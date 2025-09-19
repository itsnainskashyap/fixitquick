import { eq, and, desc, asc, count, gte, lte, sql, type SQL } from "drizzle-orm";
import { db } from "./db";
import {
  type LaundryOrder,
  type CreateLaundryOrderInput,
  type LaundryStatusHistory,
  type CreateLaundryStatusHistoryInput,
  type EnhancedProviderNotification,
  type CreateEnhancedProviderNotificationInput,
  insertLaundryOrderSchema,
  laundryOrders,
  laundryStatusHistory,
  enhancedProviderNotifications,
} from "../shared/schema";

// Status transition validation - defines allowed status changes
const ALLOWED_STATUS_TRANSITIONS: Record<string, string[]> = {
  'pending': ['pickup_scheduled', 'cancelled'],
  'pickup_scheduled': ['pickup_confirmed', 'picked_up', 'cancelled'],
  'pickup_confirmed': ['picked_up', 'cancelled'],
  'picked_up': ['processing', 'cancelled'],
  'processing': ['washing', 'cancelled'],
  'washing': ['drying'],
  'drying': ['ironing', 'quality_check'],
  'ironing': ['quality_check'],
  'quality_check': ['ready_for_delivery', 'processing'], // Can go back for re-work
  'ready_for_delivery': ['out_for_delivery'],
  'out_for_delivery': ['delivered', 'ready_for_delivery'], // Can go back if delivery failed
  'delivered': ['completed'],
  'completed': [], // Final state
  'cancelled': [], // Final state
  'refunded': [] // Final state
};

/**
 * Validates if a status transition is allowed
 */
function isValidStatusTransition(fromStatus: string, toStatus: string): boolean {
  const allowedTransitions = ALLOWED_STATUS_TRANSITIONS[fromStatus] || [];
  return allowedTransitions.includes(toStatus);
}

/**
 * Helper function to build where conditions for queries
 */
function whereAll(...conditions: (SQL<boolean> | undefined)[]): SQL<boolean> | undefined {
  const validConditions = conditions.filter(Boolean) as SQL<boolean>[];
  if (validConditions.length === 0) return undefined;
  if (validConditions.length === 1) return validConditions[0];
  return and(...validConditions);
}

/**
 * Laundry Storage Module - Focused persistence layer for laundry operations
 * Implements transactional operations with status transition validation
 */
export class LaundryStorage {
  
  /**
   * Creates a new laundry order with validation and initial status history
   */
  async createOrder(data: CreateLaundryOrderInput): Promise<LaundryOrder> {
    console.log('🧺 LaundryStorage.createOrder: Creating order:', data);
    
    return await db.transaction(async (tx) => {
      // Validate input with Zod schema
      const validatedData = insertLaundryOrderSchema.parse(data);
      
      // Create the order with initial status
      const orderResult = await tx.insert(laundryOrders)
        .values({
          ...validatedData,
          status: validatedData.status || 'pending'
        })
        .returning();
      
      const newOrder = orderResult[0];
      
      // Add initial status history for audit trail
      await tx.insert(laundryStatusHistory)
        .values({
          orderId: newOrder.id,
          fromStatus: null,
          toStatus: newOrder.status,
          changedBy: validatedData.userId,
          notes: 'Order created',
          timestamp: new Date()
        });
      
      console.log(`✅ LaundryStorage.createOrder: Created order ${newOrder.id}`);
      return newOrder;
    });
  }

  /**
   * Retrieves a single laundry order by ID
   */
  async getOrder(id: string): Promise<LaundryOrder | undefined> {
    console.log(`🧺 LaundryStorage.getOrder: Fetching order ${id}`);
    
    const result = await db.select()
      .from(laundryOrders)
      .where(eq(laundryOrders.id, id))
      .limit(1);
    
    return result.length > 0 ? result[0] : undefined;
  }

  /**
   * Lists laundry orders with filtering options
   */
  async listOrders(filters?: {
    userId?: string;
    providerId?: string;
    status?: string;
    dateFrom?: Date;
    dateTo?: Date;
    serviceType?: string;
    priority?: string;
    limit?: number;
  }): Promise<LaundryOrder[]> {
    console.log('🧺 LaundryStorage.listOrders: Listing orders with filters:', filters);
    
    let query = db.select().from(laundryOrders);
    const conditions: (SQL<boolean> | undefined)[] = [];
    
    // Apply filters
    if (filters?.userId) conditions.push(eq(laundryOrders.userId, filters.userId));
    if (filters?.providerId) conditions.push(eq(laundryOrders.providerId, filters.providerId));
    if (filters?.status) conditions.push(eq(laundryOrders.status, filters.status));
    if (filters?.serviceType) conditions.push(eq(laundryOrders.serviceType, filters.serviceType));
    if (filters?.priority) conditions.push(eq(laundryOrders.priority, filters.priority));
    if (filters?.dateFrom) conditions.push(gte(laundryOrders.createdAt, filters.dateFrom));
    if (filters?.dateTo) conditions.push(lte(laundryOrders.createdAt, filters.dateTo));
    
    const whereCondition = whereAll(...conditions);
    if (whereCondition) query = query.where(whereCondition);
    
    // Order by creation date descending
    query = query.orderBy(desc(laundryOrders.createdAt));
    
    // Apply limit if specified
    if (filters?.limit) query = query.limit(filters.limit);
    
    const result = await query;
    console.log(`✅ LaundryStorage.listOrders: Found ${result.length} orders`);
    return result;
  }

