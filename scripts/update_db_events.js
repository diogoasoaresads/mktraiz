const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function updateSchema() {
    const dbPath = path.join(process.cwd(), 'data', 'db.sqlite');
    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });

    console.log('Atualizando tabela de eventos...');
    
    await db.run('DROP TABLE IF EXISTS events');
    await db.run(`
        CREATE TABLE events (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            description TEXT,
            start_date DATE NOT NULL,
            end_date DATE,
            unit_ids TEXT,
            school_ids TEXT,
            team_size INTEGER DEFAULT 0,
            target_leads INTEGER DEFAULT 0,
            budget_planned REAL DEFAULT 0,
            budget_executed REAL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    console.log('Tabela de eventos recriada com sucesso.');
    await db.close();
}

updateSchema().catch(err => {
    console.error('Erro ao atualizar schema:', err);
    process.exit(1);
});
