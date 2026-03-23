import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

// Mock AI Engine
async function simulateAIEngine(briefing: string, brandInfo: any) {
    // Simulating delay
    // await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
        briefing_ai: `[ESTRUTURADO PELA IA]\n\nObjetivo: ${brandInfo.objective || 'Reforço de Marca'}\nFoco: ${brandInfo.accent || 'Comunidade Escolar'}\n\nO conteúdo deve focar em ${briefing.slice(0, 50)}... utilizando o tom de voz ${brandInfo.tone_of_voice}.\n\nRecomendações: Usar hashtags da escola e CTAs de engajamento.`,
        ia_legend_options: JSON.stringify([
            { title: 'Opção 1 (Inspiradora)', text: `✨ Na ${brandInfo.brand_name}, acreditamos que cada detalhe importa. ${briefing.slice(0, 30)}... Venha conhecer nossa proposta pedagógica!` },
            { title: 'Opção 2 (Direta)', text: `📣 Atenção comunidade! Sobre ${briefing.slice(0, 40)}: confira as novidades em nosso site. #RaizEducação #${brandInfo.brand_name}` },
            { title: 'Opção 3 (Humanizada)', text: `👩‍🏫 Nossos educadores estão prontos para o desafio. ${briefing.slice(0, 20)}... Juntos construímos o futuro.` }
        ]),
        design_briefing: `Utilizar paleta de cores da ${brandInfo.brand_name}. Imagens de alta resolução focadas em pessoas. Elementos gráficos: Curvas e tipografia moderna.`
    };
}

export async function GET(req: Request) {
    try {
        const db = await getDb();
        const { searchParams } = new URL(req.url);
        const schoolId = searchParams.get('schoolId');
        
        let query = 'SELECT r.*, s.brand_name, u.unit_name FROM hub_content_requests r JOIN schools s ON r.school_id = s.id LEFT JOIN units u ON r.unit_id = u.id';
        const params: any[] = [];
        
        if (schoolId) {
            query += ' WHERE r.school_id = ?';
            params.push(schoolId);
        }
        
        query += ' ORDER BY r.created_at DESC';
        
        const requests = await db.all(query, params);
        
        return NextResponse.json({ success: true, requests });
    } catch (error) {
        console.error('Hub API Error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const db = await getDb();
        const body = await req.json();
        
        const {
            schoolId,
            unitId,
            requesterName,
            requesterArea,
            demandType,
            channel,
            objective,
            targetAudience,
            desiredPublishDate,
            priority,
            briefingRaw,
            tags
        } = body;
        
        if (!schoolId || !demandType || !briefingRaw) {
            return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }
        
        const id = `HUB-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
        const uuid = uuidv4();
        
        // Fetch brand library context
        const brandLibrary = await db.get('SELECT * FROM hub_brand_library WHERE school_id = ?', [schoolId]);
        
        // Run (Mock) AI Engine
        const aiResults = await simulateAIEngine(briefingRaw, {
            brand_name: brandLibrary?.brand_name || 'Escola',
            tone_of_voice: brandLibrary?.tone_of_voice || 'Acolhedor',
            objective: objective
        });

        await db.run(`
            INSERT INTO hub_content_requests (
                id, school_id, unit_id, requester_name, requester_area,
                demand_type, channel, objective, target_audience,
                desired_publish_date, priority, briefing_raw, 
                briefing_ai, ia_legend_options, design_briefing,
                status, tags, content_category
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            uuid, schoolId, unitId || null, requesterName || 'Solicitante Geral',
            requesterArea || 'Escola', demandType, channel || 'Instagram',
            objective || 'Branding', targetAudience || 'Comunidade Escolar',
            desiredPublishDate || null, priority || 'média', briefingRaw,
            aiResults.briefing_ai, aiResults.ia_legend_options, aiResults.design_briefing,
            'recebida', tags || '[]', (tags && JSON.parse(tags).length > 0 ? JSON.parse(tags)[0] : 'Outros')
        ]);

        // Registrar no histórico
        await db.run(`
            INSERT INTO hub_request_history (id, request_id, actor_name, action, description)
            VALUES (?, ?, ?, ?, ?)
        `, [uuidv4(), uuid, requesterName || 'Solicitante', 'criacao', 'Solicitação de conteúdo enviada pelo portal.']);
        
        return NextResponse.json({ 
            success: true, 
            message: 'Solicitação recebida com sucesso',
            requestId: uuid,
            displayId: id
        });
        
    } catch (error) {
        console.error('Hub API Error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
