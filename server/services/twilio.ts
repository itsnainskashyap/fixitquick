// Comprehensive Twilio SMS Service for OTP-based Authentication
// Implements secure OTP generation, SMS delivery, and verification

import twilio from 'twilio';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { storage } from '../storage';
import { type InsertOtpChallenge } from '@shared/schema';

interface TwilioConfig {
  accountSid: string | undefined;
  authToken: string | undefined;
  fromNumber: string;
  serviceName: string;
}

interface OTPResult {
  success: boolean;
  message: string;
  challengeId?: string;
  canResend?: boolean;
  remainingAttempts?: number;
  nextResendAt?: Date;
}

interface VerificationResult {
  success: boolean;
  message: string;
  remainingAttempts?: number;
  isExpired?: boolean;
  isLocked?: boolean;
}

class TwilioService {
  private client: any;
  private config: TwilioConfig;
  private isStubMode: boolean;
  
  // Security constants
  private readonly OTP_LENGTH = 6;
  private readonly OTP_EXPIRY_MINUTES = 5;
  private readonly MAX_ATTEMPTS = 5;
  private readonly RESEND_COOLDOWN_SECONDS = 3;
  private readonly MAX_RESENDS_PER_HOUR = 3;
  private readonly BCRYPT_ROUNDS = 12;

  constructor() {
    this.config = {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      fromNumber: process.env.TWILIO_FROM_NUMBER || '+1234567890', // Fallback for stub
      serviceName: 'FixitQuick'
    };

    this.isStubMode = !this.config.accountSid || !this.config.authToken;

    if (this.isStubMode) {
      console.log('🔧 Twilio SMS Service: Running in STUB mode - no real SMS will be sent');
      console.log('📱 To enable real SMS: Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER environment variables');
    } else {
      try {
        this.client = twilio(this.config.accountSid, this.config.authToken);
        console.log('📱 Twilio SMS Service: Initialized with real credentials');
      } catch (error) {
        console.error('❌ Twilio SMS Service: Failed to initialize with provided credentials, falling back to stub mode');
        this.isStubMode = true;
      }
    }
  }

