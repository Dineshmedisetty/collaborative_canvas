# Architecture Documentation

## 📐 System Architecture

### High-Level Overview

The Collaborative Canvas application follows a client-server architecture with WebSocket-based real-time communication. The server maintains the authoritative state of the canvas, while clients render the state and send drawing events to the server.

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Client 1  │◄───────►│   Server    │◄───────►│   Client 2  │
│  (Browser)  │ WebSocket│ (Node.js)   │ WebSocket│  (Browser)  │
└─────────────┘         └─────────────┘         └─────────────┘
      │                        │                        │
      │                        │                        │
   Canvas                  Room Manager            Canvas
   Manager                 Drawing State           Manager
```

## 🔄 Data Flow Diagram

### Drawing Event Flow

```
User Action (Mouse/Touch)
    │
    ▼
CanvasManager.handleDrawStart()
    │
    ▼
Emit 'strokeStart' event
    │
    ▼
main.js: setupCanvasEvents()
    │
    ▼
WebSocketManager.sendStrokeStart()
    │
    ▼
Socket.io Client → Server
    │
    ▼
server.js: socket.on('strokeStart')
    │
    ▼
RoomManager.getRoom() → DrawingState
    │
    ▼
Store active stroke
    │
    ▼
Broadcast to other clients (socket.to(roomId).emit('stroke'))
    │
    ▼
Other Clients: WebSocketManager.on('stroke')
    │
    ▼
main.js: handleRemoteStroke()
    │
    ▼
CanvasManager.drawStrokeSegment()
    │
    ▼
Canvas updated in real-time
```

### Undo/Redo Flow

```
User Action (Ctrl+Z / Undo Button)
    │
    ▼
main.js: undo()
    │
    ▼
WebSocketManager.sendUndo()
    │
    ▼
Socket.io Client → Server
    │
    ▼
server.js: socket.on('undo')
    │
    ▼
DrawingState.undo() → Decrement currentIndex
    │
    ▼
Get updated state (visibleOperations = operations[0..currentIndex])
    │
    ▼
Broadcast to all clients (io.to(roomId).emit('operation'))
    │
    ▼
All Clients: WebSocketManager.on('operation')
    │
    ▼
main.js: handleRemoteOperation()
    │
    ▼
CanvasManager.redrawFromHistory(visibleOperations)
    │
    ▼
