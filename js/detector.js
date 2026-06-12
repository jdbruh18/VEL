/**
 * detector.js - The Staff (Shaft) Camera Tracker and Particle Simulator
 * Part of VEL Cryptography & Protection Engine
 * 
 * Manages the webcam video stream, extracts motion frames using
 * pixel-level differencing, harvests sensor noise, and maintains
 * a dynamic particle system representing falling raindrops.
 */

class RainDetector {
    constructor(videoElement, canvasWidth = 640, canvasHeight = 480) {
        this.video = videoElement || document.createElement('video');
        this.video.autoplay = true;
        this.video.muted = true;
        this.video.playsInline = true;
        
        this.width = canvasWidth;
        this.height = canvasHeight;
        
        // Processing canvas for computer vision (small to maximize FPS)
        this.procCanvas = document.createElement('canvas');
        this.procCanvas.width = 80;
        this.procCanvas.height = 60;
        this.procCtx = this.procCanvas.getContext('2d', { willReadFrequently: true });
        
        this.prevFrameData = null;
        this.mode = 'sim'; // 'sim', 'sensor', 'vision', 'replay'
        
        this.particles = [];
        this.maxParticles = 60;
        this.gridInputs = new Float32Array(64); // 8x8 input grid
        
        // Harvesting / Recording variables
        this.isHarvesting = false;
        this.frameIndex = 0;
        this.recordedFrames = [];
        
        // Replay variables
        this.replayFrames = [];
        this.replayIndex = 0;
        this.stream = null;
    }
    
    async initWebcam() {
        if (this.stream) return true;
        try {
            const constraints = {
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'
                },
                audio: false
            };
            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = this.stream;
            // Wait for video metadata to load
            await new Promise((resolve) => {
                this.video.onloadedmetadata = () => {
                    this.video.play();
                    resolve();
                };
            });
            return true;
        } catch (err) {
            console.warn("Webcam access denied or unavailable. Falling back to simulation mode.", err);
            this.mode = 'sim';
            return false;
        }
    }
    
    stopWebcam() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
            this.video.srcObject = null;
        }
    }
    
    setMode(mode) {
        this.mode = mode;
        if (mode === 'vision' || mode === 'sensor') {
            this.initWebcam();
        } else if (mode === 'sim') {
            this.stopWebcam();
        }
    }
    
    startHarvesting() {
        this.isHarvesting = true;
        this.recordedFrames = [];
        this.frameIndex = 0;
    }
    
    stopHarvesting() {
        this.isHarvesting = false;
        return this.recordedFrames;
    }
    
    setReplayData(recordedFrames) {
        this.mode = 'replay';
        this.stopWebcam();
        this.replayFrames = recordedFrames;
        this.replayIndex = 0;
        this.particles = [];
    }
    
    update() {
        this.gridInputs.fill(0);
        
        if (this.mode === 'replay') {
            this.updateReplay();
        } else if (this.mode === 'vision' || this.mode === 'sensor') {
            this.updateVision();
        } else {
            this.updateSimulation();
        }
        
        // Update physics for active particles
        this.updateParticlesPhysics();
        
        // Log coordinates if harvesting
        if (this.isHarvesting) {
            const frameCoords = this.particles.map(p => [
                parseFloat(p.x.toFixed(3)), 
                parseFloat(p.y.toFixed(3)), 
                parseFloat(p.speed.toFixed(2))
            ]);
            this.recordedFrames.push({
                f: this.frameIndex++,
                p: frameCoords
            });
        }
    }
    
    updateParticlesPhysics() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.y += p.speed;
            
            // Apply slight random wind/drift
            p.x += p.drift;
            
            // Map particle position to 8x8 input grid
            const col = Math.floor((p.x / this.width) * 8);
            const row = Math.floor((p.y / this.height) * 8);
            
            if (col >= 0 && col < 8 && row >= 0 && row < 8) {
                this.gridInputs[row * 8 + col] += p.intensity;
                if (this.gridInputs[row * 8 + col] > 1.0) {
                    this.gridInputs[row * 8 + col] = 1.0;
                }
            }
            
            // Remove particle if it goes off screen
            if (p.y > this.height) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    updateSimulation() {
        // Spawn random particles (raindrops)
        if (this.particles.length < this.maxParticles && Math.random() < 0.3) {
            this.particles.push({
                x: Math.random() * this.width,
                y: 0,
                speed: 3 + Math.random() * 6,
                drift: (Math.random() - 0.5) * 0.8,
                intensity: 0.5 + Math.random() * 0.5
            });
        }
    }
    
    updateReplay() {
        if (this.replayFrames.length === 0) return;
        
        const frameData = this.replayFrames[this.replayIndex];
        if (frameData) {
            // Reconstruct particles from logged frame data
            this.particles = frameData.p.map(coords => ({
                x: coords[0],
                y: coords[1],
                speed: coords[2],
                drift: 0, // Not needed for recreation since we log coordinates every frame
                intensity: 0.8
            }));
            
            this.replayIndex = (this.replayIndex + 1) % this.replayFrames.length;
        }
    }
    
    updateVision() {
        if (this.video.readyState !== this.video.HAVE_ENOUGH_DATA) return;
        
        // Draw small frame for pixel analysis
        this.procCtx.drawImage(this.video, 0, 0, 80, 60);
        const frame = this.procCtx.getImageData(0, 0, 80, 60);
        const data = frame.data;
        
        if (this.prevFrameData) {
            let motionThreshold = this.mode === 'vision' ? 45 : 12; // Lower threshold for sensor noise harvesting
            let motionSpawnCount = 0;
            
            // Step through pixels (every 2nd pixel to optimize)
            for (let y = 0; y < 60; y += 2) {
                for (let x = 0; x < 80; x += 2) {
                    const idx = (y * 80 + x) * 4;
                    const rDiff = Math.abs(data[idx] - this.prevFrameData[idx]);
                    const gDiff = Math.abs(data[idx+1] - this.prevFrameData[idx+1]);
                    const bDiff = Math.abs(data[idx+2] - this.prevFrameData[idx+2]);
                    const avgDiff = (rDiff + gDiff + bDiff) / 3;
                    
                    if (avgDiff > motionThreshold) {
                        motionSpawnCount++;
                        // Map 80x60 pixel coordinate to canvas size
                        const targetX = (x / 80) * this.width;
                        const targetY = (y / 60) * this.height;
                        
                        // Limit particle spawning rate
                        if (Math.random() < 0.03 && this.particles.length < this.maxParticles) {
                            this.particles.push({
                                x: targetX + (Math.random() - 0.5) * 10,
                                y: targetY,
                                speed: 2 + Math.random() * 5,
                                drift: (Math.random() - 0.5) * 0.5,
                                intensity: 0.6 + (avgDiff / 255) * 0.4
                            });
                        }
                    }
                }
            }
        }
        
        // Store current frame as previous for next iteration
        if (!this.prevFrameData || this.prevFrameData.length !== data.length) {
            this.prevFrameData = new Uint8ClampedArray(data.length);
        }
        this.prevFrameData.set(data);
        
        // Standard background ambient rain drops spawn to maintain system state
        if (this.particles.length < 15 && Math.random() < 0.1) {
            this.updateSimulation();
        }
    }
}

// Export for Node and Browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RainDetector;
} else {
    window.RainDetector = RainDetector;
}
