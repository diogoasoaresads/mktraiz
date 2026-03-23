const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

async function getDb() {
    const dbPath = path.join(process.cwd(), 'data', 'db.sqlite');
    return await open({
        filename: dbPath,
        driver: sqlite3.Database
    });
}

async function seed() {
    console.log('--- Populando Eventos no Hub ---');
    const db = await getDb();
    
    const schools = await db.all('SELECT id FROM schools LIMIT 3');
    if (schools.length === 0) return;

    const eventsData = [
        { name: 'Open Day Raiz 2026', type: 'promocional', budget: 5000, target: 100, actual_budget: 4800, actual_leads: 85 },
        { name: 'Feira das Profissões', type: 'sazonal', budget: 12000, target: 300, actual_budget: 13500, actual_leads: 280 },
        { name: 'Workshop de Tecnologia', type: 'escolar', budget: 3000, target: 50, actual_budget: 2900, actual_leads: 55 },
        { name: 'Campanha de Inverno', type: 'promocional', budget: 8000, target: 150, actual_budget: 7200, actual_leads: 140 }
    ];

    for (const e of eventsData) {
        const id = uuidv4();
        const schoolId = schools[Math.floor(Math.random() * schools.length)].id;
        
        await db.run(`
            INSERT INTO events (
                id, name, type, description, start_date, end_date, 
                school_ids, team_size, target_leads, 
                budget_planned, budget_executed
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            id,
            e.name,
            e.type,
            `Descrição para ${e.name}. Foco em captação e branding.`,
            new Date(Date.now() + Math.random() * 1000 * 60 * 60 * 24 * 30).toISOString().split('T')[0],
            new Date(Date.now() + Math.random() * 1000 * 60 * 60 * 24 * 60).toISOString().split('T')[0],
            schoolId,
            Math.floor(Math.random() * 10) + 2,
            e.target,
            e.budget,
            e.actual_budget
        ]);

        // Mock activations for these events
        const point = await db.get('SELECT id FROM activation_points ORDER BY RANDOM() LIMIT 1');
        if (point) {
            await db.run(`
                INSERT INTO activations (id, event_id, point_id, status, cost, impact_leads)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [uuidv4(), id, point.id, 'concluido', e.actual_budget, e.actual_leads]);
        }
    }

    console.log('--- 4 Eventos com Métricas Criados ---');
    await db.close();
}

seed().catch(err => console.error(err));
