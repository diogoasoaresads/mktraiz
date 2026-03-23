import getDb from '../db';

/**
 * Perform aggressive address normalization and removal of duplicate units.
 * Keeps the 'success' geocoded version or the most recent one.
 */
export async function performDeduplication() {
    const db = await getDb();

    // Aggressive normalization function
    const normalizeAddress = (addr: string) => {
        return addr
            .toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents
            .replace(/endereco:|ola,|tudo bem\?|seja bem-vindo|estamos localizados na|unidade:|logradouro:/gi, '')
            .replace(/\(\d{2}\)\s?\d{4,5}-?\d{4}/g, '') // remove phone
            .replace(/cep:\s?\d{5}-?\d{3}/gi, '') // remove CEP
            .replace(/[^\w\s]/g, ' ') // remove punctuation
            .replace(/\s+/g, ' ')
            .trim();
    };

    const units = await db.all('SELECT id, address_raw FROM units');

    // Update address_normalized with the new logic to ensure comparison works
    for (const unit of units) {
        const norm = normalizeAddress(unit.address_raw);
        await db.run('UPDATE units SET address_normalized = ? WHERE id = ?', [norm, unit.id]);
    }

    // Remove duplicate units based on the new address_normalized
    // We keep the unit that has geocode_status = 'success' or the most recent one
    const result = await db.run(`
        DELETE FROM units
        WHERE id NOT IN (
            SELECT id FROM (
                SELECT id,
                ROW_NUMBER() OVER (
                    PARTITION BY school_id, address_normalized 
                    ORDER BY 
                        CASE WHEN geocode_status = 'success' THEN 0 ELSE 1 END,
                        created_at DESC
                ) as rn
                FROM units
            ) WHERE rn = 1
        )
    `);

    const remaining = await db.get('SELECT COUNT(*) as count FROM units');

    return {
        success: true,
        removed: result?.changes || 0,
        remaining: remaining?.count || 0
    };
}
