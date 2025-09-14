export interface CountryCode {
  name: string;
  code: string;
  dialCode: string;
  flag: string;
  format: string; // Phone number format example
}

export const countryCodes: CountryCode[] = [
  // Popular countries first
  {
    name: 'India',
    code: 'IN', 
    dialCode: '+91',
    flag: '🇮🇳',
    format: '9876543210'
  },
  {
    name: 'United States',
    code: 'US',
    dialCode: '+1', 
    flag: '🇺🇸',
    format: '(555) 123-4567'
  },
  {
    name: 'United Kingdom',
    code: 'GB',
    dialCode: '+44',
    flag: '🇬🇧', 
    format: '7911 123456'
  },
  {
    name: 'Canada',
    code: 'CA',
    dialCode: '+1',
    flag: '🇨🇦',
    format: '(555) 123-4567' 
  },
  {
    name: 'Australia',
    code: 'AU',
    dialCode: '+61',
    flag: '🇦🇺',
    format: '0412 345 678'
  },
  // Other countries alphabetically
  {
    name: 'Afghanistan',
    code: 'AF',
    dialCode: '+93',
    flag: '🇦🇫',
    format: '70 123 4567'
  },
  {
    name: 'Bangladesh',
    code: 'BD',
    dialCode: '+880',
    flag: '🇧🇩',
    format: '1812-345678'
  },
  {
    name: 'Brazil',
    code: 'BR',
    dialCode: '+55',
    flag: '🇧🇷',
    format: '(11) 91234-5678'
  },
  {
    name: 'China',
    code: 'CN',
    dialCode: '+86',
    flag: '🇨🇳',
    format: '138 0013 8000'
  },
  {
    name: 'France',
    code: 'FR',
    dialCode: '+33',
    flag: '🇫🇷',
    format: '06 12 34 56 78'
  },
  {
    name: 'Germany',
    code: 'DE',
    dialCode: '+49',
    flag: '🇩🇪',
    format: '0151 23456789'
  },
  {
    name: 'Indonesia',
    code: 'ID',
    dialCode: '+62',
    flag: '🇮🇩',
    format: '0812-3456-7890'
  },
  {
    name: 'Italy',
    code: 'IT',
    dialCode: '+39',
    flag: '🇮🇹',
    format: '320 123 4567'
  },
  {
    name: 'Japan',
    code: 'JP',
    dialCode: '+81',
    flag: '🇯🇵',
    format: '080-1234-5678'
  },
  {
    name: 'Malaysia',
    code: 'MY',
    dialCode: '+60',
    flag: '🇲🇾',
    format: '012-345 6789'
  },
  {
    name: 'Mexico',
    code: 'MX',
    dialCode: '+52',
    flag: '🇲🇽',
    format: '55 1234 5678'
  },
  {
    name: 'Netherlands',
    code: 'NL',
    dialCode: '+31',
    flag: '🇳🇱',
    format: '06 12345678'
  },
  {
    name: 'Nigeria',
    code: 'NG',
    dialCode: '+234',
    flag: '🇳🇬',
    format: '0803 123 4567'
  },
  {
    name: 'Pakistan',
    code: 'PK',
    dialCode: '+92',
    flag: '🇵🇰',
    format: '0300 1234567'
  },
  {
    name: 'Philippines',
    code: 'PH',
    dialCode: '+63',
    flag: '🇵🇭',
    format: '0917 123 4567'
  },
  {
    name: 'Russia',
    code: 'RU',
    dialCode: '+7',
    flag: '🇷🇺',
    format: '9xx xxx-xx-xx'
  },
  {
    name: 'Singapore',
    code: 'SG',
    dialCode: '+65',
    flag: '🇸🇬',
    format: '8123 4567'
  },
  {
    name: 'South Africa',
    code: 'ZA',
    dialCode: '+27',
    flag: '🇿🇦',
    format: '082 123 4567'
  },
  {
    name: 'South Korea',
    code: 'KR',
    dialCode: '+82',
    flag: '🇰🇷',
    format: '010-1234-5678'
  },
  {
    name: 'Spain',
    code: 'ES',
    dialCode: '+34',
    flag: '🇪🇸',
    format: '612 34 56 78'
  },
  {
    name: 'Sri Lanka',
    code: 'LK',
    dialCode: '+94',
    flag: '🇱🇰',
    format: '071 234 5678'
  },
  {
    name: 'Thailand',
    code: 'TH',
    dialCode: '+66',
    flag: '🇹🇭',
    format: '081 234 5678'
  },
  {
    name: 'Turkey',
    code: 'TR',
    dialCode: '+90',
    flag: '🇹🇷',
    format: '0532 123 45 67'
  },
  {
    name: 'UAE',
    code: 'AE',
    dialCode: '+971',
    flag: '🇦🇪',
    format: '050 123 4567'
  },
  {
    name: 'Vietnam',
    code: 'VN',
    dialCode: '+84',
    flag: '🇻🇳',
    format: '091 234 56 78'
  }
];

// Always default to India for this application
export const getDefaultCountry = (): CountryCode => {
  return countryCodes[0]; // India is first in the list
};