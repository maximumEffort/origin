/**
 * Origin entity registry — single source of truth for legal entity metadata
 * across all four entities under the Origin umbrella.
 *
 * The brand customers see is "Origin". The legal entity that operates a
 * service depends on the service type and country. This file maps services
 * to entities and exposes helpers used by Footer, legal pages, and any
 * future invoicing component.
 *
 * V1 only "RENT" service is active (Shanghai Car Rental LLC). SELL and LEASE
 * services are gated behind separate UAE licences (see CLAUDE.md § V1 Scope).
 *
 * To unblock a new service: fill the relevant entity's licence fields and
 * map the service in `OPERATING_ENTITY_BY_SERVICE`.
 */

export type ServiceType = 'RENT' | 'SELL' | 'LEASE';
export type EntityKey =
  | 'shanghai_car_rental'
  | 'origin_west_asia_trading'
  | 'china_procurement_services'
  | 'asas';

export interface Entity {
  key: EntityKey;
  /** Legal entity name as registered. Used on tax invoices, contracts, legal pages. */
  legalName: string;
  /** Short brand-style label for casual references. */
  shortName: string;
  /** Country code (ISO 3166-1 alpha-2). */
  country: 'AE' | 'HK' | 'EG';
  /** Jurisdiction details for the entity. */
  jurisdiction: string;
  /** Type of UAE/local commercial licence held. */
  licenceType: string;
  /** Licence number — null until issued. Display "[Licence pending]" until set. */
  licenceNumber: string | null;
  /** Authority that issued the licence. */
  licenceAuthority: string;
  /** Registered office address. */
  address: string;
  /** UAE FTA VAT TRN — null until VAT registered. */
  vatTrn: string | null;
  /** Activities the entity is licensed for. */
  activities: string[];
}

export const ENTITIES: Record<EntityKey, Entity> = {
  shanghai_car_rental: {
    key: 'shanghai_car_rental',
    legalName: 'Shanghai Car Rental LLC',
    shortName: 'Shanghai Car Rental',
    country: 'AE',
    jurisdiction: 'Abu Dhabi Mainland',
    licenceType: 'Abu Dhabi Commercial Licence',
    licenceNumber: null, // TODO: set once RTA Fleet Operator Licence is issued (issue #16)
    licenceAuthority: 'Abu Dhabi Department of Economic Development',
    address: 'Creek Harbour, Horizon Tower 2, Unit 2502, Dubai, UAE',
    vatTrn: null, // TODO: set once FTA VAT registration is complete (issue #15)
    activities: ['Car Rental'],
  },
  origin_west_asia_trading: {
    key: 'origin_west_asia_trading',
    legalName: 'Origin West Asia Trading',
    shortName: 'Origin West Asia',
    country: 'AE',
    jurisdiction: 'Dubai Jebel Ali Freezone',
    licenceType: 'JAFZA Trading Licence',
    licenceNumber: null,
    licenceAuthority: 'Jebel Ali Free Zone Authority',
    address: 'Jebel Ali Free Zone, Dubai, UAE',
    vatTrn: null,
    activities: ['General Trading'],
  },
  china_procurement_services: {
    key: 'china_procurement_services',
    legalName: 'China Procurement Services Group Company Limited',
    shortName: 'China Procurement Services Group',
    country: 'HK',
    jurisdiction: 'Hong Kong',
    licenceType: 'Hong Kong Business Registration',
    licenceNumber: null,
    licenceAuthority: 'Hong Kong Business Registration Office',
    address: 'Hong Kong',
    vatTrn: null,
    activities: ['General Trading', 'Holding'],
  },
  asas: {
    key: 'asas',
    legalName: 'Asas',
    shortName: 'Asas',
    country: 'EG',
    jurisdiction: 'Egypt',
    licenceType: 'Egyptian Commercial Register',
    licenceNumber: null,
    licenceAuthority: 'General Authority for Investment (GAFI)',
    address: 'Egypt',
    vatTrn: null,
    activities: ['Logistics Services'],
  },
};

/**
 * Maps a service to its operating legal entity.
 *
 * V1: RENT → Shanghai Car Rental LLC
 * V2 (gated, requires UAE dealership licence): SELL → Origin West Asia Trading
 * V3 (gated, requires UAE finance licence):     LEASE → (TBD — likely a new SPV)
 */
export const OPERATING_ENTITY_BY_SERVICE: Record<ServiceType, EntityKey> = {
  RENT: 'shanghai_car_rental',
  // Mapping kept for type safety — V2 unlock is a separate decision.
  SELL: 'origin_west_asia_trading',
  // V3: leasing service requires Central Bank UAE licence — entity TBD.
  LEASE: 'shanghai_car_rental',
};

/** Get the legal entity that operates a given service. */
export function getOperatingEntity(service: ServiceType = 'RENT'): Entity {
  const key = OPERATING_ENTITY_BY_SERVICE[service];
  return ENTITIES[key];
}

/** Brand name shown to customers in casual contexts. */
export const BRAND_NAME = 'Origin';

/** Tagline used in the dark hero/footer. */
export const BRAND_TAGLINE = 'Environmental Protection Starts With Us';

/**
 * Render the formatted name customers see in legal contexts:
 *   "Origin (operated by Shanghai Car Rental LLC)"
 *
 * Use in the introduction of privacy/terms/RTA pages so the brand stays
 * front and centre while the legal entity is properly disclosed.
 */
export function formatBrandedLegalName(service: ServiceType = 'RENT'): string {
  const e = getOperatingEntity(service);
  return `${BRAND_NAME} (operated by ${e.legalName})`;
}

/** Render the licence reference for footer / RTA page. */
export function formatLicenceReference(service: ServiceType = 'RENT'): string {
  const e = getOperatingEntity(service);
  return e.licenceNumber
    ? `${e.licenceType} #${e.licenceNumber}`
    : `${e.licenceType} (number pending)`;
}

/** Render TRN for footer / invoice. Returns "TRN pending" when not yet issued. */
export function formatTrn(service: ServiceType = 'RENT'): string {
  const e = getOperatingEntity(service);
  return e.vatTrn ? `TRN ${e.vatTrn}` : 'TRN pending';
}
