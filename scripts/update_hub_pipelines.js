const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function updateSchema() {
    const dbPath = path.join(process.cwd(), 'data', 'db.sqlite');
    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });

    console.log('--- Atualizando Schema para Pipelines ---');
    
    // Criar tabela de pipelines
    await db.run(`
        CREATE TABLE IF NOT EXISTS hub_pipelines (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            stages_json TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Adicionar pipeline_id às solicitações
    try {
        await db.run('ALTER TABLE hub_content_requests ADD COLUMN pipeline_id TEXT');
        console.log('Coluna pipeline_id adicionada.');
    } catch (e) {
        console.log('Coluna pipeline_id já existe ou erro ignorado.');
    }

    // Criar uma pipeline padrão se não existir
    const defaultPipelineId = 'pool-geral';
    const existing = await db.get('SELECT id FROM hub_pipelines WHERE id = ?', [defaultPipelineId]);
    
    if (!existing) {
        const stages = [
            { id: 'recebida', label: 'Recebida' },
            { id: 'triagem', label: 'Triagem' },
            { id: 'complemento', label: 'Aguard. Complements' },
            { id: 'ia', label: 'Automação IA' },
            { id: 'conteudo', label: 'Conteúdo' },
            { id: 'revisao', label: 'Revisão' },
            { id: 'design', label: 'Design' },
            { id: 'aprovacao_interna', label: 'Aprov. Interna' },
            { id: 'aprovacao_solicitante', label: 'Aprov. Cliente' },
            { id: 'ajustes', label: 'Ajustes' },
            { id: 'aprovada', label: 'Aprovada' },
            { id: 'agendada', label: 'Agendada' },
            { id: 'publicada', label: 'Publicada' },
            { id: 'finalizada', label: 'Finalizada' },
            { id: 'cancelada', label: 'Cancelada' }
        ];

        await db.run(`
            INSERT INTO hub_pipelines (id, name, description, stages_json)
            VALUES (?, ?, ?, ?)
        `, [defaultPipelineId, 'Pipeline Geral', 'Fluxo padrão de produção', JSON.stringify(stages)]);
        
        // Atribuir todas as solicitações existentes a esta pipeline
        await db.run('UPDATE hub_content_requests SET pipeline_id = ?', [defaultPipelineId]);
        console.log('Pipeline padrão criada e solicitações migradas.');
    }

    console.log('--- Schema Atualizado com Sucesso ---');
    await db.close();
}

updateSchema().catch(err => {
    console.error('Erro ao atualizar schema:', err);
});
