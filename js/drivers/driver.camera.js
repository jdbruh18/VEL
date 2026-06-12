/**
 * driver.camera.js - Camera Motion & Shot Noise Entropy Driver
 * Part of VEL Cryptography & Protection Engine
 * 
 * Captures live webcam feeds, processes pixel differences to isolate movement,
 * and extracts camera sensor white noise as localized spatiotemporal coordinate events.
 */

if (typeof require !== 'undefined') {
    // If running in Node testing environment
    BaseDriver = require('./driver.base.js');
}

class CameraDriver extends BaseDriver {
    constructor(videoElement, width = 640, height = 480) {
        super(width, height);
        this.video = videoElement;
        
        if (typeof document !== 'undefined') {
            if (!this.video) {
                this.video = document.createElement('video');
                this.video.autoplay = true;
                this.video.muted = true;
                this.video.playsInline = true;
            }
            this.procCanvas = document.createElement('canvas');
            this.procCanvas.width = 80;
            this.procCanvas.height = 60;
            this.procCtx = this.procCanvas.getContext('2d', { willReadFrequently: true });
        } else {
            this.video = null;
            this.procCanvas = null;
            this.procCtx = null;
        }
        
        this.prevFrameData = null;
        this.mode = 'vision'; // 'vision' (motion) or 'sensor' (sensor shot noise)
        this.particles = [];
        this.maxParticles = 60;
    }
    
    setMode(mode) {
        this.mode = mode; // 'vision' or 'sensor'
    }
    
    async start() {
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
            
            await new Promise((resolve) => {
                this.video.onloadedmetadata = () => {
                    this.video.play();
                    resolve();
                };
            });
            return true;
        } catch (err) {
            console.warn("Webcam access failed in CameraDriver.", err);
            return false;
        }
    }
    
    stop() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
            this.video.srcObject = null;
        }
        this.particles = [];
        this.coordinates = [];
    }
    
    update() {
        this.coordinates = [];
        
        if (!this.video || this.video.readyState !== this.video.HAVE_ENOUGH_DATA) {
            // Spawn some basic ambient coordinates if video stream is initializing or absent
            return;
        }
        
        this.procCtx.drawImage(this.video, 0, 0, 80, 60);
        const frame = this.procCtx.getImageData(0, 0, 80, 60);
        const data = frame.data;
        
        if (this.prevFrameData) {
            const motionThreshold = this.mode === 'vision' ? 45 : 12; // Lower threshold for sensor noise
            
            // Scan pixels
            for (let y = 0; y < 60; y += 2) {
                for (let x = 0; x < 80; x += 2) {
                    const idx = (y * 80 + x) * 4;
                    const rDiff = Math.abs(data[idx] - this.prevFrameData[idx]);
                    const gDiff = Math.abs(data[idx+1] - this.prevFrameData[idx+1]);
                    const bDiff = Math.abs(data[idx+2] - this.prevFrameData[idx+2]);
                    const avgDiff = (rDiff + gDiff + bDiff) / 3;
                    
                    if (avgDiff > motionThreshold) {
                        const targetX = (x / 80) * this.width;
                        const targetY = (y / 60) * this.height;
                        
                        // Limit coordinates spawning rate
                        if (Math.random() < 0.035 && this.particles.length < this.maxParticles) {
                            this.particles.push({
                                x: targetX + (Math.random() - 0.5) * 10,
                                y: targetY,
                                speed: 2 + Math.random() * 4,
                                drift: (Math.random() - 0.5) * 0.4,
                                intensity: 0.6 + (avgDiff / 255) * 0.4
                            });
                        }
                    }
                }
            }
        }
        
        // Save previous frame
        if (!this.prevFrameData || this.prevFrameData.length !== data.length) {
            this.prevFrameData = new Uint8ClampedArray(data.length);
        }
        this.prevFrameData.set(data);
        
        // Ambient coordinates simulator: if no motion, inject ambient particles slowly
        if (this.particles.length < 10 && Math.random() < 0.1) {
            this.particles.push({
                x: Math.random() * this.width,
                y: 0,
                speed: 3 + Math.random() * 4,
                drift: (Math.random() - 0.5) * 0.5,
                intensity: 0.5
            });
        }
        
        // Update physics on particle drops
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.y += p.speed;
            p.x += p.drift;
            
            if (p.y > this.height) {
                this.particles.splice(i, 1);
            } else {
                this.coordinates.push({
                    x: p.x,
                    y: p.y,
                    intensity: p.intensity
                });
            }
        }
    }
}

// Export for Node and Browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CameraDriver;
} else {
    window.CameraDriver = CameraDriver;
}
