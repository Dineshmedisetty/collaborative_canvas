/**
 * Main Application Entry Point - FIXED REDO
 * Coordinates Canvas and WebSocket managers
 */

import { CanvasManager } from './canvas.js';
import { WebSocketManager } from './websocket.js';
import { PerformanceMonitor } from './performance-monitor.js';

class CollaborativeCanvas {
    constructor() {
        // Get DOM elements
        this.canvas = document.getElementById('drawingCanvas');
        this.cursorCanvas = document.getElementById('cursorCanvas');
        this.statusText = document.getElementById('statusText');
        this.statusIndicator = document.getElementById('connectionStatus');
        this.onlineCount = document.getElementById('onlineCount');
        this.operationCount = document.getElementById('operationCount');
        this.fpsCounter = document.getElementById('fpsCounter');
        this.latencyDisplay = document.getElementById('latencyDisplay');
        
        // Operation history for undo/redo
        this.operationHistory = [];
        this.currentOperationIndex = -1;
        
        // Active stroke tracking (for real-time collaboration)
        this.activeStrokes = new Map(); // userId -> stroke
        
        // Online users tracking
        this.onlineUsers = []; // Array of { userId, userColor, joinedAt, ... }
        
        // Initialize managers
        this.canvasManager = new CanvasManager(this.canvas, this.cursorCanvas);
        this.wsManager = new WebSocketManager();
        this.performanceMonitor = new PerformanceMonitor();
        
        this.init();
    }
    
    async init() {
        try {
            // Start performance monitoring
            this.performanceMonitor.start();
            
            // Connect to WebSocket server
            await this.wsManager.connect();
            
            // Start latency tracking after connection
            this.performanceMonitor.startLatencyTracking(this.wsManager.socket);
            
            // Join default room
            this.wsManager.joinRoom('default');
            
            // Setup event listeners
            this.setupCanvasEvents();
            this.setupWebSocketEvents();
            this.setupUIEvents();
            this.setupKeyboardShortcuts();
            
            // Start UI update loop for performance metrics
            this.startPerformanceUpdateLoop();
            
            // Show welcome modal
            this.showWelcomeModal();
            
        } catch (error) {
            console.error('Initialization failed:', error);
            this.updateStatus('Connection failed', false);
            this.showNotification('Connection failed. Please refresh the page.', 'error');
        }
    }
    
    /**
     * Update performance metrics in UI
     */
    startPerformanceUpdateLoop() {
        const updatePerformance = () => {
            this.performanceMonitor.updateUI(this.fpsCounter, this.latencyDisplay);
            requestAnimationFrame(updatePerformance);
        };
        updatePerformance();
    }
    
    setupCanvasEvents() {
        // Local drawing events
        this.canvasManager.on('strokeStart', (stroke) => {
            this.wsManager.sendStrokeStart(stroke);
        });
        
        this.canvasManager.on('strokeDraw', (data) => {
            this.wsManager.sendStrokeDraw(data);
        });
        
        this.canvasManager.on('strokeEnd', (stroke) => {
            // Add to local history
            this.addOperation({
                type: 'draw',
                stroke: stroke,
                userId: this.wsManager.userId,
                timestamp: Date.now()
            });
            
            this.wsManager.sendStrokeEnd(stroke);
        });
        
        this.canvasManager.on('cursorMove', (position) => {
            this.wsManager.sendCursorPosition(position);
        });
    }
    
