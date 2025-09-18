import { twilioService, VoiceCallResult, VoiceCallOptions } from './twilio.js';
import { storage } from '../storage.js';
import { phoneCallLogs, providerPhoneNotificationSettings } from '../../shared/schema.js';
import type { InsertPhoneCallLog, InsertProviderPhoneNotificationSettings } from '../../shared/schema.js';

interface QueuedCall {
  id: string;
  providerId: string;
  phoneNumber: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  options: VoiceCallOptions;
  attempt: number;
  maxRetries: number;
  scheduleTime: Date;
  expiresAt: Date;
  retryDelay: number; // in milliseconds
  originalRequestTime: Date;
}

interface CallQueueStats {
  pending: number;
  inProgress: number;
  completed: number;
  failed: number;
  totalToday: number;
}

interface NotificationPreferences {
  phoneCallsEnabled: boolean;
  quietHoursStart: string; // HH:MM format
  quietHoursEnd: string; // HH:MM format
  maxCallsPerHour: number;
  preferredLanguage: string;
  urgencyThreshold: 'low' | 'normal' | 'high' | 'urgent';
}

class PhoneNotificationService {
  private callQueue: Map<string, QueuedCall> = new Map();
  private inProgressCalls: Set<string> = new Set();
  private processingInterval: NodeJS.Timeout | null = null;
  private callHistory: Map<string, number> = new Map(); // providerId -> last hour call count
  private isProcessing = false;

  // Configuration constants
  private readonly QUEUE_PROCESS_INTERVAL = 5000; // 5 seconds
  private readonly DEFAULT_RETRY_DELAY = 120000; // 2 minutes
  private readonly MAX_RETRY_DELAY = 600000; // 10 minutes
  private readonly DEFAULT_MAX_RETRIES = 3;
  private readonly CALL_HISTORY_CLEANUP_INTERVAL = 3600000; // 1 hour
  private readonly MAX_CONCURRENT_CALLS = 5;

  constructor() {
    this.startQueueProcessor();
    this.startCallHistoryCleanup();
  }

  /**
   * Queue a phone notification for a provider
   */
  async queuePhoneNotification(
    providerId: string,
    phoneNumber: string,
    jobRequestId: string,
    options: {
      urgency?: 'low' | 'normal' | 'high' | 'urgent';
      customerName?: string;
      serviceType?: string;
      estimatedPrice?: number;
      expiresInMinutes?: number;
      maxRetries?: number;
    } = {}
  ): Promise<{ success: boolean; message: string; callId?: string }> {
    try {
      // Check if provider has phone notifications enabled
      const preferences = await this.getProviderNotificationPreferences(providerId);
      if (!preferences.phoneCallsEnabled) {
        console.log(`📞 Phone notifications disabled for provider ${providerId}`);
        return {
          success: false,
          message: 'Phone notifications are disabled for this provider'
        };
      }

      // Check if we're in quiet hours
      if (this.isInQuietHours(preferences)) {
        console.log(`📞 Skipping call to provider ${providerId} - quiet hours active`);
        return {
          success: false,
          message: 'Cannot call during quiet hours'
        };
      }

      // Check call frequency limits
      const callsThisHour = this.getCallsThisHour(providerId);
      if (callsThisHour >= preferences.maxCallsPerHour) {
        console.log(`📞 Provider ${providerId} has reached max calls per hour (${preferences.maxCallsPerHour})`);
        return {
          success: false,
          message: 'Maximum calls per hour reached'
        };
      }

      // Check urgency threshold
      const urgency = options.urgency || 'normal';
      if (!this.meetsUrgencyThreshold(urgency, preferences.urgencyThreshold)) {
        console.log(`📞 Call urgency ${urgency} below threshold ${preferences.urgencyThreshold} for provider ${providerId}`);
        return {
          success: false,
          message: 'Call urgency below provider threshold'
        };
      }

      // Create queued call
      const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const expiresInMinutes = options.expiresInMinutes || 5;
      const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
      
      const queuedCall: QueuedCall = {
        id: callId,
        providerId,
        phoneNumber,
        priority: urgency,
        options: {
          jobRequestId,
          urgency,
          customerName: options.customerName,
          serviceType: options.serviceType,
          estimatedPrice: options.estimatedPrice,
          language: preferences.preferredLanguage,
          retryAttempt: 1
        },
        attempt: 1,
        maxRetries: options.maxRetries || this.DEFAULT_MAX_RETRIES,
        scheduleTime: new Date(),
        expiresAt,
        retryDelay: this.DEFAULT_RETRY_DELAY,
        originalRequestTime: new Date()
      };

      // Add to queue
      this.callQueue.set(callId, queuedCall);
      
      console.log(`📞 Queued phone notification for provider ${providerId}, call ID: ${callId}`);
      
      return {
        success: true,
        message: 'Phone notification queued successfully',
        callId
      };

    } catch (error) {
      console.error('Error queueing phone notification:', error);
      return {
        success: false,
        message: 'Failed to queue phone notification'
      };
    }
  }

