/**
 * Performance Monitor
 * Tracks FPS and latency metrics
 */
export class PerformanceMonitor {
    constructor() {
        this.fps = 0;
        this.latency = 0;
        this.frameCount = 0;
        this.lastTime = performance.now();
        this.fpsUpdateInterval = 500; // Update FPS every 500ms
        this.lastFpsUpdate = this.lastTime;
        
        // FPS tracking
        this.frameTimes = [];
        this.maxFrameSamples = 60;
        
        // Latency tracking
        this.pingStartTime = null;
        this.pingInterval = null;
    }
    
    /**
     * Start monitoring performance
     */
    start() {
        this.startFpsTracking();
        this.startLatencyTracking();
    }
    
    /**
     * Start FPS tracking
     */
    startFpsTracking() {
        const measureFPS = () => {
            const now = performance.now();
            const delta = now - this.lastTime;
            this.lastTime = now;
            
            // Calculate FPS from frame time
            if (delta > 0) {
                const currentFPS = 1000 / delta;
                this.frameTimes.push(currentFPS);
                
                if (this.frameTimes.length > this.maxFrameSamples) {
                    this.frameTimes.shift();
                }
                
                // Calculate average FPS
                const avgFPS = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
                this.fps = Math.round(avgFPS);
            }
            
            this.frameCount++;
            requestAnimationFrame(measureFPS);
        };
        
        requestAnimationFrame(measureFPS);
    }
    
    /**
     * Start latency tracking (ping server)
     */
    startLatencyTracking(socket) {
        if (!socket) return;
        
        this.socket = socket;
        
        // Listen for pong response
        socket.on('pong', (timestamp) => {
            if (this.pingStartTime) {
                this.latency = Math.round(performance.now() - this.pingStartTime);
                this.pingStartTime = null;
            }
        });
        
        // Send ping every second
        this.pingInterval = setInterval(() => {
            if (socket.connected) {
                this.pingStartTime = performance.now();
                socket.emit('ping', performance.now());
            }
        }, 1000);
    }
    
    /**
     * Stop latency tracking
     */
    stopLatencyTracking() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }
    
    /**
     * Get current FPS
     */
    getFPS() {
        return this.fps;
    }
    
    /**
     * Get current latency
     */
    getLatency() {
        return this.latency;
    }
    
    /**
     * Update UI elements
     */
    updateUI(fpsElement, latencyElement) {
        if (fpsElement) {
            fpsElement.textContent = `FPS: ${this.fps}`;
            // Color code based on FPS
            if (this.fps >= 55) {
                fpsElement.style.color = '#22c55e'; // Green
            } else if (this.fps >= 30) {
                fpsElement.style.color = '#f59e0b'; // Yellow
            } else {
                fpsElement.style.color = '#ef4444'; // Red
            }
        }
        
        if (latencyElement) {
            if (this.latency > 0) {
                latencyElement.textContent = `Latency: ${this.latency}ms`;
                // Color code based on latency
                if (this.latency < 50) {
                    latencyElement.style.color = '#22c55e'; // Green
                } else if (this.latency < 150) {
                    latencyElement.style.color = '#f59e0b'; // Yellow
                } else {
                    latencyElement.style.color = '#ef4444'; // Red
                }
            } else {
                latencyElement.textContent = 'Latency: --ms';
                latencyElement.style.color = 'rgba(255, 255, 255, 0.9)';
            }
        }
    }
    
    /**
     * Clean up
     */
    destroy() {
        this.stopLatencyTracking();
    }
}

