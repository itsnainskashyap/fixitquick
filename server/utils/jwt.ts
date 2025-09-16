// JWT utilities for access and refresh token management
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { storage } from '../storage';
import { type InsertUserSession } from '@shared/schema';

interface AccessTokenPayload {
  userId: string;
  phone: string;
  role: string;
  iat: number;
  exp: number;
}

interface RefreshTokenPayload {
  userId: string;
  sessionId: string;
  iat: number;
  exp: number;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
}

interface SessionInfo {
  ip?: string;
  userAgent?: string;
}

class JWTService {
  private readonly ACCESS_TOKEN_EXPIRY = 2 * 60 * 60; // 2 hours in seconds
  private readonly REFRESH_TOKEN_EXPIRY = 30 * 24 * 60 * 60; // 30 days in seconds
  
  private get SECRET(): string {
    const secret = process.env.SESSION_SECRET || process.env.JWT_SECRET || 'development-secret-key-change-in-production';
    if (!secret || secret.length < 32) {
      console.warn('JWT SECRET is not set or too short. Using development fallback.');
      return 'development-secret-key-change-in-production-please-set-proper-jwt-secret';
    }
    return secret;
  }

  /**
   * Generate standalone access token for admin users
   */
  async generateAccessToken(
    userId: string,
    role: string = 'user'
  ): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    
    const accessPayload: AccessTokenPayload = {
      userId,
      phone: '', // Admin users don't need phone numbers
      role,
      iat: now,
      exp: now + this.ACCESS_TOKEN_EXPIRY
    };
    
    return jwt.sign(accessPayload, this.SECRET, { algorithm: 'HS256' });
  }

  /**
   * Generate access and refresh token pair for a user
   */
  async generateTokenPair(
    userId: string, 
    phone: string, 
    role: string = 'user',
    sessionInfo?: SessionInfo
  ): Promise<TokenPair> {
    const now = Math.floor(Date.now() / 1000);
    const refreshToken = crypto.randomBytes(32).toString('hex');
    const sessionId = crypto.randomUUID();

    // Create access token payload
    const accessPayload: AccessTokenPayload = {
      userId,
      phone,
      role,
      iat: now,
      exp: now + this.ACCESS_TOKEN_EXPIRY
    };

    // Create refresh token payload
    const refreshPayload: RefreshTokenPayload = {
      userId,
      sessionId,
      iat: now,
      exp: now + this.REFRESH_TOKEN_EXPIRY
    };

    // Generate tokens with explicit algorithm
    const accessToken = jwt.sign(accessPayload, this.SECRET, { algorithm: 'HS256' });
    const refreshTokenJWT = jwt.sign(refreshPayload, this.SECRET, { algorithm: 'HS256' });

    // Hash and store refresh token in database
    const refreshTokenHash = crypto
      .createHash('sha256')
      .update(refreshToken + refreshTokenJWT)
      .digest('hex');

    const sessionData: InsertUserSession = {
      sessionId, // SECURITY FIX: Store the sessionId for proper token rotation
      userId,
      refreshTokenHash,
      expiresAt: new Date((now + this.REFRESH_TOKEN_EXPIRY) * 1000),
      ip: sessionInfo?.ip || null,
      userAgent: sessionInfo?.userAgent || null,
    };

    await storage.createUserSession(sessionData);

    return {
      accessToken,
      refreshToken: refreshToken + ':' + refreshTokenJWT, // Combine for security
      sessionId
    };
  }

  /**
   * Generate new access token from refresh token
   */
  async refreshAccessToken(refreshTokenString: string, sessionInfo?: SessionInfo): Promise<{
    accessToken: string;
    newRefreshToken: string;
    userId: string;
  } | null> {
    try {
      // Parse the refresh token
      const [refreshToken, refreshTokenJWT] = refreshTokenString.split(':');
      if (!refreshToken || !refreshTokenJWT) {
        return null;
      }

      // Verify JWT portion
      const payload = jwt.verify(refreshTokenJWT, this.SECRET) as RefreshTokenPayload;
      
      // Hash the token to find in database
      const refreshTokenHash = crypto
        .createHash('sha256')
        .update(refreshToken + refreshTokenJWT)
        .digest('hex');

      // Find and validate session
      const session = await storage.getUserSession(payload.userId, refreshTokenHash);
      if (!session || session.revokedAt || new Date() > session.expiresAt) {
        return null;
      }

      // Get user data for new access token
      const user = await storage.getUser(payload.userId);
      if (!user || !user.phone) {
        return null;
      }

      // Revoke old session
      await storage.revokeUserSession(payload.sessionId);

      // Generate new token pair
      const tokenPair = await this.generateTokenPair(
        user.id,
        user.phone,
        user.role || 'user',
        sessionInfo
      );

      return {
        accessToken: tokenPair.accessToken,
        newRefreshToken: tokenPair.refreshToken,
        userId: user.id
      };

    } catch (error) {
      console.error('Error refreshing access token:', error);
      return null;
    }
  }

  /**
   * Verify and decode access token
   */
  async verifyAccessToken(token: string): Promise<{
    userId: string;
    phone: string;
    role: string;
  } | null> {
    try {
      // Trim and validate token format
      const trimmedToken = token.trim();
      if (!trimmedToken || trimmedToken.split('.').length !== 3) {
        console.error('JWT token is malformed: invalid format');
        return null;
      }

      const payload = jwt.verify(trimmedToken, this.SECRET, { 
        algorithms: ['HS256'] 
      }) as AccessTokenPayload;
      
      // Verify user still exists
      const user = await storage.getUser(payload.userId);
      if (!user || !user.isActive) {
        return null;
      }

      return {
        userId: payload.userId,
        phone: payload.phone,
        role: payload.role
      };
    } catch (error) {
      console.error('Error verifying access token:', error);
      if (error instanceof Error) {
        console.error('JWT Error details:', error.message);
      }
      return null;
    }
  }

  /**
   * Revoke refresh token (logout)
   */
  async revokeRefreshToken(refreshTokenString: string): Promise<boolean> {
    try {
      const [refreshToken, refreshTokenJWT] = refreshTokenString.split(':');
      if (!refreshToken || !refreshTokenJWT) {
        return false;
      }

      const payload = jwt.verify(refreshTokenJWT, this.SECRET) as RefreshTokenPayload;
      
      const refreshTokenHash = crypto
        .createHash('sha256')
        .update(refreshToken + refreshTokenJWT)
        .digest('hex');

      await storage.revokeUserSession(payload.sessionId);
      return true;
    } catch (error) {
      console.error('Error revoking refresh token:', error);
      return false;
    }
  }

  /**
   * Revoke all user sessions (logout from all devices)
   */
  async revokeAllUserSessions(userId: string): Promise<void> {
    await storage.revokeAllUserSessions(userId);
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<void> {
    await storage.cleanupExpiredSessions();
  }

  /**
   * Get token expiry times
   */
  getTokenExpiryTimes(): { accessTokenExpiry: number; refreshTokenExpiry: number } {
    return {
      accessTokenExpiry: this.ACCESS_TOKEN_EXPIRY,
      refreshTokenExpiry: this.REFRESH_TOKEN_EXPIRY
    };
  }
}

// Create singleton instance
export const jwtService = new JWTService();

// Export types
export type { AccessTokenPayload, RefreshTokenPayload, TokenPair, SessionInfo };