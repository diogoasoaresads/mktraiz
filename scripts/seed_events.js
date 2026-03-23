const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const dbPath = path.join(process.cwd(), 'data', 'db.sqlite');
const db = new sqlite3.Database(dbPath);

const events = [
    { id: uuidv4(), name: 'Volta às Aulas 2026', type: 'escolar', description: 'Início do ano letivo em todas as unidades.', start_date: '2026-02-02' },
    { id: uuidv4(), name: 'Reunião de Pais 1º Bim', type: 'escolar', description: 'Oportunidade para ativação de seguros e parceiros.', start_date: '2026-03-20' },
    { id: uuidv4(), name: 'Campanha de Matrículas', type: 'sazonal', description: 'Pico de procura por novas vagas.', start_date: '2026-10-01' },
    { id: uuidv4(), name: 'Arraiá da Raiz', type: 'promocional', description: 'Evento festivo com grande circulação de famílias.', start_date: '2026-06-15' }
];

const points = [
    { id: uuidv4(), name: 'BarraShopping', type: 'shopping', address_raw: 'Av. das Américas, 4666 - Barra da Tijuca', lat: -23.0016, lng: -43.3486, flow_intensity: 1.0, notes: 'Principal hotspot da Zona Oeste.' },
    { id: uuidv4(), name: 'Shopping Rio Sul', type: 'shopping', address_raw: 'Rua Lauro Müller, 116 - Botafogo', lat: -22.9568, lng: -43.1764, flow_intensity: 0.9, notes: 'Forte presença de público A/B.' },
    { id: uuidv4(), name: 'Metrô Carioca', type: 'metro', address_raw: 'Centro, Rio de Janeiro - RJ', lat: -22.9068, lng: -43.1729, flow_intensity: 1.0, notes: 'Altíssimo fluxo de passageiros no horário comercial.' },
    { id: uuidv4(), name: 'Parque Lage', type: 'praca', address_raw: 'R. Jardim Botânico, 414 - Jardim Botânico', lat: -22.9592, lng: -43.2120, flow_intensity: 0.7, notes: 'Local estratégico para ativações de fim de semana.' }
];

db.serialize(() => {
    // Clear old sample data if exists (optional, let's just insert)
    const insertEvent = db.prepare(`INSERT INTO events (id, name, type, description, start_date) VALUES (?, ?, ?, ?, ?)`);
    events.forEach(e => insertEvent.run(e.id, e.name, e.type, e.description, e.start_date));
    insertEvent.finalize();

    const insertPoint = db.prepare(`INSERT INTO activation_points (id, name, type, address_raw, lat, lng, flow_intensity, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    points.forEach(p => insertPoint.run(p.id, p.name, p.type, p.address_raw, p.lat, p.lng, p.flow_intensity, p.notes));
    insertPoint.finalize();

    console.log('Sample data for Events & Activations seeded successfully.');
});

db.close();
