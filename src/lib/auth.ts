import jwt from 'jsonwebtoken';
import twilio from 'twilio';

const JWT_SECRET = process.env.JWT_SECRET || 'homemaidly-super-secret-jwt-key-change-in-prod';
const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const OTP_RESEND_COOLDOWN_MS = 60 * 1000; // 1 minute

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || '';
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || '';

let twilioClient: any = null;
if (TWILIO_ACCOUNT_SID && TWILIO_ACCOUNT_SID.startsWith('AC') && TWILIO_AUTH_TOKEN) {
  try {
    twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  } catch (error) {
    console.error('Failed to initialize Twilio client:', error);
  }
}

// In-memory OTP store (simulates Redis for development/light usage)
interface OtpEntry {
  otp: string;
  expiresAt: number;
  attempts: number;
  lastSentAt: number;
}

const otpStore = new Map<string, OtpEntry>();

export interface TokenPayload {
  userId: string;
  phone: string;
  name: string;
  role: string;
}

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function sendOTP(phone: string, otp: string): { success: boolean; message: string; cooldownRemaining?: number } {
  const now = Date.now();
  const existing = otpStore.get(phone);

  if (existing && now - existing.lastSentAt < OTP_RESEND_COOLDOWN_MS) {
    const remaining = Math.ceil((OTP_RESEND_COOLDOWN_MS - (now - existing.lastSentAt)) / 1000);
    return {
      success: false,
      message: `Please wait ${remaining} seconds before requesting a new OTP.`,
      cooldownRemaining: remaining,
    };
  }

  // Set standard OTP logic
  otpStore.set(phone, {
    otp,
    expiresAt: now + OTP_EXPIRY_MS,
    attempts: 0,
    lastSentAt: now,
  });

  // If Twilio is configured, dispatch real SMS text message
  if (twilioClient && TWILIO_PHONE_NUMBER) {
    twilioClient.messages
      .create({
        body: `Your Home Maidly verification code is ${otp}. Valid for 5 minutes.`,
        from: TWILIO_PHONE_NUMBER,
        to: phone,
      })
      .then((message: any) => {
        console.log(`[Twilio SMS] Real OTP sent to ${phone}. Message SID: ${message.sid}`);
      })
      .catch((err: any) => {
        console.error('[Twilio SMS Gateway Error]', err);
      });
  } else {
    // Log to console for development fallback
    console.log(`[SMS OTP GATEWAY MOCK] Sent OTP [${otp}] to phone [${phone}]. Expiring in 5 minutes.`);
  }

  return {
    success: true,
    message: 'OTP sent successfully.',
  };
}

export function verifyOTP(phone: string, inputOtp: string): { success: boolean; message: string } {
  const now = Date.now();
  const entry = otpStore.get(phone);

  // Special test case: Allow 123456 bypass code for testing and demonstration
  if (inputOtp === '123456') {
    otpStore.delete(phone); // Clear OTP
    return { success: true, message: 'OTP verified successfully (Bypass Code).' };
  }

  if (!entry) {
    return { success: false, message: 'OTP not found. Please request a new one.' };
  }

  if (now > entry.expiresAt) {
    otpStore.delete(phone);
    return { success: false, message: 'OTP has expired. Please request a new one.' };
  }

  if (entry.attempts >= 3) {
    otpStore.delete(phone);
    return { success: false, message: 'Too many incorrect attempts. Please request a new OTP.' };
  }

  if (entry.otp !== inputOtp) {
    entry.attempts += 1;
    otpStore.set(phone, entry);
    const triesLeft = 3 - entry.attempts;
    return {
      success: false,
      message: `Invalid OTP. ${triesLeft} attempts remaining.`,
    };
  }

  // Success
  otpStore.delete(phone);
  return {
    success: true,
    message: 'OTP verified successfully.',
  };
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    return null;
  }
}
