/**
 * Country Configuration — Multi-Country Foundation
 *
 * Currently UAE-only. This config is designed to be extended when
 * Origin expands to other GCC countries and Egypt.
 *
 * Usage:
 *   import { getCountryConfig, DEFAULT_COUNTRY } from './config/countries';
 *   const config = getCountryConfig('AE');
 *   console.log(config.currency); // 'AED'
 *
 * To add a new country:
 *   1. Add a new entry to COUNTRY_CONFIGS
 *   2. Add the country code to CountryCode type
 *   3. Update payment provider integrations if needed
 *   4. Add country-specific validation rules
 */

export interface CountryConfig {
  /** ISO 3166-1 alpha-2 country code */
  code: string;
  /** Display name in English */
  name: string;
  /** ISO 4217 currency code */
  currency: string;
  /** Currency symbol for display */
  currencySymbol: string;
  /** Number of decimal places for currency */
  currencyDecimals: number;
  /** VAT / tax rate as a decimal (0.05 = 5%) */
  vatRate: number;
  /** Whether VAT must be itemised on invoices */
  vatItemisedRequired: boolean;
  /** International phone prefix */
  phonePrefix: string;
  /** Regex to validate local phone numbers (after prefix) */
  phoneRegex: RegExp;
  /** Example phone number for UI placeholders */
  phoneExample: string;
  /** Supported UI languages (ISO 639-1 / BCP 47) */
  supportedLanguages: string[];
  /** Default language for new customers */
  defaultLanguage: string;
  /** Available payment providers */
  paymentProviders: string[];
  /** IANA timezone */
  timezone: string;
  /** Date format for display */
  dateFormat: string;
  /** Business licence / registration info */
  businessLicence: {
    type: string;
    authority: string;
    /** Placeholder until actual number is confirmed */
    number: string | null;
  };
  /** Regulatory requirements specific to this country */
  kycDocuments: string[];
  /** Whether insurance is legally required with leases */
  insuranceRequired: boolean;
  /** Minimum insurance type required by law */
  minimumInsuranceType: string;
}

export type CountryCode = 'AE'; // Extend: | 'SA' | 'BH' | 'QA' | 'KW' | 'OM' | 'EG'

export const COUNTRY_CONFIGS: Record<CountryCode, CountryConfig> = {
  AE: {
    code: 'AE',
    name: 'United Arab Emirates',
    currency: 'AED',
    currencySymbol: 'د.إ',
    currencyDecimals: 2,
    vatRate: 0.05,
    vatItemisedRequired: true,
    phonePrefix: '+971',
    phoneRegex: /^5[0-9]{8}$/,
    phoneExample: '+971 5X XXX XXXX',
    supportedLanguages: ['en', 'ar', 'zh-CN'],
    defaultLanguage: 'en',
    paymentProviders: ['checkout_com', 'tabby'],
    timezone: 'Asia/Dubai',
    dateFormat: 'DD/MM/YYYY',
    businessLicence: {
      type: 'Abu Dhabi Commercial Licence',
      authority: 'Abu Dhabi Department of Economic Development',
      number: null, // Add Shanghai Car Rental LLC licence number when available
    },
    kycDocuments: [
      'emirates_id',
      'driving_licence',
      'visa_copy',
      'passport_copy',
    ],
    insuranceRequired: true,
    minimumInsuranceType: 'third_party_liability',
  },

  // ----------------------------------------------------------------
  // Future countries — uncomment and fill when expanding
  // ----------------------------------------------------------------
  //
  // SA: {
  //   code: 'SA',
  //   name: 'Saudi Arabia',
  //   currency: 'SAR',
  //   currencySymbol: 'ر.س',
  //   currencyDecimals: 2,
  //   vatRate: 0.15, // 15% VAT
  //   vatItemisedRequired: true,
  //   phonePrefix: '+966',
  //   phoneRegex: /^5[0-9]{8}$/,
  //   phoneExample: '+966 5X XXX XXXX',
  //   supportedLanguages: ['ar', 'en'],
  //   defaultLanguage: 'ar',
  //   paymentProviders: ['checkout_com', 'tabby', 'tamara'],
  //   timezone: 'Asia/Riyadh',
  //   dateFormat: 'DD/MM/YYYY',
  //   businessLicence: {
  //     type: 'Commercial Registration',
  //     authority: 'Ministry of Commerce',
  //     number: null,
  //   },
  //   kycDocuments: ['national_id', 'driving_licence', 'iqama'],
  //   insuranceRequired: true,
  //   minimumInsuranceType: 'third_party_liability',
  // },
  //
  // EG: {
  //   code: 'EG',
  //   name: 'Egypt',
  //   currency: 'EGP',
  //   currencySymbol: 'ج.م',
  //   currencyDecimals: 2,
  //   vatRate: 0.14, // 14% VAT
  //   vatItemisedRequired: true,
  //   phonePrefix: '+20',
  //   phoneRegex: /^1[0-9]{9}$/,
  //   phoneExample: '+20 1XX XXX XXXX',
  //   supportedLanguages: ['ar', 'en'],
  //   defaultLanguage: 'ar',
  //   paymentProviders: ['paymob', 'fawry'],
  //   timezone: 'Africa/Cairo',
  //   dateFormat: 'DD/MM/YYYY',
  //   businessLicence: {
  //     type: 'Commercial Register',
  //     authority: 'General Authority for Investment (GAFI)',
  //     number: null,
  //   },
  //   kycDocuments: ['national_id', 'driving_licence'],
  //   insuranceRequired: true,
  //   minimumInsuranceType: 'third_party_liability',
  // },
};

/** Default country for the platform */
export const DEFAULT_COUNTRY: CountryCode = 'AE';

/** Get config for a specific country */
export function getCountryConfig(code: CountryCode): CountryConfig {
  const config = COUNTRY_CONFIGS[code];
  if (!config) {
    throw new Error(`Country config not found for code: ${code}`);
  }
  return config;
}

/** Get the default country config (UAE) */
export function getDefaultCountryConfig(): CountryConfig {
  return getCountryConfig(DEFAULT_COUNTRY);
}

/** List all active country codes */
export function getActiveCountries(): CountryCode[] {
  return Object.keys(COUNTRY_CONFIGS) as CountryCode[];
}

/** Format a price with the country's currency symbol */
export function formatPrice(
  amount: number,
  countryCode: CountryCode = DEFAULT_COUNTRY,
): string {
  const config = getCountryConfig(countryCode);
  return `${config.currencySymbol} ${amount.toFixed(config.currencyDecimals)}`;
}

/** Calculate VAT for a given amount */
export function calculateVat(
  amount: number,
  countryCode: CountryCode = DEFAULT_COUNTRY,
): { subtotal: number; vat: number; total: number } {
  const config = getCountryConfig(countryCode);
  const vat = amount * config.vatRate;
  return {
    subtotal: amount,
    vat: Math.round(vat * 100) / 100,
    total: Math.round((amount + vat) * 100) / 100,
  };
}

/** Validate a phone number for a given country */
export function validatePhone(
  localNumber: string,
  countryCode: CountryCode = DEFAULT_COUNTRY,
): boolean {
  const config = getCountryConfig(countryCode);
  return config.phoneRegex.test(localNumber.replace(/\s/g, ''));
}
