// Hard guard to prevent i18n initialization when feature flag is off
const I18N_ENABLED = import.meta.env.VITE_I18N_ENABLED === 'true';

// Language configuration for FixitQuick
export const languages = {
  en: 'English',
  hi: 'हिंदी', // Hindi
  mr: 'मराठी', // Marathi
  bn: 'বাংলা', // Bengali
  ta: 'தமিழ்', // Tamil
  te: 'తెలుগু', // Telugu
  gu: 'ગુજરાતી', // Gujarati
  kn: 'ಕನ್ನಡ', // Kannada
  ml: 'മലയാളം', // Malayalam
};

let i18n: any;
let i18nInitialized = false;
let i18nInitPromise: Promise<any> | null = null;

// Runtime verification flag
let runtimeVerificationComplete = false;

if (!I18N_ENABLED) {
  // No-op i18n instance when disabled
  i18n = {
    changeLanguage: (lng: string) => Promise.resolve(),
    language: 'en',
    t: (key: string, options?: any) => key,
    init: () => Promise.resolve(),
  };
} else {
  // Initialize i18n only when enabled with runtime verification
  i18nInitPromise = import('i18next').then(async ({ default: i18next }) => {
    const { initReactI18next } = await import('react-i18next');
    const { default: LanguageDetector } = await import('i18next-browser-languagedetector');
    const { default: Backend } = await import('i18next-http-backend');

    // Browser language detection configuration
    const detection = {
      // Order of detection
      order: ['localStorage', 'navigator', 'htmlTag', 'path', 'subdomain'],
      
      // Keys to lookup language from
      lookupLocalStorage: 'fixitquick_language',
      
      // Cache user language on
      caches: ['localStorage'],
      
      // Exclude certain languages from being detected
      excludeCacheFor: ['cimode'],
      
      // Check whitelist for detected language
      checkWhitelist: true,
    };

    // Initialize i18next
    i18next
      // Load translation files from backend/public folder
      .use(Backend)
      // Detect user language
      .use(LanguageDetector)
      // Pass the i18n instance to react-i18next
      .use(initReactI18next)
      // Initialize i18next
      .init({
        // Default language
        lng: 'en', // Default to English
        fallbackLng: 'en', // Fallback to English if translation not found
        
        // Supported languages whitelist
        supportedLngs: Object.keys(languages),
        
        // Language detection configuration
        detection,
        
        // Debug mode - set to true during development
        debug: import.meta.env.DEV,
        
        // Interpolation configuration
        interpolation: {
          escapeValue: false, // React already escapes values
          format: function(value, format, lng) {
            // Custom formatters for Indian localization
            if (format === 'currency') {
              const locale = lng === 'hi' ? 'hi-IN' : 'en-IN';
              return new Intl.NumberFormat(locale, {
                style: 'currency',
                currency: 'INR',
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
              }).format(value);
            }
            
            if (format === 'number') {
              const locale = lng === 'hi' ? 'hi-IN' : 'en-IN';
              return new Intl.NumberFormat(locale).format(value);
            }
            
            if (format === 'date') {
              const locale = lng === 'hi' ? 'hi-IN' : 'en-IN';
              return new Intl.DateTimeFormat(locale, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              }).format(new Date(value));
            }
            
            if (format === 'time') {
              const locale = lng === 'hi' ? 'hi-IN' : 'en-IN';
              return new Intl.DateTimeFormat(locale, {
                hour: '2-digit',
                minute: '2-digit',
                hour12: lng === 'en', // 12-hour for English, 24-hour for Hindi
              }).format(new Date(value));
            }
            
            return value;
          }
        },
        
        // Backend configuration for loading translation files
        backend: {
          // Path to load translations from
          loadPath: '/locales/{{lng}}/{{ns}}.json',
          
          // Allow cross domain requests
          crossDomain: false,
          
          // Request options
          requestOptions: {
            cache: 'default',
          },
        },
        
        // Namespace configuration
        defaultNS: 'common',
        ns: ['common', 'auth', 'services', 'orders', 'payments', 'profile', 'admin'],
        
        // Translation loading configuration
        load: 'languageOnly', // Load only language without region (en instead of en-US)
        
        // Plural separator
        pluralSeparator: '_',
        contextSeparator: '_',
        
        // React configuration
        react: {
          // Use React suspense mode
          useSuspense: true,
          
          // Bind i18n instance to component
          bindI18n: 'languageChanged',
          bindI18nStore: '',
          
          // Translation component defaults
          transEmptyNodeValue: '',
          transSupportBasicHtmlNodes: true,
          transKeepBasicHtmlNodesFor: ['br', 'strong', 'i', 'em', 'span'],
          
          // Unescape HTML entities
          unescape: true,
        },
        
        // Save missing translation keys
        saveMissing: import.meta.env.DEV,
        missingKeyHandler: import.meta.env.DEV ? (lng, ns, key) => {
          console.warn(`Missing translation key: ${key} for language: ${lng} in namespace: ${ns}`);
        } : undefined,
        
        // Parsing configuration
        parseMissingKeyHandler: (key) => {
          return `[MISSING: ${key}]`;
        },
      })
      .then(() => {
        // Runtime verification on successful initialization
        i18nInitialized = true;
        runtimeVerificationComplete = true;
        
        // Log successful initialization once
        console.log('✅ i18n: Initialization successful');
        console.log(`📋 i18n: Language detected: ${i18next.language}`);
        console.log(`🌐 i18n: Supported languages: ${Object.keys(languages).join(', ')}`);
        
        // Verify HttpBackend configuration by testing a key lookup
        try {
          const testTranslation = i18next.t('app.name');
          console.log(`🔧 i18n: HttpBackend test: ${testTranslation}`);
          
          // Test if fallback works
          const fallbackTest = i18next.t('nonexistent.key', 'fallback_value');
          console.log(`🔄 i18n: Fallback test: ${fallbackTest}`);
          
        } catch (error) {
          console.warn('⚠️ i18n: Translation test failed:', error);
        }
        
        // Update the exported i18n instance
        i18n = i18next;
      })
      .catch((error) => {
        console.error('❌ i18n: Initialization failed:', error);
        
        // Fallback to English-only mode on initialization failure
        i18n = {
          changeLanguage: (lng: string) => {
            console.warn(`i18n initialization failed - staying on English`);
            return Promise.resolve();
          },
          language: 'en',
          t: (key: string, options?: any) => {
            // Return the key as fallback or a provided default value
            if (typeof options === 'string') return options;
            if (options && options.defaultValue) return options.defaultValue;
            return key.split('.').pop() || key;
          },
          init: () => Promise.resolve(),
        };
      });
  });
}