  /**
   * Process the call queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.inProgressCalls.size >= this.MAX_CONCURRENT_CALLS) {
      return;
    }

    this.isProcessing = true;

    try {
      const now = new Date();
      const callsToProcess: QueuedCall[] = [];

      // Find calls ready to be processed
      for (const [callId, call] of this.callQueue.entries()) {
        // Skip if call has expired
        if (now > call.expiresAt) {
          console.log(`📞 Call ${callId} expired, removing from queue`);
          this.callQueue.delete(callId);
          await this.logCallAttempt(call, {
            success: false,
            message: 'Call expired',
            status: 'expired'
          });
          continue;
        }

        // Skip if not yet scheduled
        if (now < call.scheduleTime) {
          continue;
        }

        // Skip if already in progress
        if (this.inProgressCalls.has(callId)) {
          continue;
        }

        callsToProcess.push(call);
      }

      // Sort by priority and schedule time
      callsToProcess.sort((a, b) => {
        const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return a.scheduleTime.getTime() - b.scheduleTime.getTime();
      });

      // Process up to the concurrent limit
      const remainingSlots = this.MAX_CONCURRENT_CALLS - this.inProgressCalls.size;
      const callsToProcessNow = callsToProcess.slice(0, remainingSlots);

      // Start processing calls concurrently
      const promises = callsToProcessNow.map(call => this.processCall(call));
      if (promises.length > 0) {
        await Promise.allSettled(promises);
      }

    } catch (error) {
      console.error('Error processing call queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process an individual call
   */
  private async processCall(call: QueuedCall): Promise<void> {
    const { id: callId, providerId, phoneNumber, options } = call;
    
    console.log(`📞 Processing call ${callId} for provider ${providerId} (attempt ${call.attempt})`);
    
    this.inProgressCalls.add(callId);
    
    try {
      // Increment call history
      this.incrementCallHistory(providerId);
      
      // Make the call
      const result = await twilioService.makeProviderNotificationCall(phoneNumber, {
        ...options,
        retryAttempt: call.attempt
      });

      // Log the attempt
      await this.logCallAttempt(call, result);

      if (result.success) {
        console.log(`📞 Call ${callId} successful: ${result.message}`);
        this.callQueue.delete(callId);
      } else {
        console.log(`📞 Call ${callId} failed: ${result.message}`);
        await this.handleFailedCall(call, result);
      }

    } catch (error) {
      console.error(`Error processing call ${callId}:`, error);
      await this.handleFailedCall(call, {
        success: false,
        message: 'Unexpected error during call processing'
      });
    } finally {
      this.inProgressCalls.delete(callId);
    }
  }

  /**
   * Handle a failed call and schedule retry if appropriate
   */
  private async handleFailedCall(call: QueuedCall, result: VoiceCallResult): Promise<void> {
    if (call.attempt >= call.maxRetries) {
      console.log(`📞 Call ${call.id} exceeded max retries (${call.maxRetries}), removing from queue`);
      this.callQueue.delete(call.id);
      return;
    }

    // Calculate next retry time with exponential backoff
    const backoffMultiplier = Math.pow(2, call.attempt - 1);
    const nextRetryDelay = Math.min(
      call.retryDelay * backoffMultiplier,
      this.MAX_RETRY_DELAY
    );
    
    const nextScheduleTime = new Date(Date.now() + nextRetryDelay);

    // Update call for retry
    call.attempt += 1;
    call.scheduleTime = nextScheduleTime;
    call.options.retryAttempt = call.attempt;

    console.log(`📞 Scheduling retry for call ${call.id} at ${nextScheduleTime.toISOString()} (attempt ${call.attempt})`);
  }

  /**
   * Log call attempt to database
   */
  private async logCallAttempt(call: QueuedCall, result: VoiceCallResult): Promise<void> {
    try {
      const logEntry: InsertPhoneCallLog = {
        providerId: call.providerId,
        jobRequestId: call.options.jobRequestId,
        twilioCallSid: result.callSid || null,
        fromNumber: process.env.TWILIO_PHONE_NUMBER || '+1234567890', // Twilio outgoing number
        toNumber: call.phoneNumber,
        status: result.success ? (result.status as 'initiated' | 'ringing' | 'answered' | 'completed' | 'failed' | 'busy' | 'no_answer' | 'cancelled' || 'completed') : 'failed',
        duration: result.duration || null,
        attemptNumber: call.attempt,
        maxAttempts: call.maxRetries,
        retryAfter: call.attempt < call.maxRetries && !result.success ? call.scheduleTime : null,
        providerAnswered: result.success && result.status === 'answered',
        errorCode: result.errorCode || null,
        errorMessage: result.errorMessage || null,
        costInCents: result.cost ? Math.round(result.cost * 100) : null,
        currency: 'USD'
      };

      await storage.createPhoneCallLog(logEntry);
    } catch (error) {
      console.error('Error logging call attempt:', error);
    }
  }

