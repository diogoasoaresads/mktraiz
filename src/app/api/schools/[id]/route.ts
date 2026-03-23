import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
    try {
        const { id } = params;
        const body = await req.json();
        const { brand_name, website, notes } = body;
        const db = await getDb();

        await db.run(`
            UPDATE schools 
            SET brand_name = ?, website = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [brand_name, website, notes, id]);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('API Error (PATCH school):', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    try {
        const { id } = params;
        const db = await getDb();

        // Start transaction
        await db.run('BEGIN TRANSACTION');

        try {
            // Delete associated units first
            await db.run('DELETE FROM units WHERE school_id = ?', [id]);

            // Delete the school
            await db.run('DELETE FROM schools WHERE id = ?', [id]);

            await db.run('COMMIT');
            return NextResponse.json({ success: true });
        } catch (err) {
            await db.run('ROLLBACK');
            throw err;
        }
    } catch (error: any) {
        console.error('API Error (DELETE school):', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