// Export i18n instance
export default i18n;

// Helper functions for language management
export const changeLanguage = async (lng: string) => {
  if (!I18N_ENABLED) return Promise.resolve();
  
  // Wait for i18n to be initialized if it's still loading
  if (i18nInitPromise && !i18nInitialized) {
    try {
      await i18nInitPromise;
    } catch (error) {
      console.warn('i18n not initialized, language change failed');
      return Promise.reject(error);
    }
  }
  
  return i18n.changeLanguage(lng);
};

export const getCurrentLanguage = () => {
  if (!I18N_ENABLED) return 'en';
  return i18n.language || 'en';
};

export const getSupportedLanguages = () => {
  if (!I18N_ENABLED) return [{ code: 'en', name: 'English', isRTL: false }];
  return Object.entries(languages).map(([code, name]) => ({
    code,
    name,
    isRTL: ['ur', 'ar'].includes(code), // Add more RTL languages as needed
  }));
};

export const isLanguageSupported = (lng: string) => {
  if (!I18N_ENABLED) return lng === 'en';
  return Object.keys(languages).includes(lng);
};

// Runtime verification helper
export const getI18nStatus = () => {
  return {
    enabled: I18N_ENABLED,
    initialized: i18nInitialized,
    verificationComplete: runtimeVerificationComplete,
    currentLanguage: getCurrentLanguage(),
  };
};

// Indian locale utilities
export const formatIndianCurrency = (amount: number, language: string = 'en') => {
  if (!I18N_ENABLED) return `₹${amount}`;
  const locale = language === 'hi' ? 'hi-IN' : 'en-IN';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatIndianNumber = (num: number, language: string = 'en') => {
  if (!I18N_ENABLED) return num.toString();
  const locale = language === 'hi' ? 'hi-IN' : 'en-IN';
  return new Intl.NumberFormat(locale).format(num);
};

export const formatIndianDate = (date: Date | string, language: string = 'en') => {
  if (!I18N_ENABLED) return new Date(date).toLocaleDateString('en-IN');
  const locale = language === 'hi' ? 'hi-IN' : 'en-IN';
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
};

export const formatIndianTime = (date: Date | string, language: string = 'en') => {
  if (!I18N_ENABLED) return new Date(date).toLocaleTimeString('en-IN');
  const locale = language === 'hi' ? 'hi-IN' : 'en-IN';
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: language === 'en', // 12-hour for English, 24-hour for Hindi
  }).format(new Date(date));
};