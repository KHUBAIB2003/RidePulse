export interface EmailMessage {
  to: string;
  subject: string;
  bodyText?: string;
  bodyHtml?: string;
}

export interface EmailProvider {
  sendEmail(message: EmailMessage): Promise<boolean>;
}

export class MockEmailProvider implements EmailProvider {
  async sendEmail(message: EmailMessage): Promise<boolean> {
    console.log(`[MockEmailProvider] Sent email to ${message.to} - Subject: "${message.subject}"`);
    return true;
  }
}
