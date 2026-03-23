import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET(req: Request, { params }: { params: { id: string } }) {
    try {
        const db = await getDb();
        const campaign = await db.get('SELECT * FROM campaigns WHERE id = ?', [params.id]);

        if (!campaign) {
            return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 });
        }

        if (campaign.allowed_types) campaign.allowed_types = JSON.parse(campaign.allowed_types);
        if (campaign.target_school_ids) campaign.target_school_ids = JSON.parse(campaign.target_school_ids);
        if (campaign.target_unit_ids) campaign.target_unit_ids = JSON.parse(campaign.target_unit_ids);

        return NextResponse.json(campaign);
    } catch (error) {
        console.error('Error fetching campaign:', error);
        return NextResponse.json({ error: 'Erro ao buscar campanha' }, { status: 500 });
    }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
    try {
        const db = await getDb();
        const data = await req.json();

        // Ensure campaign exists
        const existing = await db.get('SELECT id FROM campaigns WHERE id = ?', [params.id]);
        if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        await db.run(`
            UPDATE campaigns SET
                name = ?, objective = ?, start_date = ?, end_date = ?, budget = ?, radius_km = ?, 
                allowed_types = ?, target_school_ids = ?, target_unit_ids = ?, status = ?
            WHERE id = ?
        `, [
            data.name,
            data.objective || 'captação',
            data.start_date || null,
            data.end_date || null,
            data.budget || 0,
            data.radius_km || 5,
            JSON.stringify(data.allowed_types || []),
            JSON.stringify(data.target_school_ids || []),
            JSON.stringify(data.target_unit_ids || []),
            data.status || 'draft',
            params.id
        ]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating campaign:', error);
        return NextResponse.json({ error: 'Erro ao atualizar campanha' }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    try {
        const db = await getDb();

        // Ensure campaign exists
        const existing = await db.get('SELECT id FROM campaigns WHERE id = ?', [params.id]);
        if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        // First delete dependent scenarios and plan_lines
        const scenarios = await db.all('SELECT id FROM scenarios WHERE campaign_id = ?', [params.id]);
        for (const s of scenarios) {
            await db.run('DELETE FROM plan_lines WHERE scenario_id = ?', [s.id]);
        }
        await db.run('DELETE FROM scenarios WHERE campaign_id = ?', [params.id]);
        await db.run('DELETE FROM campaigns WHERE id = ?', [params.id]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting campaign:', error);
        return NextResponse.json({ error: 'Erro ao deletar campanha' }, { status: 500 });
    }
}
