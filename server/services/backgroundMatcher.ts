import { storage } from '../storage';
import WebSocketManager from './websocket';

/**
 * Background Matcher Service
 * 
 * Continuously monitors service bookings that need provider matching
 * and handles the 5-minute timer system for order workflow.
 * 
 * Key Features:
 * - Runs every 5 seconds to check for orders needing matching
 * - Handles expired 5-minute timers
 * - Continues matching during the countdown period
 * - Sends real-time WebSocket events
 * - Race condition protection with atomic operations
 */
export class BackgroundMatcher {
  private interval: NodeJS.Timeout | null = null;
  private isRunning = false;
  private webSocketManager: WebSocketManager | null = null;

  constructor(webSocketManager?: WebSocketManager) {
    this.webSocketManager = webSocketManager || null;
  }

  /**
   * Start the background matcher process
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️  Background matcher is already running');
      return;
    }

    console.log('🚀 Starting background matcher service...');
    this.isRunning = true;

    // Run every 5 seconds to ensure responsive matching
    this.interval = setInterval(async () => {
      await this.processOrderMatching();
    }, 5000);

    console.log('✅ Background matcher service started successfully');
  }

  /**
   * Stop the background matcher process
   */
  stop() {
    if (!this.isRunning) {
      console.log('⚠️  Background matcher is not running');
      return;
    }

    console.log('🛑 Stopping background matcher service...');
    
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    this.isRunning = false;
    console.log('✅ Background matcher service stopped');
  }

  /**
   * Main processing method - handles all order matching logic
   */
  private async processOrderMatching() {
    try {
      // Get all orders that need matching
      const ordersNeedingMatching = await storage.listOrdersNeedingMatching();

      if (ordersNeedingMatching.length === 0) {
        return; // No orders to process
      }

      console.log(`🔍 BackgroundMatcher: Processing ${ordersNeedingMatching.length} orders needing matching`);

      // Process each order
      for (const booking of ordersNeedingMatching) {
        await this.processIndividualOrder(booking);
      }
    } catch (error) {
      console.error('❌ BackgroundMatcher: Error in processOrderMatching:', error);
    }
  }

  /**
   * Process a single order for matching
   */
  private async processIndividualOrder(booking: any) {
    try {
      const now = new Date();
      const bookingId = booking.id;
      const userId = booking.userId;

      console.log(`🔄 BackgroundMatcher: Processing booking ${bookingId}`);

      // Check if matching timer has expired
      if (booking.matchingExpiresAt && new Date(booking.matchingExpiresAt) < now) {
        console.log(`⏰ BackgroundMatcher: Matching timer expired for booking ${bookingId}`);
        await this.handleExpiredMatching(booking);
        return;
      }

      // Check if order is in provider_search status and needs continued matching
      if (booking.status === 'provider_search') {
        console.log(`🎯 BackgroundMatcher: Continuing provider search for booking ${bookingId}`);
        await this.continueProviderMatching(booking);
        return;
      }

      // Check if order is pending and needs initial matching
      if (booking.status === 'pending' && booking.bookingType === 'instant') {
        console.log(`🚀 BackgroundMatcher: Starting initial provider search for booking ${bookingId}`);
        await this.startInitialMatching(booking);
        return;
      }

    } catch (error) {
      console.error(`❌ BackgroundMatcher: Error processing booking ${booking.id}:`, error);
    }
  }

  /**
   * Handle orders where the 5-minute matching timer has expired
   */
  private async handleExpiredMatching(booking: any) {
    try {
      const bookingId = booking.id;
      const userId = booking.userId;

      console.log(`💀 BackgroundMatcher: Handling expired matching for booking ${bookingId}`);

      // Update booking status to timeout/cancelled
      await storage.updateServiceBooking(bookingId, {
        status: 'cancelled',
        notes: 'No providers responded within the time limit'
      });

      // Cancel all pending job requests for this booking
      await storage.cancelAllJobRequests(bookingId);

      // Send WebSocket timeout event
      if (this.webSocketManager) {
        await this.webSocketManager.broadcastOrderTimeout(bookingId, userId);
        
        console.log(`📡 BackgroundMatcher: Sent timeout notification for booking ${bookingId}`);
      }

      console.log(`✅ BackgroundMatcher: Successfully handled expired matching for booking ${bookingId}`);

    } catch (error) {
      console.error(`❌ BackgroundMatcher: Error handling expired matching for booking ${booking.id}:`, error);
    }
  }

