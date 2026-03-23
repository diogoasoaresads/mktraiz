import getDb from './src/lib/db';

async function run() {
    const db = await getDb();

    // Lista de alters que podem falhar caso a coluna já exista, 
    // então a gente roda uma por uma capturando o erro para contornar.
    const alters = [
        "ALTER TABLE units ADD COLUMN geocode_place_id TEXT;",
        "ALTER TABLE units ADD COLUMN geocode_provider TEXT;",
        "ALTER TABLE media_assets ADD COLUMN geocode_status TEXT NOT NULL DEFAULT 'pending';",
        "ALTER TABLE media_assets ADD COLUMN lat REAL;",
        "ALTER TABLE media_assets ADD COLUMN lng REAL;",
        "ALTER TABLE media_assets ADD COLUMN geocode_confidence REAL;"
    ];

    for (const alter of alters) {
        try {
            await db.run(alter);
            console.log("Success:", alter);
        } catch (e: any) {
            console.log("Ignored (probably exists):", e.message);
        }
    }
    console.log("Database schema fix complete.");
}

run();