Canvas redrawn with visible operations only
```

## 🌐 WebSocket Protocol

### Client → Server Messages

#### `joinRoom`
Join a drawing room.
```javascript
{
  roomId: string  // Room identifier (e.g., "default")
}
```

#### `strokeStart`
Begin a new stroke.
```javascript
{
  roomId: string,
  stroke: {
    id: string,           // Unique stroke ID
    tool: string,         // "brush" | "eraser"
    color: string,        // Hex color code
    width: number,        // Stroke width in pixels
    points: Array<{x, y}>, // Initial point
    userId: string,       // User ID
    timestamp: number     // Unix timestamp
  }
}
```

#### `strokeDraw`
Add points to active stroke (sent during drawing).
```javascript
{
  roomId: string,
  points: Array<{x, y}>, // New points to add
  timestamp: number
}
```

#### `strokeEnd`
Complete a stroke.
```javascript
{
  roomId: string,
  stroke: {
    id: string,
    tool: string,
    color: string,
    width: number,
    points: Array<{x, y}>, // All points in stroke
    userId: string,
    timestamp: number
  }
}
```

#### `cursor`
Update cursor position.
```javascript
{
  roomId: string,
  position: {x, y},
  userId: string
}
```

#### `undo`
Request undo operation.
```javascript
{
  roomId: string,
  userId: string,
  timestamp: number
}
```

#### `redo`
Request redo operation.
```javascript
{
  roomId: string,
  userId: string,
  timestamp: number
}
```

#### `clear`
Clear the canvas.
```javascript
{
  roomId: string,
  userId: string,
  timestamp: number
}
```

### Server → Client Messages

#### `init`
Initial client setup.
```javascript
{
  userId: string,    // Unique user ID
  userColor: string  // Assigned user color (HSL)
}
```

#### `canvasState`
Full canvas state (sent on join or after operations).
```javascript
{
  operations: Array<Operation>, // Visible operations
  currentIndex: number          // Current position in history
}
```

#### `userJoined`
User joined the room.
```javascript
{
  userId: string,
  userColor: string
}
```

#### `userLeft`
User left the room.
```javascript
{
  userId: string
}
```

#### `stroke`
Remote stroke event.
```javascript
{
  phase: "start" | "draw" | "end",
  stroke: {
    // Stroke data (varies by phase)
    points: Array<{x, y}>,
    tool: string,
    color: string,
    width: number
  },
  userId: string
}
```

#### `cursor`
Remote cursor position.
```javascript
{
  userId: string,
  position: {x, y},
  userColor: string,
  userName?: string
}
```

#### `operation`
Remote operation (undo/redo/clear).
```javascript
{
  type: "undo" | "redo" | "clear",
  operations: Array<Operation>, // All operations (for sync)
  currentIndex: number,         // New current index
  userId: string,
  timestamp: number
}
```

#### `onlineUsers`
Updated online users list.
```javascript
{
  users: Array<{
    userId: string,
    userColor: string,
    joinedAt: number
  }>
}
```

### Operation Structure
```javascript
{
  type: "draw",
  stroke: {
    id: string,
    tool: string,
    color: string,
    width: number,
    points: Array<{x, y}>,
    userId: string,
    timestamp: number
  },
  userId: string,
  timestamp: number
}
```

## 🔄 Undo/Redo Strategy

### Overview

The undo/redo system uses a **linear operation history** with an index pointer. The server maintains the authoritative state, and all clients synchronize to the server's state.

### Implementation Details

#### Operation History Structure
```javascript
{
  operations: [op1, op2, op3, op4, op5],  // All operations
  currentIndex: 2                          // Points to op3
}
```

- `operations`: Complete array of all operations ever performed
- `currentIndex`: Current position in the history (-1 = no operations, 0 = first operation, etc.)
- `visibleOperations`: Operations from index 0 to `currentIndex` (inclusive)

#### Undo Operation
1. User requests undo (Ctrl+Z or button click)
2. Client sends `undo` message to server
3. Server decrements `currentIndex` if `currentIndex >= 0`
4. Server broadcasts updated state to all clients
5. All clients redraw canvas with `visibleOperations = operations[0..currentIndex]`

#### Redo Operation
1. User requests redo (Ctrl+Y or button click)
2. Client sends `redo` message to server
3. Server increments `currentIndex` if `currentIndex < operations.length - 1`
4. Server broadcasts updated state to all clients
5. All clients redraw canvas with `visibleOperations = operations[0..currentIndex]`

#### Adding New Operations
When a user draws after undoing:
1. All operations after `currentIndex` are removed (forward history is lost)
2. New operation is added at the end
3. `currentIndex` is set to the new operation's index
4. This ensures linear history without branches

#### Key Design Decisions

1. **Server as Source of Truth**: All undo/redo operations are processed by the server to ensure consistency
2. **Linear History**: No branching - if user undoes and then draws, forward history is lost (standard behavior)
3. **Full State Sync**: On undo/redo, server sends full operation array and current index to all clients
4. **Efficient Redrawing**: Clients redraw only visible operations (slice from 0 to currentIndex)
5. **History Limit**: Maximum 1000 operations per room to prevent memory issues

### Example Scenario

```
Initial state:
operations = [op1, op2, op3]
currentIndex = 2

User A undoes:
operations = [op1, op2, op3]
currentIndex = 1  // op3 is now hidden

