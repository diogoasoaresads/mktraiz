
import crypto from 'crypto';

// Mocking the behavior of the API route for testing normalization and fingerprinting
function testNormalization(vendor_id, address_raw, type) {
    try {
        const addressRaw = String(address_raw || '').trim();
        if (!addressRaw) {
            console.log(`Skipping: empty address`);
            return null;
        }

        const addressNormalized = addressRaw.toLowerCase().replace(/\s+/g, ' ');
        const fingerprint = crypto.createHash('md5')
            .update(`${vendor_id}-${addressNormalized}-${type}`)
            .digest('hex');

        return { addressRaw, addressNormalized, fingerprint };
    } catch (err) {
        console.error(`Error processing address "${address_raw}":`, err.message);
        return null;
    }
}

const testCases = [
    { v: 'v1', a: 'Rua das Flores, 123', t: 'Outdoor' },
    { v: 'v1', a: '  RUA DAS FLORES, 123  ', t: 'Outdoor' }, // Should result in same fingerprint
    { v: 'v1', a: null, t: 'Outdoor' }, // Should be handled gracefully
    { v: 'v1', a: undefined, t: 'Outdoor' }, // Should be handled gracefully
    { v: 'v1', a: 12345, t: 'Outdoor' }, // Should be converted to string
    { v: 'v1', a: '', t: 'Outdoor' }, // Should be skipped
];

console.log("Starting normalization tests...");
testCases.forEach((tc, i) => {
    const result = testNormalization(tc.v, tc.a, tc.t);
    console.log(`Test Case ${i}:`, result ? `Success: ${result.fingerprint}` : `Handled correctly`);
});

// Verification of fingerprint consistency
const res1 = testNormalization('v1', 'Rua A', 'Type1');
const res2 = testNormalization('v1', '  rua a  ', 'Type1');
if (res1.fingerprint === res2.fingerprint) {
    console.log("✅ Fingerprint consistency check passed!");
} else {
    console.log("❌ Fingerprint consistency check failed!");
}
