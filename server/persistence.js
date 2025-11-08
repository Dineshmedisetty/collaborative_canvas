/**
 * Persistence Manager
 * Handles saving and loading canvas state to/from disk
 */
const fs = require('fs');
const path = require('path');

class PersistenceManager {
    constructor(dataDir = './data') {
        this.dataDir = dataDir;
        this.ensureDataDir();
    }
    
    /**
     * Ensure data directory exists
     */
    ensureDataDir() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
            console.log(`Created data directory: ${this.dataDir}`);
        }
    }
    
    /**
     * Get file path for a room
     */
    getRoomFilePath(roomId) {
        // Sanitize roomId to prevent directory traversal
        const safeRoomId = roomId.replace(/[^a-zA-Z0-9-_]/g, '_');
        return path.join(this.dataDir, `room_${safeRoomId}.json`);
    }
    
    /**
     * Save room state to disk
     */
    saveRoomState(roomId, state) {
        try {
            const filePath = this.getRoomFilePath(roomId);
            const data = {
                roomId: state.roomId,
                operations: state.operations,
                currentIndex: state.currentIndex,
                savedAt: Date.now()
            };
            
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
            console.log(`Saved state for room ${roomId} to ${filePath}`);
            return true;
        } catch (error) {
            console.error(`Error saving room state for ${roomId}:`, error);
            return false;
        }
    }
    
    /**
     * Load room state from disk
     */
    loadRoomState(roomId) {
        try {
            const filePath = this.getRoomFilePath(roomId);
            
            if (!fs.existsSync(filePath)) {
                console.log(`No saved state found for room ${roomId}`);
                return null;
            }
            
            const data = fs.readFileSync(filePath, 'utf8');
            const state = JSON.parse(data);
            
            console.log(`Loaded state for room ${roomId} from ${filePath}`);
            console.log(`  Operations: ${state.operations.length}, Index: ${state.currentIndex}`);
            
            return {
                operations: state.operations || [],
                currentIndex: state.currentIndex !== undefined ? state.currentIndex : -1
            };
        } catch (error) {
            console.error(`Error loading room state for ${roomId}:`, error);
            return null;
        }
    }
    
    /**
     * Delete room state from disk
     */
    deleteRoomState(roomId) {
        try {
            const filePath = this.getRoomFilePath(roomId);
            
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`Deleted state for room ${roomId}`);
                return true;
            }
            
            return false;
        } catch (error) {
            console.error(`Error deleting room state for ${roomId}:`, error);
            return false;
        }
    }
    
    /**
     * Auto-save room state (called periodically)
     */
    autoSave(roomId, state) {
        // Only save if there are operations
        if (state.operations && state.operations.length > 0) {
            this.saveRoomState(roomId, state);
        }
    }
}

module.exports = PersistenceManager;

