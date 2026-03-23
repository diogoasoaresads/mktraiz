/**
 * Search Provider using OpenStreetMap (Overpass API)
 * This allows finding units of a brand geographically without an API key.
 */

export interface SearchResult {
    name: string;
    address: string;
    lat: number;
    lng: number;
    city?: string;
    state?: string;
}

export async function searchUnitsInOSM(brandName: string): Promise<SearchResult[]> {
    // Overpass QL query to find nodes/ways/rels with the brand name in Brazil
    // Case-insensitive regex search for the name
    const query = `
        [out:json][timeout:25];
        (
          node["name"~"${brandName}",i](-33.75,-73.99,5.27,-28.84);
          way["name"~"${brandName}",i](-33.75,-73.99,5.27,-28.84);
          rel["name"~"${brandName}",i](-33.75,-73.99,5.27,-28.84);
        );
        out center;
    `;

    const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'OOHPlannerRaiz/1.0 (contact: support@raiz-educacao.com)'
            }
        });

        if (!response.ok) {
            console.error(`Overpass API error: ${response.status}`);
            return [];
        }

        const data = await response.json();
        const results: SearchResult[] = [];

        for (const element of (data.elements || [])) {
            const tags = element.tags || {};
            const lat = element.lat || (element.center ? element.center.lat : null);
            const lng = element.lon || (element.center ? element.center.lon : null);

            if (!lat || !lng) continue;

            // Try to build a readable address from OSM tags
            let address = '';
            if (tags['addr:street']) {
                address = tags['addr:street'];
                if (tags['addr:housenumber']) address += `, ${tags['addr:housenumber']}`;
                if (tags['addr:suburb']) address += `, ${tags['addr:suburb']}`;
                if (tags['addr:city']) address += `, ${tags['addr:city']}`;
                if (tags['addr:state']) address += ` - ${tags['addr:state']}`;
            } else {
                // Fallback: use whatever text we can find or just coordinates description
                address = `Localizado em ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
            }

            results.push({
                name: tags.name || brandName,
                address: address,
                lat: lat,
                lng: lng,
                city: tags['addr:city'],
                state: tags['addr:state']
            });
        }

        return results;
    } catch (error) {
        console.error('Error searching in OSM:', error);
        return [];
    }
}
