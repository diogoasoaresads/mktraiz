import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const vendorId = params.id;
        const db = await getDb();

        // Optional: Remove plan_lines dependent on these assets to prevent foreign key constraint failures
        await db.run(`
            DELETE FROM plan_lines 
            WHERE asset_id IN (
                SELECT id FROM media_assets WHERE vendor_id = ?
            )
        `, [vendorId]);

        // Delete the assets
        const result = await db.run(`
            DELETE FROM media_assets WHERE vendor_id = ?
        `, [vendorId]);

        // Also clean the import history to start fresh
        await db.run(`
            DELETE FROM vendor_imports WHERE vendor_id = ?
        `, [vendorId]);

        return NextResponse.json({ success: true, deleted: result.changes });
    } catch (error: any) {
        console.error('Delete Vendor Inventory Error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Falha ao excluir o inventário do fornecedor.' },
            { status: 500 }
        );
    }
}
