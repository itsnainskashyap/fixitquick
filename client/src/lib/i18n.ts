import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

// Language configuration for FixitQuick
const languages = {
  en: 'English',
  hi: 'हिंदी', // Hindi
  mr: 'मराठी', // Marathi
  bn: 'বাংলা', // Bengali
  ta: 'தமிழ்', // Tamil
  te: 'తెలుగు', // Telugu
  gu: 'ગુજરાતી', // Gujarati
  kn: 'ಕನ್ನಡ', // Kannada
  ml: 'മലയാളം', // Malayalam
};

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
i18n
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
  });

// Export language configuration
export { languages };

// Export i18n instance
export default i18n;

// Helper functions for language management
export const changeLanguage = (lng: string) => {
  return i18n.changeLanguage(lng);
};

export const getCurrentLanguage = () => {
  return i18n.language;
};

export const getSupportedLanguages = () => {
  return Object.entries(languages).map(([code, name]) => ({
    code,
    name,
    isRTL: ['ur', 'ar'].includes(code), // Add more RTL languages as needed
  }));
};

export const isLanguageSupported = (lng: string) => {
  return Object.keys(languages).includes(lng);
};

// Indian locale utilities
export const formatIndianCurrency = (amount: number, language: string = 'en') => {
  const locale = language === 'hi' ? 'hi-IN' : 'en-IN';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatIndianNumber = (num: number, language: string = 'en') => {
  const locale = language === 'hi' ? 'hi-IN' : 'en-IN';
  return new Intl.NumberFormat(locale).format(num);
};

export const formatIndianDate = (date: Date | string, language: string = 'en') => {
  const locale = language === 'hi' ? 'hi-IN' : 'en-IN';
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
};

export const formatIndianTime = (date: Date | string, language: string = 'en') => {
  const locale = language === 'hi' ? 'hi-IN' : 'en-IN';
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: language === 'en', // 12-hour for English, 24-hour for Hindi
  }).format(new Date(date));
};