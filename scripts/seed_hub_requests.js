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

const STAGES = [
    'recebida', 'triagem', 'complemento', 'ia', 'conteudo', 
    'revisao', 'design', 'aprovacao_interna', 'aprovacao_solicitante', 
    'ajustes', 'aprovada', 'agendada', 'publicada', 'finalizada'
];

async function seed() {
    console.log('--- Populando Demandas no Hub ---');
    const db = await getDb();
    
    const schools = await db.all('SELECT id FROM schools LIMIT 5');
    if (schools.length === 0) return;

    for (let i = 0; i < 20; i++) {
        const school = schools[Math.floor(Math.random() * schools.length)];
        const stage = STAGES[Math.floor(Math.random() * STAGES.length)];
        const id = uuidv4();
        
        await db.run(`
            INSERT INTO hub_content_requests (
                id, school_id, requester_name, requester_area,
                demand_type, channel, objective, target_audience,
                priority, briefing_raw, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            id,
            school.id,
            ['João Silva', 'Maria Souza', 'Carlos Porto', 'Ana Valente'][Math.floor(Math.random() * 4)],
            ['Marketing', 'Comercial', 'Direção'][Math.floor(Math.random() * 3)],
            ['feed', 'stories', 'reels', 'comunicado'][Math.floor(Math.random() * 4)],
            ['Instagram', 'WhatsApp', 'LinkedIn'][Math.floor(Math.random() * 3)],
            'Divulgação de Campanha Matrículas 2026',
            'Comunidade Escolar',
            ['baixa', 'média', 'alta', 'crítica'][Math.floor(Math.random() * 4)],
            `Briefing de teste para a demanda ${i+1}. Preciso de um conteúdo focado em engajamento sobre a importância da tecnologia no ensino fundamental.`,
            stage,
            new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 24 * 7).toISOString()
        ]);
    }

    console.log('--- 20 Demandas Criadas ---');
    await db.close();
}

seed().catch(err => console.error(err));
