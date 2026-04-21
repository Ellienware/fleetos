import { SMS_CONFIG } from '@/lib/appwrite/config';

export interface SMSProvider {
  sendSMS(to: string, message: string): Promise<{ success: boolean; error?: string }>;
}

/**
 * Twilio SMS Provider
 */
class TwilioProvider implements SMSProvider {
  private accountSid: string;
  private authToken: string;
  private fromNumber: string;
  
  constructor() {
    this.accountSid = SMS_CONFIG.twilio.accountSid;
    this.authToken = SMS_CONFIG.twilio.authToken;
    this.fromNumber = SMS_CONFIG.twilio.phoneNumber;
  }
  
  async sendSMS(to: string, message: string): Promise<{ success: boolean; error?: string }> {
    if (!this.accountSid || !this.authToken || !this.fromNumber) {
      console.log('[SMS] Twilio not configured, simulating send:', { to, message });
      return { success: true };
    }
    
    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: to,
          From: this.fromNumber,
          Body: message,
        }),
      });
      
      if (!response.ok) {
        const error = await response.text();
        console.error('[SMS] Twilio error:', error);
        return { success: false, error: 'Failed to send SMS' };
      }
      
      return { success: true };
    } catch (error) {
      console.error('[SMS] Twilio error:', error);
      return { success: false, error: 'Failed to send SMS' };
    }
  }
}

/**
 * Africa's Talking SMS Provider
 */
class AfricasTalkingProvider implements SMSProvider {
  private apiKey: string;
  private username: string;
  private shortCode: string;
  
  constructor() {
    this.apiKey = SMS_CONFIG.africasTalking.apiKey;
    this.username = SMS_CONFIG.africasTalking.username;
    this.shortCode = SMS_CONFIG.africasTalking.shortCode;
  }
  
  async sendSMS(to: string, message: string): Promise<{ success: boolean; error?: string }> {
    if (!this.apiKey || !this.username) {
      console.log('[SMS] Africa\'s Talking not configured, simulating send:', { to, message });
      return { success: true };
    }
    
    try {
      const url = 'https://api.africastalking.com/version1/messaging';
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'apiKey': this.apiKey,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: new URLSearchParams({
          username: this.username,
          to,
          message,
          ...(this.shortCode && { from: this.shortCode }),
        }),
      });
      
      if (!response.ok) {
        const error = await response.text();
        console.error('[SMS] Africa\'s Talking error:', error);
        return { success: false, error: 'Failed to send SMS' };
      }
      
      return { success: true };
    } catch (error) {
      console.error('[SMS] Africa\'s Talking error:', error);
      return { success: false, error: 'Failed to send SMS' };
    }
  }
}

/**
 * Stub SMS Provider for testing
 */
class StubProvider implements SMSProvider {
  async sendSMS(to: string, message: string): Promise<{ success: boolean; error?: string }> {
    console.log('[SMS] Stub provider - Message sent:', { to, message });
    return { success: true };
  }
}

/**
 * Get the configured SMS provider
 */
function getSMSProvider(): SMSProvider {
  const provider = SMS_CONFIG.provider;
  
  switch (provider) {
    case 'twilio':
      return new TwilioProvider();
    case 'africas_talking':
      return new AfricasTalkingProvider();
    default:
      console.warn('[SMS] No valid provider configured, using stub');
      return new StubProvider();
  }
}

/**
 * Send an OTP via SMS
 */
export async function sendOTP(
  phone: string,
  otp: string
): Promise<{ success: boolean; error?: string }> {
  const provider = getSMSProvider();
  const message = `Your verification code is: ${otp}. This code expires in 5 minutes.`;
  return provider.sendSMS(phone, message);
}

/**
 * Send a notification SMS
 */
export async function sendNotification(
  phone: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  const provider = getSMSProvider();
  return provider.sendSMS(phone, message);
}

/**
 * Send a payment reminder SMS
 */
export async function sendPaymentReminder(
  phone: string,
  ownerName: string,
  amount: number,
  dueDate: string,
  associationName: string
): Promise<{ success: boolean; error?: string }> {
  const provider = getSMSProvider();
  const message = `Dear ${ownerName}, your ${associationName} membership payment of R${amount.toFixed(2)} is due on ${dueDate}. Please pay to avoid penalties.`;
  return provider.sendSMS(phone, message);
}

/**
 * Send a fine notification SMS
 */
export async function sendFineNotification(
  phone: string,
  ownerName: string,
  amount: number,
  reason: string,
  associationName: string
): Promise<{ success: boolean; error?: string }> {
  const provider = getSMSProvider();
  const message = `Dear ${ownerName}, you have been issued a fine of R${amount.toFixed(2)} by ${associationName} for: ${reason}. Please settle this amount.`;
  return provider.sendSMS(phone, message);
}

/**
 * Send a permit expiry warning SMS
 */
export async function sendPermitExpiryWarning(
  phone: string,
  ownerName: string,
  permitType: string,
  vehicleReg: string,
  expiryDate: string
): Promise<{ success: boolean; error?: string }> {
  const provider = getSMSProvider();
  const message = `Dear ${ownerName}, the ${permitType} for vehicle ${vehicleReg} expires on ${expiryDate}. Please renew to avoid violations.`;
  return provider.sendSMS(phone, message);
}

/**
 * Send a shift reminder SMS
 */
export async function sendShiftReminder(
  phone: string,
  driverName: string,
  vehicleReg: string,
  startTime: string,
  routeName?: string
): Promise<{ success: boolean; error?: string }> {
  const provider = getSMSProvider();
  const routeInfo = routeName ? ` on route ${routeName}` : '';
  const message = `Reminder: ${driverName}, your shift starts at ${startTime}${routeInfo}. Vehicle: ${vehicleReg}. Please clock in on time.`;
  return provider.sendSMS(phone, message);
}

/**
 * Send a broadcast message to multiple recipients
 */
export async function sendBroadcast(
  phones: string[],
  message: string
): Promise<{ success: number; failed: number }> {
  const provider = getSMSProvider();
  let success = 0;
  let failed = 0;
  
  for (const phone of phones) {
    const result = await provider.sendSMS(phone, message);
    if (result.success) {
      success++;
    } else {
      failed++;
    }
  }
  
  return { success, failed };
}
