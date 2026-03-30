const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, '../data/db.sqlite');

console.log('⏳ Conectando ao banco de dados...', dbPath);
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Erro ao conectar no banco:', err.message);
        process.exit(1);
    }
});

db.serialize(() => {
    console.log('🧹 Limpando dados fictícios do Hub 360...');

    db.run('DELETE FROM hub_request_comments');
    db.run('DELETE FROM hub_request_history');
    db.run('DELETE FROM hub_content_requests');
    // We typically want to keep brand library and pipelines (since they define the kanban columns)
    // but we can clear them if they want a 100% empty state. Usually keeping pipelines is better.
    // db.run('DELETE FROM hub_pipelines');
    
    // Clearing OOH campaigns and scenarios:
    db.run('DELETE FROM plan_proofs');
    db.run('DELETE FROM plan_lines');
    db.run('DELETE FROM scenarios');
    db.run('DELETE FROM campaigns');
    
    // Optionally clearing activations
    db.run('DELETE FROM events');
    db.run('DELETE FROM activation_points');
    
    console.log('✅ Dados fictícios e histórico apagados com sucesso!');
});

db.close(() => {
    console.log('👋 Desconectado do banco.');
});