  /**
   * Assigns a provider to a laundry order with concurrency control
   */
  async assignProvider(orderId: string, providerId: string): Promise<LaundryOrder | undefined> {
    console.log(`🧺 LaundryStorage.assignProvider: Assigning provider ${providerId} to order ${orderId}`);
    
    return await db.transaction(async (tx) => {
      // Lock the order for update to prevent double assignment
      const currentOrder = await tx.select()
        .from(laundryOrders)
        .where(eq(laundryOrders.id, orderId))
        .for('update')
        .limit(1);
      
      if (currentOrder.length === 0) {
        console.log(`❌ LaundryStorage.assignProvider: Order ${orderId} not found`);
        return undefined;
      }
      
      const order = currentOrder[0];
      
      // Prevent double assignment
      if (order.providerId) {
        console.log(`❌ LaundryStorage.assignProvider: Order ${orderId} already assigned to ${order.providerId}`);
        return undefined;
      }
      
      // Validate status transition to pickup_scheduled if changing status
      const newStatus = 'pickup_scheduled';
      let updateData: any = {
        providerId,
        updatedAt: new Date()
      };
      
      // Only change status if valid transition and not already in target status
      if (order.status !== newStatus) {
        if (!isValidStatusTransition(order.status, newStatus)) {
          console.log(`❌ LaundryStorage.assignProvider: Invalid transition from ${order.status} to ${newStatus}`);
          throw new Error(`Cannot assign provider: Invalid status transition from ${order.status} to ${newStatus}`);
        }
        updateData.status = newStatus;
      }
      
      // Update order with provider assignment
      const updateResult = await tx.update(laundryOrders)
        .set(updateData)
        .where(eq(laundryOrders.id, orderId))
        .returning();
      
      const updatedOrder = updateResult[0];
      
      // Add status history (only if status changed)
      if (order.status !== newStatus && updateData.status) {
        await this.addStatusHistoryInTransaction(tx, {
          orderId,
          fromStatus: order.status,
          toStatus: newStatus,
          changedBy: providerId,
          notes: `Provider assigned: ${providerId} - Status changed to ${newStatus}`
        });
      } else {
        // Add history for provider assignment without status change
        await this.addStatusHistoryInTransaction(tx, {
          orderId,
          fromStatus: order.status,
          toStatus: order.status, // Same status
          changedBy: providerId,
          notes: `Provider assigned: ${providerId}`
        });
      }
      
      // Create provider notification
      await tx.insert(enhancedProviderNotifications)
        .values({
          providerId,
          type: 'new_order',
          title: 'New Laundry Order Assigned',
          message: `You have been assigned laundry order #${orderId}`,
          data: {
            orderId,
            amount: parseFloat(updatedOrder.totalAmount),
            actionRequired: true
          },
          requiresPhoneCall: true,
          isUrgent: updatedOrder.priority === 'urgent'
        });
      
      console.log(`✅ LaundryStorage.assignProvider: Assigned provider ${providerId} to order ${orderId}`);
      return updatedOrder;
    });
  }

