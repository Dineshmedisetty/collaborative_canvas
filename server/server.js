const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');
const RoomManager = require('./rooms');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

// Serve static files from client directory
app.use(express.static(path.join(__dirname, '../client')));

// Initialize room manager (persistence disabled - drawings won't persist across restarts)
const roomManager = new RoomManager();

// Graceful shutdown (persistence disabled - not saving on shutdown)
process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    // Persistence disabled - not saving room states
    // roomManager.rooms.forEach((room, roomId) => {
    //     roomManager.saveRoom(roomId);
    // });
    roomManager.stopAutoSave();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\nShutting down server...');
    // Persistence disabled - not saving room states
    // roomManager.rooms.forEach((room, roomId) => {
    //     roomManager.saveRoom(roomId);
    // });
    roomManager.stopAutoSave();
    process.exit(0);
});

// Generate random color for user
function generateUserColor() {
    const hue = Math.floor(Math.random() * 360);
    return `hsl(${hue}, 70%, 60%)`;
}

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    const userId = socket.id;
    const userColor = generateUserColor();
    
    // Send initialization data to client
    socket.emit('init', {
        userId,
        userColor
    });
    
    // Handle room joining
    socket.on('joinRoom', ({ roomId }) => {
        console.log(`User ${userId} joining room ${roomId}`);
        
        // Join the socket.io room
        socket.join(roomId);
        
        // Add user to room in room manager
        roomManager.addUser(roomId, {
            userId,
            socketId: socket.id,
            userColor,
            joinedAt: Date.now()
        });
        
        // Send current canvas state to new user
        const room = roomManager.getRoom(roomId);
        const state = room.getFullState();
        
        console.log(`Sending canvas state to ${userId}:`, {
            operations: state.visibleOperations.length,
            currentIndex: state.currentIndex,
            canUndo: state.canUndo,
            canRedo: state.canRedo
        });
        
        socket.emit('canvasState', {
            operations: state.visibleOperations,
            currentIndex: state.currentIndex
        });
        
        // Notify other users
        socket.to(roomId).emit('userJoined', {
            userId,
            userColor
        });
        
        // Send online users list
        io.to(roomId).emit('onlineUsers', {
            users: room.getUsers()
        });
    });
    
    // Handle stroke start
    socket.on('strokeStart', ({ roomId, stroke }) => {
        const room = roomManager.getRoom(roomId);
        if (!room) return;
        
        room.setActiveStroke(userId, stroke);
        
        // Broadcast to other users
        socket.to(roomId).emit('stroke', {
            phase: 'start',
            stroke,
            userId
        });
    });
    
    // Handle stroke drawing (points being added or shape updated)
    socket.on('strokeDraw', ({ roomId, points, endPos }) => {
        const room = roomManager.getRoom(roomId);
        if (!room) return;
        
        const activeStroke = room.getActiveStroke(userId);
        if (activeStroke) {
            if (points) {
                // Brush/eraser - add points
                activeStroke.points.push(...points);
                
                // Broadcast to other users
                socket.to(roomId).emit('stroke', {
                    phase: 'draw',
                    stroke: { points },
                    userId
                });
            } else if (endPos) {
                // Shape tool - update end position
                activeStroke.endPos = endPos;
                
                // Broadcast to other users
                socket.to(roomId).emit('stroke', {
                    phase: 'draw',
                    stroke: { endPos },
                    userId
                });
            }
        }
    });
    
    // Handle stroke end
    socket.on('strokeEnd', ({ roomId, stroke }) => {
        const room = roomManager.getRoom(roomId);
        if (!room) return;
        
        // Add completed stroke to operation history
        room.addOperation({
            type: 'draw',
            stroke,
            userId,
            timestamp: stroke.timestamp
        });
        
        // Save state after adding operation (disabled - persistence not enabled)
        // roomManager.saveRoom(roomId);
        
        room.clearActiveStroke(userId);
        
        // Broadcast to other users
        socket.to(roomId).emit('stroke', {
            phase: 'end',
            stroke,
            userId
        });
        
        // Send updated state to all users (including sender)
        const state = room.getFullState();
        io.to(roomId).emit('canvasState', {
            operations: state.visibleOperations,
            currentIndex: state.currentIndex
        });
    });
    
    // Handle cursor position updates
    socket.on('cursor', ({ roomId, position }) => {
        // Broadcast to other users in room
        socket.to(roomId).emit('cursor', {
            userId,
            position,
            userColor
        });
    });
    
    // Handle ping for latency measurement
    socket.on('ping', (timestamp) => {
        socket.emit('pong', timestamp);
    });
    
    // Handle undo operation
    socket.on('undo', ({ roomId, userId: requestUserId, timestamp }) => {
        const room = roomManager.getRoom(roomId);
        if (!room) return;
        
        console.log(`Undo requested by ${requestUserId} in room ${roomId}`);
        room.debugState();
        
        const canUndo = room.undo();
        
        if (canUndo) {
            // Save state after undo (disabled - persistence not enabled)
            // roomManager.saveRoom(roomId);
            
            const state = room.getFullState();
            console.log(`Undo successful. New state:`, {
                currentIndex: state.currentIndex,
                visibleOps: state.visibleOperations.length,
                totalOps: state.totalOperations,
                canUndo: state.canUndo,
                canRedo: state.canRedo
            });
            
            // Broadcast updated state to all users
            io.to(roomId).emit('operation', {
                type: 'undo',
                operations: room.getAllOperations(), // Send ALL operations
                currentIndex: state.currentIndex,
                userId: requestUserId,
                timestamp
            });
        } else {
            console.log(`Undo failed - nothing to undo`);
            // Notify requesting user
            socket.emit('notification', {
                message: 'Nothing to undo',
                type: 'warning'
            });
        }
    });
    
    // Handle redo operation
    socket.on('redo', ({ roomId, userId: requestUserId, timestamp }) => {
        const room = roomManager.getRoom(roomId);
        if (!room) return;
        
        console.log(`Redo requested by ${requestUserId} in room ${roomId}`);
        room.debugState();
        
        const canRedo = room.redo();
        
        if (canRedo) {
            // Save state after redo (disabled - persistence not enabled)
            // roomManager.saveRoom(roomId);
            
            const state = room.getFullState();
            console.log(`Redo successful. New state:`, {
                currentIndex: state.currentIndex,
                visibleOps: state.visibleOperations.length,
                totalOps: state.totalOperations,
                canUndo: state.canUndo,
                canRedo: state.canRedo
            });
            
            // Broadcast updated state to all users
            io.to(roomId).emit('operation', {
                type: 'redo',
                operations: room.getAllOperations(), // Send ALL operations
                currentIndex: state.currentIndex,
                userId: requestUserId,
                timestamp
            });
        } else {
            console.log(`Redo failed - nothing to redo`);
            // Notify requesting user
            socket.emit('notification', {
                message: 'Nothing to redo',
                type: 'warning'
            });
        }
    });
    
    // Handle clear canvas operation
    socket.on('clear', ({ roomId, userId: requestUserId, timestamp }) => {
        const room = roomManager.getRoom(roomId);
        if (!room) return;
        
        console.log(`Clear requested by ${requestUserId} in room ${roomId}`);
        
        room.clear();
        
        // Save cleared state (disabled - persistence not enabled)
        // roomManager.saveRoom(roomId);
        
        // Broadcast to all users
        io.to(roomId).emit('operation', {
            type: 'clear',
            operations: [],
            currentIndex: -1,
            userId: requestUserId,
            timestamp
        });
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        
        // Remove user from all rooms
        const rooms = roomManager.removeUserFromAllRooms(userId);
        
        // Notify other users in each room
        rooms.forEach(roomId => {
            socket.to(roomId).emit('userLeft', { userId });
            
            const room = roomManager.getRoom(roomId);
            if (room) {
                io.to(roomId).emit('onlineUsers', {
                    users: room.getUsers()
                });
            }
        });
    });
});

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
    console.log(`========================================`);
    console.log(`🎨 Collaborative Canvas Server`);
    console.log(`========================================`);
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Open multiple browser tabs to test!`);
    console.log(`========================================`);
});