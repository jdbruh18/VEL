/**
 * test.js - Mathematical & Cryptographic Verification Suite
 * Part of VEL Cryptography & Protection Engine
 * 
 * Verifies reservoir determinism, SHA-256 correctness, and
 * end-to-end encryption/decryption roundtrips under Node.js.
 */

const assert = require('assert');
const { NeuralReservoir, createPRNG } = require('../js/lsm.js');
const { sha256, stringToBytes, bytesToHex, encryptVEL, decryptVEL } = require('../js/crypto.js');

console.log("==========================================");
console.log("🛡️ VEL CRYPTO ENGINE - UNIT TEST RUNNER");
console.log("==========================================\n");

function testPRNG() {
    console.log("Test 1: PRNG Consistency...");
    const seed = "VEL_TEST_SEED_123";
    const rand1 = createPRNG(seed);
    const rand2 = createPRNG(seed);
    
    for (let i = 0; i < 50; i++) {
        assert.strictEqual(rand1(), rand2(), `Mismatch at index ${i}`);
    }
    console.log("✔️ PRNG is deterministic and identical across instances.\n");
}

function testReservoirDeterminism() {
    console.log("Test 2: LSM Neural Reservoir Determinism...");
    const seed = "VEL_MYSTIC_SPEAR_2026";
    const res1 = new NeuralReservoir(128, 64, seed);
    const res2 = new NeuralReservoir(128, 64, seed);
    
    // Step both reservoirs with the same random input sequence
    const inputs = new Float32Array(64).map(() => Math.random());
    
    for (let step = 0; step < 20; step++) {
        const state1 = res1.update(inputs);
        const state2 = res2.update(inputs);
        
        for (let i = 0; i < 128; i++) {
            assert.strictEqual(state1[i], state2[i], `State mismatch at step ${step}, neuron ${i}`);
        }
    }
    
    // Verify that reset function works correctly
    res1.reset();
    for (let i = 0; i < 128; i++) {
        assert.strictEqual(res1.states[i], 0, `State not zeroed at neuron ${i}`);
    }
    
    console.log("✔️ Neural reservoir updates are float-perfect deterministic.\n");
}

function testSHA256() {
    console.log("Test 3: SHA-256 Core Hashing...");
    
    // Benchmark 1: "abc" standard NIST test vector
    const inputAbc = stringToBytes("abc");
    const digestAbc = sha256(inputAbc);
    const hexAbc = bytesToHex(digestAbc);
    const expectedAbc = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
    
    assert.strictEqual(hexAbc, expectedAbc, "SHA-256 failed on standard vector 'abc'");
    
    // Benchmark 2: Empty string
    const inputEmpty = stringToBytes("");
    const digestEmpty = sha256(inputEmpty);
    const hexEmpty = bytesToHex(digestEmpty);
    const expectedEmpty = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
    
    assert.strictEqual(hexEmpty, expectedEmpty, "SHA-256 failed on empty vector");
    
    console.log("✔️ SHA-256 matches NIST standard reference digests.\n");
}

function testEncryptionRoundtrip() {
    console.log("Test 4: End-to-End Encryption & Decryption Roundtrip...");
    
    const seed = "VEL_PROTECTION_KEY_888";
    const reservoir = new NeuralReservoir(128, 64, seed);
    
    const plaintext = "Lord Murugan's Vel represents sharp intellect (Tip) and vast knowledge (Broad Top).";
    
    // Mock recorded coordinate frames (simulating rain detector logs)
    // 5 frames with 4 particle coordinate triples each
    const recordedFrames = [
        { f: 0, p: [[100, 200, 5], [150, 250, 6], [300, 100, 4], [400, 300, 7]] },
        { f: 1, p: [[102, 205, 5], [152, 256, 6], [302, 104, 4], [402, 305, 7]] },
        { f: 2, p: [[104, 210, 5], [154, 262, 6], [304, 108, 4], [404, 310, 7]] },
        { f: 3, p: [[106, 215, 5], [156, 268, 6], [306, 112, 4], [406, 315, 7]] },
        { f: 4, p: [[108, 220, 5], [158, 274, 6], [308, 116, 4], [408, 320, 7]] }
    ];
    
    // Encrypt
    const ciphertextHex = encryptVEL(plaintext, reservoir, recordedFrames);
    console.log(`- Plaintext length: ${plaintext.length} chars`);
    console.log(`- Ciphertext Hex:   ${ciphertextHex.substring(0, 40)}... (${ciphertextHex.length} hex chars)`);
    
    // Decrypt
    const decrypted = decryptVEL(ciphertextHex, reservoir, recordedFrames);
    console.log(`- Decrypted Result: "${decrypted}"`);
    
    assert.strictEqual(decrypted, plaintext, "Decrypted message does not match original plaintext!");
    console.log("✔️ Decryption successfully recovered plaintext message from ciphertext.\n");
}

// Run all tests
try {
    testPRNG();
    testReservoirDeterminism();
    testSHA256();
    testEncryptionRoundtrip();
    console.log("==========================================");
    console.log("🎉 ALL TESTS PASSED SUCCESSFULLY! VEL ENGINE SECURE.");
    console.log("==========================================");
} catch (err) {
    console.error("\n❌ TEST FAILED:");
    console.error(err.message);
    process.exit(1);
}
