import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'data', 'db.sqlite');

// Ensure data directory exists
if (!fs.existsSync(path.join(process.cwd(), 'data'))) {
    fs.mkdirSync(path.join(process.cwd(), 'data'), { recursive: true });
}

let db: Database | null = null;

export async function getDb() {
    if (db) return db;

    db = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });

    // Initialize schema
    const schemaPath = path.join(process.cwd(), 'src/lib/db/schema.sql');
    if (fs.existsSync(schemaPath)) {
        const schema = fs.readFileSync(schemaPath, 'utf8');
        await db.exec(schema);
    }

    return db;
}

export default getDb;