  /**
   * Send OTP to phone number with comprehensive security checks
   */
  async sendOTP(phone: string, ip?: string, userAgent?: string): Promise<OTPResult> {
    try {
      // Normalize phone number
      const normalizedPhone = this.formatPhoneNumber(phone);
      if (!normalizedPhone) {
        return {
          success: false,
          message: 'Invalid phone number format. Please use format +[country code][number]'
        };
      }

      // Check for rate limiting and abuse
      const rateLimit = await this.checkRateLimit(normalizedPhone, ip);
      if (!rateLimit.allowed) {
        return {
          success: false,
          message: rateLimit.message,
          canResend: false,
          nextResendAt: rateLimit.nextAllowedAt
        };
      }

      // Expire any existing active challenges for this phone
      await storage.expireOtpChallenges(normalizedPhone);

      // Generate secure OTP
      const otp = this.generateOTP();
      const hashedOtp = await this.hashOTP(otp);

      // Create new OTP challenge in database
      const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000);
      const challenge: InsertOtpChallenge = {
        phone: normalizedPhone,
        codeHash: hashedOtp,
        expiresAt,
        attempts: 0,
        resendCount: rateLimit.currentResends + 1,
        ip: ip || '',
        userAgent: userAgent || '',
        status: 'sent'
      };

      const createdChallenge = await storage.createOtpChallenge(challenge);

      // Send SMS
      const smsResult = await this.sendSMS(normalizedPhone, otp);
      
      if (!smsResult.success) {
        // Mark challenge as failed
        await storage.updateOtpChallenge(createdChallenge.id, { status: 'expired' });
        return {
          success: false,
          message: smsResult.message
        };
      }

      return {
        success: true,
        message: 'OTP sent successfully',
        challengeId: createdChallenge.id,
        canResend: false,
        nextResendAt: new Date(Date.now() + this.RESEND_COOLDOWN_SECONDS * 1000)
      };

    } catch (error) {
      console.error('Error sending OTP:', error);
      return {
        success: false,
        message: 'Failed to send OTP. Please try again later.'
      };
    }
  }

  /**
   * Verify OTP with comprehensive security checks
   */
  async verifyOTP(phone: string, code: string, ip?: string): Promise<VerificationResult> {
    try {
      const normalizedPhone = this.formatPhoneNumber(phone);
      if (!normalizedPhone) {
        return {
          success: false,
          message: 'Invalid phone number format'
        };
      }

      // Get active challenge
      const challenge = await storage.getActiveOtpChallenge(normalizedPhone);
      if (!challenge) {
        return {
          success: false,
          message: 'No active verification code found. Please request a new one.',
          isExpired: true
        };
      }

      // Check if expired
      if (new Date() > challenge.expiresAt) {
        await storage.updateOtpChallenge(challenge.id, { status: 'expired' });
        return {
          success: false,
          message: 'Verification code has expired. Please request a new one.',
          isExpired: true
        };
      }

      // Check attempt limit
      const currentAttempts = challenge.attempts ?? 0;
      if (currentAttempts >= this.MAX_ATTEMPTS) {
        await storage.updateOtpChallenge(challenge.id, { status: 'expired' });
        return {
          success: false,
          message: 'Too many incorrect attempts. Please request a new verification code.',
          isLocked: true
        };
      }

      // Verify OTP
      const isValidOtp = await this.verifyOTPHash(code, challenge.codeHash);
      
      // Update attempt count
      const newAttempts = currentAttempts + 1;
      await storage.updateOtpChallenge(challenge.id, { 
        attempts: newAttempts,
        ip: ip || challenge.ip
      });

      if (!isValidOtp) {
        const remainingAttempts = this.MAX_ATTEMPTS - newAttempts;
        return {
          success: false,
          message: `Incorrect verification code. ${remainingAttempts} attempts remaining.`,
          remainingAttempts
        };
      }

      // Success - mark as verified
      await storage.updateOtpChallenge(challenge.id, { status: 'verified' });

      return {
        success: true,
        message: 'Phone number verified successfully'
      };

    } catch (error) {
      console.error('Error verifying OTP:', error);
      return {
        success: false,
        message: 'Verification failed. Please try again.'
      };
    }
  }

  /**
   * Check if user can request new OTP (rate limiting)
   */
  async canResendOTP(phone: string, ip?: string): Promise<{
    canResend: boolean;
    message: string;
    nextResendAt?: Date;
  }> {
    try {
      const normalizedPhone = this.formatPhoneNumber(phone);
      if (!normalizedPhone) {
        return {
          canResend: false,
          message: 'Invalid phone number format'
        };
      }

      const rateLimit = await this.checkRateLimit(normalizedPhone, ip);
      return {
        canResend: rateLimit.allowed,
        message: rateLimit.message,
        nextResendAt: rateLimit.nextAllowedAt
      };

    } catch (error) {
      console.error('Error checking resend eligibility:', error);
      return {
        canResend: false,
        message: 'Unable to check resend eligibility'
      };
    }
  }

  /**
   * Format and validate phone number to international format
   */
  private formatPhoneNumber(phone: string): string | null {
    // Remove all non-digit characters except +
    let cleaned = phone.replace(/[^\d+]/g, '');
    
    // If it doesn't start with +, assume it's missing country code
    if (!cleaned.startsWith('+')) {
      // If it starts with 0, it might be a national number (remove leading 0)
      if (cleaned.startsWith('0')) {
        cleaned = cleaned.substring(1);
      }
      
      // For Indian numbers (10 digits), add +91
      if (cleaned.length === 10 && /^[6-9]\d{9}$/.test(cleaned)) {
        cleaned = '+91' + cleaned;
      }
      // For US numbers (10 digits), add +1
      else if (cleaned.length === 10 && /^[2-9]\d{9}$/.test(cleaned)) {
        cleaned = '+1' + cleaned;
      }
      // If still no country code and looks like international format, add +
      else if (cleaned.length >= 10 && cleaned.length <= 15) {
        cleaned = '+' + cleaned;
      }
    }

    // Validate the final format
    const phoneRegex = /^\+[1-9]\d{6,14}$/;
    if (!phoneRegex.test(cleaned)) {
      return null;
    }

    return cleaned;
  }

  /**
   * Generate cryptographically secure OTP
   */
  private generateOTP(): string {
    const digits = '0123456789';
    let otp = '';
    
    for (let i = 0; i < this.OTP_LENGTH; i++) {
      const randomIndex = crypto.randomInt(0, digits.length);
      otp += digits[randomIndex];
    }
    
    return otp;
  }

  /**
   * Hash OTP using bcrypt
   */
  private async hashOTP(code: string): Promise<string> {
    return await bcrypt.hash(code, this.BCRYPT_ROUNDS);
  }

  /**
   * Verify OTP against hash
   */
  private async verifyOTPHash(code: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(code, hash);
  }

  /**
   * Send SMS via Twilio or stub
   */
  private async sendSMS(phone: string, otp: string): Promise<{ success: boolean; message: string }> {
    // WebOTP compatible message format for auto-fill
    const message = `<#> Your ${this.config.serviceName} verification code is ${otp}

Do not share this code with anyone. Valid for ${this.OTP_EXPIRY_MINUTES} minutes.

${this.config.serviceName.toLowerCase()}.app #${this.generateWebOTPHash()}`;

    if (this.isStubMode) {
      console.log(`📱 [STUB MODE] SMS to ${phone}: ${otp}`);
      console.log(`📱 [STUB MODE] Full message: ${message}`);
      return {
        success: true,
        message: 'SMS sent successfully (stub mode)'
      };
    }

    try {
      const result = await this.client.messages.create({
        body: message,
        from: this.config.fromNumber,
        to: phone
      });

      console.log(`📱 SMS sent successfully to ${phone}, SID: ${result.sid}`);
      return {
        success: true,
        message: 'SMS sent successfully'
      };

    } catch (error: any) {
      console.error('Twilio SMS error:', error);
      
      // Handle specific Twilio errors
      if (error.code === 21211) {
        return {
          success: false,
          message: 'Invalid phone number'
        };
      } else if (error.code === 21608) {
        return {
          success: false,
          message: 'Phone number not verified with Twilio (development account)'
        };
      } else if (error.code === 21614) {
        return {
          success: false,
          message: 'Phone number is invalid or blocked'
        };
      }

      return {
        success: false,
        message: 'Failed to send SMS. Please try again later.'
      };
    }
  }

  /**
   * Check rate limiting for OTP requests
   */
  private async checkRateLimit(phone: string, ip?: string): Promise<{
    allowed: boolean;
    message: string;
    currentResends: number;
    nextAllowedAt?: Date;
  }> {
    try {
      // Check recent challenges for this phone
      const recentChallenges = await storage.getRecentOtpChallenges(phone, 3600); // Last hour
      const resendCount = recentChallenges.length;

      // Check hourly limit
      if (resendCount >= this.MAX_RESENDS_PER_HOUR) {
        const oldestChallenge = recentChallenges[recentChallenges.length - 1];
        const oldestTime = oldestChallenge.createdAt?.getTime() ?? Date.now();
        const nextAllowedAt = new Date(oldestTime + 3600 * 1000);
        
        return {
          allowed: false,
          message: `Too many OTP requests. Please wait until ${nextAllowedAt.toLocaleTimeString()} before requesting again.`,
          currentResends: resendCount,
          nextAllowedAt
        };
      }

      // Check cooldown period
      if (recentChallenges.length > 0) {
        const lastChallenge = recentChallenges[0];
        const lastTime = lastChallenge.createdAt?.getTime() ?? Date.now();
        const timeSinceLastRequest = Date.now() - lastTime;
        
        if (timeSinceLastRequest < this.RESEND_COOLDOWN_SECONDS * 1000) {
          const nextAllowedAt = new Date(lastTime + this.RESEND_COOLDOWN_SECONDS * 1000);
          
          return {
            allowed: false,
            message: `Please wait ${Math.ceil((this.RESEND_COOLDOWN_SECONDS * 1000 - timeSinceLastRequest) / 1000)} seconds before requesting a new code.`,
            currentResends: resendCount,
            nextAllowedAt
          };
        }
      }

      // Additional IP-based rate limiting (if IP provided)
      if (ip) {
        const ipChallenges = await storage.getRecentOtpChallengesByIp(ip, 600); // Last 10 minutes
        if (ipChallenges.length >= 5) {
          return {
            allowed: false,
            message: 'Too many OTP requests from this network. Please try again later.',
            currentResends: resendCount,
            nextAllowedAt: new Date(Date.now() + 600 * 1000)
          };
        }
      }

      return {
        allowed: true,
        message: 'Rate limit check passed',
        currentResends: resendCount
      };

    } catch (error) {
      console.error('Error checking rate limit:', error);
      return {
        allowed: false,
        message: 'Unable to verify rate limit',
        currentResends: 0
      };
    }
  }

  /**
   * Generate WebOTP hash for auto-fill support
   */
  private generateWebOTPHash(): string {
    // Generate a simple hash for WebOTP format
    // In production, this should be a consistent hash based on your app
    const appString = this.config.serviceName + 'otp';
    return crypto.createHash('sha256').update(appString).digest('hex').substring(0, 8);
  }

  /**
   * Clean up expired OTP challenges (called periodically)
   */
  async cleanupExpiredChallenges(): Promise<void> {
    try {
      await storage.cleanupExpiredOtpChallenges();
      console.log('🧹 Cleaned up expired OTP challenges');
    } catch (error) {
      console.error('Error cleaning up expired challenges:', error);
    }
  }

  /**
   * Get service statistics (for admin/monitoring)
   */
  async getStatistics(hours: number = 24): Promise<{
    totalSent: number;
    totalVerified: number;
    successRate: number;
    activeMode: string;
  }> {
    try {
      const stats = await storage.getOtpStatistics(hours);
      return {
        ...stats,
        activeMode: this.isStubMode ? 'stub' : 'production'
      };
    } catch (error) {
      console.error('Error getting OTP statistics:', error);
      return {
        totalSent: 0,
        totalVerified: 0,
        successRate: 0,
        activeMode: this.isStubMode ? 'stub' : 'production'
      };
    }
  }

  /**
   * Validate phone number format (public utility)
   */
  isValidPhoneNumber(phone: string): boolean {
    return this.formatPhoneNumber(phone) !== null;
  }
}

// Create singleton instance
export const twilioService = new TwilioService();

// Export utility functions
export const formatPhoneNumber = (phone: string): string | null => {
  return twilioService.isValidPhoneNumber(phone) ? 
    (twilioService as any).formatPhoneNumber(phone) : null;
};

export const isValidPhoneNumber = (phone: string): boolean => {
  return twilioService.isValidPhoneNumber(phone);
};

// Export types for use in routes
export type { OTPResult, VerificationResult };

// Default export
export default twilioService;