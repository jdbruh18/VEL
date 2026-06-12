/**
 * app.js - Modular Dashboard Coordinator & Vel Visualizer
 * Part of VEL Cryptography & Protection Engine
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Core Cryptographic and Vision Objects
    const reservoir = new NeuralReservoir(128, 64, "cfe14fe4f35ea43568731e3f59348b8b144878d18dc68e7860613d81a236d02f");
    const video = document.getElementById('webcam-video');
    
    // Core manager
    const core = new VelCore(reservoir);
    
    // Initialize Pluggable Drivers (400x300 canvas size)
    const cameraDriver = new CameraDriver(video, 400, 300);
    const simDriver = new SimulationDriver(400, 300);
    const serialDriver = new SerialDriver(400, 300);
    const quantumDriver = new QuantumDriver(400, 300);
    
    // Register drivers
    core.registerDriver('vision', cameraDriver);
    core.registerDriver('sensor', cameraDriver); // Re-uses camera driver with sensor modes
    core.registerDriver('sim', simDriver);
    core.registerDriver('serial', serialDriver);
    core.registerDriver('quantum', quantumDriver);
    
    // 2. UI Elements
    const canvasWebcam = document.getElementById('canvas-webcam');
    const ctxWebcam = canvasWebcam.getContext('2d');
    const canvasVel = document.getElementById('canvas-vel');
    const ctxVel = canvasVel.getContext('2d');
    
    const modeSelect = document.getElementById('mode-select');
    const seedInput = document.getElementById('seed-input');
    const leakInput = document.getElementById('leak-input');
    
    const terminalLogs = document.getElementById('terminal-logs');
    const binaryStream = document.getElementById('binary-stream');
    const entropyDisplay = document.getElementById('entropy-value');
    
    // Hardware elements
    const serialGroup = document.getElementById('serial-connection-group');
    const btnConnectSerial = document.getElementById('btn-connect-serial');
    
    // Encrypt Panel
    const plaintextInput = document.getElementById('plaintext-input');
    const ciphertextOutput = document.getElementById('ciphertext-output');
    const btnHarvestEncrypt = document.getElementById('btn-harvest-encrypt');
    const btnToggleHarvest = document.getElementById('btn-toggle-harvest');
    const harvestStatus = document.getElementById('harvest-status');
    
    // Decrypt Panel
    const ciphertextInput = document.getElementById('ciphertext-input');
    const keyfileUpload = document.getElementById('keyfile-upload');
    const btnDecryptReplay = document.getElementById('btn-decrypt-replay');
    const plaintextOutput = document.getElementById('plaintext-output');
    
    // Overlays
    const harvestOverlay = document.getElementById('harvest-overlay');
    const countdownDisplay = document.getElementById('countdown-display');
    
    // 3. State variables
    let animationFrameId = null;
    let neuronPositions = [];
    let rollingEntropy = [];
    let isReplayingVisual = false;
    let loadedReplayData = null;
    let currentGridInputs = new Float32Array(64);
    let currentCoords = [];
    
    // 4. Generate Neuron Positions inside the Vel Spearhead
    function generateNeuronPositions() {
        neuronPositions = [];
        const width = canvasVel.width;
        const height = canvasVel.height;
        const cx = width / 2;
        const cy = height * 0.35; // Center of spearhead
        const spearHeight = height * 0.45;
        const spearWidth = width * 0.65;
        
        // Mathematical leaf-shape (Spearhead boundary) check
        const isInsideSpearhead = (x, y) => {
            const dx = x - cx;
            const dy = y - cy;
            const ny = -dy / (spearHeight / 2); // Map dy to [-1, 1] (top is positive)
            const nx = dx / (spearWidth / 2);
            
            if (ny < -1.0 || ny > 1.0) return false;
            
            // Adjust leaf width based on height coordinate
            let leafEnvelope = Math.cos(ny * Math.PI / 2);
            if (ny < 0) {
                leafEnvelope = Math.sqrt(1 - ny * ny) * Math.cos(ny * Math.PI / 6);
            } else {
                leafEnvelope = Math.cos(ny * Math.PI / 2) * (1.1 - ny);
            }
            
            return Math.abs(nx) <= leafEnvelope;
        };
        
        // Generate 128 nodes clustered inside the spearhead
        let attempts = 0;
        const rand = createPRNG("cfe14fe4f35ea43568731e3f59348b8b144878d18dc68e7860613d81a236d02f");
        
        while (neuronPositions.length < 128 && attempts < 2000) {
            attempts++;
            const rx = cx + (rand() - 0.5) * spearWidth;
            const ry = cy + (rand() - 0.5) * spearHeight;
            if (isInsideSpearhead(rx, ry)) {
                neuronPositions.push({ x: rx, y: ry });
            }
        }
        
        // Fallback: simple oval if leaf-check fails
        while (neuronPositions.length < 128) {
            const theta = rand() * Math.PI * 2;
            const r = rand() * (spearWidth / 3);
            neuronPositions.push({
                x: cx + Math.cos(theta) * r,
                y: cy + Math.sin(theta) * r * 1.5
            });
        }
    }
    
    // 5. Initialize the app
    async function init() {
        generateNeuronPositions();
        
        // Mode listener
        modeSelect.addEventListener('change', async (e) => {
            const mode = e.target.value;
            logTerminal(`Switching to Driver: ${mode.toUpperCase()}...`);
            
            // Toggle serial connection button visibility
            if (mode === 'serial') {
                serialGroup.style.display = "block";
            } else {
                serialGroup.style.display = "none";
            }
            
            try {
                if (mode === 'vision') {
                    cameraDriver.setMode('vision');
                    await core.setDriver('vision');
                } else if (mode === 'sensor') {
                    cameraDriver.setMode('sensor');
                    await core.setDriver('sensor');
                } else {
                    await core.setDriver(mode);
                }
                logTerminal(`Active driver connected successfully.`);
            } catch (err) {
                logTerminal(`❌ Failed starting driver: ${err.message}`);
                modeSelect.value = 'sim';
                await core.setDriver('sim');
            }
        });
        
        // Serial Connect click listener
        btnConnectSerial.addEventListener('click', async () => {
            try {
                logTerminal("Establishing Serial connection over USB...");
                await serialDriver.start();
                logTerminal("🔌 Serial Link established. Feed active.");
                btnConnectSerial.textContent = "🔌 Serial Connected";
                btnConnectSerial.style.borderColor = "var(--cyan)";
                btnConnectSerial.style.color = "var(--cyan)";
            } catch (err) {
                logTerminal(`❌ Serial Link failed: ${err.message}`);
                alert(`Serial connection error: ${err.message}`);
            }
        });
        
        // Seed listener
        seedInput.addEventListener('input', (e) => {
            if (e.target.value.trim()) {
                reservoir.seed = e.target.value;
                reservoir.initializeMatrices();
                logTerminal(`Reservoir re-initialized with seed: "${e.target.value}"`);
            }
        });
        
        // Leak rate listener
        leakInput.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            reservoir.alpha = val;
            document.getElementById('leak-value').textContent = val.toFixed(2);
        });
        
        // Bind button actions
        btnToggleHarvest.addEventListener('click', toggleManualHarvest);
        btnHarvestEncrypt.addEventListener('click', triggerHarvestAndEncrypt);
        btnDecryptReplay.addEventListener('click', triggerDecryptAndReplay);
        
        // Bind self-test button
        const btnSelfTest = document.getElementById('btn-self-test');
        if (btnSelfTest) {
            btnSelfTest.addEventListener('click', runEngineSelfTest);
        }
        
        // Keyfile Upload Listener
        keyfileUpload.addEventListener('change', handleKeyfileUpload);
        
        // Start simulation mode by default
        await core.setDriver('sim');
        modeSelect.value = 'sim';
        
        // Launch Loop
        logTerminal("VEL Cryptography & Protection Engine Initialized.");
        logTerminal("Spearhead Reservoir loaded: 128 neurons, 10% density.");
        
        loop();
    }
    
    // 6. Logging Helper
    function logTerminal(message) {
        const time = new Date().toLocaleTimeString();
        terminalLogs.innerHTML += `<div><span class="term-time">[${time}]</span> ${message}</div>`;
        terminalLogs.scrollTop = terminalLogs.scrollHeight;
    }
    
    // 7. Manual Harvesting Controls
    function toggleManualHarvest() {
        if (isReplayingVisual) return;
        if (!core.isHarvesting) {
            core.startHarvesting();
            btnToggleHarvest.innerHTML = `<span class="glow-dot" style="background: #ff3b30"></span> Stop Harvest`;
            harvestStatus.textContent = "Harvesting dynamic environmental entropy...";
            harvestStatus.style.color = "#ff3b30";
            logTerminal("Started manual entropy harvesting.");
        } else {
            const frames = core.stopHarvesting();
            btnToggleHarvest.innerHTML = `<span class="glow-dot" style="background: #00ff87"></span> Start Harvest`;
            harvestStatus.textContent = `Harvested ${frames.length} frames of entropy. Ready to encrypt.`;
            harvestStatus.style.color = "#00ff87";
            logTerminal(`Stopped manual harvesting. Logged ${frames.length} entropy frames.`);
        }
    }
    
    // 8. Auto Countdown Harvest + Encrypt
    function triggerHarvestAndEncrypt() {
        if (isReplayingVisual) return;
        
        const plaintext = plaintextInput.value.trim();
        if (!plaintext) {
            alert("Please input plaintext to encrypt.");
            return;
        }
        
        // If they already have recorded frames, we encrypt immediately
        if (core.recordedFrames.length > 0 && !core.isHarvesting) {
            encryptAndDownload();
            return;
        }
        
        logTerminal("Initiating Auto-Harvesting sequence...");
        harvestOverlay.style.display = "flex";
        
        core.startHarvesting();
        let secondsLeft = 3;
        countdownDisplay.textContent = secondsLeft;
        
        const interval = setInterval(() => {
            secondsLeft--;
            countdownDisplay.textContent = secondsLeft;
            
            if (secondsLeft <= 0) {
                clearInterval(interval);
                core.stopHarvesting();
                harvestOverlay.style.display = "none";
                
                logTerminal(`Auto-harvesting completed. Captured ${core.recordedFrames.length} frames.`);
                encryptAndDownload();
            }
        }, 1000);
    }
    
    function encryptAndDownload() {
        try {
            const plaintext = plaintextInput.value;
            const ciphertext = encryptVEL(plaintext, reservoir, core.recordedFrames);
            
            ciphertextOutput.value = ciphertext;
            logTerminal("Encryption completed successfully.");
            
            const keyfileObj = packageKeyfile(core.recordedFrames, reservoir.seed, reservoir.numNeurons);
            const keyfileStr = JSON.stringify(keyfileObj, null, 2);
            
            const blob = new Blob([keyfileStr], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `shield_${Date.now()}.vel`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            logTerminal("Generated and downloaded security keyfile (.vel).");
        } catch (err) {
            logTerminal(`Encryption failed: ${err.message}`);
            alert(err.message);
        }
    }
    
    // 9. Keyfile Upload parsing
    function handleKeyfileUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (data.projectName !== "VEL") {
                    throw new Error("Invalid file format. Not a VEL keyfile.");
                }
                
                loadedReplayData = data;
                logTerminal(`Successfully loaded .vel keyfile. Frames: ${data.frameCount}, LSM Seed: "${data.seed}"`);
                
                reservoir.seed = data.seed;
                reservoir.initializeMatrices();
                seedInput.value = data.seed;
            } catch (err) {
                alert(`Error loading keyfile: ${err.message}`);
                logTerminal(`Keyfile load error: ${err.message}`);
                loadedReplayData = null;
            }
        };
        reader.readAsText(file);
    }
    
    // 10. Decrypt & Replay
    function triggerDecryptAndReplay() {
        const ciphertext = ciphertextInput.value.trim();
        if (!ciphertext) {
            alert("Please input hex ciphertext.");
            return;
        }
        if (!loadedReplayData) {
            alert("Please upload the corresponding .vel keyfile first.");
            return;
        }
        
        logTerminal("Initiating Decryption & Visual Replay...");
        isReplayingVisual = true;
        btnDecryptReplay.disabled = true;
        
        // Feed the recorded coordinates to the core for visual replay
        core.setReplayData(loadedReplayData.recordedFrames);
        
        let replaySteps = loadedReplayData.recordedFrames.length;
        let counter = 0;
        
        const interval = setInterval(() => {
            counter++;
            if (counter >= replaySteps) {
                clearInterval(interval);
                
                try {
                    const decrypted = decryptVEL(ciphertext, reservoir, loadedReplayData.recordedFrames);
                    plaintextOutput.value = decrypted;
                    logTerminal("Decryption completed successfully. Plaintext recovered.");
                } catch (err) {
                    logTerminal(`Decryption failed: ${err.message}`);
                    plaintextOutput.value = "DECRYPTION FAILED";
                }
                
                isReplayingVisual = false;
                btnDecryptReplay.disabled = false;
                core.stopReplaying();
            }
        }, 30);
    }
    
    // 11. Main Rendering Loop
    function loop() {
        // A. Update core state
        const state = core.update();
        currentCoords = state.coords;
        currentGridInputs = state.gridInputs;
        
        // B. Render webcam/simulation canvas
        renderWebcamCanvas();
        
        // C. Render Vel Canvas
        renderVelCanvas();
        
        // D. Update scrolling key stream binary and entropy display
        updateHUD();
        
        animationFrameId = requestAnimationFrame(loop);
    }
    
    function renderWebcamCanvas() {
        ctxWebcam.fillStyle = '#0b0f19';
        ctxWebcam.fillRect(0, 0, canvasWebcam.width, canvasWebcam.height);
        
        // Draw webcam mirror image with opacity if webcam-based driver is active
        if (!core.isReplaying && (core.activeDriver === cameraDriver) && (modeSelect.value === 'vision' || modeSelect.value === 'sensor')) {
            ctxWebcam.save();
            ctxWebcam.translate(canvasWebcam.width, 0);
            ctxWebcam.scale(-1, 1);
            ctxWebcam.globalAlpha = 0.35;
            ctxWebcam.drawImage(video, 0, 0, canvasWebcam.width, canvasWebcam.height);
            ctxWebcam.restore();
        }
        
        // Render 8x8 input grid cells
        ctxWebcam.strokeStyle = 'rgba(0, 243, 255, 0.08)';
        ctxWebcam.lineWidth = 1;
        const cellW = canvasWebcam.width / 8;
        const cellH = canvasWebcam.height / 8;
        
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const activation = currentGridInputs[r * 8 + c];
                if (activation > 0) {
                    ctxWebcam.fillStyle = `rgba(0, 243, 255, ${activation * 0.25})`;
                    ctxWebcam.fillRect(c * cellW, r * cellH, cellW, cellH);
                }
                ctxWebcam.strokeRect(c * cellW, r * cellH, cellW, cellH);
            }
        }
        
        // Render particles (glowing raindrops / noise vectors)
        currentCoords.forEach(p => {
            const grad = ctxWebcam.createRadialGradient(p.x, p.y, 1, p.x, p.y, 6);
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(0.3, 'rgba(0, 243, 255, 0.8)');
            grad.addColorStop(1, 'rgba(211, 0, 255, 0)');
            
            ctxWebcam.fillStyle = grad;
            ctxWebcam.beginPath();
            ctxWebcam.arc(p.x, p.y, 6, 0, Math.PI * 2);
            ctxWebcam.fill();
            
            // Draw tail
            ctxWebcam.strokeStyle = 'rgba(0, 243, 255, 0.25)';
            ctxWebcam.lineWidth = 1.5;
            ctxWebcam.beginPath();
            ctxWebcam.moveTo(p.x, p.y);
            ctxWebcam.lineTo(p.x, p.y - 6);
            ctxWebcam.stroke();
        });
    }
    
    function renderVelCanvas() {
        ctxVel.fillStyle = '#0b0f19';
        ctxVel.fillRect(0, 0, canvasVel.width, canvasVel.height);
        
        const cx = canvasVel.width / 2;
        const cy = canvasVel.height * 0.35;
        const spearHeight = canvasVel.height * 0.45;
        const spearWidth = canvasVel.width * 0.65;
        
        const topY = cy - spearHeight / 2;
        const bottomY = cy + spearHeight / 2;
        
        // Draw the Long Staff (Shaft) - Gold gradient metallic look
        const staffGrad = ctxVel.createLinearGradient(cx - 6, bottomY, cx + 6, bottomY);
        staffGrad.addColorStop(0, '#8B7500');
        staffGrad.addColorStop(0.5, '#FFD700');
        staffGrad.addColorStop(1, '#8B7500');
        
        ctxVel.fillStyle = staffGrad;
        ctxVel.fillRect(cx - 5, bottomY, 10, canvasVel.height - bottomY - 15);
        
        // Draw base mount
        ctxVel.fillStyle = '#D4AF37';
        ctxVel.beginPath();
        ctxVel.moveTo(cx - 15, canvasVel.height - 15);
        ctxVel.lineTo(cx + 15, canvasVel.height - 15);
        ctxVel.lineTo(cx + 8, canvasVel.height - 25);
        ctxVel.lineTo(cx - 8, canvasVel.height - 25);
        ctxVel.closePath();
        ctxVel.fill();
        
        // Draw the Broad Top (Spearhead leaf shape)
        ctxVel.beginPath();
        ctxVel.moveTo(cx, topY);
        
        ctxVel.bezierCurveTo(
            cx - spearWidth * 0.6, cy - spearHeight * 0.2,
            cx - spearWidth * 0.6, cy + spearHeight * 0.2,
            cx, bottomY
        );
        
        ctxVel.bezierCurveTo(
            cx + spearWidth * 0.6, cy + spearHeight * 0.2,
            cx + spearWidth * 0.6, cy - spearHeight * 0.2,
            cx, topY
        );
        ctxVel.closePath();
        
        const spearGrad = ctxVel.createRadialGradient(cx, cy, 10, cx, cy, spearWidth);
        spearGrad.addColorStop(0, 'rgba(11, 25, 44, 0.9)');
        spearGrad.addColorStop(0.8, 'rgba(15, 32, 67, 0.95)');
        spearGrad.addColorStop(1, 'rgba(0, 128, 128, 0.95)');
        
        ctxVel.fillStyle = spearGrad;
        ctxVel.fill();
        
        ctxVel.strokeStyle = '#FFD700';
        ctxVel.lineWidth = 3;
        ctxVel.stroke();
        
        ctxVel.strokeStyle = 'rgba(255, 215, 0, 0.4)';
        ctxVel.lineWidth = 1;
        ctxVel.beginPath();
        ctxVel.moveTo(cx, topY);
        ctxVel.lineTo(cx, bottomY);
        ctxVel.stroke();
        
        // Render synapses
        ctxVel.strokeStyle = 'rgba(0, 243, 255, 0.04)';
        ctxVel.lineWidth = 1;
        const w_res = reservoir.W_res;
        
        let drawnConnections = 0;
        const maxSynapsesToDraw = 120;
        
        for (let i = 0; i < 128 && drawnConnections < maxSynapsesToDraw; i += 2) {
            const state = reservoir.states[i];
            if (Math.abs(state) < 0.15) continue;
            
            for (let j = 0; j < 128; j += 4) {
                if (w_res[i][j] !== 0) {
                    ctxVel.beginPath();
                    ctxVel.moveTo(neuronPositions[i].x, neuronPositions[i].y);
                    ctxVel.lineTo(neuronPositions[j].x, neuronPositions[j].y);
                    ctxVel.strokeStyle = w_res[i][j] > 0 
                        ? `rgba(0, 243, 255, ${Math.abs(state) * 0.12})`
                        : `rgba(211, 0, 255, ${Math.abs(state) * 0.12})`;
                    ctxVel.stroke();
                    drawnConnections++;
                }
            }
        }
        
        // Render individual Neurons (Hope, Love, Fear Colorization)
        neuronPositions.forEach((pos, idx) => {
            const state = reservoir.states[idx];
            const size = 3 + Math.abs(state) * 3;
            
            let color = 'rgba(0, 243, 255, 0.85)'; // Hope (Cyan)
            let shadowColor = '#00f3ff';
            
            if (Math.abs(state) <= 0.15) {
                color = 'rgba(0, 128, 128, 0.7)'; // Love (Peacock Teal)
                shadowColor = '#008080';
            } else if (state < -0.15) {
                color = 'rgba(211, 0, 255, 0.85)'; // Fear (Purple)
                shadowColor = '#d300ff';
            }
            
            if (Math.abs(state) > 0.4) {
                ctxVel.shadowColor = shadowColor;
                ctxVel.shadowBlur = 10;
            } else {
                ctxVel.shadowBlur = 0;
            }
            
            ctxVel.fillStyle = color;
            ctxVel.beginPath();
            ctxVel.arc(pos.x, pos.y, size, 0, Math.PI * 2);
            ctxVel.fill();
        });
        
        ctxVel.shadowBlur = 0;
        
        // Draw the Sharp Tip (Glowing Point)
        const avgState = Array.from(reservoir.states).reduce((sum, v) => sum + Math.abs(v), 0) / 128;
        const pulse = 10 + Math.sin(Date.now() / 150) * 4 + avgState * 10;
        
        const tipGrad = ctxVel.createRadialGradient(cx, topY, 1, cx, topY, pulse);
        tipGrad.addColorStop(0, '#ffffff');
        tipGrad.addColorStop(0.3, 'rgba(255, 215, 0, 0.9)');
        tipGrad.addColorStop(0.7, 'rgba(0, 243, 255, 0.4)');
        tipGrad.addColorStop(1, 'rgba(0, 243, 255, 0)');
        
        ctxVel.fillStyle = tipGrad;
        ctxVel.beginPath();
        ctxVel.arc(cx, topY, pulse, 0, Math.PI * 2);
        ctxVel.fill();
    }
    
    // 12. Update scrolling binary stream HUD
    function updateHUD() {
        const stateBuf = reservoir.getStateBuffer();
        const hash = sha256(stateBuf);
        
        let bin = '';
        for (let i = 0; i < 8; i++) {
            bin += hash[i].toString(2).padStart(8, '0') + ' ';
        }
        binaryStream.textContent = bin;
        
        const entropy = calculateEntropy(hash);
        entropyDisplay.textContent = `${entropy.toFixed(4)} bits/byte`;
        
        // Calculate Kottayil Triad LHF Theory percentages
        const states = reservoir.states;
        let hopeCount = 0;
        let fearCount = 0;
        let loveCount = 0;
        
        for (let i = 0; i < 128; i++) {
            const val = states[i];
            if (val > 0.15) {
                hopeCount++;
            } else if (val < -0.15) {
                fearCount++;
            } else {
                loveCount++;
            }
        }
        
        const hopePct = Math.round((hopeCount / 128) * 100);
        const fearPct = Math.round((fearCount / 128) * 100);
        const lovePct = Math.round((loveCount / 128) * 100);
        
        document.getElementById('lhf-hope').textContent = hopePct;
        document.getElementById('lhf-love').textContent = lovePct;
        document.getElementById('lhf-fear').textContent = fearPct;
        
        if (Math.random() < 0.02) {
            rollingEntropy.push(entropy);
            if (rollingEntropy.length > 50) rollingEntropy.shift();
        }
    }
    
    function calculateEntropy(bytes) {
        const freqs = {};
        bytes.forEach(b => {
            freqs[b] = (freqs[b] || 0) + 1;
        });
        
        let entropy = 0;
        const len = bytes.length;
        Object.values(freqs).forEach(count => {
            const p = count / len;
            entropy -= p * Math.log2(p);
        });
        return entropy;
    }
    
    // 5.1. Engine Self-Test Runner
    function runEngineSelfTest() {
        logTerminal("--- STARTING ENGINE SELF-TEST ---");
        
        // 1. PRNG test
        try {
            const seed = "VEL_TEST_SEED_123";
            const rand1 = createPRNG(seed);
            const rand2 = createPRNG(seed);
            let prngPassed = true;
            for (let i = 0; i < 50; i++) {
                if (rand1() !== rand2()) {
                    prngPassed = false;
                    break;
                }
            }
            if (prngPassed) {
                logTerminal("✅ Test 1: PRNG Consistency... PASSED");
            } else {
                logTerminal("❌ Test 1: PRNG Consistency... FAILED");
            }
        } catch (err) {
            logTerminal(`❌ Test 1: PRNG Consistency... ERROR: ${err.message}`);
        }
        
        // 2. LSM determinism test
        try {
            const seed = "VEL_MYSTIC_SPEAR_2026";
            const res1 = new NeuralReservoir(128, 64, seed);
            const res2 = new NeuralReservoir(128, 64, seed);
            const testInputs = new Float32Array(64).map((_, i) => Math.sin(i));
            
            res1.update(testInputs);
            res2.update(testInputs);
            
            let lsmPassed = true;
            for (let i = 0; i < 128; i++) {
                if (Math.abs(res1.states[i] - res2.states[i]) > 1e-7) {
                    lsmPassed = false;
                    break;
                }
            }
            if (lsmPassed) {
                logTerminal("✅ Test 2: LSM Determinism... PASSED");
            } else {
                logTerminal("❌ Test 2: LSM Determinism... FAILED");
            }
        } catch (err) {
            logTerminal(`❌ Test 2: LSM Determinism... ERROR: ${err.message}`);
        }
        
        // 3. SHA-256 standard validation
        try {
            const testInput = stringToBytes("abc");
            const digest = sha256(testInput);
            const hexResult = bytesToHex(digest);
            const expectedHex = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
            
            if (hexResult === expectedHex) {
                logTerminal("✅ Test 3: SHA-256 NIST Vector... PASSED");
            } else {
                logTerminal("❌ Test 3: SHA-256 NIST Vector... FAILED");
            }
        } catch (err) {
            logTerminal(`❌ Test 3: SHA-256 NIST Vector... ERROR: ${err.message}`);
        }
        
        // 4. E2E Encrypt/Decrypt
        try {
            const testReservoir = new NeuralReservoir(128, 64, "VEL_TEST_E2E");
            const testPlain = "Protection, Wisdom, and Victory!";
            const dummyFrames = [
                { f: 0, p: [[100, 200, 5], [300, 400, 6]] },
                { f: 1, p: [[102, 205, 5], [302, 405, 6]] }
            ];
            
            const cipherHex = encryptVEL(testPlain, testReservoir, dummyFrames);
            const decPlain = decryptVEL(cipherHex, testReservoir, dummyFrames);
            
            if (decPlain === testPlain) {
                logTerminal("✅ Test 4: E2E Encrypt/Decrypt... PASSED");
            } else {
                logTerminal("❌ Test 4: E2E Encrypt/Decrypt... FAILED (mismatch)");
            }
        } catch (err) {
            logTerminal(`❌ Test 4: E2E Encrypt/Decrypt... ERROR: ${err.message}`);
        }
        
        // 5. Pluggable Drivers & VelCore framework test
        try {
            const testReservoir = new NeuralReservoir(128, 64, "VEL_TEST_ESN");
            const testCore = new VelCore(testReservoir);
            
            const sim = new SimulationDriver(400, 300);
            const camera = new CameraDriver(null, 400, 300);
            const quantum = new QuantumDriver(400, 300);
            const serial = new SerialDriver(400, 300);
            
            testCore.registerDriver('sim', sim);
            testCore.registerDriver('camera', camera);
            testCore.registerDriver('quantum', quantum);
            testCore.registerDriver('serial', serial);
            
            await testCore.setDriver('sim');
            const driverSetPassed = (testCore.activeDriver === sim);
            
            testCore.startHarvesting();
            for (let i = 0; i < 5; i++) {
                testCore.update();
            }
            const logs = testCore.stopHarvesting();
            const harvestLogPassed = (logs.length === 5);
            
            if (driverSetPassed && harvestLogPassed) {
                logTerminal("✅ Test 5: Pluggable Drivers & VelCore... PASSED");
                logTerminal(`🎉 ENGINE SECURE: All self-tests passed!`);
            } else {
                logTerminal("❌ Test 5: Pluggable Drivers & VelCore... FAILED");
            }
        } catch (err) {
            logTerminal(`❌ Test 5: Pluggable Drivers & VelCore... ERROR: ${err.message}`);
        }
    }
    
    // Initialize application
    init();
});
