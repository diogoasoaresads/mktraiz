import getDb from '../../src/lib/db/index';

async function check() {
    try {
        const db = await getDb();
        const columns = await db.all("PRAGMA table_info(units)");
        console.log("Columns in units table:");
        console.table(columns);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
