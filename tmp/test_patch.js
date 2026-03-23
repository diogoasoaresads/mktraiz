const sqlite3 = require('sqlite3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const dbPath = path.join(process.cwd(), 'data', 'db.sqlite');
const db = new sqlite3.Database(dbPath);

async function testUpdate() {
    const requestId = '9971ef'; // Mock partial ID for discovery
    
    // Find a real ID first
    db.get('SELECT id, status FROM hub_content_requests LIMIT 1', async (err, row) => {
        if (err) {
            console.error(err);
            return;
        }
        if (!row) {
            console.log('No requests found');
            return;
        }
        
        const id = row.id;
        const oldStatus = row.status;
        const newStatus = 'finalizada';
        
        console.log(`Testing update for ID: ${id} from ${oldStatus} to ${newStatus}`);
        
        db.run('UPDATE hub_content_requests SET status = ? WHERE id = ?', [newStatus, id], function(err) {
            if (err) {
                console.error('Update Error:', err);
                return;
            }
            console.log('Update Success');
            
            db.run(`
                INSERT INTO hub_request_history (id, request_id, actor_name, action, description, old_status, new_status)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [uuidv4(), id, 'Sistema', 'mudanca_status', `Teste de transição`, oldStatus, newStatus], function(err) {
                if (err) {
                    console.error('Insert History Error:', err);
                } else {
                    console.log('Insert History Success');
                }
                db.close();
            });
        });
    });
}

testUpdate();
