import { messaging, db } from './firebase';
import { aiService } from './ai';

interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

interface WhatsAppMessage {
  to: string;
  message: string;
  type: 'text' | 'template';
  templateName?: string;
  templateParams?: string[];
}

interface FCMTokenData {
  userId: string;
  token: string;
  deviceType: 'web' | 'android' | 'ios';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

class NotificationService {
  private whatsappApiUrl: string;
  private whatsappToken: string;

  constructor() {
    this.whatsappApiUrl = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v17.0';
    this.whatsappToken = process.env.WHATSAPP_ACCESS_TOKEN || '';
  }

  // FCM Token Management
  async saveFCMToken(userId: string, token: string, deviceType: string = 'web') {
    try {
      const tokenData: FCMTokenData = {
        userId,
        token,
        deviceType: deviceType as 'web' | 'android' | 'ios',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.collection('fcmTokens').doc(`${userId}_${deviceType}`).set(tokenData, { merge: true });
      
      console.log('FCM token saved successfully for user:', userId);
      return true;
    } catch (error) {
      console.error('Error saving FCM token:', error);
      throw new Error('Failed to save FCM token');
    }
  }

  async getUserFCMTokens(userId: string): Promise<string[]> {
    try {
      const tokensSnapshot = await db.collection('fcmTokens')
        .where('userId', '==', userId)
        .where('isActive', '==', true)
        .get();

      return tokensSnapshot.docs.map(doc => doc.data().token);
    } catch (error) {
      console.error('Error fetching FCM tokens:', error);
      return [];
    }
  }

  async removeFCMToken(userId: string, token: string) {
    try {
      const tokensSnapshot = await db.collection('fcmTokens')
        .where('userId', '==', userId)
        .where('token', '==', token)
        .get();

      const batch = db.batch();
      tokensSnapshot.docs.forEach(doc => {
        batch.update(doc.ref, { isActive: false, updatedAt: new Date() });
      });

      await batch.commit();
      console.log('FCM token removed for user:', userId);
    } catch (error) {
      console.error('Error removing FCM token:', error);
    }
  }

  // Push Notifications
  async sendPushNotification(userId: string, payload: NotificationPayload) {
    try {
      const tokens = await this.getUserFCMTokens(userId);
      
      if (tokens.length === 0) {
        console.log('No FCM tokens found for user:', userId);
        return { success: false, reason: 'No tokens found' };
      }

      const message = {
        notification: {
          title: payload.title,
          body: payload.body,
          ...(payload.imageUrl && { image: payload.imageUrl }),
        },
        data: {
          ...payload.data,
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
        },
        tokens,
        webpush: {
          fcm_options: {
            link: payload.data?.link || '/',
          },
          notification: {
            icon: '/icons/icon-192x192.png',
            badge: '/icons/badge-72x72.png',
            vibrate: [100, 50, 100],
            actions: [
              {
                action: 'view',
                title: 'View Details',
                icon: '/icons/view-icon.png',
              },
              {
                action: 'dismiss',
                title: 'Dismiss',
                icon: '/icons/dismiss-icon.png',
              },
            ],
          },
        },
      };

      const response = await messaging.sendMulticast(message);
      
      // Handle failed tokens
      if (response.failureCount > 0) {
        const failedTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            failedTokens.push(tokens[idx]);
            console.error('Failed to send to token:', tokens[idx], resp.error);
          }
        });

        // Remove invalid tokens
        await this.cleanupInvalidTokens(userId, failedTokens);
      }

      // Save notification to database
      await this.saveNotificationRecord(userId, payload, response.successCount > 0);