  /**
   * Continue matching providers for orders already in provider_search status
   */
  private async continueProviderMatching(booking: any) {
    try {
      const bookingId = booking.id;
      const existingCandidateCount = booking.candidateCount || 0;

      console.log(`🔄 BackgroundMatcher: Continuing matching for booking ${bookingId}, existing candidates: ${existingCandidateCount}`);

      // Check if we can find additional providers (expand search criteria)
      const additionalProviders = await storage.findMatchingProviders({
        serviceId: booking.serviceId,
        location: {
          latitude: booking.serviceLocation.latitude,
          longitude: booking.serviceLocation.longitude,
        },
        urgency: booking.urgency,
        bookingType: 'instant',
        maxDistance: Math.min(50, 25 + (existingCandidateCount * 5)), // Expand radius gradually
        maxProviders: Math.max(3, 5 - existingCandidateCount), // Find additional providers
      });

      if (additionalProviders.length > 0) {
        console.log(`📋 BackgroundMatcher: Found ${additionalProviders.length} additional providers for booking ${bookingId}`);

        // Create job requests for additional providers
        for (const provider of additionalProviders) {
          const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now

          await storage.createProviderJobRequest({
            bookingId,
            providerId: provider.userId,
            expiresAt,
            distanceKm: provider.distanceKm?.toString() || '0',
            estimatedTravelTime: provider.estimatedTravelTime || 0,
          });

          // Send WebSocket notification to provider
          if (this.webSocketManager) {
            await this.webSocketManager.broadcastProviderRequested(bookingId, provider.userId, {
              id: `${bookingId}_${provider.userId}`,
              serviceId: booking.serviceId,
              serviceLocation: booking.serviceLocation,
              totalAmount: booking.totalAmount,
              urgency: booking.urgency,
              expiresAt,
              distanceKm: provider.distanceKm,
              estimatedTravelTime: provider.estimatedTravelTime
            });
          }

          console.log(`📲 BackgroundMatcher: Sent job request to additional provider ${provider.userId}`);
        }

        // Update candidate count
        const newCandidateCount = existingCandidateCount + additionalProviders.length;
        await storage.updateServiceBooking(bookingId, {
          candidateCount: newCandidateCount
        });

        console.log(`📊 BackgroundMatcher: Updated candidate count to ${newCandidateCount} for booking ${bookingId}`);
      } else {
        console.log(`🔍 BackgroundMatcher: No additional providers found for booking ${bookingId}`);
      }

    } catch (error) {
      console.error(`❌ BackgroundMatcher: Error continuing provider matching for booking ${booking.id}:`, error);
    }
  }

  /**
   * Start initial matching for orders that just became eligible
   */
  private async startInitialMatching(booking: any) {
    try {
      const bookingId = booking.id;
      const userId = booking.userId;

      console.log(`🚀 BackgroundMatcher: Starting initial matching for booking ${bookingId}`);

      // Find matching providers
      const providers = await storage.findMatchingProviders({
        serviceId: booking.serviceId,
        location: {
          latitude: booking.serviceLocation.latitude,
          longitude: booking.serviceLocation.longitude,
        },
        urgency: booking.urgency,
        bookingType: 'instant',
        maxDistance: 25,
        maxProviders: 5,
      });

      if (providers.length === 0) {
        console.log(`❌ BackgroundMatcher: No providers found for booking ${bookingId}`);
        await storage.updateServiceBooking(bookingId, {
          status: 'cancelled',
          notes: 'No providers available in your area',
        });
        return;
      }

      // Set up 5-minute matching timer
      const matchingExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

      // Update booking with matching timer and candidate count
      await storage.updateBookingMatchingExpiry(bookingId, matchingExpiresAt, providers.length);
      await storage.updateServiceBooking(bookingId, {
        status: 'provider_search',
      });

      // Create job requests for all providers
      for (const provider of providers) {
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

        await storage.createProviderJobRequest({
          bookingId,
          providerId: provider.userId,
          expiresAt,
          distanceKm: provider.distanceKm?.toString() || '0',
          estimatedTravelTime: provider.estimatedTravelTime || 0,
        });

        // Send WebSocket notification to provider
        if (this.webSocketManager) {
          await this.webSocketManager.broadcastProviderRequested(bookingId, provider.userId, {
            id: `${bookingId}_${provider.userId}`,
            serviceId: booking.serviceId,
            serviceLocation: booking.serviceLocation,
            totalAmount: booking.totalAmount,
            urgency: booking.urgency,
            expiresAt,
            distanceKm: provider.distanceKm,
            estimatedTravelTime: provider.estimatedTravelTime
          });
        }
      }

      // Notify user that matching has started
      if (this.webSocketManager) {
        await this.webSocketManager.broadcastMatchingStarted(bookingId, userId, providers.length, matchingExpiresAt);
      }

      console.log(`✅ BackgroundMatcher: Started initial matching for booking ${bookingId} with ${providers.length} providers`);

    } catch (error) {
      console.error(`❌ BackgroundMatcher: Error starting initial matching for booking ${booking.id}:`, error);
    }
  }

  /**
   * Get provider IDs that have already been contacted for a booking
   */
  private async getAlreadyContactedProviders(bookingId: string): Promise<string[]> {
    try {
      // This would need to be implemented in storage if not already available
      // For now, return empty array to not exclude anyone
      return [];
    } catch (error) {
      console.error(`❌ BackgroundMatcher: Error getting contacted providers for booking ${bookingId}:`, error);
      return [];
    }
  }

  /**
   * Set WebSocket manager for real-time notifications
   */
  setWebSocketManager(webSocketManager: WebSocketManager) {
    this.webSocketManager = webSocketManager;
    console.log('✅ BackgroundMatcher: WebSocket manager configured');
  }

  /**
   * Get current status information
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      hasWebSocketManager: !!this.webSocketManager,
      intervalId: !!this.interval
    };
  }
}

// Export singleton instance
export const backgroundMatcher = new BackgroundMatcher();