  /**
   * Schedules pickup for a laundry order with proper validation and locking
   */
  async schedulePickup(orderId: string, pickupDate: Date, pickupTime: string): Promise<LaundryOrder | undefined> {
    console.log(`🧺 LaundryStorage.schedulePickup: Scheduling pickup for order ${orderId}`);
    
    return await db.transaction(async (tx) => {
      // Lock the order and read current status
      const currentOrder = await tx.select()
        .from(laundryOrders)
        .where(eq(laundryOrders.id, orderId))
        .for('update')
        .limit(1);
      
      if (currentOrder.length === 0) {
        console.log(`❌ LaundryStorage.schedulePickup: Order ${orderId} not found`);
        return undefined;
      }
      
      const order = currentOrder[0];
      const newStatus = 'pickup_scheduled';
      
      let updateData: any = {
        preferredPickupDate: pickupDate,
        preferredPickupTime: pickupTime,
        updatedAt: new Date()
      };
      
      // Make schedulePickup idempotent - handle case where status is already pickup_scheduled
      if (order.status === newStatus) {
        // Already in pickup_scheduled state - just update pickup details without status change
        console.log(`🧺 LaundryStorage.schedulePickup: Order ${orderId} already pickup_scheduled, updating pickup details`);
      } else {
        // Validate status transition for non-idempotent case
        if (!isValidStatusTransition(order.status, newStatus)) {
          console.log(`❌ LaundryStorage.schedulePickup: Invalid transition from ${order.status} to ${newStatus}`);
          throw new Error(`Invalid status transition from ${order.status} to ${newStatus}`);
        }
        updateData.status = newStatus;
      }
      
      // Update order with pickup schedule
      const result = await tx.update(laundryOrders)
        .set(updateData)
        .where(eq(laundryOrders.id, orderId))
        .returning();
      
      if (result.length === 0) return undefined;
      
      // Add status history based on whether status changed
      if (order.status === newStatus) {
        // Idempotent case - add note without status change
        await this.addStatusHistoryInTransaction(tx, {
          orderId,
          fromStatus: order.status,
          toStatus: order.status, // Same status
          notes: `Pickup rescheduled for ${pickupDate.toDateString()} at ${pickupTime}`
        });
      } else {
        // Status transition case
        await this.addStatusHistoryInTransaction(tx, {
          orderId,
          fromStatus: order.status,
          toStatus: newStatus,
          notes: `Pickup scheduled for ${pickupDate.toDateString()} at ${pickupTime}`
        });
      }
      
      console.log(`✅ LaundryStorage.schedulePickup: Scheduled pickup for order ${orderId}`);
      return result[0];
    });
  }

  /**
   * Confirms pickup with actual timing and weight, with proper validation and locking
   */
  async confirmPickup(orderId: string, actualPickupTime: Date, weight?: number): Promise<LaundryOrder | undefined> {
    console.log(`🧺 LaundryStorage.confirmPickup: Confirming pickup for order ${orderId}`);
    
    return await db.transaction(async (tx) => {
      // Lock the order and read current status
      const currentOrder = await tx.select()
        .from(laundryOrders)
        .where(eq(laundryOrders.id, orderId))
        .for('update')
        .limit(1);
      
      if (currentOrder.length === 0) {
        console.log(`❌ LaundryStorage.confirmPickup: Order ${orderId} not found`);
        return undefined;
      }
      
      const order = currentOrder[0];
      const newStatus = 'picked_up';
      
      // Validate status transition
      if (!isValidStatusTransition(order.status, newStatus)) {
        console.log(`❌ LaundryStorage.confirmPickup: Invalid transition from ${order.status} to ${newStatus}`);
        throw new Error(`Invalid status transition from ${order.status} to ${newStatus}`);
      }
      
      const updateData: any = {
        actualPickupTime,
        status: newStatus,
        updatedAt: new Date()
      };
      
      if (weight !== undefined) {
        updateData.totalWeight = weight.toString();
      }
      
      const result = await tx.update(laundryOrders)
        .set(updateData)
        .where(eq(laundryOrders.id, orderId))
        .returning();
      
      if (result.length === 0) return undefined;
      
      // Add status history with actual current status
      await this.addStatusHistoryInTransaction(tx, {
        orderId,
        fromStatus: order.status, // Use actual current status
        toStatus: newStatus,
        notes: weight ? `Items picked up - Weight: ${weight}kg` : 'Items picked up'
      });
      
      console.log(`✅ LaundryStorage.confirmPickup: Confirmed pickup for order ${orderId}`);
      return result[0];
    });
  }

  /**
   * Updates order status with validation and history tracking
   */
  async updateStatus(orderId: string, newStatus: string, changedBy?: string, notes?: string): Promise<LaundryOrder | undefined> {
    console.log(`🧺 LaundryStorage.updateStatus: Updating order ${orderId} status to ${newStatus}`);
    
    return await db.transaction(async (tx) => {
      // Get current order
      const currentOrder = await tx.select()
        .from(laundryOrders)
        .where(eq(laundryOrders.id, orderId))
        .for('update')
        .limit(1);
      
      if (currentOrder.length === 0) {
        console.log(`❌ LaundryStorage.updateStatus: Order ${orderId} not found`);
        return undefined;
      }
      
      const order = currentOrder[0];
      
      // Validate status transition
      if (!isValidStatusTransition(order.status, newStatus)) {
        console.log(`❌ LaundryStorage.updateStatus: Invalid transition from ${order.status} to ${newStatus}`);
        throw new Error(`Invalid status transition from ${order.status} to ${newStatus}`);
      }
      
      // Update order status
      const result = await tx.update(laundryOrders)
        .set({
          status: newStatus,
          updatedAt: new Date()
        })
        .where(eq(laundryOrders.id, orderId))
        .returning();
      
      // Add status history
      await this.addStatusHistoryInTransaction(tx, {
        orderId,
        fromStatus: order.status,
        toStatus: newStatus,
        changedBy,
        notes: notes || `Status updated to ${newStatus}`
      });
      
      console.log(`✅ LaundryStorage.updateStatus: Updated order ${orderId} status to ${newStatus}`);
      return result[0];
    });
  }

