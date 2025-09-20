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
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  
  // In development, use MemoryStore as fallback or enable createTableIfMissing
  let sessionStore;
  if (process.env.NODE_ENV === 'development') {
    try {
      const pgStore = connectPg(session);
      sessionStore = new pgStore({
        conString: process.env.DATABASE_URL,
        createTableIfMissing: true, // Enable in development
        ttl: sessionTtl,
        tableName: "sessions",
      });
      console.log('🔧 Development: Using PostgreSQL session store with auto-create tables');
    } catch (error) {
      console.warn('⚠️ Development: PostgreSQL session store failed, falling back to MemoryStore:', error);
      const MemoryStore = require('memorystore')(session);
      sessionStore = new MemoryStore({
        checkPeriod: sessionTtl, // Prune expired entries every TTL
      });
    }
  } else {
    // Production: Use PostgreSQL only
    const pgStore = connectPg(session);
    sessionStore = new pgStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: false,
      ttl: sessionTtl,
      tableName: "sessions",
    });
    console.log('🔧 Production: Using PostgreSQL session store');
  }

  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Environment-dependent security
      sameSite: 'lax', // Add sameSite for CSRF protection while allowing OAuth redirects
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
  console.log('🔐 replitAuth.upsertUser: Starting upsert for user', { 
    id: claims["sub"], 
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"] 
  });
  
  try {
    await storage.upsertUser({
      id: claims["sub"],
      email: claims["email"],
      firstName: claims["first_name"],
      lastName: claims["last_name"],
      profileImageUrl: claims["profile_image_url"],
    });
    console.log('✅ replitAuth.upsertUser: Successfully upserted user', claims["sub"]);
  } catch (error: any) {
    console.error('❌ replitAuth.upsertUser: Failed to upsert user', { 
      userId: claims["sub"], 
      error: error.message,
      stack: error.stack 
    });
    throw error; // Re-throw to ensure OAuth fails if user creation fails
  }
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
    
    // Store the referrer URL to redirect back after OAuth
    const referer = req.get('Referer') || req.headers.referer as string;
    if (referer) {
      // Store in session for callback redirect
      (req.session as any).returnTo = referer;
      try {
        const returnUrl = new URL(referer);
        console.log(`🔗 Storing return URL for post-OAuth redirect: ${returnUrl.pathname}`);
      } catch {
        console.log(`🔗 Storing return URL for post-OAuth redirect: [URL]`);
      }
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
      failureRedirect: '/api/login?error=oauth_callback_failed'
    })(req, res, (err: any) => {
      if (err) {
        console.error(`❌ OAuth callback error for strategy ${matchingDomain}:`, err);
        return res.redirect('/api/login?error=oauth_callback_failed');
      }

      // Get the stored return URL from session
      const returnTo = (req.session as any)?.returnTo;
      
      // Determine smart redirect destination
      let redirectPath = '/';
      
      if (returnTo) {
        // Extract path and query string from full URL if it's from the same domain
        try {
          const returnUrl = new URL(returnTo);
          const currentUrl = new URL(`${req.protocol}://${req.get('host')}`);
          
          if (returnUrl.hostname === currentUrl.hostname) {
            redirectPath = returnUrl.pathname + returnUrl.search;
            console.log(`🔗 OAuth success - redirecting back to original page: ${returnUrl.pathname}`);
          } else {
            console.log(`⚠️ OAuth success - returnTo URL from different domain, using default redirect`);
          }
        } catch (urlError) {
          console.log(`⚠️ OAuth success - invalid returnTo URL, using default redirect`);
        }
        
        // Clear the stored return URL
        delete (req.session as any).returnTo;
      } else {
        console.log(`🔗 OAuth success - no return URL stored, redirecting to homepage`);
      }
      
      res.redirect(redirectPath);
      console.log(`✅ OAuth callback successful, redirecting to: ${redirectPath}`);
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