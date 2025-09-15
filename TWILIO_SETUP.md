# Twilio SMS Integration Setup Guide

This guide explains how to set up real Twilio API integration for SMS-based authentication in the FixitQuick application.

## Prerequisites

1. **Twilio Account**: Create a free account at [twilio.com](https://www.twilio.com)
2. **Phone Number**: Purchase a phone number from Twilio Console
3. **API Credentials**: Get your Account SID and Auth Token

## Step 1: Get Twilio Credentials

### 1.1 Create Twilio Account
- Go to [https://www.twilio.com](https://www.twilio.com)
- Sign up for a free account
- Verify your email and phone number

### 1.2 Get Account SID and Auth Token
- Log into Twilio Console
- Go to Dashboard → Account Info
- Copy your **Account SID** and **Auth Token**

### 1.3 Purchase Phone Number
- Go to Console → Phone Numbers → Manage → Buy a number
- Choose a number that supports SMS
- Complete the purchase

## Step 2: Environment Variables Setup

Add the following environment variables to your project:

### 2.1 Development Environment
Create or update your `.env` file:

```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_FROM_NUMBER=+1234567890

# Development Options
TWILIO_DEV_FALLBACK=true
NODE_ENV=development
```

### 2.2 Production Environment
For production, set these in your hosting platform:

```env
# Twilio Configuration (Production)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_FROM_NUMBER=+1234567890

# Production Settings
NODE_ENV=production
```

## Step 3: Environment Variable Details

### TWILIO_ACCOUNT_SID
- **Description**: Your unique Twilio Account identifier
- **Format**: Starts with "AC" followed by 32 characters
- **Example**: `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- **Where to find**: Twilio Console → Dashboard

### TWILIO_AUTH_TOKEN
- **Description**: Your secret authentication token
- **Format**: 32-character hexadecimal string
- **Example**: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- **Where to find**: Twilio Console → Dashboard
- **Security**: Keep this secret and never commit to version control

### TWILIO_FROM_NUMBER
- **Description**: Your Twilio phone number for sending SMS
- **Format**: E.164 format with country code
- **Example**: `+12345678901` (US), `+919876543210` (India)
- **Where to find**: Twilio Console → Phone Numbers → Manage

### TWILIO_DEV_FALLBACK (Development Only)
- **Description**: Enable fallback logging when using trial account
- **Values**: `true` or `false`
- **Default**: `false`
- **Use case**: For testing with unverified numbers in development

## Step 4: Testing the Integration

### 4.1 Verify Setup
Start your application and check the logs:

```bash
npm run dev
```

Look for these messages:
- ✅ `📱 Twilio SMS Service: Initialized successfully`
- ✅ `📱 Using Twilio number: +1***7890`
- ✅ `📱 Twilio connection test successful`

### 4.2 Test SMS Sending
1. Go to the login page
2. Enter a phone number (for trial accounts, use verified numbers only)
3. Click "Send OTP"
4. Check your phone for the SMS

### 4.3 Trial Account Limitations
- **Verified Numbers Only**: Trial accounts can only send to verified numbers
- **Add Numbers**: Go to Console → Phone Numbers → Verified Caller IDs
- **Upgrade**: Upgrade to paid account to send to any number

## Step 5: Supported Phone Number Formats

The system automatically handles various Indian phone number formats:

### Input Formats Supported:
- `9876543210` → `+919876543210`
- `98765 43210` → `+919876543210`
- `+91 9876543210` → `+919876543210`
- `91 9876543210` → `+919876543210`
- `919876543210` → `+919876543210`
- `+919876543210` → `+919876543210`

### Validation Rules:
- Must be 10 digits for Indian numbers
- Must start with 6, 7, 8, or 9
- Automatically adds +91 country code
- Supports international formats for other countries

## Step 6: Error Handling

### Common Errors and Solutions:

#### `🔧 Twilio SMS Service: Running in STUB mode`
- **Cause**: Missing environment variables
- **Solution**: Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER

#### `❌ Twilio SMS Service: Failed to initialize`
- **Cause**: Invalid credentials
- **Solution**: Double-check Account SID and Auth Token

#### `This number is not verified for SMS delivery in development mode`
- **Cause**: Trial account limitation
- **Solution**: Add phone number to verified caller IDs or set TWILIO_DEV_FALLBACK=true

#### `Invalid phone number format`
- **Cause**: Incorrect phone number format
- **Solution**: Use E.164 format (+1234567890)

## Step 7: Production Considerations

### 7.1 Security
- Never commit credentials to version control
- Use environment variables or secure secret management
- Regularly rotate Auth Tokens
- Monitor usage and billing

### 7.2 Rate Limiting
The application includes built-in rate limiting:
- 3 OTP requests per hour per phone number
- 30-second cooldown between requests
- 5 attempts per IP per 10 minutes

### 7.3 Monitoring
Monitor these metrics:
- SMS delivery rates
- Failed authentication attempts
- API usage and costs
- Error rates by error type

### 7.4 Scaling
For high volume:
- Consider Twilio's Messaging Services
- Implement proper queue management
- Monitor API rate limits
- Set up alerts for failures

## Step 8: Troubleshooting

### Check Environment Variables
```bash
# Verify variables are set
echo $TWILIO_ACCOUNT_SID
echo $TWILIO_AUTH_TOKEN  
echo $TWILIO_FROM_NUMBER
```

### Enable Debug Logging
Add to your environment:
```env
DEBUG=twilio*
LOG_LEVEL=debug
```

### Test with Twilio Console
Use Twilio Console's testing tools:
1. Go to Console → Programmable Messaging → Try it out
2. Send a test message to verify your setup
3. Check delivery reports

## Step 9: Cost Optimization

### Free Trial Credits
- New accounts get free credits
- Monitor usage in Twilio Console
- Upgrade when credits run low

### SMS Pricing
- India: ~$0.0395 per SMS
- US: ~$0.0075 per SMS
- Check current pricing: [Twilio Pricing](https://www.twilio.com/pricing)

### Cost Reduction Tips
- Implement SMS deduplication
- Use rate limiting to prevent abuse
- Consider WhatsApp for marketing messages
- Monitor and alert on usage spikes

## Support

If you encounter issues:
1. Check the application logs for error messages
2. Verify environment variables are correctly set
3. Test credentials in Twilio Console
4. Check [Twilio Documentation](https://www.twilio.com/docs)
5. Contact Twilio Support for API-related issues

## Security Checklist

- [ ] Environment variables are not committed to version control
- [ ] Auth Token is kept secret and secure
- [ ] Rate limiting is enabled and properly configured
- [ ] SMS content doesn't contain sensitive information
- [ ] Phone numbers are validated before sending
- [ ] Audit logging is enabled for compliance
- [ ] Failed attempts are monitored and alerted
- [ ] Production credentials are different from development