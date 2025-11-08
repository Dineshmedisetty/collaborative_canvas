export class CanvasManager {
    constructor(canvasElement, cursorCanvasElement) {
        this.canvas = canvasElement;
        this.ctx = canvasElement.getContext('2d', { willReadFrequently: false });
        this.cursorCanvas = cursorCanvasElement;
        this.cursorCtx = cursorCanvasElement.getContext('2d');
        
        // Drawing state
        this.isDrawing = false;
        this.currentTool = 'brush';
        this.strokeColor = '#000000';
        this.strokeWidth = 3;
        this.fontSize = 24;
        
        // Current stroke being drawn
        this.currentStroke = null;
        this.startPos = null; // For shapes
        this.isTextMode = false;
        this.textInput = null;
        this.lastDrawnPointIndex = 0; // Track last drawn point for smooth lines
        
        // Operation history for preview (synced from main.js)
        this.operationHistory = [];
        
        // User cursors from other users
        this.userCursors = new Map();
        
        // Performance tracking
        this.lastDrawTime = 0;
        this.drawThrottle = 16; // ~60fps
        
        this.setupCanvas();
        this.bindEvents();
        this.startCursorAnimation();
    }
    
    setupCanvas() {
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();
        
        // Set canvas size with device pixel ratio for crisp rendering
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.cursorCanvas.width = rect.width;
        this.cursorCanvas.height = rect.height;
        
        // Scale context to match device pixel ratio
        this.ctx.scale(dpr, dpr);
        
        // Set canvas drawing properties
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        // Handle window resize
        window.addEventListener('resize', () => this.handleResize());
    }
    
    handleResize() {
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        
        // Save current canvas content
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        
        // Resize
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.cursorCanvas.width = rect.width;
        this.cursorCanvas.height = rect.height;
        
        this.ctx.scale(dpr, dpr);
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        // Restore content
        this.ctx.putImageData(imageData, 0, 0);
    }
    
    bindEvents() {
        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => this.handleDrawStart(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleDrawMove(e));
        this.canvas.addEventListener('mouseup', () => this.handleDrawEnd());
        this.canvas.addEventListener('mouseleave', () => this.handleDrawEnd());
        
        // Touch events for mobile
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.handleDrawStart(touch);
        }, { passive: false });
        
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.handleDrawMove(touch);
        }, { passive: false });
        
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.handleDrawEnd();
        }, { passive: false });
        
        // Initialize cursor style
        this.updateCursor();
    }
    
    /**
     * Update cursor style based on current tool
     */
    updateCursor() {
        if (this.currentTool === 'text') {
            this.canvas.style.cursor = 'text';
        } else if (this.currentTool === 'eraser') {
            this.canvas.style.cursor = 'grab';
        } else {
            this.canvas.style.cursor = 'crosshair';
        }
    }
    
    getCanvasCoordinates(event) {
        const rect = this.canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        
        // Calculate coordinates accounting for device pixel ratio
        // The canvas context is scaled by DPR, so coordinates need to match
        const x = (event.clientX - rect.left);
        const y = (event.clientY - rect.top);
        
        return { x, y };
    }
    
    handleDrawStart(event) {
        // Text tool requires click to place text
        if (this.currentTool === 'text') {
            this.handleTextPlacement(event);
            return;
        }
        
        // Shape tools (rectangle, circle, line)
        if (['rectangle', 'circle', 'line'].includes(this.currentTool)) {
            this.isDrawing = true;
            const pos = this.getCanvasCoordinates(event);
            this.startPos = pos;
            
            this.currentStroke = {
                tool: this.currentTool,
                color: this.strokeColor,
                width: this.strokeWidth,
                startPos: pos,
                endPos: pos
            };
            
            this.emit('strokeStart', this.currentStroke);
            return;
        }
        
        // Brush and eraser tools
        this.isDrawing = true;
        const pos = this.getCanvasCoordinates(event);
        
        // Initialize new stroke
        this.currentStroke = {
            tool: this.currentTool,
            color: this.strokeColor,
            width: this.strokeWidth,
            points: [pos]
        };
        
        // Reset last drawn point index for new stroke
        this.lastDrawnPointIndex = 0;
        
        // Emit stroke start event
        this.emit('strokeStart', this.currentStroke);
    }
    
    handleDrawMove(event) {
        const pos = this.getCanvasCoordinates(event);
        
        // Always emit cursor position
        this.emit('cursorMove', pos);
        
        if (!this.isDrawing || !this.currentStroke) return;
        
        // Handle shape tools
        if (['rectangle', 'circle', 'line'].includes(this.currentTool)) {
            this.currentStroke.endPos = pos;
            
            // Redraw preview
            this.redrawPreview();
            
            // Emit drawing event for shapes
            this.emit('strokeDraw', {
                endPos: pos
            });
            return;
        }
        
        // Brush and eraser tools
        // Add point to current stroke
        this.currentStroke.points.push(pos);
        
        // Draw immediately for smooth continuous lines
        // Always draw from the last drawn point to ensure no gaps
        if (this.currentStroke.points.length >= 2) {
            this.drawStrokeSegment(
                this.currentStroke,
                this.lastDrawnPointIndex
            );
            // Update last drawn point index to the last point
            // (so next segment connects smoothly from where we left off)
            this.lastDrawnPointIndex = this.currentStroke.points.length - 1;
        }
        
        // Throttle network events for performance (but always draw locally)
        const now = Date.now();
        if (now - this.lastDrawTime >= this.drawThrottle) {
            this.lastDrawTime = now;
            
            // Emit drawing event
            this.emit('strokeDraw', {
                points: this.currentStroke.points.slice(-2) // Only send new points
            });
        }
    }
    
    handleDrawEnd() {
        if (!this.isDrawing || !this.currentStroke) return;
        
        this.isDrawing = false;
        
        // For brush/eraser, ensure the final segment is drawn
        if (!['rectangle', 'circle', 'line'].includes(this.currentTool)) {
            if (this.currentStroke.points && this.currentStroke.points.length >= 2) {
                // Draw any remaining undrawn points
                this.drawStrokeSegment(
                    this.currentStroke,
                    this.lastDrawnPointIndex
                );
            }
        }
        
        // For shape tools, finalize the shape
        if (['rectangle', 'circle', 'line'].includes(this.currentTool)) {
            if (this.currentStroke.endPos) {
                // Emit stroke end event with shape data
                this.emit('strokeEnd', this.currentStroke);
            }
        } else {
            // Emit stroke end event
            this.emit('strokeEnd', this.currentStroke);
        }
        
        this.currentStroke = null;
        this.startPos = null;
        this.lastDrawnPointIndex = 0;
    }
    
    /**
     * Draw a stroke segment (from one point to the next)
     */
    drawStrokeSegment(stroke, startIndex) {
        if (!stroke.points || stroke.points.length < 2) return;
        
        const ctx = this.ctx;
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.width;
        
        // Use destination-out for eraser (removes pixels)
        ctx.globalCompositeOperation = 
            stroke.tool === 'eraser' ? 'destination-out' : 'source-over';
        
        ctx.beginPath();
        
        const start = Math.max(0, startIndex);
        const points = stroke.points;
        
        ctx.moveTo(points[start].x, points[start].y);
        
        for (let i = start + 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
    }
    
    /**
     * Draw a complete stroke (all points) or shape
     */
    drawStroke(stroke) {
        if (!stroke) return;
        
        const ctx = this.ctx;
        
        // Handle different tool types
        if (stroke.tool === 'rectangle' && stroke.startPos && stroke.endPos) {
            this.drawRectangle(stroke);
        } else if (stroke.tool === 'circle' && stroke.startPos && stroke.endPos) {
            this.drawCircle(stroke);
        } else if (stroke.tool === 'line' && stroke.startPos && stroke.endPos) {
            this.drawLine(stroke);
        } else if (stroke.tool === 'text' && stroke.text && stroke.position) {
            this.drawText(stroke);
        } else if (stroke.points && stroke.points.length > 0) {
            // Brush or eraser
            ctx.strokeStyle = stroke.color;
            ctx.lineWidth = stroke.width;
            ctx.globalCompositeOperation = 
                stroke.tool === 'eraser' ? 'destination-out' : 'source-over';
            
            ctx.beginPath();
            ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
            
            for (let i = 1; i < stroke.points.length; i++) {
                ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
            }
            
            ctx.stroke();
            ctx.globalCompositeOperation = 'source-over';
        }
    }
    
    /**
     * Draw rectangle
     */
    drawRectangle(stroke) {
        const ctx = this.ctx;
        const start = stroke.startPos;
        const end = stroke.endPos;
        
        const x = Math.min(start.x, end.x);
        const y = Math.min(start.y, end.y);
        const width = Math.abs(end.x - start.x);
        const height = Math.abs(end.y - start.y);
        
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.width;
        ctx.globalCompositeOperation = 'source-over';
        
        ctx.strokeRect(x, y, width, height);
    }
    
    /**
     * Draw circle
     */
    drawCircle(stroke) {
        const ctx = this.ctx;
        const start = stroke.startPos;
        const end = stroke.endPos;
        
        const centerX = start.x;
        const centerY = start.y;
        const radius = Math.sqrt(
            Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
        );
        
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.width;
        ctx.globalCompositeOperation = 'source-over';
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    /**
     * Draw line
     */
    drawLine(stroke) {
        const ctx = this.ctx;
        const start = stroke.startPos;
        const end = stroke.endPos;
        
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.width;
        ctx.globalCompositeOperation = 'source-over';
        ctx.lineCap = 'round';
        
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
    }
    
    /**
     * Draw text
     */
    drawText(stroke) {
        if (!stroke || !stroke.text || !stroke.position) return;
        
        const ctx = this.ctx;
        const fontSize = stroke.fontSize || this.fontSize;
        
        // Set text properties
        ctx.fillStyle = stroke.color;
        ctx.font = `${fontSize}px sans-serif`;
        ctx.textBaseline = 'top';
        ctx.textAlign = 'left';
        ctx.globalCompositeOperation = 'source-over';
        
        // Draw text
        ctx.fillText(stroke.text, stroke.position.x, stroke.position.y);
    }
    
    /**
     * Redraw preview (for shapes while dragging)
     */
    redrawPreview() {
        // Always start with a clear canvas
        this.clear();
        
        // Redraw from history if it exists and has operations
        if (this.operationHistory && this.operationHistory.length > 0) {
            this.redrawFromHistory(this.operationHistory);
        }
        
        // Draw current shape preview on top
        if (this.currentStroke && this.startPos && this.currentStroke.endPos) {
            this.drawStroke(this.currentStroke);
        }
    }
    
    /**
     * Handle text placement
     */
    handleTextPlacement(event) {
        // Prevent default to avoid any issues
        event.preventDefault();
        event.stopPropagation();
        
        const pos = this.getCanvasCoordinates(event);
        const rect = this.canvas.getBoundingClientRect();
        
        // Store reference to avoid multiple inputs
        if (this.textInput && document.body.contains(this.textInput)) {
            // Remove existing input if any
            document.body.removeChild(this.textInput);
        }
        
        // Create text input
        const input = document.createElement('input');
        input.type = 'text';
        input.value = '';
        input.placeholder = 'Type text and press Enter';
        
        // Calculate position accounting for page scroll and viewport
        // Use fixed positioning relative to viewport
        const x = rect.left + pos.x;
        const y = rect.top + pos.y;
        
        input.style.position = 'fixed';
        input.style.left = `${x}px`;
        input.style.top = `${y}px`;
        input.style.transform = 'translate(0, 0)'; // Ensure no transform issues
        input.style.fontSize = `${this.fontSize}px`;
        input.style.border = '2px solid #6366f1';
        input.style.borderRadius = '4px';
        input.style.padding = '4px 8px';
        input.style.outline = 'none';
        input.style.zIndex = '10000';
        input.style.fontFamily = 'sans-serif';
        input.style.color = this.strokeColor;
        input.style.background = 'rgba(255, 255, 255, 0.95)';
        input.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
        input.style.minWidth = '100px';
        
        this.textInput = input;
        document.body.appendChild(input);
        
        // Select all text when focused for easy replacement
        setTimeout(() => {
            input.focus();
            input.select();
        }, 10);
        
        // Track if submitted to avoid double submission
        let submitted = false;
        
        // Handle text submission
        const handleSubmit = () => {
            if (submitted) return;
            submitted = true;
            
            const text = input.value.trim();
            if (text && document.body.contains(input)) {
                const textStroke = {
                    tool: 'text',
                    text: text,
                    color: this.strokeColor,
                    fontSize: this.fontSize,
                    position: pos
                };
                
                console.log('Text submitted:', text, 'at position:', pos);
                
                // Draw immediately locally
                this.drawText(textStroke);
                
                // Send to server
                this.emit('strokeStart', textStroke);
                this.emit('strokeEnd', textStroke);
            }
            
            // Remove input after a short delay
            setTimeout(() => {
                if (document.body.contains(input)) {
                    document.body.removeChild(input);
                }
                this.textInput = null;
            }, 50);
        };
        
        // Handle Enter key (submit)
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                handleSubmit();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                submitted = true; // Mark as submitted to prevent blur handler
                if (document.body.contains(input)) {
                    document.body.removeChild(input);
                }
                this.textInput = null;
            }
        });
        
        // Handle blur (when user clicks away) - only if not already submitted
        input.addEventListener('blur', () => {
            // Small delay to allow Enter key to process first
            setTimeout(() => {
                if (!submitted && document.body.contains(input)) {
                    handleSubmit();
                }
            }, 150);
        });
        
        // Prevent canvas events while typing
        input.addEventListener('mousedown', (e) => {
            e.stopPropagation();
        });
        
        input.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }
    
    /**
     * Clear the entire canvas
     */
    clear() {
        const dpr = window.devicePixelRatio || 1;
        this.ctx.clearRect(0, 0, this.canvas.width / dpr, this.canvas.height / dpr);
    }
    
    /**
     * Redraw canvas from operation history
     */
    redrawFromHistory(operations) {
        this.clear();
        operations.forEach(op => {
            if (op.type === 'draw' && op.stroke) {
                this.drawStroke(op.stroke);
            }
        });
    }
    
    /**
     * Store operation history for preview redraw
     */
    setOperationHistory(operations) {
        // Always use a copy to avoid reference issues
        this.operationHistory = operations ? [...operations] : [];
    }
    
    /**
     * Set font size
     */
    setFontSize(size) {
        this.fontSize = size;
    }
    
    /**
     * Update cursor position for a user
     */
    updateUserCursor(userId, position, color, userName) {
        this.userCursors.set(userId, {
            position,
            color,
            userName,
            lastUpdate: Date.now()
        });
    }
    
    /**
     * Remove user cursor
     */
    removeUserCursor(userId) {
        this.userCursors.delete(userId);
    }
    
    /**
     * Animate user cursors on overlay canvas
     */
    startCursorAnimation() {
        const animate = () => {
            this.cursorCtx.clearRect(0, 0, this.cursorCanvas.width, this.cursorCanvas.height);
            
            const now = Date.now();
            
            this.userCursors.forEach((cursor, userId) => {
                // Remove stale cursors (not updated in 5 seconds)
                if (now - cursor.lastUpdate > 5000) {
                    this.userCursors.delete(userId);
                    return;
                }
                
                const { position, color, userName } = cursor;
                const ctx = this.cursorCtx;
                
                // Draw cursor dot
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(position.x, position.y, 6, 0, Math.PI * 2);
                ctx.fill();
                
                // Draw cursor border
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 2;
                ctx.stroke();
                
                // Draw user name label
                ctx.font = '12px sans-serif';
                ctx.fillStyle = 'white';
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 3;
                
                const text = userName || userId.substring(0, 8);
                const textWidth = ctx.measureText(text).width;
                
                // Draw text background
                ctx.fillStyle = color;
                ctx.fillRect(position.x + 12, position.y - 18, textWidth + 8, 18);
                
                // Draw text
                ctx.fillStyle = 'white';
                ctx.fillText(text, position.x + 16, position.y - 6);
            });
            
            requestAnimationFrame(animate);
        };
        
        animate();
    }
    
    /**
     * Event emitter for canvas events
     */
    emit(eventName, data) {
        const event = new CustomEvent(eventName, { detail: data });
        this.canvas.dispatchEvent(event);
    }
    
    /**
     * Listen to canvas events
     */
    on(eventName, callback) {
        this.canvas.addEventListener(eventName, (e) => callback(e.detail));
    }
    
    /**
     * Set drawing tool
     */
    setTool(tool) {
        this.currentTool = tool;
        this.updateCursor();
    }
    
    /**
     * Set stroke color
     */
    setColor(color) {
        this.strokeColor = color;
    }
    
    /**
     * Set stroke width
     */
    setStrokeWidth(width) {
        this.strokeWidth = width;
    }
}