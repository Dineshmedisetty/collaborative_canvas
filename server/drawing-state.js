/**
 * Drawing State Manager - FIXED REDO
 * Maintains the operation history and state for a drawing room
 */
class DrawingState {
    constructor(roomId) {
        this.roomId = roomId;
        this.operations = []; // Complete operation history
        this.currentIndex = -1; // Current position in history (for undo/redo)
        this.users = new Map(); // userId -> user data
        this.activeStrokes = new Map(); // userId -> current stroke being drawn
        this.maxHistorySize = 1000; // Prevent unlimited memory growth
    }
    
    /**
     * Add user to room
     */
    addUser(userData) {
        this.users.set(userData.userId, userData);
        console.log(`User ${userData.userId} added to room ${this.roomId}`);
    }
    
    /**
     * Remove user from room
     */
    removeUser(userId) {
        this.users.delete(userId);
        this.activeStrokes.delete(userId);
        console.log(`User ${userId} removed from room ${this.roomId}`);
    }
    
    /**
     * Check if user exists in room
     */
    hasUser(userId) {
        return this.users.has(userId);
    }
    
    /**
     * Get all users in room
     */
    getUsers() {
        return Array.from(this.users.values());
    }
    
    /**
     * Get user count
     */
    getUserCount() {
        return this.users.size;
    }
    
    /**
     * Set active stroke for a user
     */
    setActiveStroke(userId, stroke) {
        this.activeStrokes.set(userId, stroke);
    }
    
    /**
     * Get active stroke for a user
     */
    getActiveStroke(userId) {
        return this.activeStrokes.get(userId);
    }
    
    /**
     * Clear active stroke for a user
     */
    clearActiveStroke(userId) {
        this.activeStrokes.delete(userId);
    }
    
    /**
     * Add operation to history
     * This is the core of undo/redo functionality
     */
    addOperation(operation) {
        // IMPORTANT: Remove any operations after current index
        // This means if user undoes and then draws, forward history is lost
        if (this.currentIndex < this.operations.length - 1) {
            this.operations = this.operations.slice(0, this.currentIndex + 1);
            console.log(`Truncated forward history. New length: ${this.operations.length}`);
        }
        
        // Add new operation
        this.operations.push(operation);
        this.currentIndex++;
        
        // Limit history size to prevent memory issues
        if (this.operations.length > this.maxHistorySize) {
            const removeCount = this.operations.length - this.maxHistorySize;
            this.operations = this.operations.slice(removeCount);
            this.currentIndex -= removeCount;
        }
        
        console.log(`Operation added to ${this.roomId}: ${operation.type}, index: ${this.currentIndex}/${this.operations.length - 1}`);
    }
    
    /**
     * Undo last operation
     * Returns true if undo was successful, false if nothing to undo
     */
    undo() {
        if (this.currentIndex < 0) {
            console.log(`Cannot undo in ${this.roomId}: already at beginning (index: ${this.currentIndex})`);
            return false;
        }
        
        this.currentIndex--;
        console.log(`Undo in ${this.roomId}: now at index ${this.currentIndex}/${this.operations.length - 1}`);
        return true;
    }
    
    /**
     * Redo next operation
     * Returns true if redo was successful, false if nothing to redo
     */
    redo() {
        // Check if we can redo (are we before the end of operations?)
        if (this.currentIndex >= this.operations.length - 1) {
            console.log(`Cannot redo in ${this.roomId}: already at end (index: ${this.currentIndex}, length: ${this.operations.length})`);
            return false;
        }
        
        this.currentIndex++;
        console.log(`Redo in ${this.roomId}: now at index ${this.currentIndex}/${this.operations.length - 1}`);
        return true;
    }
    
    /**
     * Clear all operations
     */
    clear() {
        this.operations = [];
        this.currentIndex = -1;
        this.activeStrokes.clear();
        console.log(`Canvas cleared in ${this.roomId}`);
    }
    
    /**
     * Get visible operations (up to current index for undo/redo)
     * This is what clients should render
     */
    getOperations() {
        // Return operations from index 0 to currentIndex (inclusive)
        return this.operations.slice(0, this.currentIndex + 1);
    }
    
    /**
     * Get all operations (including future ones for debugging)
     */
    getAllOperations() {
        return this.operations;
    }
    
    /**
     * Get current index in operation history
     */
    getCurrentIndex() {
        return this.currentIndex;
    }
    
    /**
     * Get total operation count (including undone operations)
     */
    getOperationCount() {
        return this.operations.length;
    }
    
    /**
     * Check if undo is possible
     */
    canUndo() {
        return this.currentIndex >= 0;
    }
    
    /**
     * Check if redo is possible
     */
    canRedo() {
        return this.currentIndex < this.operations.length - 1;
    }
    
    /**
     * Get full state (for debugging/persistence)
     */
    getFullState() {
        return {
            roomId: this.roomId,
            operations: this.operations,
            visibleOperations: this.getOperations(),
            currentIndex: this.currentIndex,
            totalOperations: this.operations.length,
            userCount: this.users.size,
            activeStrokeCount: this.activeStrokes.size,
            canUndo: this.canUndo(),
            canRedo: this.canRedo()
        };
    }
    
    /**
     * Debug method to print state
     */
    debugState() {
        console.log('=== Drawing State Debug ===');
        console.log(`Room: ${this.roomId}`);
        console.log(`Total Operations: ${this.operations.length}`);
        console.log(`Current Index: ${this.currentIndex}`);
        console.log(`Visible Operations: ${this.getOperations().length}`);
        console.log(`Can Undo: ${this.canUndo()}`);
        console.log(`Can Redo: ${this.canRedo()}`);
        console.log(`Users: ${this.users.size}`);
        console.log('===========================');
    }
}

module.exports = DrawingState;