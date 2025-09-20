/**
 * COMPREHENSIVE ORDER LIFECYCLE STATE MACHINE TESTS
 * 
 * Tests for complete order lifecycle implementation with:
 * - State machine enforcement with transition validation
 * - Scheduling constraints validation during provider matching
 * - Cancellation/refund and receipt integration
 * - Production-ready validation and edge cases
 */

import request from 'supertest';
import { expect } from 'chai';

// Test configuration
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5000';
const API_BASE = `${BASE_URL}/api/v1`;

describe('Enhanced Order Lifecycle State Machine', function() {
  this.timeout(30000); // 30 second timeout for complex tests

  let testCustomer, testProvider, testService, testBooking;
  let authHeaders = {};

  before(async function() {
    console.log('🚀 Setting up order lifecycle test environment...');
    
    // Create test users and service
    testCustomer = await createTestUser('customer');
    testProvider = await createTestUser('provider');
    testService = await createTestService();
    
    authHeaders.customer = await getAuthHeader(testCustomer.id);
    authHeaders.provider = await getAuthHeader(testProvider.id);
    
    console.log('✅ Test environment setup complete');
  });

  describe('1. State Machine Enforcement', function() {
    
    it('should enforce valid state transitions', async function() {
      // Create booking in pending state
      testBooking = await createTestBooking();
      
      // Valid transition: pending → requested
      let response = await request(BASE_URL)
        .patch(`/api/v1/orders/${testBooking.id}/status`)
        .set('Authorization', authHeaders.customer)
        .send({ newStatus: 'requested' })
        .expect(200);
        
      expect(response.body.success).to.be.true;
      expect(response.body.booking.status).to.equal('requested');
      
      // Valid transition: requested → matching
      response = await request(BASE_URL)
        .patch(`/api/v1/orders/${testBooking.id}/status`)
        .set('Authorization', authHeaders.customer) 
        .send({ newStatus: 'matching' })
        .expect(200);
        
      expect(response.body.booking.status).to.equal('matching');
    });

    it('should reject invalid state transitions', async function() {
      // Invalid transition: matching → completed (skipping intermediate states)
      const response = await request(BASE_URL)
        .patch(`/api/v1/orders/${testBooking.id}/status`)
        .set('Authorization', authHeaders.customer)
        .send({ newStatus: 'completed' })
        .expect(400);
        
      expect(response.body.success).to.be.false;
      expect(response.body.error).to.include('Invalid status transition');
    });

    it('should enforce role-based authorization for transitions', async function() {
      // Only providers can accept jobs
      const response = await request(BASE_URL)
        .patch(`/api/v1/orders/${testBooking.id}/status`)
        .set('Authorization', authHeaders.customer)
        .send({ newStatus: 'accepted' })
        .expect(403);
        
      expect(response.body.success).to.be.false;
      expect(response.body.error).to.include('Only assigned provider can accept');
    });

    it('should enforce TTL for time-sensitive transitions', async function() {
      // Create expired booking
      const expiredBooking = await createTestBooking({
        matchingExpiresAt: new Date(Date.now() - 60000) // 1 minute ago
      });
      
      const response = await request(BASE_URL)
        .patch(`/api/v1/orders/${expiredBooking.id}/status`)
        .set('Authorization', authHeaders.provider)
        .send({ newStatus: 'matched' })
        .expect(400);
        
      expect(response.body.error).to.include('Matching period has expired');
    });
  });

  describe('2. Scheduling Constraints Validation', function() {
    
    it('should enforce deterministic provider ordering', async function() {
      // Create multiple providers at different distances/ratings
      const providers = await createTestProviders([
        { distance: 5, rating: 4.5, lastAcceptTime: '2024-01-01' },
        { distance: 3, rating: 4.0, lastAcceptTime: '2024-01-02' },  
        { distance: 5, rating: 4.8, lastAcceptTime: '2024-01-03' },
        { distance: 3, rating: 4.0, lastAcceptTime: '2024-01-01' }
      ]);
      
      const response = await request(BASE_URL)
        .post('/api/v1/orders/find-providers')
        .set('Authorization', authHeaders.customer)
        .send({
          serviceId: testService.id,
          location: { latitude: 12.9716, longitude: 77.5946 },
          maxDistance: 10
        })
        .expect(200);
        
      const orderedProviders = response.body.providers;
      
      // Verify deterministic ordering: distance → rating → lastAcceptTime
      expect(orderedProviders[0].distanceKm).to.be.lessThan(orderedProviders[2].distanceKm);
      expect(orderedProviders[1].rating).to.be.greaterThan(orderedProviders[3].rating);
    });

    it('should validate service scheduling rules', async function() {
      // Create service with specific time windows
      const restrictedService = await createTestService({
        schedulingRules: [{
          dayOfWeek: 1, // Monday
          timeSlots: [{ start: '09:00', end: '17:00', maxBookings: 5 }]
        }]
      });
      
      // Try booking on Sunday (should fail)
      const sundayDate = getNextSunday();
      const response = await request(BASE_URL)
        .post('/api/v1/orders')
        .set('Authorization', authHeaders.customer)
        .send({
          serviceId: restrictedService.id,
          scheduledAt: sundayDate.toISOString()
        })
        .expect(400);
        
      expect(response.body.error).to.include('outside service availability hours');
    });

    it('should validate provider availability constraints', async function() {
      // Mark provider as unavailable
      await markProviderUnavailable(testProvider.id, new Date());
      
      const response = await request(BASE_URL)
        .post('/api/v1/orders/find-providers')
        .set('Authorization', authHeaders.customer)
        .send({
          serviceId: testService.id,
          providerId: testProvider.id,
          scheduledAt: new Date().toISOString()
        })
        .expect(400);
        
      expect(response.body.error).to.include('Provider is not available');
    });

    it('should validate booking time constraints', async function() {
      // Try booking in the past
      const pastDate = new Date(Date.now() - 86400000); // 1 day ago
      const response = await request(BASE_URL)
        .post('/api/v1/orders')
        .set('Authorization', authHeaders.customer)
        .send({
          serviceId: testService.id,
          scheduledAt: pastDate.toISOString()
        })
        .expect(400);
        
      expect(response.body.error).to.include('advance booking');
    });
  });

  describe('3. Cancellation/Refund Integration', function() {
    
    it('should process full refund for early cancellation', async function() {
      const booking = await createTestBooking({
        status: 'matched',
        totalAmount: 100,
        scheduledAt: new Date(Date.now() + 86400000 * 2) // 2 days from now
      });
      
      const response = await request(BASE_URL)
        .post(`/api/v1/orders/${booking.id}/cancel`)
        .set('Authorization', authHeaders.customer)
        .send({
          cancellationReason: 'customer_request',
          cancellationNotes: 'Change of plans'
        })
        .expect(200);
        
      expect(response.body.success).to.be.true;
      expect(response.body.refundAmount).to.equal(100);
      expect(response.body.refundId).to.exist;
    });

    it('should apply cancellation fees for late cancellation', async function() {
      const booking = await createTestBooking({
        status: 'accepted',
        totalAmount: 100,
        scheduledAt: new Date(Date.now() + 3600000) // 1 hour from now
      });
      
      const response = await request(BASE_URL)
        .post(`/api/v1/orders/${booking.id}/cancel`)
        .set('Authorization', authHeaders.customer)
        .send({
          cancellationReason: 'customer_request'
        })
        .expect(200);
        
      expect(response.body.refundAmount).to.equal(80); // 20% cancellation fee
      expect(response.body.cancellationFee).to.equal(20);
    });

    it('should prevent refund for work in progress', async function() {
      const booking = await createTestBooking({
        status: 'in_progress',
        totalAmount: 100
      });
      
      const response = await request(BASE_URL)
        .post(`/api/v1/orders/${booking.id}/cancel`)
        .set('Authorization', authHeaders.customer)
        .send({
          cancellationReason: 'customer_request'
        })
        .expect(400);
        
      expect(response.body.error).to.include('cannot be cancelled');
    });

    it('should ensure refund idempotency', async function() {
      const booking = await createTestBooking({
        status: 'matched',
        totalAmount: 100
      });
      
      const idempotencyKey = `cancel_${Date.now()}`;
      
      // First cancellation request
      const response1 = await request(BASE_URL)
        .post(`/api/v1/orders/${booking.id}/cancel`)
        .set('Authorization', authHeaders.customer)
        .set('Idempotency-Key', idempotencyKey)
        .send({
          cancellationReason: 'customer_request'
        })
        .expect(200);
        
      // Duplicate cancellation request with same idempotency key
      const response2 = await request(BASE_URL)
        .post(`/api/v1/orders/${booking.id}/cancel`)
        .set('Authorization', authHeaders.customer)
        .set('Idempotency-Key', idempotencyKey)
        .send({
          cancellationReason: 'customer_request'
        })
        .expect(200);
        
      // Should return same refund ID
      expect(response1.body.refundId).to.equal(response2.body.refundId);
    });
  });

  describe('4. Receipt Integration', function() {
    
    it('should generate completion receipt', async function() {
      const booking = await createTestBooking({
        status: 'completed',
        totalAmount: 150,
        customerRating: 5,
        customerReview: 'Excellent service'
      });
      
      const response = await request(BASE_URL)
        .post(`/api/v1/orders/${booking.id}/receipt`)
        .set('Authorization', authHeaders.customer)
        .expect(200);
        
      expect(response.body.success).to.be.true;
      expect(response.body.receiptId).to.exist;
      expect(response.body.receipt.paymentDetails.totalAmount).to.equal(150);
    });

    it('should integrate receipt with order documents', async function() {
      const booking = await createTestBooking({ status: 'completed' });
      
      await request(BASE_URL)
        .post(`/api/v1/orders/${booking.id}/receipt`)
        .set('Authorization', authHeaders.customer)
        .expect(200);
        
      const documentsResponse = await request(BASE_URL)
        .get(`/api/v1/orders/${booking.id}/documents`)
        .set('Authorization', authHeaders.customer)
        .expect(200);
        
      const receipt = documentsResponse.body.documents.find(
        doc => doc.documentType === 'completion_receipt'
      );
      expect(receipt).to.exist;
    });
  });

  describe('5. End-to-End Lifecycle Validation', function() {
    
    it('should complete full happy path lifecycle', async function() {
      console.log('🎯 Testing complete order lifecycle...');
      
      // 1. Create order
      const booking = await createTestBooking({ status: 'pending' });
      
      // 2. Request service
      await updateBookingStatus(booking.id, 'requested', authHeaders.customer);
      
      // 3. Start matching
      await updateBookingStatus(booking.id, 'matching', authHeaders.customer);
      
      // 4. Provider matched
      await updateBookingStatus(booking.id, 'matched', authHeaders.customer);
      
      // 5. Provider accepts
      await updateBookingStatus(booking.id, 'accepted', authHeaders.provider);
      
      // 6. Provider en route
      await updateBookingStatus(booking.id, 'enroute', authHeaders.provider);
      
      // 7. Provider arrives
      await updateBookingStatus(booking.id, 'arrived', authHeaders.provider);
      
      // 8. Work starts
      await updateBookingStatus(booking.id, 'started', authHeaders.provider);
      
      // 9. Work in progress
      await updateBookingStatus(booking.id, 'in_progress', authHeaders.provider);
      
      // 10. Work completed
      await updateBookingStatus(booking.id, 'work_completed', authHeaders.provider);
      
      // 11. Order completed
      const finalResponse = await updateBookingStatus(booking.id, 'completed', authHeaders.customer);
      
      expect(finalResponse.body.booking.status).to.equal('completed');
      console.log('✅ Complete lifecycle validation passed');
    });

    it('should handle invalid transition attempts', async function() {
      const testCases = [
        { from: 'pending', to: 'completed', shouldFail: true },
        { from: 'matching', to: 'work_completed', shouldFail: true },
        { from: 'accepted', to: 'in_progress', shouldFail: true }, // missing intermediate states
        { from: 'enroute', to: 'arrived', shouldFail: false }, // valid transition
      ];
      
      for (const testCase of testCases) {
        const booking = await createTestBooking({ status: testCase.from });
        
        const response = await request(BASE_URL)
          .patch(`/api/v1/orders/${booking.id}/status`)
          .set('Authorization', authHeaders.provider)
          .send({ newStatus: testCase.to });
          
        if (testCase.shouldFail) {
          expect(response.status).to.be.oneOf([400, 403]);
        } else {
          expect(response.status).to.equal(200);
        }
      }
    });
  });

  // Helper functions
  async function createTestUser(role) {
    const response = await request(BASE_URL)
      .post('/api/v1/auth/register')
      .send({
        email: `test-${role}-${Date.now()}@example.com`,
        password: 'password123',
        name: `Test ${role}`,
        role: role
      });
    return response.body.user;
  }

  async function createTestService(options = {}) {
    const response = await request(BASE_URL)
      .post('/api/v1/services')
      .set('Authorization', authHeaders.provider)
      .send({
        name: 'Test Service',
        categoryId: 'cat_electrical',
        basePrice: 100,
        description: 'Test service for lifecycle testing',
        ...options
      });
    return response.body.service;
  }

  async function createTestBooking(options = {}) {
    const response = await request(BASE_URL)
      .post('/api/v1/orders')
      .set('Authorization', authHeaders.customer)
      .send({
        serviceId: testService.id,
        description: 'Test booking for lifecycle',
        serviceLocation: {
          latitude: 12.9716,
          longitude: 77.5946,
          address: 'Test Address'
        },
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        bookingType: 'instant',
        urgency: 'normal',
        ...options
      });
    return response.body.booking;
  }

  async function updateBookingStatus(bookingId, newStatus, authHeader) {
    return await request(BASE_URL)
      .patch(`/api/v1/orders/${bookingId}/status`)
      .set('Authorization', authHeader)
      .send({ newStatus })
      .expect(200);
  }

  async function getAuthHeader(userId) {
    const response = await request(BASE_URL)
      .post('/api/v1/auth/login')
      .send({
        email: `user-${userId}@example.com`,
        password: 'password123'
      });
    return `Bearer ${response.body.token}`;
  }

  function getNextSunday() {
    const date = new Date();
    const day = date.getDay();
    const diff = date.getDate() - day;
    return new Date(date.setDate(diff));
  }

  after(async function() {
    console.log('🧹 Cleaning up test environment...');
    // Cleanup test data
  });
});