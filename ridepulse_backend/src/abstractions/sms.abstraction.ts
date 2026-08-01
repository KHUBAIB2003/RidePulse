export interface SmsPayload {
  toPhone: string;
  message: string;
  isEmergency?: boolean;
}

export interface SmsProvider {
  sendSms(payload: SmsPayload): Promise<boolean>;
}

export class MockSmsProvider implements SmsProvider {
  async sendSms(payload: SmsPayload): Promise<boolean> {
    console.log(`[MockSmsProvider] ${payload.isEmergency ? '🚨 EMERGENCY ' : ''}SMS to ${payload.toPhone}: "${payload.message}"`);
    return true;
  }
}
