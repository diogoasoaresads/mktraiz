
async function testRecommend() {
    console.log("Testing Recommendation Engine...");
    try {
        // We'll try to reach the local API directly
        const campaignId = '7ecf8b63-146b-4ac3-9426-ed0887e6518a'; // A valid campaign ID from DB if possible, or we'll just check if it fails with 404/400 instead of 500
        const scenarioId = '3482a514-6f02-468e-976d-1bd7545ca891'; // A valid scenario ID

        const res = await fetch('http://localhost:3000/api/planner/recommend', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ campaignId, scenarioId })
        });

        const data = await res.json();
        console.log("Response Status:", res.status);
        console.log("Response Data:", data);

        if (res.status === 200 && data.success) {
            console.log("✅ Recommendation Engine is working!");
        } else if (res.status === 404 || res.status === 400) {
            console.log("ℹ️ Engine reachable, but IDs are invalid (expected behavior for random IDs).");
        } else {
            console.log("❌ Engine failed with status", res.status);
        }
    } catch (err) {
        console.error("Error reaching API:", err.message);
    }
}

testRecommend();