  /**
   * Get provider notification preferences
   */
  private async getProviderNotificationPreferences(providerId: string): Promise<NotificationPreferences> {
    try {
      const settings = await storage.getProviderPhoneNotificationSettings(providerId);
      
      if (settings) {
        return {
          phoneCallsEnabled: settings.phoneNotificationsEnabled ?? false,
          quietHoursStart: settings.quietHoursStart ?? '22:00',
          quietHoursEnd: settings.quietHoursEnd ?? '07:00',
          maxCallsPerHour: settings.maxCallsPerHour ?? 10,
          preferredLanguage: settings.voiceMessageLanguage ?? 'en',
          urgencyThreshold: 'normal' // Default since urgencyThreshold doesn't exist in schema
        };
      }

      // Return defaults if no settings found
      return {
        phoneCallsEnabled: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
        maxCallsPerHour: 10,
        preferredLanguage: 'en',
        urgencyThreshold: 'normal'
      };
    } catch (error) {
      console.error('Error getting provider notification preferences:', error);
      // Return safe defaults
      return {
        phoneCallsEnabled: false, // Disable by default on error
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
        maxCallsPerHour: 5,
        preferredLanguage: 'en',
        urgencyThreshold: 'high'
      };
    }
  }

  /**
   * Check if current time is within quiet hours
   */
  private isInQuietHours(preferences: NotificationPreferences): boolean {
    const now = new Date();
    const currentTime = now.getHours().toString().padStart(2, '0') + ':' + 
                       now.getMinutes().toString().padStart(2, '0');
    
    const { quietHoursStart, quietHoursEnd } = preferences;
    
    // Handle case where quiet hours span midnight
    if (quietHoursStart > quietHoursEnd) {
      return currentTime >= quietHoursStart || currentTime <= quietHoursEnd;
    } else {
      return currentTime >= quietHoursStart && currentTime <= quietHoursEnd;
    }
  }

  /**
   * Check if urgency meets provider threshold
   */
  private meetsUrgencyThreshold(urgency: string, threshold: string): boolean {
    const urgencyLevels = { low: 1, normal: 2, high: 3, urgent: 4 };
    return urgencyLevels[urgency as keyof typeof urgencyLevels] >= 
           urgencyLevels[threshold as keyof typeof urgencyLevels];
  }

  /**
   * Get call count for provider in current hour
   */
  private getCallsThisHour(providerId: string): number {
    return this.callHistory.get(providerId) || 0;
  }

  /**
   * Increment call history for provider
   */
  private incrementCallHistory(providerId: string): void {
    const current = this.callHistory.get(providerId) || 0;
    this.callHistory.set(providerId, current + 1);
  }

  /**
   * Start queue processor
   */
  private startQueueProcessor(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
    
    this.processingInterval = setInterval(() => {
      this.processQueue().catch(error => {
        console.error('Queue processing error:', error);
      });
    }, this.QUEUE_PROCESS_INTERVAL);
    
    console.log('📞 Phone notification queue processor started');
  }

  /**
   * Start call history cleanup
   */
  private startCallHistoryCleanup(): void {
    setInterval(() => {
      console.log('📞 Cleaning up call history');
      this.callHistory.clear();
    }, this.CALL_HISTORY_CLEANUP_INTERVAL);
  }

  /**
   * Get queue statistics
   */
  getQueueStats(): CallQueueStats {
    const pending = this.callQueue.size;
    const inProgress = this.inProgressCalls.size;
    
    return {
      pending,
      inProgress,
      completed: 0, // Would need to track this in memory or database
      failed: 0, // Would need to track this in memory or database  
      totalToday: 0 // Would need to query database
    };
  }

  /**
   * Cancel a queued call
   */
  cancelCall(callId: string): boolean {
    if (this.callQueue.has(callId)) {
      this.callQueue.delete(callId);
      console.log(`📞 Cancelled queued call ${callId}`);
      return true;
    }
    return false;
  }

  /**
   * Get call queue status for a provider
   */
  getProviderCallStatus(providerId: string): QueuedCall[] {
    return Array.from(this.callQueue.values())
      .filter(call => call.providerId === providerId);
  }

  /**
   * Cleanup and stop the service
   */
  destroy(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    
    this.callQueue.clear();
    this.inProgressCalls.clear();
    this.callHistory.clear();
    
    console.log('📞 Phone notification service destroyed');
  }
}

// Create singleton instance
export const phoneNotificationService = new PhoneNotificationService();

// Export types
export type { QueuedCall, CallQueueStats, NotificationPreferences };

// Default export
export default phoneNotificationService;