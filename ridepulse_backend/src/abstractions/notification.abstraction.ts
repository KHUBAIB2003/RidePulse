export interface NotificationMessage {
  recipient: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  channel: 'PUSH' | 'SMS' | 'EMAIL' | 'WHATSAPP';
}

export interface NotificationResult {
  success: boolean;
  messageId: string;
  channel: string;
  timestamp: Date;
  error?: string;
}

export interface NotificationProvider {
  sendPushNotification(recipientToken: string, title: string, body: string, data?: Record<string, any>): Promise<NotificationResult>;
  sendSms(phoneNumber: string, message: string): Promise<NotificationResult>;
  sendEmail(toEmail: string, subject: string, htmlContent: string): Promise<NotificationResult>;
  sendWhatsApp(phoneNumber: string, message: string): Promise<NotificationResult>;
}

export class MockNotificationProvider implements NotificationProvider {
  async sendPushNotification(recipientToken: string, title: string, body: string, data?: Record<string, any>): Promise<NotificationResult> {
    console.log(`[PushNotificationProvider] Sent to ${recipientToken}: "${title}" - ${body}`, data || '');
    return {
      success: true,
      messageId: `push_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      channel: 'PUSH',
      timestamp: new Date()
    };
  }

  async sendSms(phoneNumber: string, message: string): Promise<NotificationResult> {
    console.log(`[SmsNotificationProvider] Sent to ${phoneNumber}: ${message}`);
    return {
      success: true,
      messageId: `sms_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      channel: 'SMS',
      timestamp: new Date()
    };
  }

  async sendEmail(toEmail: string, subject: string, _htmlContent: string): Promise<NotificationResult> {
    console.log(`[EmailNotificationProvider] Sent to ${toEmail}: [${subject}]`);
    return {
      success: true,
      messageId: `email_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      channel: 'EMAIL',
      timestamp: new Date()
    };
  }

  async sendWhatsApp(phoneNumber: string, message: string): Promise<NotificationResult> {
    console.log(`[WhatsAppNotificationProvider] Sent to ${phoneNumber}: ${message}`);
    return {
      success: true,
      messageId: `wa_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      channel: 'WHATSAPP',
      timestamp: new Date()
    };
  }
}

export const notificationEngine = new MockNotificationProvider();
