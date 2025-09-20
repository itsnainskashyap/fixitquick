import { storage } from '../storage';
import WebSocketManager from './websocket';
import { phoneNotificationService } from './phoneNotifications';
import { notificationService } from './notifications';

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
   * Main processing method - handles all order matching logic with strict 5-minute timer enforcement
   */
  private async processOrderMatching() {
    try {
      // Step 1: Expire old job requests (critical for TTL enforcement)
      await storage.expireOldJobRequests();

      // Step 2: Get all orders that need matching
      const ordersNeedingMatching = await storage.listOrdersNeedingMatching();

      // Step 3: Check for orders needing radius expansion
      const ordersNeedingExpansion = await storage.getBookingsNeedingRadiusExpansion();

      if (ordersNeedingMatching.length === 0 && ordersNeedingExpansion.length === 0) {
        return; // No orders to process
      }

      console.log(`🔍 BackgroundMatcher: Processing ${ordersNeedingMatching.length} orders needing matching, ${ordersNeedingExpansion.length} needing expansion`);

      // Step 4: Process radius expansions first (time-sensitive)
      for (const booking of ordersNeedingExpansion) {
        await this.handleRadiusExpansion(booking);
      }

      // Step 5: Process each order for matching
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
   * Handle radius expansion for bookings that need broader search
   */
  private async handleRadiusExpansion(booking: any) {
    try {
      console.log(`📡 BackgroundMatcher: Expanding search radius for booking ${booking.id}`);
      
      const expansionResult = await storage.expandSearchRadius(booking.id);
      
      if (expansionResult.success) {
        // Emit WebSocket event for radius expansion
        if (this.webSocketManager) {
          this.webSocketManager.sendToUser(booking.userId, {
            type: 'order.radius_expanded',
            data: {
              bookingId: booking.id,
              newRadius: expansionResult.newRadius,
              searchWave: expansionResult.newWave,
              message: expansionResult.message,
            }
          });
        }

        // Continue matching with expanded radius
        await this.continueProviderMatching(booking, expansionResult.newRadius);
      } else {
        console.log(`❌ BackgroundMatcher: Cannot expand radius for booking ${booking.id}: ${expansionResult.message}`);
        
        // If we can't expand radius anymore, handle as expired matching
        if (expansionResult.message?.includes('Maximum search radius reached')) {
          await this.handleExpiredMatching(booking);
        }
      }
    } catch (error) {
      console.error(`❌ BackgroundMatcher: Error expanding radius for booking ${booking.id}:`, error);
    }
  }

  /**
   * Enhanced provider matching with radius and TTL enforcement  
   */
  private async continueProviderMatching(booking: any, customRadius?: number) {
    try {
      const currentRadius = customRadius || booking.currentSearchRadius || 15;
      
      console.log(`🎯 BackgroundMatcher: Searching for providers within ${currentRadius}km for booking ${booking.id}`);

      // Find eligible providers with current radius
      const matchingProviders = await storage.findMatchingProviders({
        serviceId: booking.serviceId,
        location: {
          latitude: booking.serviceLocation.latitude,
          longitude: booking.serviceLocation.longitude
        },
        urgency: booking.urgency || 'normal',
        bookingType: booking.bookingType,
        scheduledAt: booking.scheduledAt,
        maxDistance: currentRadius,
        maxProviders: 5, // Limit to 5 providers per wave
      });

      if (matchingProviders.length === 0) {
        console.log(`❌ BackgroundMatcher: No providers found within ${currentRadius}km for booking ${booking.id}`);
        return;
      }

      console.log(`✅ BackgroundMatcher: Found ${matchingProviders.length} eligible providers for booking ${booking.id}`);

      // Create job requests with strict 5-minute TTL
      let offersCreated = 0;
      for (const provider of matchingProviders) {
        try {
          const jobRequest = await storage.createProviderJobRequest({
            orderId: booking.id,
            providerId: provider.userId,
            priority: this.calculatePriority(booking.urgency),
            distanceKm: provider.distanceKm,
            estimatedTravelTime: provider.estimatedTravelTime,
            // 5-minute TTL enforcement
            expiresAt: new Date(Date.now() + 5 * 60 * 1000),
          });

          // Send PWA push notification for job offer (high priority)
          await this.sendPWANotificationToProvider(provider, booking, jobRequest);

          // Emit WebSocket event for job offer
          if (this.webSocketManager) {
            this.webSocketManager.sendToUser(provider.userId, {
              type: 'job.offer_sent',
              data: {
                jobRequest: {
                  ...jobRequest,
                  remainingSeconds: 300, // 5 minutes
                  bookingDetails: {
                    id: booking.id,
                    serviceTitle: booking.serviceTitle,
                    serviceLocation: booking.serviceLocation,
                    scheduledAt: booking.scheduledAt,
                    urgency: booking.urgency,
                    estimatedPrice: booking.totalAmount,
                  },
                  customerInfo: {
                    name: booking.customerName,
                    rating: booking.customerRating || 5.0,
                  },
                }
              }
            });

            // Also emit to customer about offers sent
            this.webSocketManager.sendToUser(booking.userId, {
              type: 'order.offers_sent',
              data: {
                bookingId: booking.id,
                providersCount: matchingProviders.length,
                currentRadius,
                searchWave: booking.searchWave || 1,
              }
            });
          }

          // Send phone notification to provider (non-blocking)
          this.sendPhoneNotificationToProvider(provider, booking, jobRequest).catch(error => {
            console.error(`❌ BackgroundMatcher: Error sending phone notification to provider ${provider.userId}:`, error);
          });

          offersCreated++;
        } catch (error) {
          console.error(`❌ BackgroundMatcher: Error creating job request for provider ${provider.userId}:`, error);
        }
      }

      // Update booking with pending offers count
      await storage.updateBookingMatchingExpiry(
        booking.id, 
        new Date(Date.now() + 5 * 60 * 1000), // 5-minute window
        offersCreated
      );

      console.log(`📤 BackgroundMatcher: Created ${offersCreated} job offers for booking ${booking.id}`);

    } catch (error) {
      console.error(`❌ BackgroundMatcher: Error in continueProviderMatching for booking ${booking.id}:`, error);
    }
  }

  /**
   * Calculate priority based on urgency and booking type
   */
  private calculatePriority(urgency: string): number {
    const priorityMap = {
      'urgent': 1,
      'high': 2,
      'normal': 3,
      'low': 4,
    };
    return priorityMap[urgency as keyof typeof priorityMap] || 3;
  }

  /**
   * Send phone notification to provider about new job offer
   */
  private async sendPhoneNotificationToProvider(provider: any, booking: any, jobRequest: any): Promise<void> {
    try {
      console.log(`📞 BackgroundMatcher: Sending phone notification to provider ${provider.userId} for booking ${booking.id}`);

      // Get provider's phone number from their profile
      const providerProfile = await storage.getServiceProvider(provider.userId);
      if (!providerProfile || !providerProfile.phoneNumber) {
        console.log(`📞 BackgroundMatcher: No phone number found for provider ${provider.userId}, skipping phone notification`);
        return;
      }

      // Determine urgency level for phone notification
      const urgencyMapping: Record<string, 'low' | 'normal' | 'high' | 'urgent'> = {
        'low': 'low',
        'normal': 'normal', 
        'high': 'high',
        'urgent': 'urgent'
      };
      
      const phoneUrgency = urgencyMapping[booking.urgency || 'normal'] || 'normal';

      // Queue phone notification with all relevant details
      const phoneNotificationResult = await phoneNotificationService.queuePhoneNotification(
        provider.userId,
        providerProfile.phoneNumber,
        booking.id,
        {
          urgency: phoneUrgency,
          customerName: booking.customerName,
          serviceType: booking.serviceTitle,
          estimatedPrice: booking.totalAmount,
          expiresInMinutes: 5, // Match the 5-minute timer
          maxRetries: 2 // Allow retries for important notifications
        }
      );

      if (phoneNotificationResult.success) {
        console.log(`✅ BackgroundMatcher: Phone notification queued for provider ${provider.userId}, call ID: ${phoneNotificationResult.callId}`);
        
        // Update job request with phone notification info
        if (phoneNotificationResult.callId) {
          await storage.updateProviderJobRequest(jobRequest.id, {
            phoneCallId: phoneNotificationResult.callId,
            phoneNotificationSent: true,
            phoneNotificationTimestamp: new Date()
          });
        }
      } else {
        console.log(`⚠️ BackgroundMatcher: Failed to queue phone notification for provider ${provider.userId}: ${phoneNotificationResult.message}`);
        
        // Update job request to record failed phone notification attempt
        await storage.updateProviderJobRequest(jobRequest.id, {
          phoneNotificationSent: false,
          phoneNotificationError: phoneNotificationResult.message,
          phoneNotificationTimestamp: new Date()
        });
      }

    } catch (error) {
      console.error(`❌ BackgroundMatcher: Error sending phone notification to provider ${provider.userId}:`, error);
      
      // Record error in job request
      try {
        await storage.updateProviderJobRequest(jobRequest.id, {
          phoneNotificationSent: false,
          phoneNotificationError: error instanceof Error ? error.message : 'Unknown error',
          phoneNotificationTimestamp: new Date()
        });
      } catch (updateError) {
        console.error(`❌ BackgroundMatcher: Error updating job request with phone notification error:`, updateError);
      }
    }
  }

  /**
   * Send PWA push notification to provider about new job offer
   */
  private async sendPWANotificationToProvider(provider: any, booking: any, jobRequest: any): Promise<void> {
    try {
      console.log(`🔔 BackgroundMatcher: Sending PWA notification to provider ${provider.userId} for booking ${booking.id}`);

      // Determine notification type based on urgency
      let notificationType = 'new_job_request';
      if (booking.urgency === 'urgent' || booking.urgency === 'emergency') {
        notificationType = 'emergency_request';
      }

      // Build comprehensive notification payload
      const notificationPayload = {
        title: booking.urgency === 'urgent' || booking.urgency === 'emergency' 
          ? '🚨 EMERGENCY JOB REQUEST' 
          : '🔧 New Job Request Available',
        body: `${booking.serviceTitle} needed in ${booking.serviceLocation?.area || 'your area'}. Estimated: ₹${booking.totalAmount}`,
        data: {
          type: notificationType,
          providerType: 'service_provider',
          orderId: booking.id,
          jobId: jobRequest.id,
          bookingId: booking.id,
          urgency: booking.urgency || 'normal',
          serviceTitle: booking.serviceTitle,
          customerName: booking.customerName,
          estimatedPrice: booking.totalAmount,
          location: booking.serviceLocation,
          scheduledAt: booking.scheduledAt,
          expiresAt: jobRequest.expiresAt,
          remainingSeconds: 300, // 5 minutes
          link: `/provider/dashboard?jobId=${jobRequest.id}`,
          // Additional context for action handling
          acceptEndpoint: `/api/v1/orders/${booking.id}/accept`,
          declineEndpoint: `/api/v1/orders/${booking.id}/decline`,
        },
        imageUrl: '/icons/job-notification.png', // Optional image
      };

      // Send PWA notification with high priority
      const result = await notificationService.sendPushNotification(
        provider.userId, 
        notificationPayload
      );

      if (result.success) {
        console.log(`✅ BackgroundMatcher: PWA notification sent to provider ${provider.userId}, delivery count: ${result.successCount}`);
        
        // Update job request with PWA notification info
        await storage.updateProviderJobRequest(jobRequest.id, {
          pwaNotificationSent: true,
          pwaNotificationTimestamp: new Date(),
          pwaNotificationDelivered: result.successCount > 0
        });
      } else {
        console.log(`⚠️ BackgroundMatcher: Failed to send PWA notification to provider ${provider.userId}: ${result.reason || 'Unknown error'}`);
        
        // Record failed PWA notification attempt
        await storage.updateProviderJobRequest(jobRequest.id, {
          pwaNotificationSent: false,
          pwaNotificationError: result.reason || 'Failed to send PWA notification',
          pwaNotificationTimestamp: new Date()
        });
      }

    } catch (error) {
      console.error(`❌ BackgroundMatcher: Error sending PWA notification to provider ${provider.userId}:`, error);
      
      // Record error in job request
      try {
        await storage.updateProviderJobRequest(jobRequest.id, {
          pwaNotificationSent: false,
          pwaNotificationError: error instanceof Error ? error.message : 'Unknown PWA notification error',
          pwaNotificationTimestamp: new Date()
        });
      } catch (updateError) {
        console.error(`❌ BackgroundMatcher: Error updating job request with PWA notification error:`, updateError);
      }
    }
  }

  /**
   * Send PWA notification for parts provider orders
   */
  async sendPWANotificationToPartsProvider(
    providerId: string, 
    orderId: string, 
    orderDetails: any
  ): Promise<void> {
    try {
      console.log(`📦 BackgroundMatcher: Sending PWA notification to parts provider ${providerId} for order ${orderId}`);

      const notificationPayload = {
        title: '📦 New Parts Order',
        body: `New order for ${orderDetails.itemCount || 'multiple'} items. Total: ₹${orderDetails.totalAmount}`,
        data: {
          type: 'new_order',
          providerType: 'parts_provider',
          orderId: orderId,
          itemCount: orderDetails.itemCount,
          totalAmount: orderDetails.totalAmount,
          customerName: orderDetails.customerName,
          urgency: orderDetails.urgency || 'normal',
          estimatedDelivery: orderDetails.estimatedDelivery,
          link: `/parts-provider/dashboard?orderId=${orderId}`,
          acceptEndpoint: `/api/v1/parts-provider/orders/${orderId}/accept`,
        },
      };

      const result = await notificationService.sendPushNotification(
        providerId, 
        notificationPayload
      );

      if (result.success) {
        console.log(`✅ BackgroundMatcher: PWA notification sent to parts provider ${providerId}`);
      } else {
        console.log(`⚠️ BackgroundMatcher: Failed to send PWA notification to parts provider ${providerId}`);
      }

    } catch (error) {
      console.error(`❌ BackgroundMatcher: Error sending PWA notification to parts provider ${providerId}:`, error);
    }
  }

  /**
   * Send PWA notification for low stock alerts
   */
  async sendLowStockPWANotification(providerId: string, stockData: any): Promise<void> {
    try {
      const notificationPayload = {
        title: '⚠️ Low Stock Alert',
        body: `${stockData.itemName} is running low (${stockData.currentStock} remaining)`,
        data: {
          type: 'low_stock_alert',
          providerType: 'parts_provider',
          partId: stockData.partId,
          itemName: stockData.itemName,
          currentStock: stockData.currentStock,
          threshold: stockData.threshold,
          link: `/parts-provider/dashboard?tab=inventory&highlight=${stockData.partId}`,
        },
      };

      await notificationService.sendPushNotification(providerId, notificationPayload);
      console.log(`📊 BackgroundMatcher: Low stock PWA notification sent to parts provider ${providerId}`);

    } catch (error) {
      console.error(`❌ BackgroundMatcher: Error sending low stock PWA notification:`, error);
    }
  }

  /**
   * Start initial matching for new orders
   */
  private async startInitialMatching(booking: any) {
    try {
      console.log(`🚀 BackgroundMatcher: Starting initial matching for booking ${booking.id}`);

      // Set initial search parameters
      const initialRadius = 15; // Start with 15km radius
      const matchingExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5-minute timer

      // Update booking status and search parameters
      await storage.updateServiceBooking(booking.id, {
        status: 'provider_search',
        matchingExpiresAt,
        currentSearchRadius: initialRadius,
        searchWave: 1,
        radiusExpansionHistory: [{
          wave: 1,
          radius: initialRadius,
          providersFound: 0,
          expandedAt: new Date().toISOString(),
        }],
      });

      // Emit WebSocket event for matching started
      if (this.webSocketManager) {
        this.webSocketManager.sendToUser(booking.userId, {
          type: 'order.matching_started',
          data: {
            bookingId: booking.id,
            searchRadius: initialRadius,
            searchWave: 1,
            timeLimit: 300, // 5 minutes in seconds
          }
        });
      }

      // Start provider matching
      await this.continueProviderMatching(booking, initialRadius);

    } catch (error) {
      console.error(`❌ BackgroundMatcher: Error in startInitialMatching for booking ${booking.id}:`, error);
    }
  }

  /**
   * Handle provider acceptance of job offer with complete state machine integration
   */
  async handleProviderAcceptance(bookingId: string, providerId: string, acceptanceDetails?: {
    estimatedArrival?: Date;
    quotedPrice?: number;
    notes?: string;
  }): Promise<{ success: boolean; message?: string }> {
    try {
      console.log(`✅ BackgroundMatcher: Handling provider acceptance for booking ${bookingId} by provider ${providerId}`);

      // Use storage method with race condition protection
      const result = await storage.acceptProviderJobRequest(bookingId, providerId, acceptanceDetails);
      
      if (result.success && result.booking) {
        // Create status history for acceptance
        await storage.createOrderStatusHistory({
          orderId: bookingId,
          fromStatus: 'provider_search',
          toStatus: 'provider_assigned',
          changedBy: providerId,
          changedByRole: 'provider',
          reason: 'Provider accepted job offer',
          metadata: acceptanceDetails,
        });

        // Send welcome chat message from system
        await storage.createOrderChatMessage({
          orderId: bookingId,
          senderId: 'system',
          senderRole: 'system',
          messageType: 'status_update',
          content: `Your service provider has been assigned and will arrive soon! ${acceptanceDetails?.estimatedArrival ? `Estimated arrival: ${new Date(acceptanceDetails.estimatedArrival).toLocaleTimeString()}` : ''}`,
          isSystemMessage: true,
        });

        // Emit WebSocket events for real-time updates
        if (this.webSocketManager) {
          // Notify customer
          this.webSocketManager.sendToUser(result.booking.userId, {
            type: 'order.provider_assigned',
            data: {
              bookingId,
              providerId,
              status: 'provider_assigned',
              estimatedArrival: acceptanceDetails?.estimatedArrival,
              quotedPrice: acceptanceDetails?.quotedPrice,
              message: 'Great news! A service provider has accepted your request.',
              providerInfo: {
                // Will be populated by frontend from provider profile
                name: 'Your Service Provider',
                rating: 4.8,
                experience: '5+ years'
              }
            }
          });

          // Notify provider about successful assignment
          this.webSocketManager.sendToUser(providerId, {
            type: 'job.accepted_confirmed',
            data: {
              bookingId,
              status: 'provider_assigned',
              customerLocation: result.booking.serviceLocation,
              customerInfo: {
                name: result.booking.customerName
              },
              nextSteps: [
                'Review customer location and requirements',
                'Start heading to the location',
                'Update your status when en route'
              ]
            }
          });
        }

        console.log(`✅ BackgroundMatcher: Successfully processed provider acceptance for booking ${bookingId}`);
        return { success: true };
      }

      return result;
    } catch (error) {
      console.error(`❌ BackgroundMatcher: Error handling provider acceptance:`, error);
      return { success: false, message: 'Failed to process provider acceptance' };
    }
  }

  /**
   * Handle provider declining job offer
   */
  async handleProviderDecline(bookingId: string, providerId: string, reason?: string): Promise<{ success: boolean; message?: string }> {
    try {
      console.log(`❌ BackgroundMatcher: Handling provider decline for booking ${bookingId} by provider ${providerId}`);

      const result = await storage.declineProviderJobRequest(bookingId, providerId, reason);
      
      if (result.success) {
        // Continue matching with remaining providers or expand radius
        const booking = await storage.getServiceBooking(bookingId);
        if (booking && booking.status === 'provider_search') {
          // Check if there are still pending offers
          const pendingOffers = await storage.getProviderJobRequests(providerId, { status: 'sent' });
          
          if (pendingOffers.length === 0) {
            // No more pending offers, trigger radius expansion
            setTimeout(() => {
              this.handleRadiusExpansion(booking);
            }, 2000); // Small delay to allow other potential acceptances
          }
        }

        console.log(`✅ BackgroundMatcher: Successfully processed provider decline for booking ${bookingId}`);
        return { success: true };
      }

      return result;
    } catch (error) {
      console.error(`❌ BackgroundMatcher: Error handling provider decline:`, error);
      return { success: false, message: 'Failed to process provider decline' };
    }
  }

  /**
   * Handle provider status updates (enroute, arrived, started, etc.)
   */
  async updateProviderStatus(bookingId: string, providerId: string, status: 'enroute' | 'arrived' | 'started' | 'in_progress' | 'completed', metadata?: any): Promise<{ success: boolean; message?: string }> {
    try {
      console.log(`🔄 BackgroundMatcher: Updating provider status for booking ${bookingId} to ${status}`);

      // Validate state transition
      const booking = await storage.getServiceBooking(bookingId);
      if (!booking) {
        return { success: false, message: 'Booking not found' };
      }

      // Map provider status to booking status
      const statusMapping: Record<string, string> = {
        'enroute': 'provider_on_way',
        'arrived': 'work_in_progress',
        'started': 'work_in_progress',
        'in_progress': 'work_in_progress',
        'completed': 'work_completed'
      };

      const newBookingStatus = statusMapping[status];
      if (!newBookingStatus) {
        return { success: false, message: 'Invalid status update' };
      }

      // Use enhanced state transition method
      const transitionResult = await storage.transitionOrderState(
        bookingId,
        newBookingStatus,
        providerId,
        `Provider updated status to ${status}`,
        metadata
      );

      if (!transitionResult.success) {
        return transitionResult;
      }

      // Update booking status
      await storage.updateServiceBooking(bookingId, { 
        status: newBookingStatus,
        ...(status === 'completed' && { completedAt: new Date() })
      });

      // Create location update if location data provided
      if (metadata?.location && (status === 'enroute' || status === 'arrived')) {
        await storage.createLocationUpdate({
          orderId: bookingId,
          providerId,
          latitude: metadata.location.latitude,
          longitude: metadata.location.longitude,
          status: status === 'arrived' ? 'arrived' : 'enroute',
          accuracy: metadata.location.accuracy,
          estimatedArrival: metadata.estimatedArrival,
          isSharedWithCustomer: true,
          shareLevel: 'approximate',
        });
      }

      // Send status update chat message
      const statusMessages: Record<string, string> = {
        'enroute': 'Your service provider is on the way! 🚗',
        'arrived': 'Your service provider has arrived at your location! 📍',
        'started': 'Work has started on your service request! 🔧',
        'in_progress': 'Work is currently in progress... ⚙️',
        'completed': 'Work has been completed! Please review and rate the service. ✅'
      };

      await storage.createOrderChatMessage({
        orderId: bookingId,
        senderId: 'system',
        senderRole: 'system',
        messageType: 'status_update',
        content: statusMessages[status] || `Status updated to ${status}`,
        isSystemMessage: true,
      });

      // Emit WebSocket events for real-time updates
      if (this.webSocketManager) {
        // Notify customer
        this.webSocketManager.sendToUser(booking.userId, {
          type: 'order.status_updated',
          data: {
            bookingId,
            status: newBookingStatus,
            providerStatus: status,
            timestamp: new Date(),
            location: metadata?.location,
            estimatedArrival: metadata?.estimatedArrival,
            message: statusMessages[status],
          }
        });

        // Notify provider of successful status update
        this.webSocketManager.sendToUser(providerId, {
          type: 'job.status_updated',
          data: {
            bookingId,
            status: newBookingStatus,
            providerStatus: status,
            timestamp: new Date(),
          }
        });
      }

      // Handle completion flow
      if (status === 'completed') {
        await this.handleOrderCompletion(bookingId, providerId);
      }

      console.log(`✅ BackgroundMatcher: Successfully updated provider status for booking ${bookingId} to ${status}`);
      return { success: true };
    } catch (error) {
      console.error(`❌ BackgroundMatcher: Error updating provider status:`, error);
      return { success: false, message: 'Failed to update provider status' };
    }
  }

  /**
   * Handle order completion workflow
   */
  private async handleOrderCompletion(bookingId: string, providerId: string): Promise<void> {
    try {
      console.log(`🎉 BackgroundMatcher: Handling order completion for booking ${bookingId}`);

      // Generate completion certificate
      await storage.createOrderDocument({
        orderId: bookingId,
        documentType: 'completion_certificate',
        title: 'Service Completion Certificate',
        description: 'Certificate confirming successful completion of service',
        url: `/api/documents/completion/${bookingId}`, // Will be generated by document service
        uploadedBy: providerId,
        uploadedByRole: 'provider',
        isPublic: false,
      });

      // Create system message for completion
      await storage.createOrderChatMessage({
        orderId: bookingId,
        senderId: 'system',
        senderRole: 'system',
        messageType: 'status_update',
        content: 'Service completed successfully! 🎉 Please take a moment to rate your experience and provide feedback.',
        isSystemMessage: true,
      });

      // Emit completion events
      if (this.webSocketManager) {
        const booking = await storage.getServiceBooking(bookingId);
        if (booking) {
          // Notify customer
          this.webSocketManager.sendToUser(booking.userId, {
            type: 'order.completed',
            data: {
              bookingId,
              status: 'work_completed',
              completedAt: new Date(),
              message: 'Service completed successfully!',
              nextSteps: [
                'Rate your service provider',
                'Provide feedback',
                'Download receipt'
              ]
            }
          });

          // Notify provider
          this.webSocketManager.sendToUser(providerId, {
            type: 'job.completed',
            data: {
              bookingId,
              status: 'work_completed',
              completedAt: new Date(),
              message: 'Job marked as completed!',
              nextSteps: [
                'Rate your customer',
                'Submit any final documentation',
                'Wait for payment processing'
              ]
            }
          });
        }
      }

      console.log(`✅ BackgroundMatcher: Successfully processed order completion for booking ${bookingId}`);
    } catch (error) {
      console.error(`❌ BackgroundMatcher: Error handling order completion:`, error);
    }
  }

  /**
   * Handle order cancellation workflow
   */
  async handleOrderCancellation(bookingId: string, cancelledBy: string, cancelledByRole: 'customer' | 'provider' | 'admin', reason: string, customReason?: string): Promise<{ success: boolean; message?: string; refundInfo?: any }> {
    try {
      console.log(`🚫 BackgroundMatcher: Handling order cancellation for booking ${bookingId} by ${cancelledByRole} ${cancelledBy}`);

      const booking = await storage.getServiceBooking(bookingId);
      if (!booking) {
        return { success: false, message: 'Booking not found' };
      }

      // Get cancellation policy
      const policy = await storage.getCancellationPolicy(booking.serviceId);
      
      // Calculate hours before service
      const hoursBeforeService = booking.scheduledAt 
        ? (new Date(booking.scheduledAt).getTime() - new Date().getTime()) / (1000 * 60 * 60)
        : 0;

      // Calculate refund based on policy and timing
      let refundPercent = 0;
      let penaltyAmount = 0;

      if (policy) {
        if (hoursBeforeService >= policy.freeHours) {
          refundPercent = policy.freeRefundPercent;
        } else if (hoursBeforeService >= policy.partialRefundHours) {
          refundPercent = policy.partialRefundPercent;
        } else {
          refundPercent = policy.noRefundPercent;
        }

        // Calculate provider penalty if provider cancels
        if (cancelledByRole === 'provider' && hoursBeforeService < policy.freeHours) {
          penaltyAmount = (booking.totalAmount * policy.providerPenaltyPercent) / 100;
        }
      }

      const refundAmount = (booking.totalAmount * refundPercent) / 100;

      // Create cancellation record
      const cancellation = await storage.createOrderCancellation({
        orderId: bookingId,
        cancelledBy,
        cancelledByRole,
        reason,
        customReason,
        policyId: policy?.id,
        hoursBeforeService,
        appliedRefundPercent: refundPercent,
        refundAmount,
        penaltyAmount,
      });

      // Update booking status
      await storage.transitionOrderState(
        bookingId,
        'cancelled',
        cancelledBy,
        `Order cancelled: ${reason}`,
        { refundPercent, refundAmount, penaltyAmount }
      );

      await storage.updateServiceBooking(bookingId, { 
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelledBy,
        cancelReason: reason,
      });

      // Cancel any pending job requests
      await storage.cancelAllJobRequests(bookingId);

      // Create cancellation chat message
      await storage.createOrderChatMessage({
        orderId: bookingId,
        senderId: 'system',
        senderRole: 'system',
        messageType: 'status_update',
        content: `Order has been cancelled. ${refundAmount > 0 ? `Refund of ₹${refundAmount} will be processed within 3-5 business days.` : ''}`,
        isSystemMessage: true,
      });

      // Emit cancellation events
      if (this.webSocketManager) {
        const cancelData = {
          bookingId,
          status: 'cancelled',
          cancelledBy: cancelledByRole,
          reason,
          refundAmount,
          refundPercent,
          cancelledAt: new Date(),
        };

        // Notify customer
        this.webSocketManager.sendToUser(booking.userId, {
          type: 'order.cancelled',
          data: {
            ...cancelData,
            message: `Order cancelled: ${reason}`,
          }
        });

        // Notify provider if assigned
        if (booking.assignedProviderId) {
          this.webSocketManager.sendToUser(booking.assignedProviderId, {
            type: 'job.cancelled',
            data: {
              ...cancelData,
              message: `Job cancelled: ${reason}`,
            }
          });
        }
      }

      console.log(`✅ BackgroundMatcher: Successfully processed order cancellation for booking ${bookingId}`);
      return { 
        success: true, 
        refundInfo: {
          refundAmount,
          refundPercent,
          penaltyAmount,
          hoursBeforeService
        }
      };
    } catch (error) {
      console.error(`❌ BackgroundMatcher: Error handling order cancellation:`, error);
      return { success: false, message: 'Failed to process cancellation' };
    }
  }

  /**
   * Handle orders where the 5-minute matching timer has expired
   */
  private async handleExpiredMatching(booking: any) {
    try {
      const bookingId = booking.id;
      const userId = booking.userId;

      console.log(`⏰ BackgroundMatcher: Handling expired matching for booking ${bookingId}`);

      // Cancel all pending job requests for this booking
      await storage.cancelAllJobRequests(bookingId);

      // Update booking status to no providers found
      await storage.updateServiceBooking(bookingId, {
        status: 'no_providers_found',
        assignmentMethod: 'timeout',
        matchingExpiresAt: null, // Clear expiry since matching is done
        pendingOffers: 0,
      });

      // Create status history
      await storage.createOrderStatusHistory({
        orderId: bookingId,
        fromStatus: 'provider_search',
        toStatus: 'no_providers_found',
        changedByRole: 'system',
        reason: 'Matching timer expired - no providers accepted within time limit',
      });

      // Emit WebSocket events for expiry
      if (this.webSocketManager) {
        // Notify customer that matching has expired
        this.webSocketManager.sendToUser(userId, {
          type: 'order.matching_expired',
          data: {
            bookingId,
            status: 'no_providers_found',
            message: 'No providers were found within the time limit. Please try again or contact support.',
            nextSteps: [
              'Try again with a different time',
              'Contact customer support',
              'Consider scheduling for later'
            ],
          }
        });

        // Emit expired events to any providers with pending offers
        const activeRequests = await storage.getActiveJobRequestsWithTTL();
        const expiredRequests = activeRequests.filter(req => req.orderId === bookingId && req.isExpired);
        
        for (const request of expiredRequests) {
          this.webSocketManager.sendToUser(request.providerId, {
            type: 'job.expired',
            data: {
              jobRequestId: request.id,
              bookingId,
              reason: 'timeout',
              message: 'This job request has expired',
            }
          });
        }
      }

      console.log(`❌ BackgroundMatcher: Booking ${bookingId} marked as no providers found due to timeout`);

    } catch (error) {
      console.error(`❌ BackgroundMatcher: Error handling expired matching for booking ${booking.id}:`, error);
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