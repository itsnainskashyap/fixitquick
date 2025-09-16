import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

// Allow fallback for development
const replitDomains = process.env.REPLIT_DOMAINS || 'localhost';
console.log('🔧 Setting up Replit auth for domains:', replitDomains);

const getOidcConfig = memoize(
  async () => {
    const issuerUrl = process.env.ISSUER_URL ?? "https://replit.com/oidc";
    const clientId = process.env.REPL_ID!;
    const clientSecret = process.env.REPL_IDENTITY_KEY!;
    
    if (!clientId) {
      throw new Error('REPL_ID environment variable is required for OAuth configuration');
    }
    if (!clientSecret) {
      throw new Error('REPL_IDENTITY_KEY environment variable is required for OAuth configuration');
    }
    
    console.log('🔧 Creating OIDC configuration for Replit Auth...', {
      issuer: issuerUrl,
      client_id: clientId,
      has_identity_key: !!clientSecret,
      client_secret_length: clientSecret?.length || 0
    });
    
    try {
      // Use openid-client discovery to get OIDC endpoints with client credentials
      const config = await client.discovery(
        new URL(issuerUrl),
        clientId,
        clientSecret // Pass client secret for proper authentication
      );
      
      console.log('✅ OIDC configuration successfully created:', {
        issuer: (config as any).issuer,
        authorization_endpoint: (config as any).authorization_endpoint,
        token_endpoint: (config as any).token_endpoint,
        userinfo_endpoint: (config as any).userinfo_endpoint,
        client_id: (config as any).client_id,
        client_authentication_method: (config as any).client_authentication_method || 'client_secret_basic'
      });
      
      return config;
    } catch (error) {
      console.error('❌ OIDC configuration failed:', {
        error: (error as Error).message,
        stack: (error as Error).stack,
        issuer: issuerUrl,
        hasClientId: !!clientId,
        hasClientSecret: !!clientSecret,
        clientIdLength: clientId?.length || 0,
        clientSecretLength: clientSecret?.length || 0
      });
      throw error;
    }
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

// Store registered domains for lookup
const registeredDomains = new Map<string, string>();

function findMatchingDomain(hostname: string): string | null {
  // Direct match
  if (registeredDomains.has(hostname)) {
    return registeredDomains.get(hostname)!;
  }
  
  // Check for partial matches (for cases where req.hostname might be different)
  for (const [registered, original] of Array.from(registeredDomains.entries())) {
    if (hostname === registered || registered.includes(hostname) || hostname.includes(registered)) {
      return original;
    }
  }
  
  return null;
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  console.log('🔧 Setting up OAuth with environment:', {
    issuer: process.env.ISSUER_URL ?? "https://replit.com/oidc",
    clientId: process.env.REPL_ID,
    hasClientId: !!process.env.REPL_ID,
    hasClientSecret: !!process.env.REPL_IDENTITY_KEY,
    replitDomains: replitDomains
  });

  const config = await getOidcConfig();
  
  if (!config) {
    throw new Error('OIDC configuration is null or undefined');
  }
  
  console.log('✅ OIDC configuration ready for use:', {
    issuer: (config as any).issuer,
    client_id: (config as any).client_id,
    hasAuthEndpoint: !!(config as any).authorization_endpoint,
    hasTokenEndpoint: !!(config as any).token_endpoint
  });

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    try {
      const claims = tokens.claims();
      console.log('🔐 OAuth verify callback - claims:', { 
        sub: claims?.sub, 
        email: claims?.email,
        hasAccessToken: !!tokens.access_token,
        hasRefreshToken: !!tokens.refresh_token,
        tokenType: tokens.token_type
      });
      
      const user = {};
      updateUserSession(user, tokens);
      await upsertUser(claims);
      
      console.log('✅ OAuth verification successful for user:', claims?.sub);
      verified(null, user);
    } catch (error) {
      console.error('❌ OAuth verification failed:', error);
      console.error('OAuth verification error details:', {
        message: (error as Error).message,
        stack: (error as Error).stack,
        name: (error as Error).name
      });
      verified(error, null);
    }
  };

  const domains = replitDomains.split(",");
  console.log('🔧 Registering auth strategies for domains:', domains);
  
  for (const domain of domains) {
    const trimmedDomain = domain.trim();
    const strategyName = `replitauth:${trimmedDomain}`;
    
    // Store domain mapping
    registeredDomains.set(trimmedDomain, strategyName);
    
    const callbackURL = trimmedDomain === 'localhost' 
      ? `http://${trimmedDomain}:5000/api/callback`
      : `https://${trimmedDomain}/api/callback`;
      
    console.log('🔧 Creating OAuth strategy:', {
      name: strategyName,
      scope: "openid email profile offline_access",
      callbackURL,
      issuer: (config as any).issuer
    });
    
    // Create strategy with proper client authentication
    const strategy = new Strategy(
      {
        name: strategyName,
        config,
        scope: "openid email profile offline_access",
        callbackURL,
      },
      verify
    );
    passport.use(strategy);
    console.log(`✅ Registered strategy: ${strategyName} with callback URL: ${trimmedDomain === 'localhost' ? `http://${trimmedDomain}:5000/api/callback` : `https://${trimmedDomain}/api/callback`}`);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    const hostname = req.hostname || req.get('host') || 'localhost';
    const matchingDomain = findMatchingDomain(hostname);
    
    if (!matchingDomain) {
      console.error(`❌ No matching strategy found for hostname: ${hostname}`);
      console.log('Available registered domains:', Array.from(registeredDomains.keys()));
      return res.status(500).json({ 
        error: 'Authentication configuration error',
        hostname,
        availableDomains: Array.from(registeredDomains.keys())
      });
    }
    
    console.log(`🔐 Login attempt - hostname: ${hostname}, using strategy: ${matchingDomain}`);
    passport.authenticate(matchingDomain, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    const hostname = req.hostname || req.get('host') || 'localhost';
    const matchingDomain = findMatchingDomain(hostname);
    
    if (!matchingDomain) {
      console.error(`❌ No matching strategy found for callback hostname: ${hostname}`);
      console.log('Available registered domains:', Array.from(registeredDomains.keys()));
      console.log('Request headers:', req.headers);
      return res.status(500).json({ 
        error: 'Authentication callback configuration error',
        hostname,
        availableDomains: Array.from(registeredDomains.keys())
      });
    }
    
    console.log(`🔐 Callback attempt - hostname: ${hostname}, using strategy: ${matchingDomain}`);
    
    passport.authenticate(matchingDomain, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
      failureFlash: false
    })(req, res, (err: any) => {
      if (err) {
        console.error(`❌ OAuth callback error for strategy ${matchingDomain}:`, err);
        console.error('Full error details:', {
          message: err.message,
          stack: err.stack,
          name: err.name,
          cause: err.cause,
          code: err.code,
          // Try to capture OAuth-specific error details
          error: err.error,
          error_description: err.error_description,
          error_uri: err.error_uri,
          statusCode: err.statusCode,
          response: err.response,
          // Additional openid-client specific error fields
          error_code: err.error_code,
          error_details: err.error_details,
          params: err.params
        });
        
        // Log additional request context for debugging
        console.error('Request context:', {
          url: req.url,
          query: req.query,
          method: req.method,
          hostname: req.hostname,
          headers: {
            host: req.headers.host,
            'user-agent': req.headers['user-agent'],
            referer: req.headers.referer,
            'content-type': req.headers['content-type'],
            authorization: req.headers.authorization ? '[REDACTED]' : undefined
          }
        });
        
        return res.redirect('/api/login?error=oauth_callback_failed');
      }
      console.log('✅ OAuth callback successful, redirecting to /');
    });
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};