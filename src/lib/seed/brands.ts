import getDb from '../db';
import { v4 as uuidv4 } from 'uuid';

export const RAIS_BRANDS = [
    { brand_name: 'Colégio QI', website: 'colegioqi.com.br' },
    { brand_name: 'Matriz Educação', website: 'matrizeducacao.com.br' },
    { brand_name: 'Apogeu', website: 'apogeu.com.br' },
    { brand_name: 'Leonardo da Vinci', website: 'colegioleonardodavinci.com.br' },
    { brand_name: 'Cubo', website: 'cubo.global' },
    { brand_name: 'Escola SAP', website: 'escolasap.com.br' },
    { brand_name: 'Creche Global Tree', website: 'crecheglobaltree.com.br' },
    { brand_name: 'Sarah Dawsey', website: 'sdjf.com.br' },
    { brand_name: 'Americano Bilíngue', website: 'americanobilingue.com.br' },
    { brand_name: 'Escola S.A. Pereira', website: 'escolasapereira.com.br' },
    { brand_name: 'Unificado', website: 'unificado.com.br' },
    { brand_name: 'Colégio União', website: 'colegiouniao.com.br' },
];

export async function seedBrands() {
    const db = await getDb();
    console.log('Seeding brands...');

    // [CRITICAL] Clear strictly before seed to avoid duplicates/obsolete data
    await db.run('DELETE FROM units');
    await db.run('DELETE FROM schools');

    for (const brand of RAIS_BRANDS) {
        await db.run(
            'INSERT INTO schools (id, brand_name, website, group_name) VALUES (?, ?, ?, ?)',
            [uuidv4(), brand.brand_name, brand.website, 'Raiz Educação']
        );
        console.log(`Added brand: ${brand.brand_name}`);
    }
}
