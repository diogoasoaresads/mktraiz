const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

async function fixSchema() {
    const dbPath = path.join(__dirname, '../data/db.sqlite');
    console.log(`Conectando ao banco em: ${dbPath}`);
    
    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });

    try {
        console.log('Verificando colunas na tabela media_assets...');
        const mediaAssetsColumns = await db.all('PRAGMA table_info(media_assets)');
        const hasGeocodeSuspect = mediaAssetsColumns.some(c => c.name === 'geocode_suspect');
        const hasDailyImpressions = mediaAssetsColumns.some(c => c.name === 'daily_impressions');
        const hasTrafficFlow = mediaAssetsColumns.some(c => c.name === 'traffic_flow');

        if (!hasGeocodeSuspect) {
            console.log('Adicionando coluna geocode_suspect a media_assets...');
            await db.run('ALTER TABLE media_assets ADD COLUMN geocode_suspect INTEGER DEFAULT 0');
        }

        if (!hasDailyImpressions) {
            console.log('Adicionando coluna daily_impressions a media_assets...');
            await db.run('ALTER TABLE media_assets ADD COLUMN daily_impressions REAL DEFAULT 0');
        }

        if (!hasTrafficFlow) {
            console.log('Adicionando coluna traffic_flow a media_assets...');
            await db.run('ALTER TABLE media_assets ADD COLUMN traffic_flow REAL DEFAULT 0');
        }

        console.log('Verificando colunas na tabela geocoding_cache...');
        const geocodingCacheColumns = await db.all('PRAGMA table_info(geocoding_cache)');
        const hasData = geocodingCacheColumns.some(c => c.name === 'data');

        if (!hasData) {
            console.log('Adicionando coluna data a geocoding_cache...');
            await db.run('ALTER TABLE geocoding_cache ADD COLUMN data TEXT');
        }

        console.log('Verificando colunas na tabela competitors...');
        const competitorsColumns = await db.all('PRAGMA table_info(competitors)');
        const hasBrand = competitorsColumns.some(c => c.name === 'brand');

        if (!hasBrand) {
            console.log('Adicionando coluna brand a competitors...');
            await db.run('ALTER TABLE competitors ADD COLUMN brand TEXT');
            console.log('Copiando dados de brand_name para brand...');
            await db.run('UPDATE competitors SET brand = brand_name');
        }

        console.log('Esquema sincronizado com sucesso!');
    } catch (err) {
        console.error('Erro ao sincronizar esquema:', err);
    } finally {
        await db.close();
    }
}

fixSchema();
