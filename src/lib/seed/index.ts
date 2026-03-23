import { seedBrands } from './brands';
import { scrapeUnitsForBrand } from './scraper';
import getDb from '../db';
import { performDeduplication } from '../units/deduplicate';

export async function runFullSeed() {
    await seedBrands();

    const db = await getDb();
    const schools = await db.all('SELECT id, website FROM schools');

    console.log(`Starting units scraping for ${schools.length} schools...`);

    for (const school of schools) {
        await scrapeUnitsForBrand(school.id, school.website);
    }

    // Auto-deduplicate after sync
    console.log('Running auto-deduplication...');
    await performDeduplication();

    console.log('Full seed completed.');
}
