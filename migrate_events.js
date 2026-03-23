const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(process.cwd(), 'data', 'db.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    console.log('Verificando colunas da tabela events...');
    db.all("PRAGMA table_info(events)", (err, rows) => {
        if (err) {
            console.error('Erro ao ler infos da tabela:', err);
            process.exit(1);
        }
        
        const hasSchoolIds = rows.some(row => row.name === 'school_ids');
        
        if (!hasSchoolIds) {
            console.log('Adicionando coluna school_ids...');
            db.run("ALTER TABLE events ADD COLUMN school_ids TEXT", (err) => {
                if (err) {
                    console.error('Erro ao adicionar coluna:', err);
                    process.exit(1);
                }
                console.log('Coluna school_ids adicionada com sucesso!');
                process.exit(0);
            });
        } else {
            console.log('A coluna school_ids já existe.');
            process.exit(0);
        }
    });
});