  /**
   * Completes dropoff with delivery confirmation
   */
  async completeDropoff(orderId: string, actualDeliveryTime: Date, photos?: string[]): Promise<LaundryOrder | undefined> {
    console.log(`🧺 LaundryStorage.completeDropoff: Completing dropoff for order ${orderId}`);
    
    return await db.transaction(async (tx) => {
      const updateData: any = {
        actualDeliveryTime,
        status: 'delivered',
        updatedAt: new Date()
      };
      
      if (photos) {
        updateData.afterPhotos = photos;
      }
      
      const result = await tx.update(laundryOrders)
        .set(updateData)
        .where(eq(laundryOrders.id, orderId))
        .returning();
      
      if (result.length === 0) return undefined;
      
      // Add status history
      await this.addStatusHistoryInTransaction(tx, {
        orderId,
        fromStatus: 'out_for_delivery',
        toStatus: 'delivered',
        notes: 'Items delivered successfully'
      });
      
      return result[0];
    });
  }

  /**
   * Adds status history entry (public method)
   */
  async addStatusHistory(data: {
    orderId: string;
    fromStatus: string | null;
    toStatus: string;
    changedBy?: string;
    notes?: string;
    location?: { latitude: number; longitude: number; address?: string };
  }): Promise<LaundryStatusHistory> {
    const result = await db.insert(laundryStatusHistory)
      .values({
        ...data,
        timestamp: new Date()
      })
      .returning();
    
    return result[0];
  }

  /**
   * Internal method to add status history within a transaction
   */
  private async addStatusHistoryInTransaction(tx: any, data: {
    orderId: string;
    fromStatus: string | null;
    toStatus: string;
    changedBy?: string;
    notes?: string;
    location?: { latitude: number; longitude: number; address?: string };
  }): Promise<LaundryStatusHistory> {
    const result = await tx.insert(laundryStatusHistory)
      .values({
        ...data,
        timestamp: new Date()
      })
      .returning();
    
    return result[0];
  }

  /**
   * Gets status history for an order
   */
  async getStatusHistory(orderId: string): Promise<LaundryStatusHistory[]> {
    const result = await db.select()
      .from(laundryStatusHistory)
      .where(eq(laundryStatusHistory.orderId, orderId))
      .orderBy(asc(laundryStatusHistory.timestamp));
    
    return result;
  }

  /**
   * Creates enhanced provider notification
   */
  async createNotification(data: CreateEnhancedProviderNotificationInput): Promise<EnhancedProviderNotification> {
    const result = await db.insert(enhancedProviderNotifications)
      .values(data)
      .returning();
    
    return result[0];
  }

  /**
   * Gets provider notifications with filtering
   */
  async getProviderNotifications(providerId: string, options?: {
    unreadOnly?: boolean;
    limit?: number;
    type?: string;
  }): Promise<EnhancedProviderNotification[]> {
    let query = db.select()
      .from(enhancedProviderNotifications)
      .where(eq(enhancedProviderNotifications.providerId, providerId));
    
    if (options?.unreadOnly) {
      query = query.where(eq(enhancedProviderNotifications.isRead, false));
    }
    
    if (options?.type) {
      query = query.where(eq(enhancedProviderNotifications.type, options.type));
    }
    
    query = query.orderBy(desc(enhancedProviderNotifications.createdAt));
    
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    
    return await query;
  }

  /**
   * Marks notification as read
   */
  async markNotificationAsRead(id: string): Promise<EnhancedProviderNotification | undefined> {
    const result = await db.update(enhancedProviderNotifications)
      .set({
        isRead: true,
        readAt: new Date()
      })
      .where(eq(enhancedProviderNotifications.id, id))
      .returning();
    
    return result.length > 0 ? result[0] : undefined;
  }

  /**
   * Counts unread notifications for a provider
   */
  async countUnreadNotifications(providerId: string): Promise<number> {
    const result = await db.select({ count: count() })
      .from(enhancedProviderNotifications)
      .where(
        and(
          eq(enhancedProviderNotifications.providerId, providerId),
          eq(enhancedProviderNotifications.isRead, false)
        )
      );
    
    return result[0]?.count || 0;
  }

  /**
   * Deletes a notification
   */
  async deleteNotification(id: string): Promise<{ success: boolean }> {
    const result = await db.delete(enhancedProviderNotifications)
      .where(eq(enhancedProviderNotifications.id, id))
      .returning();
    
    return { success: result.length > 0 };
  }
}

// Export singleton instance
export const laundryStorage = new LaundryStorage();