    setupWebSocketEvents() {
        // Connection events
        this.wsManager.on('connected', () => {
            this.updateStatus('Connected', true);
        });
        
        this.wsManager.on('disconnected', () => {
            this.updateStatus('Disconnected', false);
            this.showNotification('Disconnected from server', 'error');
        });
        
        // Initialization
        this.wsManager.on('init', (data) => {
            // User info elements removed from header
            // Update color preview
            const colorPreview = document.querySelector('.color-preview');
            if (colorPreview) {
                colorPreview.style.backgroundColor = '#000000';
            }
        });
        
        // Canvas state synchronization
        this.wsManager.on('canvasState', (data) => {
            console.log('Received canvas state:', data);
            this.operationHistory = data.operations || [];
            this.currentOperationIndex = data.operations ? data.operations.length - 1 : -1;
            // Update canvasManager with visible operations
            const visibleOps = data.operations ? data.operations.slice(0, this.currentOperationIndex + 1) : [];
            this.canvasManager.setOperationHistory(visibleOps);
            this.canvasManager.redrawFromHistory(visibleOps);
            this.updateOperationCount();
            this.updateUndoRedoButtons();
        });
        
        // Remote user events
        this.wsManager.on('userJoined', (data) => {
            console.log('User joined:', data);
            this.showNotification(`User ${data.userId.substring(0, 8)} joined`, 'info');
        });
        
        this.wsManager.on('userLeft', (data) => {
            this.canvasManager.removeUserCursor(data.userId);
            this.showNotification(`User ${data.userId.substring(0, 8)} left`, 'info');
        });
        
        // Remote drawing
        this.wsManager.on('remoteStroke', (data) => {
            this.handleRemoteStroke(data);
        });
        
        // Remote cursor
        this.wsManager.on('remoteCursor', (data) => {
            if (data.userId !== this.wsManager.userId) {
                this.canvasManager.updateUserCursor(
                    data.userId,
                    data.position,
                    data.userColor,
                    data.userName
                );
            }
        });
        
        // Remote operations (undo/redo/clear)
        this.wsManager.on('remoteOperation', (data) => {
            this.handleRemoteOperation(data);
        });
        
        // Online users update
        this.wsManager.on('onlineUsers', (data) => {
            this.onlineUsers = data.users || [];
            this.onlineCount.textContent = this.onlineUsers.length;
            this.updateUsersList();
        });
    }
    
