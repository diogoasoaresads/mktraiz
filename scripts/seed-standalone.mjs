import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { parse } from 'node-html-parser';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'data', 'db.sqlite');

const RAIS_BRANDS = [
    { brand_name: 'Colégio QI', website: 'colegioqi.com.br' },
    { brand_name: 'Matriz Educação', website: 'matrizeducacao.com.br' },
    { brand_name: 'Apogeu', website: 'apogeu.com.br' },
    { brand_name: 'Leonardo da Vinci', website: 'colegioleonardodavinci.com.br' },
    { brand_name: 'Cubo', website: 'cubo.global' },
    { brand_name: 'Escola SAP', website: 'escolasap.com.br' },
    { brand_name: 'Creche Global Tree', website: 'crecheglobaltree.com.br' },
    { brand_name: 'Sarah Dawsey', website: 'sdjf.com.br' },
    { brand_name: 'Americano Bilíngue', website: 'americanobilingue.com.br' },
    { brand_name: 'Escola S.A. Pereira', website: 'escolasapereira.com.br' },
    { brand_name: 'Unificado', website: 'unificado.com.br' },
    { brand_name: 'Colégio União', website: 'colegiouniao.com.br' },
];

const UNIT_PAGE_PATTERNS = ['/unidades', '/nossas-unidades', '/contato', '/enderecos', '/onde-estamos'];

async function run() {
    console.log('Starting Standalone Seed (with node-html-parser)...');

    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });

    // Ensure schema
    const schema = fs.readFileSync(path.join(process.cwd(), 'src/lib/db/schema.sql'), 'utf8');
    await db.exec(schema);

    // [MODIFIED] Clear existing data to ensure a fresh start as requested
    console.log('Clearing old data...');
    await db.run('DELETE FROM units');
    await db.run('DELETE FROM schools');

    for (const brand of RAIS_BRANDS) {
        console.log(`Processing brand: ${brand.brand_name}`);

        let schoolId;
        const existing = await db.get('SELECT id FROM schools WHERE brand_name = ?', brand.brand_name);

        if (!existing) {
            schoolId = uuidv4();
            await db.run(
                'INSERT INTO schools (id, brand_name, website, group_name) VALUES (?, ?, ?, ?)',
                [schoolId, brand.brand_name, brand.website, 'Raiz Educação']
            );
        } else {
            schoolId = existing.id;
        }

        // Scraping
        const url = `https://${brand.website}`;
        try {
            console.log(`  Scraping ${url}...`);
            const response = await fetch(url);
            const html = await response.text();
            const root = parse(html);

            let unitsUrl = url;
            const links = root.querySelectorAll('a');
            for (const link of links) {
                const href = link.getAttribute('href');
                if (href && UNIT_PAGE_PATTERNS.some(p => href.toLowerCase().includes(p))) {
                    unitsUrl = href.startsWith('http') ? href : new URL(href, url).toString();
                    break;
                }
            }

            console.log(`  Units page: ${unitsUrl}`);
            const unitsRes = await fetch(unitsUrl);
            const unitsHtml = await unitsRes.text();
            const unitsRoot = parse(unitsHtml);

            const units = [];
            const candidates = unitsRoot.querySelectorAll('p, div, address, li');
            for (const el of candidates) {
                const text = el.text.trim();
                if (text.length > 20 && (text.includes('Rua') || text.includes('Av.') || text.includes('Avenida') || text.includes('CEP'))) {
                    if (/\d+/.test(text)) {
                        units.push(text);
                    }
                }
            }

            const uniqueUnits = [...new Set(units)];
            console.log(`  Found ${uniqueUnits.length} units.`);

            if (uniqueUnits.length === 0) {
                await db.run('UPDATE schools SET units_status = ? WHERE id = ?', ['units_missing', schoolId]);
            } else {
                for (const addr of uniqueUnits) {
                    await db.run(`
                        INSERT INTO units (id, school_id, unit_name, address_raw, address_normalized, geocode_status)
                        VALUES (?, ?, ?, ?, ?, ?)
                        ON CONFLICT(school_id, address_normalized, unit_name) DO NOTHING
                    `, [uuidv4(), schoolId, 'Unidade', addr, addr.toLowerCase().trim(), 'pending']);
                }
                await db.run('UPDATE schools SET units_status = ? WHERE id = ?', ['seeded_ok', schoolId]);
            }

        } catch (e) {
            console.error(`  Error scraping ${brand.website}:`, e.message);
            await db.run('UPDATE schools SET units_status = ? WHERE id = ?', ['seed_error', schoolId]);
        }
    }

    console.log('Seed Completed!');
    await db.close();
}

run().catch(console.error);
