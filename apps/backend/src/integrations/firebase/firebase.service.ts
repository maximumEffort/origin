import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

export interface PushNotification {
  token: string;          // FCM device token (stored per customer)
  title: string;
  body: string;
  data?: Record<string, string>;  // Custom payload (e.g. { screen: 'portal' })
  imageUrl?: string;
}

export interface TopicNotification {
  topic: string;          // e.g. 'fleet-managers', 'all-customers'
  title: string;
  body: string;
  data?: Record<string, string>;
}

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);

  constructor(private config: ConfigService) {}

  onModuleInit() {
    if (admin.apps.length === 0) {
      const serviceAccount = this.config.get<string>('FIREBASE_SERVICE_ACCOUNT_JSON', '');

      if (!serviceAccount) {
        this.logger.warn('Firebase: FIREBASE_SERVICE_ACCOUNT_JSON not set — push notifications disabled');
        return;
      }

      try {
        admin.initializeApp({
          credential: admin.credential.cert(JSON.parse(serviceAccount)),
        });
        this.logger.log('Firebase Admin SDK initialised');
      } catch (err: any) {
        this.logger.error(`Firebase init failed: ${err.message}`);
      }
    }
  }

  /**
   * Send a push notification to a single device.
   * token is the FCM registration token stored when the user logs into the app.
   */
  async sendToDevice(notification: PushNotification): Promise<void> {
    if (!this.isInitialised()) return;

    const message: admin.messaging.Message = {
      token: notification.token,
      notification: {
        title: notification.title,
        body: notification.body,
        imageUrl: notification.imageUrl,
      },
      data: notification.data ?? {},
      android: {
        priority: 'high',
        notification: { sound: 'default' },
      },
      apns: {
        payload: { aps: { sound: 'default', badge: 1 } },
      },
    };

    try {
      const response = await admin.messaging().send(message);
      this.logger.log(`Push sent: ${response}`);
    } catch (err: any) {
      // Token may be stale — log but don't throw
      this.logger.error(`Push failed for token ${notification.token.slice(0, 20)}...: ${err.message}`);
    }
  }

  /**
   * Send a push notification to multiple devices.
   * Tokens are split into batches of 500 (FCM limit).
   */
  async sendToDevices(tokens: string[], title: string, body: string, data?: Record<string, string>): Promise<void> {
    if (!this.isInitialised() || tokens.length === 0) return;

    const BATCH_SIZE = 500;
    for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
      const batch = tokens.slice(i, i + BATCH_SIZE);
      const message: admin.messaging.MulticastMessage = {
        tokens: batch,
        notification: { title, body },
        data: data ?? {},
        android: { priority: 'high', notification: { sound: 'default' } },
        apns: { payload: { aps: { sound: 'default' } } },
      };

      try {
        const result = await admin.messaging().sendEachForMulticast(message);
        this.logger.log(`Batch push: ${result.successCount} sent, ${result.failureCount} failed`);
      } catch (err: any) {
        this.logger.error(`Batch push failed: ${err.message}`);
      }
    }
  }

  /**
   * Send to a topic (subscribed devices).
   * Useful for broadcasting fleet alerts or promotions.
   */
  async sendToTopic(notification: TopicNotification): Promise<void> {
    if (!this.isInitialised()) return;

    const message: admin.messaging.Message = {
      topic: notification.topic,
      notification: { title: notification.title, body: notification.body },
      data: notification.data ?? {},
    };

    try {
      await admin.messaging().send(message);
      this.logger.log(`Topic push sent: ${notification.topic}`);
    } catch (err: any) {
      this.logger.error(`Topic push failed: ${err.message}`);
    }
  }

  /**
   * Subscribe a device token to a topic.
   * e.g. subscribe fleet managers to 'fleet-alerts'
   */
  async subscribeToTopic(tokens: string[], topic: string): Promise<void> {
    if (!this.isInitialised()) return;
    await admin.messaging().subscribeToTopic(tokens, topic);
  }

  async unsubscribeFromTopic(tokens: string[], topic: string): Promise<void> {
    if (!this.isInitialised()) return;
    await admin.messaging().unsubscribeFromTopic(tokens, topic);
  }

  private isInitialised(): boolean {
    return admin.apps.length > 0;
  }
}
