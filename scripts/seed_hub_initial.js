const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

async function getDb() {
    const dbPath = path.join(process.cwd(), 'data', 'db.sqlite');
    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });
    
    // Initialize schema to ensure tables exist
    const schemaPath = path.join(process.cwd(), 'src/lib/db/schema.sql');
    if (fs.existsSync(schemaPath)) {
        const schema = fs.readFileSync(schemaPath, 'utf8');
        await db.exec(schema);
    }
    
    return db;
}

async function seed() {
    console.log('--- Inicializando Tabelas do Hub ---');
    const db = await getDb();

    // 1. Verificar escolas existentes
    const schools = await db.all('SELECT * FROM schools');
    console.log(`Encontradas ${schools.length} escolas.`);

    if (schools.length === 0) {
        console.log('Nenhuma escola encontrada para seed de biblioteca.');
        return;
    }

    // 2. Seed na hub_brand_library para cada escola
    console.log('Populando Biblioteca de Marca...');
    for (const school of schools) {
        // Verificar se já existe
        const existing = await db.get('SELECT id FROM hub_brand_library WHERE school_id = ?', [school.id]);
        
        if (!existing) {
            await db.run(`
                INSERT INTO hub_brand_library (
                    id, school_id, abc_guidelines, tone_of_voice, 
                    institutional_differentials, personas, visual_guidelines
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                uuidv4(),
                school.id,
                `Diretrizes ABC para ${school.brand_name}: Foco em excelência acadêmica e valores humanos.`,
                'Tom de voz acolhedor, inspirador e profissional.',
                'Metodologia Raiz, infraestrutura moderna, foco em resultados.',
                'Personas: Pais preocupados com o futuro dos filhos, alunos engajados.',
                'Cores vibrantes, fontes limpas, imagens de alunos reais.'
            ]);
            console.log(`- Biblioteca criada para: ${school.brand_name}`);
        } else {
            console.log(`- Biblioteca já existe para: ${school.brand_name}`);
        }
    }

    console.log('--- Seed do Hub Concluído ---');
    await db.close();
}

seed().catch(err => {
    console.error('Erro no Seed:', err);
});
