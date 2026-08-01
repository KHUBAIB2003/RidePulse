export interface PushNotificationMessage {
  targetTokenOrTopic: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  isTopic?: boolean;
}

export interface PushNotificationProvider {
  sendNotification(msg: PushNotificationMessage): Promise<boolean>;
}

export class MockPushNotificationProvider implements PushNotificationProvider {
  async sendNotification(msg: PushNotificationMessage): Promise<boolean> {
    console.log(`[MockPushNotificationProvider] Sent Push to ${msg.isTopic ? 'Topic' : 'Device'} "${msg.targetTokenOrTopic}": [${msg.title}] ${msg.body}`);
    return true;
  }
}