User B draws:
operations = [op1, op2, op4]  // op3 removed, op4 added
currentIndex = 2

User A redo:
Cannot redo - op3 is gone (replaced by op4)
```

## ⚡ Performance Decisions

### 1. Drawing Event Throttling

**Decision**: Throttle drawing events to ~60fps (16ms intervals)

**Rationale**:
- Prevents overwhelming the server with too many events
- Reduces network traffic
- Maintains smooth drawing experience
- Balances responsiveness with performance

**Implementation**:
```javascript
const drawThrottle = 16; // ~60fps
if (now - this.lastDrawTime < this.drawThrottle) return;
```

### 2. Incremental Point Transmission

**Decision**: Send only new points during `strokeDraw`, not the entire stroke

**Rationale**:
- Reduces payload size
- Lower latency for real-time updates
- Less bandwidth usage
- Server reconstructs full stroke from incremental updates

**Implementation**:
```javascript
// Client sends only new points
this.emit('strokeDraw', {
  points: this.currentStroke.points.slice(-2) // Last 2 points
});

// Server appends to active stroke
activeStroke.points.push(...points);
```

### 3. Client-Side Prediction

**Decision**: Draw immediately on client before server confirmation

**Rationale**:
- Zero perceived latency for the drawing user
- Immediate visual feedback
- Server still maintains authoritative state
- Other users see updates via server broadcast

**Implementation**:
```javascript
// Draw locally immediately
this.drawStrokeSegment(this.currentStroke, ...);

// Then send to server
this.wsManager.sendStrokeDraw(points);
```

### 4. Efficient Canvas Redrawing

**Decision**: Redraw entire canvas from operation history for undo/redo

**Rationale**:
- Simpler than tracking individual operations
- Ensures consistency across all clients
- Canvas operations are fast for moderate operation counts
- Clear and predictable behavior

**Implementation**:
```javascript
redrawFromHistory(operations) {
  this.clear();
  operations.forEach(op => {
    if (op.type === 'draw' && op.stroke) {
      this.drawStroke(op.stroke);
    }
  });
}
```

### 5. Device Pixel Ratio Support

**Decision**: Scale canvas based on device pixel ratio

**Rationale**:
- Crisp rendering on high-DPI displays (Retina, 4K)
- Prevents blurry canvas on modern devices
- Maintains performance on standard displays

**Implementation**:
```javascript
const dpr = window.devicePixelRatio || 1;
this.canvas.width = rect.width * dpr;
this.canvas.height = rect.height * dpr;
this.ctx.scale(dpr, dpr);
```

### 6. Active Stroke Tracking

**Decision**: Track active strokes separately from completed operations

**Rationale**:
- Allows real-time drawing updates without affecting history
- Completed strokes are added to history only on `strokeEnd`
- Prevents partial strokes from polluting operation history
- Enables smooth real-time collaboration

**Implementation**:
```javascript
// Active strokes (in progress)
this.activeStrokes = new Map(); // userId -> stroke

// Completed operations (in history)
this.operations = []; // Array of operations
```

### 7. Operation History Limit

**Decision**: Limit history to 1000 operations per room

**Rationale**:
- Prevents unlimited memory growth
- Maintains performance with large drawings
- Reasonable limit for most use cases
- Can be adjusted based on requirements

**Implementation**:
```javascript
if (this.operations.length > this.maxHistorySize) {
  const removeCount = this.operations.length - this.maxHistorySize;
  this.operations = this.operations.slice(removeCount);
  this.currentIndex -= removeCount;
}
```

### 8. Cursor Update Throttling

**Decision**: Send cursor position on every mouse move (no throttling)

**Rationale**:
- Cursor updates are lightweight
- Important for real-time collaboration feel
- Clients remove stale cursors (5 second timeout)
- Minimal performance impact

**Implementation**:
```javascript
// Always emit cursor position
this.emit('cursorMove', pos);

