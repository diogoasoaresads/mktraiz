// geo.ts — Geographic utility functions
// Note: getDb is imported dynamically inside getGeographicMetricsFromIBGE
//       to prevent SQLite (server-only) from leaking into the client bundle.

/**
 * Calculates the Haversine distance between two points in kilometers.
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
}

function deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
}

/**
 * Normalizes an address string for better matching and fingerprinting.
 */
export function normalizeAddress(address: string): string {
    if (!address) return '';

    let normalized = address.toLowerCase();

    // Standardize abbreviations
    normalized = normalized.replace(/\brua\b/g, 'r.');
    normalized = normalized.replace(/\bavenida\b/g, 'av.');
    normalized = normalized.replace(/\balameda\b/g, 'al.');
    normalized = normalized.replace(/\btravessa\b/g, 'tv.');
    normalized = normalized.replace(/\bpraça\b/g, 'pc.');

    // Remove special characters but keep accents
    normalized = normalized.replace(/[^\w\s\u00C0-\u017F.,-]/gi, ' ');

    // Collapse spaces
    normalized = normalized.replace(/\s+/g, ' ').trim();

    // Standardize commas and hyphens
    normalized = normalized.replace(/\s*,\s*/g, ', ');
    normalized = normalized.replace(/\s*-\s*/g, ' - ');

    return normalized;
}

/**
 * Generates a unique fingerprint for a media asset to avoid duplicates.
 */
export async function generateAssetFingerprint(vendorId: string, addressRaw: string, type: string, format?: string, side?: string): Promise<string> {
    const normAddress = normalizeAddress(addressRaw);
    const crypto = await import('crypto');
    const content = `${vendorId}|${normAddress}|${type.toLowerCase()}|${(format || '').toLowerCase()}|${(side || '').toLowerCase()}`;
    return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Returns deterministic geographic metrics (synthetic IBGE-like data) based on lat/lng.
 * Used as a fast synchronous fallback in the recommendation engine.
 */
export function getGeographicMetrics(lat: number, lng: number): { income: number; population: number; flow_index: number } {
    const hash = Math.abs(Math.sin(lat * 12.9898 + lng * 78.233)) * 43758.5453;
    const deterministicRandom = hash - Math.floor(hash);
    const income = Math.floor(deterministicRandom * 10000) + 1500;
    const population = Math.floor((1 - deterministicRandom) * 10000) + 500;
    const flowHash = Math.abs(Math.cos(lat * 45.123 + lng * 12.345)) * 98765.123;
    const flow_index = flowHash - Math.floor(flowHash);
    return { income, population, flow_index };
}

// getGeographicMetricsFromIBGE is in geo.server.ts (server-only, uses SQLite)
// Import from '@/lib/geo.server' in API Routes only.

/**
 * Simulated Points of Interest (POI) proximity.
 * Returns distance in km to nearest specific POIs.
 */
export function getPoiMetrics(lat: number, lng: number): { shopping_distance: number; transit_distance: number; school_distance: number } {
    // Generate pseudo-random distances from 0.05km (50m) up to 3.5km
    const rand1 = Math.abs(Math.sin(lat * 11.11 + lng * 22.22)) * 33.33;
    const shopping_distance = (rand1 - Math.floor(rand1)) * 3.45 + 0.05;

    const rand2 = Math.abs(Math.cos(lat * 33.33 + lng * 44.44)) * 55.55;
    const transit_distance = (rand2 - Math.floor(rand2)) * 3.45 + 0.05;

    const rand3 = Math.abs(Math.sin(lat * 55.55 + lng * 66.66)) * 77.77;
    const school_distance = (rand3 - Math.floor(rand3)) * 3.45 + 0.05;

    return { shopping_distance, transit_distance, school_distance };
}
