const DrawingState = require('./drawing-state');
const PersistenceManager = require('./persistence');

/**
 * Room Manager
 * Manages multiple drawing rooms and their users
 */
class RoomManager {
    constructor() {
        this.rooms = new Map();
        this.persistence = new PersistenceManager();
        this.autoSaveInterval = null;
        this.startAutoSave();
    }
    
    /**
     * Get or create a room (always starts fresh - persistence disabled)
     */
    getRoom(roomId) {
        if (!this.rooms.has(roomId)) {
            const room = new DrawingState(roomId);
            
            // Persistence loading disabled - always start with fresh canvas
            // If you want to enable persistence, uncomment the lines below:
            /*
            const savedState = this.persistence.loadRoomState(roomId);
            if (savedState) {
                room.operations = savedState.operations;
                room.currentIndex = savedState.currentIndex;
                console.log(`Loaded ${savedState.operations.length} operations for room ${roomId}`);
            }
            */
            
            this.rooms.set(roomId, room);
        }
        return this.rooms.get(roomId);
    }
    
    /**
     * Save room state to disk (disabled - persistence not enabled)
     */
    saveRoom(roomId) {
        // Persistence disabled - not saving to disk
        // If you want to enable persistence, uncomment the code below:
        /*
        const room = this.rooms.get(roomId);
        if (room) {
            const state = room.getFullState();
            this.persistence.saveRoomState(roomId, state);
        }
        */
    }
    
    /**
     * Start auto-save timer (disabled - persistence not enabled)
     */
    startAutoSave() {
        // Auto-save disabled - drawings won't persist across server restarts
        // If you want to enable persistence, uncomment the code below:
        /*
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }
        
        this.autoSaveInterval = setInterval(() => {
            this.rooms.forEach((room, roomId) => {
                const state = room.getFullState();
                if (state.operations.length > 0) {
                    this.persistence.autoSave(roomId, state);
                }
            });
        }, 30000); // Save every 30 seconds
        
        console.log('Auto-save started (every 30 seconds)');
        */
        console.log('Auto-save disabled - drawings will not persist across server restarts');
    }
    
    /**
     * Stop auto-save
     */
    stopAutoSave() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
        }
    }
    
    /**
     * Add user to a room
     */
    addUser(roomId, userData) {
        const room = this.getRoom(roomId);
        room.addUser(userData);
    }
    
    /**
     * Remove user from a room
     */
    removeUser(roomId, userId) {
        const room = this.rooms.get(roomId);
        if (!room) return;
        
        room.removeUser(userId);
        
        // Clean up empty rooms (persistence disabled - not saving before deletion)
        if (room.getUserCount() === 0) {
            // this.saveRoom(roomId);
            this.rooms.delete(roomId);
            console.log(`Room ${roomId} deleted (no users)`);
        }
    }
    
    /**
     * Remove user from all rooms they're in
     */
    removeUserFromAllRooms(userId) {
        const roomIds = [];
        
        this.rooms.forEach((room, roomId) => {
            if (room.hasUser(userId)) {
                this.removeUser(roomId, userId);
                roomIds.push(roomId);
            }
        });
        
        return roomIds;
    }
    
    /**
     * Get all active rooms
     */
    getAllRooms() {
        return Array.from(this.rooms.keys());
    }
    
    /**
     * Get room statistics
     */
    getStats() {
        const stats = {
            totalRooms: this.rooms.size,
            rooms: []
        };
        
        this.rooms.forEach((room, roomId) => {
            stats.rooms.push({
                roomId,
                userCount: room.getUserCount(),
                operationCount: room.getOperationCount()
            });
        });
        
        return stats;
    }
}

module.exports = RoomManager;