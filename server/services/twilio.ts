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
  fromNumber: string | undefined;
  serviceName: string;
  devFallbackEnabled: boolean;
  environment: string;
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
  private isProduction: boolean;
  private hasValidCredentials: boolean;
  
  // Security constants
  private readonly OTP_LENGTH = 6;
  private readonly OTP_EXPIRY_MINUTES = 5;
  private readonly MAX_ATTEMPTS = 5;
  private readonly RESEND_COOLDOWN_SECONDS = 30;
  private readonly MAX_RESENDS_PER_HOUR = 3;
  private readonly BCRYPT_ROUNDS = 12;

  constructor() {
    this.config = {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      fromNumber: process.env.TWILIO_FROM_NUMBER,
      serviceName: 'FixitQuick',
      devFallbackEnabled: process.env.TWILIO_DEV_FALLBACK === 'true',
      environment: process.env.NODE_ENV || 'development'
    };

    this.isProduction = this.config.environment === 'production';
    this.hasValidCredentials = !!(this.config.accountSid && this.config.authToken && this.config.fromNumber);
    this.isStubMode = !this.hasValidCredentials;

    if (this.isStubMode) {
      console.log('🔧 Twilio SMS Service: Running in STUB mode - no real SMS will be sent');
      console.log('📱 To enable real SMS: Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER environment variables');
      if (this.isProduction) {
        console.warn('⚠️  PRODUCTION WARNING: Twilio SMS is in stub mode - users cannot receive OTP codes!');
      }
    } else {
      try {
        this.client = twilio(this.config.accountSid, this.config.authToken);
        console.log(`📱 Twilio SMS Service: Initialized successfully (${this.config.environment} environment)`);
        if (!this.isProduction && !this.config.devFallbackEnabled) {
          console.log('📱 Development mode: Set TWILIO_DEV_FALLBACK=true to enable fallback logging for unverified numbers');
        }
      } catch (error) {
        console.error('❌ Twilio SMS Service: Failed to initialize with provided credentials');
        this.isStubMode = true;
        if (this.isProduction) {
          console.error('❌ PRODUCTION ERROR: Twilio credentials are invalid - SMS authentication is disabled!');
        }
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
        // Mark challenge as failed and don't expose it to users
        await storage.updateOtpChallenge(createdChallenge.id, { status: 'expired' });
        return {
          success: false,
          message: smsResult.message
        };
      }

      // Only update challenge to 'sent' status if SMS was actually sent
      if (smsResult.actuallyDelivered) {
        await storage.updateOtpChallenge(createdChallenge.id, { status: 'sent' });
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
   * Format and validate phone number to E.164 international format
   * Supports common country formats with intelligent normalization
   */
  private formatPhoneNumber(phone: string): string | null {
    if (!phone || typeof phone !== 'string') {
      return null;
    }

    // Remove all non-digit characters except +
    let cleaned = phone.trim().replace(/[^\d+]/g, '');
    
    if (!cleaned) {
      return null;
    }

    // If it doesn't start with +, add country code based on number pattern
    if (!cleaned.startsWith('+')) {
      // Remove leading zeros (common in national format)
      if (cleaned.startsWith('0')) {
        cleaned = cleaned.substring(1);
      }
      
      // Add country codes based on number patterns
      if (cleaned.length === 10) {
        // Indian mobile numbers: start with 6-9
        if (/^[6-9]\d{9}$/.test(cleaned)) {
          cleaned = '+91' + cleaned;
        }
        // US/Canada numbers: start with 2-9
        else if (/^[2-9]\d{9}$/.test(cleaned)) {
          cleaned = '+1' + cleaned;
        }
        // UK mobile: might be missing leading 7
        else if (/^7\d{9}$/.test(cleaned)) {
          cleaned = '+44' + cleaned;
        }
      }
      // 11 digits might be US with leading 1
      else if (cleaned.length === 11 && cleaned.startsWith('1') && /^1[2-9]\d{9}$/.test(cleaned)) {
        cleaned = '+' + cleaned;
      }
      // 8 digits might be Singapore
      else if (cleaned.length === 8 && /^[89]\d{7}$/.test(cleaned)) {
        cleaned = '+65' + cleaned;
      }
      // If none of the above, assume it needs + prefix for international
      else if (cleaned.length >= 7 && cleaned.length <= 15) {
        // Don't assume country code for ambiguous lengths
        return null;
      }
    }

    // Remove any duplicate + symbols
    cleaned = cleaned.replace(/\++/g, '+');
    
    // Ensure it starts with + and has valid length
    if (!cleaned.startsWith('+')) {
      return null;
    }

    // Validate E.164 format: +[1-4 digit country code][subscriber number]
    // Total length should be 8-15 digits after '+' (E.164 standard)
    const phoneRegex = /^\+[1-9]\d{7,14}$/;
    if (!phoneRegex.test(cleaned)) {
      return null;
    }

    // Additional validation for known country patterns
    const countryCode = cleaned.substring(1, cleaned.startsWith('+1') ? 2 : cleaned.startsWith('+91') ? 3 : cleaned.startsWith('+44') ? 3 : 4);
    const subscriberNumber = cleaned.substring(countryCode.length + 1);
    
    // Country-specific validation
    if (countryCode === '91') {
      // India: mobile numbers should be 10 digits starting with 6-9
      if (subscriberNumber.length !== 10 || !/^[6-9]\d{9}$/.test(subscriberNumber)) {
        return null;
      }
    } else if (countryCode === '1') {
      // US/Canada: should be 10 digits starting with 2-9
      if (subscriberNumber.length !== 10 || !/^[2-9]\d{9}$/.test(subscriberNumber)) {
        return null;
      }
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
   * Send SMS via Twilio with production-safe error handling
   */
  private async sendSMS(phone: string, otp: string): Promise<{ 
    success: boolean; 
    message: string;
    actuallyDelivered?: boolean;
  }> {
    // WebOTP compatible message format for auto-fill
    const message = `<#> Your ${this.config.serviceName} verification code is ${otp}

Do not share this code with anyone. Valid for ${this.OTP_EXPIRY_MINUTES} minutes.

${this.config.serviceName.toLowerCase()}.app #${this.generateWebOTPHash()}`;

    if (this.isStubMode) {
      // Only log OTP in non-production environments
      if (!this.isProduction) {
        console.log(`📱 [STUB MODE] SMS to ${phone}: ${otp}`);
        console.log(`📱 [STUB MODE] Full message: ${message}`);
      }
      return {
        success: true,
        message: 'SMS sent successfully (stub mode)',
        actuallyDelivered: false
      };
    }

    try {
      const result = await this.client.messages.create({
        body: message,
        from: this.config.fromNumber,
        to: phone
      });

      // Safe logging - no OTP exposure
      console.log(`📱 SMS sent successfully to ${this.maskPhoneNumber(phone)}, SID: ${result.sid}`);
      return {
        success: true,
        message: 'SMS sent successfully',
        actuallyDelivered: true
      };

    } catch (error: any) {
      // Safe error logging - no sensitive data
      console.error(`Twilio SMS error for ${this.maskPhoneNumber(phone)}:`, {
        code: error.code,
        message: error.message,
        moreInfo: error.moreInfo
      });
      
      // Handle specific Twilio errors with environment-aware responses
      if (error.code === 21211) {
        return {
          success: false,
          message: 'Invalid phone number format',
          actuallyDelivered: false
        };
      } else if (error.code === 21608) {
        // Trial account limitation - environment-gated fallback
        return this.handleTrialLimitation(phone, otp, message);
      } else if (error.code === 21614) {
        return {
          success: false,
          message: 'Phone number is invalid or not reachable',
          actuallyDelivered: false
        };
      } else if (error.code === 20003) {
        return {
          success: false,
          message: 'Authentication failed. Please contact support.',
          actuallyDelivered: false
        };
      }

      // Generic error handling
      const userMessage = this.isProduction 
        ? 'Unable to send verification code. Please try again or contact support.'
        : 'Failed to send SMS. Please try again later.';
        
      return {
        success: false,
        message: userMessage,
        actuallyDelivered: false
      };
    }
  }

  /**
   * Handle Twilio trial account limitations with production-safe behavior
   */
  private handleTrialLimitation(phone: string, otp: string, message: string): {
    success: boolean;
    message: string;
    actuallyDelivered?: boolean;
  } {
    if (this.isProduction) {
      // PRODUCTION: Never log OTP, return clear error
      console.warn(`📱 Production SMS failed: Unverified number ${this.maskPhoneNumber(phone)} (Twilio trial limitation)`);
      return {
        success: false,
        message: 'This phone number must be verified with our SMS provider. Please contact support to verify your number.',
        actuallyDelivered: false
      };
    } else {
      // DEVELOPMENT: Allow fallback only if explicitly enabled
      if (this.config.devFallbackEnabled) {
        console.log(`📱 Development fallback for ${phone} (Twilio trial limitation)`);
        console.log(`📱 [DEV FALLBACK] OTP: ${otp}`);
        console.log(`📱 [DEV FALLBACK] Message: ${message}`);
        return {
          success: true,
          message: 'OTP sent successfully (development fallback - check logs)',
          actuallyDelivered: false
        };
      } else {
        console.warn(`📱 Development SMS failed: Unverified number ${phone} (Twilio trial limitation)`);
        console.log('📱 Set TWILIO_DEV_FALLBACK=true to enable console fallback in development');
        return {
          success: false,
          message: 'This number is not verified for SMS delivery in development mode.',
          actuallyDelivered: false
        };
      }
    }
  }

  /**
   * Mask phone number for safe logging
   */
  private maskPhoneNumber(phone: string): string {
    if (phone.length <= 4) return '****';
    const visibleDigits = 2;
    const maskedLength = phone.length - visibleDigits * 2;
    return phone.substring(0, visibleDigits) + '*'.repeat(maskedLength) + phone.substring(phone.length - visibleDigits);
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
    environment: string;
    hasValidCredentials: boolean;
    devFallbackEnabled: boolean;
  }> {
    try {
      const stats = await storage.getOtpStatistics(hours);
      return {
        ...stats,
        activeMode: this.isStubMode ? 'stub' : 'twilio',
        environment: this.config.environment,
        hasValidCredentials: this.hasValidCredentials,
        devFallbackEnabled: this.config.devFallbackEnabled
      };
    } catch (error) {
      console.error('Error getting OTP statistics:', error);
      return {
        totalSent: 0,
        totalVerified: 0,
        successRate: 0,
        activeMode: this.isStubMode ? 'stub' : 'twilio',
        environment: this.config.environment,
        hasValidCredentials: this.hasValidCredentials,
        devFallbackEnabled: this.config.devFallbackEnabled
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