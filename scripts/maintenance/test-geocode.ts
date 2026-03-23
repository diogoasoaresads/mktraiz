import { processGeocodingQueue } from '../../src/lib/geocoding';

async function run() {
    try {
        console.log("Starting geocoding process...");
        await processGeocodingQueue();
        console.log("Geocoding complete.");
    } catch (e) {
        console.error("Error during geocoding:", e);
    }
}

run();