// Remove stale cursors
if (now - cursor.lastUpdate > 5000) {
  this.userCursors.delete(userId);
}
```

## 🔀 Conflict Resolution

### Overview

The system uses **sequential processing** with **last-write-wins** semantics for simultaneous operations. The server processes operations in the order they are received, and the canvas state reflects the most recent operations.

### Drawing Conflicts

#### Scenario: Two users draw simultaneously in overlapping areas

**Resolution Strategy**:
1. Each user's stroke is processed independently
2. Strokes are added to the canvas in the order they complete
3. Later strokes are drawn on top of earlier strokes
4. No merging or blending - standard canvas compositing applies

**Implementation**:
```javascript
// Each stroke is a separate operation
room.addOperation({
  type: 'draw',
  stroke: {...},
  userId: userId,
  timestamp: Date.now()
});

// Strokes are drawn in order
operations.forEach(op => {
  this.drawStroke(op.stroke);
});
```

**Limitations**:
- No operational transforms (OT) or conflict-free replicated data types (CRDTs)
- Simultaneous strokes may overlap in unexpected ways
- Last stroke to complete appears on top

### Undo/Redo Conflicts

#### Scenario: User A undoes while User B is drawing

**Resolution Strategy**:
1. Undo operation is processed immediately
2. Active strokes (in progress) are not affected by undo
3. When User B completes their stroke, it's added to the history
4. If User B's stroke was started before the undo, it may create inconsistencies

**Implementation**:
```javascript
// Undo only affects completed operations
undo() {
  if (this.currentIndex < 0) return false;
  this.currentIndex--;
  return true;
}

// Active strokes are separate
this.activeStrokes = new Map(); // Not affected by undo
```

**Limitations**:
- Active strokes are not part of the undo/redo system
- If a user starts drawing before an undo, their stroke may be added after undo, creating confusion
- No transaction system to coordinate operations

### Clear Conflicts

#### Scenario: User A clears canvas while User B is drawing

**Resolution Strategy**:
1. Clear operation is processed immediately
2. All operations are removed from history
3. Active strokes continue until completion
4. When active strokes complete, they're added to the (now empty) history
5. Canvas shows only strokes completed after the clear

**Implementation**:
```javascript
clear() {
  this.operations = [];
  this.currentIndex = -1;
  this.activeStrokes.clear(); // Also clear active strokes
}
```

### Network Latency Handling

#### Scenario: User A's stroke arrives after User B's stroke, but User A started drawing first

**Resolution Strategy**:
1. Server processes operations in the order received (not by timestamp)
2. Client-side prediction shows User A's stroke immediately
3. Server order determines final canvas state
4. Other users see strokes in server order

**Implementation**:
```javascript
// Client draws immediately (prediction)
this.drawStrokeSegment(this.currentStroke, ...);

// Server processes in receive order
socket.on('strokeEnd', ({ roomId, stroke }) => {
  room.addOperation({...}); // Added in receive order
});
```

**Limitations**:
- Network latency can cause strokes to appear out of order
- No vector clocks or Lamport timestamps for ordering
- Final state may not match the "intended" order

### Recommended Improvements

For production use, consider:

1. **Operational Transforms (OT)**: Transform operations to handle conflicts
2. **CRDTs**: Conflict-free replicated data types for automatic conflict resolution
3. **Vector Clocks**: Logical timestamps for ordering events
4. **Transaction System**: Coordinate related operations
5. **Conflict Merging**: Merge overlapping strokes intelligently
6. **Optimistic Locking**: Prevent conflicts before they occur


## 🎯 Conclusion

The Collaborative Canvas application demonstrates real-time collaboration using WebSockets, canvas operations, and state synchronization. The architecture prioritizes simplicity and real-time performance, with clear areas for improvement in conflict resolution, persistence, and scalability.

For production use, consider implementing operational transforms, persistence, authentication, and enhanced conflict resolution strategies.

