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
          this.webSocketManager.emitToUser(booking.userId, 'order.radius_expanded', {
            bookingId: booking.id,
            newRadius: expansionResult.newRadius,
            searchWave: expansionResult.newWave,
            message: expansionResult.message,
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

          // Emit WebSocket event for job offer
          if (this.webSocketManager) {
            this.webSocketManager.emitToUser(provider.userId, 'job.offer_sent', {
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
            });

            // Also emit to customer about offers sent
            this.webSocketManager.emitToUser(booking.userId, 'order.offers_sent', {
              bookingId: booking.id,
              providersCount: matchingProviders.length,
              currentRadius,
              searchWave: booking.searchWave || 1,
            });
          }

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
        this.webSocketManager.emitToUser(booking.userId, 'order.matching_started', {
          bookingId: booking.id,
          searchRadius: initialRadius,
          searchWave: 1,
          timeLimit: 300, // 5 minutes in seconds
        });
      }

      // Start provider matching
      await this.continueProviderMatching(booking, initialRadius);

    } catch (error) {
      console.error(`❌ BackgroundMatcher: Error in startInitialMatching for booking ${booking.id}:`, error);
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

      // Emit WebSocket events for expiry
      if (this.webSocketManager) {
        // Notify customer that matching has expired
        this.webSocketManager.emitToUser(userId, 'order.matching_expired', {
          bookingId,
          status: 'no_providers_found',
          message: 'No providers were found within the time limit. Please try again or contact support.',
          nextSteps: [
            'Try again with a different time',
            'Contact customer support',
            'Consider scheduling for later'
          ],
        });

        // Emit expired events to any providers with pending offers
        const activeRequests = await storage.getActiveJobRequestsWithTTL();
        const expiredRequests = activeRequests.filter(req => req.orderId === bookingId && req.isExpired);
        
        for (const request of expiredRequests) {
          this.webSocketManager.emitToUser(request.providerId, 'job.expired', {
            jobRequestId: request.id,
            bookingId,
            reason: 'timeout',
            message: 'This job request has expired',
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