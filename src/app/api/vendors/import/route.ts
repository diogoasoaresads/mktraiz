import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: Request) {
    try {
        const { vendors } = await req.json();
        const db = await getDb();

        let inserted = 0;
        for (const vendor of vendors) {
            if (!vendor.name) continue;

            const id = uuidv4();
            await db.run(`
                INSERT INTO vendors (id, name, contact_name, contact_email, contact_phone, cities_covered)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [
                id,
                vendor.name,
                vendor.contact_name || null,
                vendor.contact_email || null,
                vendor.contact_phone || null,
                vendor.cities_covered || null
            ]);
            inserted++;
        }

        return NextResponse.json({ success: true, inserted });
    } catch (error) {
        console.error('Import Vendors Error:', error);
        return NextResponse.json({ success: false, error: 'Falha na importação.' }, { status: 500 });
    }
}
