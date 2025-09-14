import { useTranslation } from 'react-i18next';

// Type definitions for locale-specific formatting
export interface LocaleFormatOptions {
  language?: string;
  region?: string;
  currency?: string;
  numberFormat?: 'indian' | 'international';
  dateFormat?: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  timeFormat?: '12h' | '24h';
}

// Indian states and their major cities for region selection
export const INDIAN_REGIONS = {
  'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Tirupati'],
  'Assam': ['Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat'],
  'Bihar': ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur'],
  'Chhattisgarh': ['Raipur', 'Bilaspur', 'Korba', 'Durg'],
  'Delhi': ['New Delhi', 'Central Delhi', 'South Delhi', 'North Delhi', 'East Delhi', 'West Delhi'],
  'Goa': ['Panaji', 'Margao', 'Vasco da Gama', 'Mapusa'],
  'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Gandhinagar'],
  'Haryana': ['Faridabad', 'Gurgaon', 'Panipat', 'Ambala'],
  'Himachal Pradesh': ['Shimla', 'Dharamshala', 'Manali', 'Kullu'],
  'Jharkhand': ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro'],
  'Karnataka': ['Bangalore', 'Mysore', 'Hubli-Dharwad', 'Mangalore', 'Belgaum'],
  'Kerala': ['Kochi', 'Thiruvananthapuram', 'Kozhikode', 'Thrissur', 'Kollam'],
  'Madhya Pradesh': ['Bhopal', 'Indore', 'Gwalior', 'Jabalpur', 'Ujjain'],
  'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Aurangabad'],
  'Odisha': ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Brahmapur'],
  'Punjab': ['Chandigarh', 'Ludhiana', 'Amritsar', 'Jalandhar'],
  'Rajasthan': ['Jaipur', 'Udaipur', 'Jodhpur', 'Kota', 'Ajmer'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem'],
  'Telangana': ['Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar'],
  'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Ghaziabad', 'Agra', 'Varanasi', 'Meerut'],
  'West Bengal': ['Kolkata', 'Howrah', 'Durgapur', 'Asansol', 'Siliguri'],
} as const;

// Get all cities for dropdown/search
export const getAllIndianCities = (): Array<{ state: string; city: string; displayName: string }> => {
  const cities: Array<{ state: string; city: string; displayName: string }> = [];
  
  Object.entries(INDIAN_REGIONS).forEach(([state, stateCities]) => {
    stateCities.forEach(city => {
      cities.push({
        state,
        city,
        displayName: `${city}, ${state}`
      });
    });
  });
  
  return cities.sort((a, b) => a.city.localeCompare(b.city));
};

