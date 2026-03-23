const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'db.sqlite');
const db = new sqlite3.Database(dbPath);

const UNITS_DATA = [
    { brand: 'Colégio QI', name: 'QI Freguesia', address: 'Rua Joaquim Pinheiro, 105, Freguesia, Rio de Janeiro - RJ' },
    { brand: 'Colégio QI', name: 'QI Maracanã', address: 'Rua Ibituruna, 37, Maracanã, Rio de Janeiro - RJ' },
    { brand: 'Colégio QI', name: 'QI Méier', address: 'Rua Jacinto, 81, Méier, Rio de Janeiro - RJ' },
    { brand: 'Colégio QI', name: 'QI Recreio', address: 'Estrada Coronel Pedro Correia, 887, Jacarepaguá, Rio de Janeiro - RJ' },
    { brand: 'Americano Bilíngue', name: 'Unidade Porto Alegre', address: 'Rua Cabral, 521, Rio Branco, Porto Alegre - RS' },
    { brand: 'Apogeu', name: 'Apogeu Zona Norte', address: 'Avenida Dr. Simeão de Faria, 291, Santa Cruz, Juiz de Fora - MG' },
    { brand: 'Apogeu', name: 'Apogeu São Pedro', address: 'Avenida Pedro Henrique Krambeck, 1641, São Pedro, Juiz de Fora - MG' },
    { brand: 'Apogeu', name: 'Apogeu Centro I', address: 'Rua Santo Antônio, 382, Centro, Juiz de Fora - MG' },
    { brand: 'Apogeu', name: 'Apogeu Centro II', address: 'Rua Santo Antônio, 437, Centro, Juiz de Fora - MG' },
];

db.serialize(() => {
    db.all('SELECT id, brand_name FROM schools', (err, schools) => {
        if (err) {
            console.error(err);
            return;
        }

        UNITS_DATA.forEach(data => {
            const school = schools.find(s => s.brand_name === data.brand);
            if (!school) return;

            const addressNormalized = data.address.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();

            db.run(`
                INSERT INTO units (id, school_id, unit_name, address_raw, address_normalized, geocode_status)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(school_id, address_normalized, unit_name) DO UPDATE SET
                    address_raw = excluded.address_raw
            `, [uuidv4(), school.id, data.name, data.address, addressNormalized, 'pending'], (err) => {
                if (err) console.error(`Error updating ${data.name}:`, err);
                else console.log(`Updated unit: ${data.name}`);
            });
        });
    });
});
