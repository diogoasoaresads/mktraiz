const Database = require('better-sqlite3');
try {
    const db = new Database(':memory:');
    console.log('Database connected successfully!');
} catch (err) {
    console.error('Failed to connect to database:', err.message);
}