// Indian number formatting with lakhs and crores
export const formatIndianNumber = (
  num: number, 
  options: { 
    language?: string; 
    notation?: 'standard' | 'compact' | 'indian';
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  } = {}
): string => {
  const { language = 'en', notation = 'indian', minimumFractionDigits, maximumFractionDigits } = options;
  
  if (notation === 'indian') {
    // Custom Indian numbering system (lakhs, crores)
    const formatWithIndianSystem = (value: number): string => {
      if (value >= 10000000) { // 1 crore
        const crores = value / 10000000;
        return `${crores.toFixed(crores >= 100 ? 0 : 1)} ${language === 'hi' ? 'करोड़' : 'Cr'}`;
      } else if (value >= 100000) { // 1 lakh
        const lakhs = value / 100000;
        return `${lakhs.toFixed(lakhs >= 100 ? 0 : 1)} ${language === 'hi' ? 'लाख' : 'L'}`;
      } else if (value >= 1000) { // 1 thousand
        const thousands = value / 1000;
        return `${thousands.toFixed(thousands >= 100 ? 0 : 1)} ${language === 'hi' ? 'हज़ार' : 'K'}`;
      }
      
      return value.toLocaleString(language === 'hi' ? 'hi-IN' : 'en-IN');
    };
    
    return formatWithIndianSystem(num);
  }
  
  const locale = language === 'hi' ? 'hi-IN' : 'en-IN';
  return new Intl.NumberFormat(locale, {
    notation: notation === 'indian' ? 'standard' : notation,
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(num);
};

// Currency formatting with Indian Rupee symbol
export const formatCurrency = (
  amount: number,
  options: {
    language?: string;
    currency?: string;
    notation?: 'standard' | 'compact' | 'indian';
    showDecimals?: boolean;
  } = {}
): string => {
  const { 
    language = 'en', 
    currency = 'INR', 
    notation = 'standard',
    showDecimals = true 
  } = options;
  
  const locale = language === 'hi' ? 'hi-IN' : 'en-IN';
  
  if (notation === 'indian' && currency === 'INR') {
    // Custom formatting for Indian currency with lakhs/crores
    const indianAmount = formatIndianNumber(amount, { language, notation: 'indian' });
    return `₹${indianAmount}`;
  }
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    notation: notation === 'indian' ? 'standard' : notation,
    minimumFractionDigits: showDecimals ? (amount % 1 === 0 ? 0 : 2) : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(amount);
};

// Date formatting for Indian locale (DD/MM/YYYY)
export const formatDate = (
  date: Date | string | number,
  options: {
    language?: string;
    format?: 'short' | 'medium' | 'long' | 'full' | 'DD/MM/YYYY';
    includeTime?: boolean;
    timeFormat?: '12h' | '24h';
  } = {}
): string => {
  const { language = 'en', format = 'medium', includeTime = false, timeFormat = '12h' } = options;
  const locale = language === 'hi' ? 'hi-IN' : 'en-IN';
  const dateObj = new Date(date);
  
  if (format === 'DD/MM/YYYY') {
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    
    if (includeTime) {
      const timeStr = formatTime(dateObj, { language, timeFormat });
      return `${day}/${month}/${year} ${timeStr}`;
    }
    
    return `${day}/${month}/${year}`;
  }
  
  const dateOptions: Intl.DateTimeFormatOptions = {
    dateStyle: format as Intl.DateTimeFormatOptions['dateStyle'],
  };
  
  if (includeTime) {
    dateOptions.timeStyle = 'short';
  }
  
  return new Intl.DateTimeFormat(locale, dateOptions).format(dateObj);
};

// Time formatting
export const formatTime = (
  date: Date | string | number,
  options: {
    language?: string;
    timeFormat?: '12h' | '24h';
    includeSeconds?: boolean;
  } = {}
): string => {
  const { language = 'en', timeFormat = '12h', includeSeconds = false } = options;
  const locale = language === 'hi' ? 'hi-IN' : 'en-IN';
  const dateObj = new Date(date);
  
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    second: includeSeconds ? '2-digit' : undefined,
    hour12: timeFormat === '12h',
  }).format(dateObj);
};

// Phone number formatting for Indian numbers
export const formatPhoneNumber = (
  phone: string,
  options: {
    countryCode?: string;
    format?: 'international' | 'national' | 'compact';
  } = {}
): string => {
  const { countryCode = '+91', format = 'national' } = options;
  
  // Remove all non-digits
  const cleaned = phone.replace(/\D/g, '');
  
  // Handle Indian phone numbers (10 digits)
  if (cleaned.length === 10) {
    const formatted = cleaned.replace(/(\d{5})(\d{5})/, '$1 $2');
    
    switch (format) {
      case 'international':
        return `${countryCode} ${formatted}`;
      case 'compact':
        return cleaned;
      case 'national':
      default:
        return formatted;
    }
  }
  
  // Handle international format with country code
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    const number = cleaned.substring(2);
    const formatted = number.replace(/(\d{5})(\d{5})/, '$1 $2');
    
    switch (format) {
      case 'international':
        return `+91 ${formatted}`;
      case 'compact':
        return cleaned;
      case 'national':
      default:
        return formatted;
    }
  }
  
  return phone; // Return as-is if format doesn't match
};

// Address formatting for Indian addresses
export const formatAddress = (
  address: {
    line1?: string;
    line2?: string;
    landmark?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
  },
  options: {
    language?: string;
    format?: 'full' | 'compact' | 'single-line';
  } = {}
): string => {
  const { language = 'en', format = 'full' } = options;
  const { line1, line2, landmark, city, state, pincode, country = 'India' } = address;
  
  const parts: string[] = [];
  
  if (line1) parts.push(line1);
  if (line2) parts.push(line2);
  if (landmark) parts.push(`Near ${landmark}`);
  
  const locationParts: string[] = [];
  if (city) locationParts.push(city);
  if (state && state !== city) locationParts.push(state);
  if (pincode) locationParts.push(pincode);
  if (country && format === 'full') locationParts.push(country);
  
  if (locationParts.length > 0) {
    parts.push(locationParts.join(', '));
  }
  
  const separator = format === 'single-line' ? ', ' : '\n';
  return parts.join(separator);
};

