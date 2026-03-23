const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

async function migrate() {
    const dbPath = path.join(__dirname, '../data/db.sqlite');
    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });

    console.log('Migrando banco de dados...');

    await db.exec(`
        CREATE TABLE IF NOT EXISTS vendor_users (
            id TEXT PRIMARY KEY,
            vendor_id TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            name TEXT,
            role TEXT DEFAULT 'admin',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (vendor_id) REFERENCES vendors(id)
        );

        CREATE INDEX IF NOT EXISTS idx_vendor_users_email ON vendor_users(email);
        CREATE INDEX IF NOT EXISTS idx_vendor_users_vendor ON vendor_users(vendor_id);
    `);

    console.log('Tabela vendor_users criada com sucesso!');
    await db.close();
}

migrate().catch(console.error);