    setupUIEvents() {
        // Tool buttons
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tool = btn.dataset.tool;
                if (tool) {
                    this.setTool(tool);
                    
                    // Update active button
                    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                }
            });
        });
        
        // Color picker
        const colorPicker = document.getElementById('colorPicker');
        const colorPreview = document.querySelector('.color-preview');
        
        colorPicker.addEventListener('change', (e) => {
            this.canvasManager.setColor(e.target.value);
            if (colorPreview) {
                colorPreview.style.backgroundColor = e.target.value;
            }
        });
        
        // Initialize color preview
        if (colorPreview) {
            colorPreview.style.backgroundColor = colorPicker.value;
        }
        
        // Stroke width
        const strokeWidthInput = document.getElementById('strokeWidth');
        const strokeWidthValue = document.getElementById('strokeWidthValue');
        
        strokeWidthInput.addEventListener('input', (e) => {
            const width = parseInt(e.target.value);
            this.canvasManager.setStrokeWidth(width);
            strokeWidthValue.textContent = width;
        });
        
        // Font size (for text tool)
        const fontSizeInput = document.getElementById('fontSize');
        const fontSizeValue = document.getElementById('fontSizeValue');
        
        if (fontSizeInput && fontSizeValue) {
            fontSizeInput.addEventListener('input', (e) => {
                const size = parseInt(e.target.value);
                this.canvasManager.setFontSize(size);
                fontSizeValue.textContent = size;
            });
        }
        
        // Action buttons
        document.getElementById('undoBtn').addEventListener('click', () => this.undo());
        document.getElementById('redoBtn').addEventListener('click', () => this.redo());
        document.getElementById('clearBtn').addEventListener('click', () => this.clear());
        
        // Welcome modal
        const closeWelcome = document.getElementById('closeWelcome');
        const startDrawing = document.getElementById('startDrawing');
        
        if (closeWelcome) {
            closeWelcome.addEventListener('click', () => this.hideWelcomeModal());
        }
        
        if (startDrawing) {
            startDrawing.addEventListener('click', () => this.hideWelcomeModal());
        }
        
        // Online users button - toggle users modal
        const onlineUsersBtn = document.getElementById('onlineUsersBtn');
        const usersModal = document.getElementById('usersModal');
        const closeUsersModal = document.getElementById('closeUsersModal');
        
        if (onlineUsersBtn && usersModal) {
            onlineUsersBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleUsersModal();
            });
        }
        
        if (closeUsersModal && usersModal) {
            closeUsersModal.addEventListener('click', () => {
                this.hideUsersModal();
            });
        }
        
        // Close users modal when clicking outside
        document.addEventListener('click', (e) => {
            if (usersModal && usersModal.style.display !== 'none') {
                if (!usersModal.contains(e.target) && !onlineUsersBtn.contains(e.target)) {
                    this.hideUsersModal();
                }
            }
        });
    }
    
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Only handle shortcuts when Ctrl/Cmd is pressed (except for text input)
            const isInputFocused = document.activeElement.tagName === 'INPUT' || 
                                  document.activeElement.tagName === 'TEXTAREA';
            
            // Undo: Ctrl+Z or Cmd+Z
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                this.undo();
                return;
            }
            
            // Redo: Ctrl+Y or Ctrl+Shift+Z or Cmd+Shift+Z
            if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
                e.preventDefault();
                this.redo();
                return;
            }
            
            // Tool shortcuts - require Ctrl/Cmd key
            if ((e.ctrlKey || e.metaKey) && !isInputFocused) {
                // Brush: Ctrl+B or Cmd+B
                if (e.key === 'b' || e.key === 'B') {
                    e.preventDefault();
                    this.setTool('brush');
                    document.getElementById('brushBtn').click();
                    return;
                }
                
                // Eraser: Ctrl+E or Cmd+E
                if (e.key === 'e' || e.key === 'E') {
                    e.preventDefault();
                    this.setTool('eraser');
                    document.getElementById('eraserBtn').click();
                    return;
                }
                
                // Rectangle: Ctrl+R or Cmd+R
                if (e.key === 'r' || e.key === 'R') {
                    e.preventDefault();
                    this.setTool('rectangle');
                    document.getElementById('rectangleBtn').click();
                    return;
                }
                
                // Circle: Ctrl+C or Cmd+C
                if (e.key === 'c' || e.key === 'C') {
                    e.preventDefault();
                    this.setTool('circle');
                    document.getElementById('circleBtn').click();
                    return;
                }
                
                // Line: Ctrl+L or Cmd+L
                if (e.key === 'l' || e.key === 'L') {
                    e.preventDefault();
                    this.setTool('line');
                    document.getElementById('lineBtn').click();
                    return;
                }
                
                // Text: Ctrl+T or Cmd+T
                if (e.key === 't' || e.key === 'T') {
                    e.preventDefault();
                    this.setTool('text');
                    document.getElementById('textBtn').click();
                    return;
                }
            }
        });
    }
    
    setTool(tool) {
        this.canvasManager.setTool(tool);
        
        const colorPicker = document.getElementById('colorPicker');
        const fontSizeInput = document.getElementById('fontSize');
        const fontSizeValue = document.getElementById('fontSizeValue');
        const strokeWidthInput = document.getElementById('strokeWidth');
        const strokeWidthValue = document.getElementById('strokeWidthValue');
        
        // Disable color picker for eraser
        colorPicker.disabled = tool === 'eraser';
        
        // Show/hide font size for text tool
        if (fontSizeInput && fontSizeValue) {
            if (tool === 'text') {
                fontSizeInput.style.display = 'block';
                fontSizeValue.style.display = 'block';
            } else {
                fontSizeInput.style.display = 'none';
                fontSizeValue.style.display = 'none';
            }
        }
    }
    
    handleRemoteStroke(data) {
        const { phase, stroke, userId } = data;
        
        if (userId === this.wsManager.userId) return;
        
        switch (phase) {
            case 'start':
                this.activeStrokes.set(userId, stroke);
                // Draw text immediately if it's complete
                if (stroke.tool === 'text' && stroke.text && stroke.position) {
                    // Text is complete on start, draw it immediately
                    this.canvasManager.drawText(stroke);
                }
                break;
                
            case 'draw':
                const activeStroke = this.activeStrokes.get(userId);
                if (activeStroke) {
                    // Handle brush/eraser
                    if (activeStroke.points && stroke.points) {
                        activeStroke.points.push(...stroke.points);
                        this.canvasManager.drawStrokeSegment(
                            activeStroke,
                            activeStroke.points.length - stroke.points.length - 1
                        );
                    } else if (stroke.endPos) {
                        // Handle shapes - update end position and redraw
                        activeStroke.endPos = stroke.endPos;
                        // Redraw canvas from current operation history
                        const currentOps = this.canvasManager.operationHistory || [];
                        this.canvasManager.clear();
                        if (currentOps.length > 0) {
                            this.canvasManager.redrawFromHistory(currentOps);
                        }
                        // Draw all active strokes (remote users)
                        this.activeStrokes.forEach((stroke, userId) => {
                            if (userId !== this.wsManager.userId) {
                                this.canvasManager.drawStroke(stroke);
                            }
                        });
                    }
                }
                break;
                
            case 'end':
                this.activeStrokes.delete(userId);
                // Don't add to local history - server will send updated state
                break;
        }
    }
    
    handleRemoteOperation(data) {
        const { type, operations, currentIndex } = data;
        
        console.log('Remote operation received:', type, 'index:', currentIndex, 'ops:', operations.length);
        
        switch (type) {
            case 'undo':
            case 'redo':
                // Server sends updated state with new index
                this.operationHistory = operations;
                this.currentOperationIndex = currentIndex;
                
                // Redraw only visible operations
                const visibleOps = operations.slice(0, currentIndex + 1);
                this.canvasManager.setOperationHistory(visibleOps);
                this.canvasManager.redrawFromHistory(visibleOps);
                
                this.updateOperationCount();
                this.updateUndoRedoButtons();
                
                this.showNotification(
                    type === 'undo' ? 'Undo applied' : 'Redo applied',
                    'info'
                );
                break;
                
            case 'clear':
                this.operationHistory = [];
                this.currentOperationIndex = -1;
                // Update canvasManager's operation history to empty array
                this.canvasManager.setOperationHistory([]);
                this.canvasManager.clear();
                this.updateOperationCount();
                this.updateUndoRedoButtons();
                this.showNotification('Canvas cleared', 'info');
                break;
        }
    }
    
    addOperation(operation) {
        // Don't modify history here - server is the source of truth
        // This is just for immediate local feedback
        console.log('Local operation added:', operation.type);
    }
    
    undo() {
        // Check if we can undo locally
        if (this.currentOperationIndex < 0) {
            console.log('Nothing to undo');
            this.showNotification('Nothing to undo', 'warning');
            return;
        }
        
        console.log('Sending undo request');
        this.wsManager.sendUndo();
    }
    
    redo() {
        // Check if we can redo locally
        if (this.currentOperationIndex >= this.operationHistory.length - 1) {
            console.log('Nothing to redo');
            this.showNotification('Nothing to redo', 'warning');
            return;
        }
        
        console.log('Sending redo request. Current index:', this.currentOperationIndex, 'Total ops:', this.operationHistory.length);
        this.wsManager.sendRedo();
    }
    
    clear() {
        if (!confirm('Clear the entire canvas? This will affect all users.')) {
            return;
        }
        
        // Optimistically clear local state immediately
        this.operationHistory = [];
        this.currentOperationIndex = -1;
        this.canvasManager.setOperationHistory([]);
        this.canvasManager.clear();
        this.updateOperationCount();
        this.updateUndoRedoButtons();
        
        // Send clear request to server
        this.wsManager.sendClear();
    }
    
    updateStatus(text, connected) {
        this.statusText.textContent = text;
        this.statusIndicator.className = connected ? 'status-indicator connected' : 'status-indicator';
    }
    
    updateOperationCount() {
        const total = this.operationHistory.length;
        const current = this.currentOperationIndex + 1;
        this.operationCount.textContent = `Operations: ${current}/${total}`;
    }
    
    updateUndoRedoButtons() {
        const undoBtn = document.getElementById('undoBtn');
        const redoBtn = document.getElementById('redoBtn');
        
        // Disable undo if at beginning
        if (this.currentOperationIndex < 0) {
            undoBtn.style.opacity = '0.5';
            undoBtn.style.cursor = 'not-allowed';
        } else {
            undoBtn.style.opacity = '1';
            undoBtn.style.cursor = 'pointer';
        }
        
        // Disable redo if at end
        if (this.currentOperationIndex >= this.operationHistory.length - 1) {
            redoBtn.style.opacity = '0.5';
            redoBtn.style.cursor = 'not-allowed';
        } else {
            redoBtn.style.opacity = '1';
            redoBtn.style.cursor = 'pointer';
        }
    }
    
    showNotification(message, type = 'info') {
        const container = document.getElementById('notificationContainer');
        if (!container) return;
        
        const notification = document.createElement('div');
        notification.className = `notification notification-${type} glass-effect`;
        notification.innerHTML = `
            <span class="notification-icon">${this.getNotificationIcon(type)}</span>
            <span class="notification-message">${message}</span>
        `;
        
        container.appendChild(notification);
        
        // Animate in
        setTimeout(() => notification.classList.add('show'), 10);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
    
    getNotificationIcon(type) {
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };
        return icons[type] || icons.info;
    }
    
    showWelcomeModal() {
        const modal = document.getElementById('welcomeModal');
        if (modal) {
            modal.style.display = 'flex';
        }
    }
    
    hideWelcomeModal() {
        const modal = document.getElementById('welcomeModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
    
    /**
     * Toggle users modal visibility
     */
    toggleUsersModal() {
        const usersModal = document.getElementById('usersModal');
        if (usersModal) {
            if (usersModal.style.display === 'none' || !usersModal.style.display) {
                this.showUsersModal();
            } else {
                this.hideUsersModal();
            }
        }
    }
    
    /**
     * Show users modal
     */
    showUsersModal() {
        const usersModal = document.getElementById('usersModal');
        if (usersModal) {
            usersModal.style.display = 'block';
            this.updateUsersList();
        }
    }
    
    /**
     * Hide users modal
     */
    hideUsersModal() {
        const usersModal = document.getElementById('usersModal');
        if (usersModal) {
            usersModal.style.display = 'none';
        }
    }
    
    /**
     * Update the users list display
     */
    updateUsersList() {
        const usersList = document.getElementById('usersList');
        if (!usersList) return;
        
        // Clear existing list
        usersList.innerHTML = '';
        
        if (this.onlineUsers.length === 0) {
            usersList.innerHTML = '<div class="user-item empty">No users online</div>';
            return;
        }
        
        // Add each user to the list
        this.onlineUsers.forEach(user => {
            const userItem = document.createElement('div');
            userItem.className = 'user-item';
            
            // Check if this is the current user
            const isCurrentUser = user.userId === this.wsManager.userId;
            if (isCurrentUser) {
                userItem.classList.add('current-user');
            }
            
            userItem.innerHTML = `
                <div class="user-color-indicator" style="background-color: ${user.userColor || '#6366f1'}"></div>
                <div class="user-info">
                    <div class="user-id">${user.userId.substring(0, 8)}${isCurrentUser ? ' (You)' : ''}</div>
                    <div class="user-status">Online</div>
                </div>
            `;
            
            usersList.appendChild(userItem);
        });
    }
}

// Initialize application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new CollaborativeCanvas();
    });
} else {
    new CollaborativeCanvas();
}