// Distance formatting
export const formatDistance = (
  distanceInKm: number,
  options: {
    language?: string;
    unit?: 'km' | 'auto';
  } = {}
): string => {
  const { language = 'en', unit = 'auto' } = options;
  
  if (unit === 'auto') {
    if (distanceInKm < 1) {
      const meters = Math.round(distanceInKm * 1000);
      return `${meters} ${language === 'hi' ? 'मीटर' : 'm'}`;
    }
  }
  
  const formatted = distanceInKm < 10 ? distanceInKm.toFixed(1) : Math.round(distanceInKm);
  return `${formatted} ${language === 'hi' ? 'किमी' : 'km'}`;
};

// Duration formatting (for service duration, delivery time, etc.)
export const formatDuration = (
  minutes: number,
  options: {
    language?: string;
    format?: 'short' | 'long';
  } = {}
): string => {
  const { language = 'en', format = 'short' } = options;
  
  if (minutes < 60) {
    const unit = language === 'hi' ? 
      (format === 'short' ? 'मिनट' : 'मिनट') : 
      (format === 'short' ? 'min' : 'minutes');
    return `${minutes} ${unit}`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    const unit = language === 'hi' ? 
      (format === 'short' ? 'घंटे' : 'घंटे') : 
      (format === 'short' ? 'hr' : (hours === 1 ? 'hour' : 'hours'));
    return `${hours} ${unit}`;
  }
  
  const hourUnit = language === 'hi' ? 
    (format === 'short' ? 'घ' : 'घंटे') : 
    (format === 'short' ? 'h' : (hours === 1 ? 'hr' : 'hrs'));
  const minUnit = language === 'hi' ? 
    (format === 'short' ? 'मि' : 'मिनट') : 
    (format === 'short' ? 'm' : 'min');
    
  return `${hours}${hourUnit} ${remainingMinutes}${minUnit}`;
};

// Festival and holiday awareness for Indian market
export const getIndianFestivals = (year: number = new Date().getFullYear()) => {
  // This would typically come from an API or be updated annually
  // For now, returning major festivals with approximate dates
  return [
    { name: 'Diwali', nameHi: 'दिवाली', date: new Date(year, 10, 4), type: 'major' },
    { name: 'Holi', nameHi: 'होली', date: new Date(year, 2, 25), type: 'major' },
    { name: 'Eid', nameHi: 'ईद', date: new Date(year, 3, 22), type: 'major' },
    { name: 'Durga Puja', nameHi: 'दुर्गा पूजा', date: new Date(year, 9, 15), type: 'regional' },
    { name: 'Ganesh Chaturthi', nameHi: 'गणेश चतुर्थी', date: new Date(year, 8, 10), type: 'regional' },
    { name: 'Navratri', nameHi: 'नवरात्रि', date: new Date(year, 9, 7), type: 'regional' },
  ];
};

// Check if current date is near a major Indian festival
export const isNearFestival = (days: number = 7): boolean => {
  const today = new Date();
  const festivals = getIndianFestivals();
  
  return festivals.some(festival => {
    const timeDiff = Math.abs(festival.date.getTime() - today.getTime());
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    return daysDiff <= days;
  });
};

// React hook for accessing current locale formatting
export const useLocaleFormatting = () => {
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language;
  
  return {
    language: currentLanguage,
    formatNumber: (num: number, options?: any) => formatIndianNumber(num, { language: currentLanguage, ...options }),
    formatCurrency: (amount: number, options?: any) => formatCurrency(amount, { language: currentLanguage, ...options }),
    formatDate: (date: Date | string | number, options?: any) => formatDate(date, { language: currentLanguage, ...options }),
    formatTime: (date: Date | string | number, options?: any) => formatTime(date, { language: currentLanguage, ...options }),
    formatPhone: (phone: string, options?: any) => formatPhoneNumber(phone, options),
    formatAddress: (address: any, options?: any) => formatAddress(address, { language: currentLanguage, ...options }),
    formatDistance: (distance: number, options?: any) => formatDistance(distance, { language: currentLanguage, ...options }),
    formatDuration: (minutes: number, options?: any) => formatDuration(minutes, { language: currentLanguage, ...options }),
  };
};