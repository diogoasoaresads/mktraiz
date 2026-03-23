const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function expandSchema() {
    const dbPath = path.join(process.cwd(), 'data', 'db.sqlite');
    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });

    console.log('--- Expandindo Schema para Fases 2 e 3 ---');
    
    // Adicionar colunas de inteligência e publicação
    try {
        await db.run('ALTER TABLE hub_content_requests ADD COLUMN tags TEXT'); // JSON array: ["Acadêmico", "Esporte"]
        console.log('Coluna tags adicionada.');
    } catch (e) {}

    try {
        await db.run('ALTER TABLE hub_content_requests ADD COLUMN content_category TEXT'); // Pillar: 'Relacionamento', 'Captação'
        console.log('Coluna content_category adicionada.');
    } catch (e) {}

    try {
        await db.run('ALTER TABLE hub_content_requests ADD COLUMN published_url TEXT');
        console.log('Coluna published_url adicionada.');
    } catch (e) {}

    console.log('--- Schema Expandido com Sucesso ---');
    await db.close();
}

expandSchema().catch(err => {
    console.error('Erro ao expandir schema:', err);
});
