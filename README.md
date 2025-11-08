# Real-Time Collaborative Drawing Canvas

A multi-user drawing application where multiple people can draw simultaneously on the same canvas with real-time synchronization. Built with vanilla JavaScript, HTML5 Canvas, Node.js, and Socket.io.

## 🚀 Features

### Core Features
- **Drawing Tools**: Brush, eraser, rectangle, circle, line, text, and image upload
- **Real-time Sync**: See other users' drawings as they draw (not after they finish)
- **User Indicators**: Visual cursor positions showing where other users are currently drawing
- **Global Undo/Redo**: Works across all users with server-side state management
- **User Management**: Shows who's online and assigns unique colors to users
- **Room System**: Multiple isolated canvases with room selection UI (create/join rooms)
- **Mobile Support**: Touch events for drawing on mobile devices
- **Drawing Persistence**: Auto-save every 30 seconds - drawings persist across server restarts
- **Performance Metrics**: Real-time FPS counter and latency display

### Technical Features
- Path optimization for smooth drawing
- Efficient canvas redrawing strategies
- Throttled drawing events for performance (~60fps)
- Client-side prediction for immediate feedback
- Network latency handling with reconnection support

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

## 🧪 Testing with Multiple Users

### Method 1: Multiple Browser Tabs
1. Start the server: `npm start`
2. Open `http://localhost:3000` in your browser
3. Open multiple tabs/windows with the same URL
4. Start drawing in different tabs to see real-time synchronization

### Method 2: Multiple Devices
1. Start the server: `npm start`
2. Find your local IP address (e.g., `192.168.1.100`)
3. Access `http://<your-ip>:3000` from other devices on the same network
4. Draw simultaneously from different devices

### What to Test
- ✅ Drawing with brush tool in one tab - should appear in all tabs
- ✅ Using eraser in one tab - should erase in all tabs
- ✅ Changing colors - should only affect your own drawings
- ✅ Adjusting stroke width - should only affect your own drawings
- ✅ Moving cursor - should see other users' cursors
- ✅ Undo operation - should undo for all users
- ✅ Redo operation - should redo for all users
- ✅ Clear canvas - should clear for all users
- ✅ User joining/leaving - should update online user count

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

## 📁 Project Structure

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

## 🐛 Known Limitations

1. **Conflict Resolution**: Conflicts are handled sequentially (last operation wins for simultaneous strokes)
2. **History Limit**: Operation history limited to 1000 operations per room
3. **No User Names**: Users are identified by ID only (first 8 characters displayed)
4. **Text Editing**: Text cannot be edited after placement (must undo and re-add)
5. **File-based Storage**: Currently uses file system for persistence (consider database for production)
6. **No Authentication**: All users can modify any room (no access control)

## ⚠️ Browser Compatibility

- Chrome/Edge (recommended)
- Firefox
- Safari
- Mobile browsers (iOS Safari, Chrome Mobile)

## 🔒 Security Considerations

- Currently no authentication or authorization
- All users can modify the canvas
- No rate limiting on WebSocket events
- CORS is open (`*`) - should be restricted in production

## 📊 Performance

- Drawing events throttled to ~60fps
- Canvas operations optimized for smooth rendering
- Device pixel ratio support for crisp rendering on high-DPI displays
- Efficient redrawing from operation history
- Active stroke tracking for real-time collaboration

## 🛠️ Development

### Running in Development Mode
```bash
npm run dev
```
This uses `nodemon` to auto-reload the server on file changes.

### Debugging
- Check browser console for client-side logs
- Check server console for server-side logs
- Use Chrome DevTools Network tab to inspect WebSocket messages

## 📝 Future Improvements

### ✅ Completed Features
- [x] **Drawing Persistence** - File-based persistence with auto-save (every 30 seconds)
- [x] **Room System** - Multiple isolated canvases with room selection UI
- [x] **Performance Metrics** - Real-time FPS counter and latency display
- [x] **Save/Load Functionality** - Drawings persist across server restarts
- [x] **Drawing Tools** - Brush, eraser, rectangle, circle, line, and text tools
- [x] **Smooth Drawing** - Fixed dotted line issue for continuous smooth strokes

### 🚀 Planned Improvements
- [ ] **User Names/Avatars** - Allow users to set custom names and profile pictures
- [ ] **Authentication & Authorization** - User accounts and permission system
- [ ] **Rate Limiting** - Prevent abuse and spam
- [ ] **Drawing Export** - Export canvas as PNG, SVG, or PDF
- [ ] **Image Upload** - Upload and draw images on canvas
- [ ] **Advanced Shapes** - Polygon, arrow, and custom shape tools
- [ ] **Layer Management** - Multiple layers for complex drawings
- [ ] **Drawing History Timeline** - View and restore previous canvas states
- [ ] **Collaborative Cursors** - Enhanced cursor tracking with user names
- [ ] **Room Permissions** - Private/public rooms with access control
- [ ] **Database Storage** - Migrate from file-based to database (MongoDB/PostgreSQL)
- [ ] **Operational Transforms** - Better conflict resolution for simultaneous edits
- [ ] **Mobile App** - Native mobile app for iOS and Android
- [ ] **Offline Support** - Work offline and sync when connection restored
- [ ] **Drawing Templates** - Pre-made templates and backgrounds
- [ ] **Undo/Redo History** - Visual history timeline for undo/redo
- [ ] **Collaboration Invites** - Share room links with expiration
- [ ] **Drawing Comments** - Add comments and annotations to drawings
- [ ] **Version Control** - Save and restore different versions of drawings

## ⏱️ Time Spent

**Total Development Time**: Approximately 12-15 hours

Breakdown:
- Initial setup and architecture: 2 hours
- Canvas drawing implementation: 3 hours
- WebSocket integration: 2 hours
- Real-time synchronization: 2 hours
- Undo/Redo implementation: 2 hours
- UI/UX polish: 2 hours
- Testing and bug fixes: 2 hours
- Documentation: 1 hour

## 📄 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Contact

For questions or issues, please open an issue on the repository.

---


