# Real-Time Collaborative Drawing Canvas

A multi-user drawing application where multiple people can draw simultaneously on the same canvas with real-time synchronization. Built with vanilla JavaScript, HTML5 Canvas, Node.js, and Socket.io.

<h3>Live Demo</h3>
The project is live here <a href='http://collaborativecanvas-production.up.railway.app'> Collaborative-canvas</a>

## Features Overview
### Core Drawing Capabilities

- Multiple Tools: Brush, eraser, shapes (rectangle, circle, line)
- Customization: Color picker with presets, adjustable stroke width (1-50px)
- Shape Options: Filled or outlined shapes
- Export: Download canvas as PNG image

### Real-Time Collaboration

- Live Drawing Sync: Watch other users draw in real-time (no lag!)
- Animated Cursors: See where collaborators are drawing with named cursors
- Online Indicators: Track active users with color-coded presence
- Instant Updates: Changes broadcast to all users immediately

### Room System (Isolated Workspaces)

- Multiple Rooms: Create separate canvases for different projects
- Room Selection UI: Easy-to-use interface for creating/joining rooms
- Default Room: Quick start with default room for instant collaboration
- Custom Rooms: Join specific rooms via URL: ?room=your-room-name
- Independent State: Each room maintains its own drawing history

### Drawing Persistence

- Auto-Save: Canvas state saved every 5 seconds automatically
- Server Restart Recovery: All drawings preserved across server restarts
- File-Based Storage: Simple JSON storage in data/rooms/ directory
- Per-Room Persistence: Each room saves independently
- State Restoration: Operations and undo/redo history fully restored

### Advanced Features

- Global Undo/Redo: Server-authoritative undo/redo works across all users
- Performance Monitoring: Real-time FPS and network latency display
- Path Optimization: Smooth curves using quadratic Bezier paths
- Mobile Support: Touch events for tablets and smartphones
- Keyboard Shortcuts: Fast workflow with tool shortcuts
- Reconnection Handling: Auto-reconnect with message queuing

## 📋 Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

## 🔧 Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd collaborative-canvas
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the server**
   ```bash
   npm start
   ```
   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

4. **Open in browser**
   - Navigate to `http://localhost:3000`
   - Open multiple browser tabs/windows to test multi-user collaboration

##  Testing with Multiple Users

### Method 1: Multiple Browser Tabs
1. Start the server: `npm start`
2. Open `http://localhost:3000` in your browser
3. Open multiple tabs/windows with the same URL
4. Start drawing in different tabs to see real-time synchronization

### Method 2: Multiple Devices
1. Start the server: `npm start`
2. Find your local IP address
3. Access `http://<your-ip>:3000` from other devices on the same network
4. Draw simultaneously from different devices

### What to Test
-  Drawing with brush tool in one tab - should appear in all tabs
-  Using eraser in one tab - should erase in all tabs
-  Changing colors - should only affect your own drawings
-  Adjusting stroke width - should only affect your own drawings
-  Moving cursor - should see other users' cursors
-  Undo operation - should undo for all users
-  Redo operation - should redo for all users
-  Clear canvas - should clear for all users
-  User joining/leaving - should update online user count

## ⌨️ Keyboard Shortcuts

- `Ctrl+B` (or `Cmd+B` on Mac) - Switch to brush tool
- `Ctrl+E` (or `Cmd+E` on Mac) - Switch to eraser tool
- `Ctrl+R` (or `Cmd+R` on Mac) - Switch to rectangle tool
- `Ctrl+C` (or `Cmd+C` on Mac) - Switch to circle tool
- `Ctrl+L` (or `Cmd+L` on Mac) - Switch to line tool
- `Ctrl+T` (or `Cmd+T` on Mac) - Switch to text tool
- `Ctrl+Z` (or `Cmd+Z` on Mac) - Undo last operation
- `Ctrl+Y` or `Ctrl+Shift+Z` (or `Cmd+Y`/`Cmd+Shift+Z` on Mac) - Redo operation

**Note**: Tool shortcuts require Ctrl/Cmd key to avoid conflicts with typing and text input.

##  Project Structure

```
collaborative-canvas/
├── client/
│   ├── index.html              # Main HTML file
│   ├── style.css               # Styles and animations
│   ├── canvas.js               # Canvas drawing logic
│   ├── websocket.js            # WebSocket client
│   ├── main.js                 # App initialization
│   └── performance-monitor.js  # Performance metrics (FPS, latency)
├── server/
│   ├── server.js               # Express + Socket.io server
│   ├── rooms.js                # Room management
│   ├── drawing-state.js        # Canvas state management
│   └── persistence.js          # Drawing persistence (save/load)
├── data/                       # Saved canvas states (auto-generated)
├── package.json
├── README.md
└── ARCHITECTURE.md
```

## Room System

### Accessing Rooms
   - Default Room:
     ```bash
     http://localhost:3000
     ```
   - Custom Rooms:
     ```bash
     http://localhost:3000/?room=<ur-room-name>
     ```
### How It Works
- Each room has its own isolated canvas
- Create a room by visiting a unique URL
- Share the URL with team members to collaborate
- Rooms are automatically created when first accessed
     

##  Known Limitations

1. **Conflict Resolution**: Conflicts are handled sequentially (last operation wins for simultaneous strokes)
2. **History Limit**: Operation history limited to 1000 operations per room
3. **No User Names**: Users are identified by ID only (first 8 characters displayed)
4. **Text Editing**: Text cannot be edited after placement (must undo and re-add)
5. **File-based Storage**: Currently uses file system for persistence (consider database for production)
6. **No Authentication**: All users can modify any room (no access control)

##  Browser Compatibility

- Chrome/Edge (recommended)
- Firefox
- Safari
- Mobile browsers (iOS Safari, Chrome Mobile)

##  Performance

- Drawing events throttled to ~60fps
- Canvas operations optimized for smooth rendering
- Device pixel ratio support for crisp rendering on high-DPI displays
- Efficient redrawing from operation history
- Active stroke tracking for real-time collaboration

##  Time Spent

**Total Development Time**: Approximately 2-3 days


##  Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

##  Contact

For questions or issues, please open an issue on the repository.

---


