async function testSearch(brand) {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(brand)}&format=json&addressdetails=1&limit=20&countrycodes=br`;
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'OOHPlannerRaiz/1.0 (contact: diogo.soares@example.com)'
            }
        });
        if (!response.ok) {
            console.error(`Status: ${response.status}`);
            return;
        }
        const data = await response.json();
        console.log(JSON.stringify(data, null, 2));
    } catch (e) {
        console.error(e);
    }
}

testSearch('Colégio QI Rio de Janeiro');
