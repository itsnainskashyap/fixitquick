import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

// Production safety validation
function validateProductionSafety() {
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development';
  const allowDevAuth = process.env.ALLOW_DEV_AUTH === 'true';
  
  console.log('\n🔒 SECURITY VALIDATION STARTING...');
  console.log(`Environment: ${process.env.NODE_ENV || 'undefined'}`);
  console.log(`Dev Auth Allowed: ${allowDevAuth}`);
  
  // CRITICAL: Prevent dev auth in production
  if (isProduction && allowDevAuth) {
    console.error('\n'.repeat(5));
    console.error('🚨'.repeat(50));
    console.error('🚨 CRITICAL SECURITY VIOLATION DETECTED!!');
    console.error('🚨');
    console.error('🚨 ALLOW_DEV_AUTH=true is set in PRODUCTION!!');
    console.error('🚨 This creates a MASSIVE security vulnerability!');
    console.error('🚨');
    console.error('🚨 IMMEDIATE ACTION REQUIRED:');
    console.error('🚨 1. Set ALLOW_DEV_AUTH=false');
    console.error('🚨 2. Restart the application');
    console.error('🚨 3. Review all environment variables');
    console.error('🚨');
    console.error('🚨'.repeat(50));
    console.error('\n'.repeat(5));
    
    process.exit(1); // Force shutdown
  }
  
  // Validate required environment variables for production
  if (isProduction) {
    const requiredEnvVars = [
      'DATABASE_URL',
      'JWT_SECRET_KEY',
      'TWILIO_ACCOUNT_SID',
      'TWILIO_AUTH_TOKEN'
    ];
    
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.error('🚨 Production Environment Validation Failed!');
      console.error('🚨 Missing required environment variables:');
      missingVars.forEach(varName => {
        console.error(`🚨   - ${varName}`);
      });
      console.error('🚨 Application cannot start safely in production.');
      process.exit(1);
    }
    
    console.log('✅ Production environment validated successfully');
    console.log('✅ All required environment variables present');
    console.log('✅ Development authentication disabled');
  }
  
  // Development environment information
  if (isDevelopment) {
    console.log('\n🔧 DEVELOPMENT ENVIRONMENT DETECTED');
    
    if (allowDevAuth) {
      console.log('⚠️  Development authentication ENABLED');
      console.log('⚠️  Security reminder: NEVER enable in production!');
    } else {
      console.log('🔒 Development authentication DISABLED');
      console.log('💡 To enable: set ALLOW_DEV_AUTH=true');
    }
    
    // Check for optional dev conveniences
    const devConveniences = {
      'SKIP_OTP_RATE_LIMIT': process.env.SKIP_OTP_RATE_LIMIT === 'true',
      'TWILIO_DEV_FALLBACK': process.env.TWILIO_DEV_FALLBACK === 'true',
    };
    
    console.log('\n🔧 Development conveniences:');
    Object.entries(devConveniences).forEach(([key, enabled]) => {
      console.log(`   ${enabled ? '✅' : '❌'} ${key}: ${enabled}`);
    });
  }
  
  console.log('✅ Security validation completed successfully\n');
}

const app = express();

// Configure trust proxy for proper rate limiting
app.set('trust proxy', 1);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Run security validation before starting the server
  validateProductionSafety();
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    // Add SPA rewrite middleware to prevent Vite HTML proxy module errors
    app.use((req, _res, next) => {
      if (
        req.method === 'GET' &&
        !req.path.startsWith('/api') &&
        !req.path.startsWith('/@') && // Vite internals/HMR
        !req.path.startsWith('/src') && // source modules
        !req.path.includes('.') // skip asset/file requests
      ) {
        req.url = '/'; // Rewrite to root for Vite to process
      }
      next();
    });
    
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
