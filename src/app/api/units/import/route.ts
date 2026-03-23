import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: Request) {
    try {
        const { schoolId, units, mode = 'append', confirmGlobalReplace = false } = await req.json();
        const db = await getDb();

        // Mode: 'replace' = apagar todas as unidades antes de inserir
        if (mode === 'replace') {
            if (schoolId === 'global') {
                if (confirmGlobalReplace) {
                    await db.run('DELETE FROM units');
                } else {
                    console.log('Global replace requested but not confirmed. Falling back to append.');
                }
            } else {
                await db.run('DELETE FROM units WHERE school_id = ?', [schoolId]);
            }
        }

        const normalize = (addr: string) => addr
            .toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/endereco:|ola,|tudo bem\?|seja bem-vindo|estamos localizados na|unidade:|logradouro:/gi, '')
            .replace(/\(\d{2}\)\s?\d{4,5}-?\d{4}/g, '')
            .replace(/cep:\s?\d{5}-?\d{3}/gi, '')
            .replace(/[^\w\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        let inserted = 0;
        let skipped = 0;
        const brandCache = new Map<string, string>(); // name -> id

        // Warm up cache with existing schools
        const existingSchools = await db.all('SELECT id, brand_name FROM schools');
        existingSchools.forEach(s => brandCache.set(s.brand_name.toLowerCase().trim(), s.id));

        const affectedSchoolIds = new Set<string>();
        if (schoolId !== 'global') affectedSchoolIds.add(schoolId);

        for (const unit of units) {
            const addressNormalized = normalize(unit.address_raw);
            if (addressNormalized.length < 15) {
                skipped++;
                continue;
            }

            let targetSchoolId = schoolId;

            // Brand Auto-Creation/Detection
            if (schoolId === 'global' || !schoolId) {
                if (unit.school_id) {
                    targetSchoolId = unit.school_id;
                } else if (unit.brand_name) {
                    const normBrandName = unit.brand_name.toLowerCase().trim();
                    if (brandCache.has(normBrandName)) {
                        targetSchoolId = brandCache.get(normBrandName)!;
                    } else {
                        // Create new brand
                        const newBrandId = uuidv4();
                        await db.run(
                            'INSERT INTO schools (id, brand_name, website) VALUES (?, ?, ?)',
                            [newBrandId, unit.brand_name, unit.website || null]
                        );
                        brandCache.set(normBrandName, newBrandId);
                        targetSchoolId = newBrandId;
                    }
                }
            }

            if (!targetSchoolId || targetSchoolId === 'global') {
                skipped++;
                continue;
            }

            affectedSchoolIds.add(targetSchoolId);

            try {
                await db.run(`
                    INSERT INTO units (
                        id, school_id, unit_name, address_raw, address_normalized,
                        city, state, lat, lng, geocode_status
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(school_id, address_normalized, unit_name) DO UPDATE SET
                        address_raw = excluded.address_raw,
                        city = excluded.city,
                        state = excluded.state,
                        lat = COALESCE(excluded.lat, units.lat),
                        lng = COALESCE(excluded.lng, units.lng),
                        geocode_status = CASE 
                            WHEN excluded.lat IS NOT NULL THEN 'success' 
                            ELSE units.geocode_status 
                        END
                `, [
                    uuidv4(),
                    targetSchoolId,
                    unit.unit_name || 'Unidade',
                    unit.address_raw,
                    addressNormalized,
                    unit.city || null,
                    unit.state || null,
                    unit.lat || null,
                    unit.lng || null,
                    unit.lat ? 'success' : 'pending'
                ]);
                inserted++;
            } catch (err) {
                console.error('Error inserting unit:', err);
                skipped++;
            }
        }

        // Update status for all affected brands
        for (const id of Array.from(affectedSchoolIds)) {
            await db.run('UPDATE schools SET units_status = ? WHERE id = ?', ['seeded_ok', id]);
        }

        return NextResponse.json({ success: true, inserted, skipped, mode });
    } catch (error: any) {
        console.error('Import API error:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to import units',
            details: error.message
        }, { status: 500 });
    }
}
