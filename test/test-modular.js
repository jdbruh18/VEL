/**
 * test-modular.js - Modular Driver Verification Suite
 * Part of VEL Cryptography & Protection Engine
 */

const assert = require('assert');
const { NeuralReservoir } = require('../js/lsm.js');
const BaseDriver = require('../js/drivers/driver.base.js');
const SimulationDriver = require('../js/drivers/driver.sim.js');
const CameraDriver = require('../js/drivers/driver.camera.js');
const QuantumDriver = require('../js/drivers/driver.quantum.js');
const VelCore = require('../js/vel-core.js');

console.log("==========================================");
console.log("🔱 VEL MODULAR DRIVER TEST RUNNER");
console.log("==========================================\n");

function testDriversInstantiation() {
    console.log("Test 1: Pluggable Drivers Instantiation...");
    
    const sim = new SimulationDriver(400, 300);
    const camera = new CameraDriver(null, 400, 300);
    const quantum = new QuantumDriver(400, 300);
    
    assert.ok(sim instanceof BaseDriver, "SimulationDriver should extend BaseDriver");
    assert.ok(camera instanceof BaseDriver, "CameraDriver should extend BaseDriver");
    assert.ok(quantum instanceof BaseDriver, "QuantumDriver should extend BaseDriver");
    
    assert.strictEqual(sim.width, 400);
    assert.strictEqual(camera.height, 300);
    
    console.log("✔️ All pluggable drivers instantiate and inherit from BaseDriver correctly.\n");
}

function testSimulationDriverCoordinates() {
    console.log("Test 2: Simulation Driver updates...");
    
    const sim = new SimulationDriver(400, 300);
    sim.start();
    
    // Step driver multiple times to spawn particles
    for (let i = 0; i < 20; i++) {
        sim.update();
    }
    
    const coords = sim.getCoordinates();
    const grid = sim.getGridInputs();
    
    console.log(`- Active simulation particles spawned: ${coords.length}`);
    assert.strictEqual(grid.length, 64, "Input grid must be 64 elements");
    
    sim.stop();
    assert.strictEqual(sim.getCoordinates().length, 0, "Stopping driver should clear active particles");
    
    console.log("✔️ Simulation driver generates and clears spatiotemporal coordinates.\n");
}

function testVelCoreDriverSwitching() {
    console.log("Test 3: VelCore Driver switching & harvesting...");
    
    const reservoir = new NeuralReservoir(128, 64, "VEL_CORE_TEST");
    const core = new VelCore(reservoir);
    
    const sim = new SimulationDriver(400, 300);
    const quantum = new QuantumDriver(400, 300);
    
    core.registerDriver('sim', sim);
    core.registerDriver('quantum', quantum);
    
    // Switch to sim
    core.setDriver('sim');
    assert.strictEqual(core.activeDriver, sim, "Active driver should be sim");
    
    // Start harvest
    core.startHarvesting();
    assert.ok(core.isHarvesting, "Core should be in harvesting state");
    
    for (let i = 0; i < 5; i++) {
        core.update();
    }
    
    const recorded = core.stopHarvesting();
    assert.strictEqual(recorded.length, 5, "Harvest log should contain 5 frames");
    assert.ok(Array.isArray(recorded[0].p), "Frame log should contain particle coords list");
    
    console.log("✔️ VelCore manages driver lifecycle and harvesting logs successfully.\n");
}

// Run tests
try {
    testDriversInstantiation();
    testSimulationDriverCoordinates();
    testVelCoreDriverSwitching();
    console.log("==========================================");
    console.log("🎉 ALL MODULAR TESTS PASSED SUCCESSFULLY!");
    console.log("==========================================");
} catch (err) {
    console.error("\n❌ MODULAR TEST FAILED:");
    console.error(err.message);
    process.exit(1);
}
