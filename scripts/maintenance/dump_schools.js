import getDb from './src/lib/db/index.js';

async function main() {
    const db = await getDb();
    const schools = await db.all('SELECT id, brand_name, website FROM schools');
    console.log(JSON.stringify(schools, null, 2));
}

main().catch(console.error);