      return {
        success: response.successCount > 0,
        successCount: response.successCount,
        failureCount: response.failureCount,
      };
    } catch (error) {
      console.error('Error sending push notification:', error);
      throw new Error('Failed to send push notification');
    }
  }

  async sendBulkNotifications(userIds: string[], payload: NotificationPayload) {
    try {
      const results = await Promise.allSettled(
        userIds.map(userId => this.sendPushNotification(userId, payload))
      );

      const successful = results.filter(result => 
        result.status === 'fulfilled' && result.value.success
      ).length;

      console.log(`Bulk notification sent to ${successful}/${userIds.length} users`);
      return { successful, total: userIds.length };
    } catch (error) {
      console.error('Error sending bulk notifications:', error);
      throw new Error('Failed to send bulk notifications');
    }
  }

  // WhatsApp Business API Integration
  async sendWhatsAppMessage(message: WhatsAppMessage) {
    try {
      if (!this.whatsappToken) {
        console.warn('WhatsApp API token not configured');
        return { success: false, reason: 'WhatsApp not configured' };
      }

      const url = `${this.whatsappApiUrl}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
      
      let messageBody: any = {
        messaging_product: 'whatsapp',
        to: message.to,
      };

      if (message.type === 'text') {
        messageBody.type = 'text';
        messageBody.text = { body: message.message };
      } else if (message.type === 'template' && message.templateName) {
        messageBody.type = 'template';
        messageBody.template = {
          name: message.templateName,
          language: { code: 'en' },
          ...(message.templateParams && {
            components: [
              {
                type: 'body',
                parameters: message.templateParams.map(param => ({
                  type: 'text',
                  text: param,
                })),
              },
            ],
          }),
        };
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.whatsappToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messageBody),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('WhatsApp API error:', result);
        return { success: false, error: result };
      }

      console.log('WhatsApp message sent successfully:', result.messages[0].id);
      return { success: true, messageId: result.messages[0].id };
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      throw new Error('Failed to send WhatsApp message');
    }
  }

  // Notification Templates for Different Events
  async notifyOrderUpdate(userId: string, orderId: string, status: string, providerName?: string) {
    const statusMessages = {
      accepted: `Your order has been accepted${providerName ? ` by ${providerName}` : ''}`,
      in_progress: 'Your service is now in progress',
      completed: 'Your service has been completed successfully',
      cancelled: 'Your order has been cancelled',
    };

    const payload: NotificationPayload = {
      title: 'Order Update',
      body: statusMessages[status as keyof typeof statusMessages] || 'Your order status has been updated',
      data: {
        type: 'order_update',
        orderId,
        status,
        link: `/orders/${orderId}`,
      },
    };

    await this.sendPushNotification(userId, payload);

    // Also send WhatsApp notification for important updates
    if (['accepted', 'completed'].includes(status)) {
      const userDoc = await db.collection('users').doc(userId).get();
      const userData = userDoc.data();
      
      if (userData?.phone) {
        await this.sendWhatsAppMessage({
          to: userData.phone,
          message: `${payload.title}: ${payload.body}. Track your order: ${process.env.APP_URL}/orders/${orderId}`,
          type: 'text',
        });
      }
    }
  }

  async notifyProviderAssignment(providerId: string, orderId: string, customerName: string, serviceType: string) {
    const payload: NotificationPayload = {
      title: 'New Order Assignment',
      body: `New ${serviceType} order from ${customerName}`,
      data: {
        type: 'new_order',
        orderId,
        link: `/provider/orders/${orderId}`,
      },
    };

    await this.sendPushNotification(providerId, payload);

    // Send WhatsApp for immediate attention
    const providerDoc = await db.collection('users').doc(providerId).get();
    const providerData = providerDoc.data();
    
    if (providerData?.phone) {
      await this.sendWhatsAppMessage({
        to: providerData.phone,
        message: `New order alert! ${serviceType} service needed by ${customerName}. Reply ACCEPT to confirm or check the app for details.`,
        type: 'text',
      });
    }
  }

  async notifyProviders(orderData: any) {
    try {
      // Find nearby providers based on order category and location
      const providersSnapshot = await db.collection('serviceProviders')
        .where('categoryId', '==', orderData.categoryId)
        .where('isVerified', '==', true)
        .get();

      const notifications = providersSnapshot.docs.map(async (doc) => {
        const providerId = doc.data().userId;
        await this.notifyProviderAssignment(
          providerId,
          orderData.id,
          orderData.customerName,
          orderData.serviceType
        );
      });

      await Promise.all(notifications);
      console.log(`Notified ${providersSnapshot.size} providers for order ${orderData.id}`);
    } catch (error) {
      console.error('Error notifying providers:', error);
    }
  }

  async notifyPaymentUpdate(userId: string, orderId: string, status: 'success' | 'failed', amount: number) {
    const statusMessages = {
      success: `Payment of ₹${amount} completed successfully`,
      failed: `Payment of ₹${amount} failed. Please try again`,
    };

    const payload: NotificationPayload = {
      title: 'Payment Update',
      body: statusMessages[status],
      data: {
        type: 'payment_update',
        orderId,
        status,
        amount: amount.toString(),
        link: `/orders/${orderId}`,
      },
    };

    await this.sendPushNotification(userId, payload);
  }

  async notifyWalletUpdate(userId: string, type: 'credit' | 'debit', amount: number, description: string) {
    const payload: NotificationPayload = {
      title: 'Wallet Update',
      body: `₹${amount} ${type === 'credit' ? 'added to' : 'deducted from'} your wallet - ${description}`,
      data: {
        type: 'wallet_update',
        amount: amount.toString(),
        transactionType: type,
        link: '/wallet',
      },
    };

    await this.sendPushNotification(userId, payload);
  }

  async notifyEmergencyRequest(providerId: string, orderId: string, urgency: string) {
    const payload: NotificationPayload = {
      title: '🚨 EMERGENCY SERVICE REQUEST',
      body: `Urgent ${urgency} service needed! Higher payout available.`,
      data: {
        type: 'emergency_order',
        orderId,
        urgency,
        link: `/provider/orders/${orderId}`,
      },
    };

    // Send immediate notification
    await this.sendPushNotification(providerId, payload);

    // Send urgent WhatsApp message
    const providerDoc = await db.collection('users').doc(providerId).get();
    const providerData = providerDoc.data();
    
    if (providerData?.phone) {
      await this.sendWhatsAppMessage({
        to: providerData.phone,
        message: `🚨 EMERGENCY SERVICE REQUEST! Urgent assistance needed. 30% extra payout. Reply ACCEPT immediately or check app.`,
        type: 'text',
      });
    }
  }

  // Utility Methods
  private async cleanupInvalidTokens(userId: string, invalidTokens: string[]) {
    try {
      const batch = db.batch();
      
      for (const token of invalidTokens) {
        const tokensSnapshot = await db.collection('fcmTokens')
          .where('userId', '==', userId)
          .where('token', '==', token)
          .get();

        tokensSnapshot.docs.forEach(doc => {
          batch.update(doc.ref, { isActive: false, updatedAt: new Date() });
        });
      }

      await batch.commit();
      console.log(`Cleaned up ${invalidTokens.length} invalid tokens for user:`, userId);
    } catch (error) {
      console.error('Error cleaning up invalid tokens:', error);
    }
  }

  private async saveNotificationRecord(userId: string, payload: NotificationPayload, sent: boolean) {
    try {
      await db.collection('notifications').add({
        userId,
        title: payload.title,
        body: payload.body,
        data: payload.data || {},
        sent,
        isRead: false,
        createdAt: new Date(),
      });
    } catch (error) {
      console.error('Error saving notification record:', error);
    }
  }

  // AI-Enhanced Notifications
  async generatePersonalizedNotification(userId: string, type: string, context: any): Promise<NotificationPayload> {
    try {
      const userDoc = await db.collection('users').doc(userId).get();
      const userData = userDoc.data();

      const prompt = `
      Generate a personalized notification for a FixitQuick user:
      
      User Data: ${JSON.stringify(userData)}
      Notification Type: ${type}
      Context: ${JSON.stringify(context)}
      
      Create an engaging, helpful notification that:
      - Uses the user's preferred language/tone
      - References relevant context
      - Includes actionable information
      - Maintains professional yet friendly tone
      
      Return JSON: {"title": "...", "body": "..."}
      `;

      const response = await aiService.generateContent(prompt);
      const notification = JSON.parse(response);

      return {
        title: notification.title,
        body: notification.body,
        data: context,
      };
    } catch (error) {
      console.error('Error generating personalized notification:', error);
      // Fallback to generic notification
      return {
        title: 'FixitQuick Update',
        body: 'You have a new update from FixitQuick',
        data: context,
      };
    }
  }

  // Notification Preferences Management
  async updateNotificationPreferences(userId: string, preferences: {
    push: boolean;
    email: boolean;
    sms: boolean;
    whatsapp: boolean;
    orderUpdates: boolean;
    promotions: boolean;
    reminders: boolean;
  }) {
    try {
      await db.collection('notificationPreferences').doc(userId).set({
        ...preferences,
        updatedAt: new Date(),
      }, { merge: true });

      console.log('Notification preferences updated for user:', userId);
      return true;
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      throw new Error('Failed to update notification preferences');
    }
  }

  async getUserNotificationPreferences(userId: string) {
    try {
      const prefDoc = await db.collection('notificationPreferences').doc(userId).get();
      
      if (!prefDoc.exists) {
        // Return default preferences
        return {
          push: true,
          email: true,
          sms: false,
          whatsapp: true,
          orderUpdates: true,
          promotions: true,
          reminders: true,
        };
      }

      return prefDoc.data();
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
      return null;
    }
  }

  // Scheduled Notifications
  async scheduleNotification(userId: string, payload: NotificationPayload, scheduledAt: Date) {
    try {
      await db.collection('scheduledNotifications').add({
        userId,
        payload,
        scheduledAt,
        sent: false,
        createdAt: new Date(),
      });

      console.log('Notification scheduled for user:', userId, 'at:', scheduledAt);
    } catch (error) {
      console.error('Error scheduling notification:', error);
      throw new Error('Failed to schedule notification');
    }
  }

  // Process scheduled notifications (this would typically run as a cron job)
  async processScheduledNotifications() {
    try {
      const now = new Date();
      const scheduledSnapshot = await db.collection('scheduledNotifications')
        .where('scheduledAt', '<=', now)
        .where('sent', '==', false)
        .limit(100)
        .get();

      const batch = db.batch();
      const notifications = [];

      for (const doc of scheduledSnapshot.docs) {
        const data = doc.data();
        notifications.push(
          this.sendPushNotification(data.userId, data.payload)
        );
        
        batch.update(doc.ref, { sent: true, sentAt: now });
      }

      await Promise.all([...notifications, batch.commit()]);
      
      console.log(`Processed ${scheduledSnapshot.size} scheduled notifications`);
    } catch (error) {
      console.error('Error processing scheduled notifications:', error);
    }
  }
}

export const notificationService = new NotificationService();
