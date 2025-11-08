export class WebSocketManager {
    constructor() {
        this.socket = null;
        this.userId = null;
        this.userColor = null;
        this.roomId = 'default';
        this.connected = false;
        this.eventHandlers = new Map();
    }
    
    /**
     * Connect to WebSocket server
     */
    connect() {
        return new Promise((resolve, reject) => {
            this.socket = io({
                reconnection: true,
                reconnectionDelay: 1000,
                reconnectionAttempts: 5
            });
            
            // Connection successful
            this.socket.on('connect', () => {
                console.log('Connected to server');
                this.connected = true;
                this.emit('connected');
            });
            
            // Receive user initialization data
            this.socket.on('init', (data) => {
                this.userId = data.userId;
                this.userColor = data.userColor;
                console.log('Initialized:', data);
                this.emit('init', data);
                resolve(data);
            });
            
            // Receive canvas state (operation history)
            this.socket.on('canvasState', (data) => {
                console.log('Received canvas state:', data.operations.length, 'operations');
                this.emit('canvasState', data);
            });
            
            // User joined room
            this.socket.on('userJoined', (data) => {
                console.log('User joined:', data.userId);
                this.emit('userJoined', data);
            });
            
            // User left room
            this.socket.on('userLeft', (data) => {
                console.log('User left:', data.userId);
                this.emit('userLeft', data);
            });
            
            // Receive stroke from other user
            this.socket.on('stroke', (data) => {
                this.emit('remoteStroke', data);
            });
            
            // Receive cursor position from other user
            this.socket.on('cursor', (data) => {
                this.emit('remoteCursor', data);
            });
            
            // Receive operation (undo/redo/clear)
            this.socket.on('operation', (data) => {
                this.emit('remoteOperation', data);
            });
            
            // Online users list update
            this.socket.on('onlineUsers', (data) => {
                this.emit('onlineUsers', data);
            });
            
            // Disconnection
            this.socket.on('disconnect', (reason) => {
                console.log('Disconnected:', reason);
                this.connected = false;
                this.emit('disconnected', { reason });
            });
            
            // Connection error
            this.socket.on('connect_error', (error) => {
                console.error('Connection error:', error);
                this.emit('connectionError', { error });
                reject(error);
            });
            
            // Handle ping/pong for latency measurement
            this.socket.on('pong', (timestamp) => {
                // Handled by performance monitor
            });
        });
    }
    
    /**
     * Join a drawing room
     */
    joinRoom(roomId = 'default') {
        this.roomId = roomId;
        this.socket.emit('joinRoom', { roomId });
    }
    
    /**
     * Send stroke start event
     */
    sendStrokeStart(stroke) {
        if (!this.connected) return;
        
        this.socket.emit('strokeStart', {
            roomId: this.roomId,
            stroke: {
                ...stroke,
                id: `${this.userId}-${Date.now()}`,
                userId: this.userId,
                timestamp: Date.now()
            }
        });
    }
    
    /**
     * Send stroke draw event (points being added or shape updated)
     */
    sendStrokeDraw(data) {
        if (!this.connected) return;
        
        this.socket.emit('strokeDraw', {
            roomId: this.roomId,
            points: data.points,
            endPos: data.endPos,
            timestamp: Date.now()
        });
    }
    
    /**
     * Send stroke end event
     */
    sendStrokeEnd(stroke) {
        if (!this.connected) return;
        
        this.socket.emit('strokeEnd', {
            roomId: this.roomId,
            stroke: {
                ...stroke,
                id: `${this.userId}-${Date.now()}`,
                userId: this.userId,
                timestamp: Date.now()
            }
        });
    }
    
    /**
     * Send cursor position
     */
    sendCursorPosition(position) {
        if (!this.connected) return;
        
        this.socket.emit('cursor', {
            roomId: this.roomId,
            position,
            userId: this.userId
        });
    }
    
    /**
     * Send undo operation
     */
    sendUndo() {
        if (!this.connected) return;
        
        this.socket.emit('undo', {
            roomId: this.roomId,
            userId: this.userId,
            timestamp: Date.now()
        });
    }
    
    /**
     * Send redo operation
     */
    sendRedo() {
        if (!this.connected) return;
        
        this.socket.emit('redo', {
            roomId: this.roomId,
            userId: this.userId,
            timestamp: Date.now()
        });
    }
    
    /**
     * Send clear canvas operation
     */
    sendClear() {
        if (!this.connected) return;
        
        this.socket.emit('clear', {
            roomId: this.roomId,
            userId: this.userId,
            timestamp: Date.now()
        });
    }
    
    /**
     * Event emitter
     */
    emit(eventName, data) {
        const handlers = this.eventHandlers.get(eventName) || [];
        handlers.forEach(handler => handler(data));
    }
    
    /**
     * Event listener
     */
    on(eventName, callback) {
        if (!this.eventHandlers.has(eventName)) {
            this.eventHandlers.set(eventName, []);
        }
        this.eventHandlers.get(eventName).push(callback);
    }
    
    /**
     * Disconnect from server
     */
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
        }
    }
}