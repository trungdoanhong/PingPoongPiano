# 🎹 Pink Poong Piano - Layout Diagram & Workflow

## 📱 **Sơ đồ tổng quan giao diện**

```mermaid
graph TD
    A[🎹 Pink Poong Piano Interface] --> B[📱 Orientation Check]
    A --> C[🎮 Main Game Container]
    
    B --> B1[Portrait Mode:<br/>Rotation Warning]
    B --> B2[Landscape Mode:<br/>Game Interface]
    
    C --> D[🎛️ Control Panel - TOP]
    C --> E[📺 Game Content Area - CENTER]
    
    D --> D1[Primary Controls - Always Visible]
    D --> D2[Secondary Controls - Context Sensitive]
    
    D1 --> D1A[Left Group:<br/>- Score Display<br/>- Menu Dropdown]
    D1 --> D1B[Right Group:<br/>- User Auth Panel<br/>- Fullscreen Button]
    
    D2 --> D2A[Game Controls:<br/>- Speed Control<br/>- Margin Control<br/>- Restart Button]
    
    E --> E1[🎯 Game Board<br/>Piano Keys + Falling Tiles]
    E --> E2[🎵 Audio Analyzer<br/>Waveform + Note Detection]
    E --> E3[👨‍💼 Admin Panel<br/>User Management]
    E --> E4[🎼 Song Manager<br/>Piano Roll Editor]
    E --> E5[📚 Music Theory<br/>Learning Content]
    
    E4 --> E4A[Song List Panel - LEFT]
    E4 --> E4B[Piano Roll Editor - CENTER]
    
    E4A --> E4A1[Song Library]
    E4A --> E4A2[Import/Export]
    E4A --> E4A3[New Song Button]
    
    E4B --> E4B1[Timeline Ruler]
    E4B --> E4B2[Piano Keys Reference]
    E4B --> E4B3[Note Grid Canvas]
    E4B --> E4B4[Playback Controls]
```

## 🎹 **Cách thức hoạt động của giao diện Pink Poong Piano**

### **1. 📱 Kiểm tra hướng màn hình (Orientation Check)**
```
Portrait Mode → Hiển thị thông báo xoay thiết bị
Landscape Mode → Kích hoạt giao diện game
```

### **2. 🎛️ Control Panel (Thanh điều khiển trên)**

**Primary Controls (Luôn hiển thị):**
- **Score Panel**: Hiển thị điểm số real-time
- **Menu Dropdown**: Chuyển đổi giữa các chế độ
  - Piano Game (🎮)
  - Audio Analyzer (🎵) 
  - Song Manager (🎼)
  - Music Theory (📚)
  - Admin Panel (👨‍💼 - chỉ admin)
- **User Auth**: Login/Logout + avatar
- **Fullscreen Button**: Chế độ toàn màn hình

**Secondary Controls (Hiển thị theo ngữ cảnh):**
- **Speed Control**: Điều chỉnh tốc độ rơi của tiles
- **Margin Control**: Điều chỉnh vùng nhận diện âm thanh
- **Restart Button**: Khởi động lại game

### **3. 📺 Luồng chuyển đổi chế độ**

```mermaid
flowchart LR
    A[Menu Selection] --> B{Mode?}
    
    B -->|Piano Game| C[🎯 Game Board]
    B -->|Audio Analyzer| D[🎵 Audio Analyzer]
    B -->|Song Manager| E[🎼 Song Manager]
    B -->|Admin Panel| F[👨‍💼 Admin Panel]
    
    C --> C1[Piano Keys Display]
    C --> C2[Falling Tiles Animation]
    C --> C3[Audio Detection Logic]
    C --> C4[Score Calculation]
    
    D --> D1[Microphone Access]
    D --> D2[Real-time Waveform]
    D --> D3[Note Detection Display]
    D --> D4[Frequency Analysis]
    
    E --> E1[Song List Panel]
    E --> E2[Piano Roll Editor]
    E1 --> E1A[Local Songs]
    E1 --> E1B[Server Songs]
    E2 --> E2A[Note Placement]
    E2 --> E2B[Timeline Control]
    E2 --> E2C[Playback Preview]
    
    F --> F1[User Management]
    F --> F2[Song Statistics]
    F --> F3[System Analytics]
```

### **4. 🎮 Game Workflow (Luồng hoạt động game)**

```mermaid
sequenceDiagram
    participant U as 👤 User
    participant I as 📱 Interface  
    participant A as 🎵 Audio Engine
    participant G as 🎮 Game Engine
    participant S as 💾 Storage
    
    U->>I: Open app in landscape
    I->>A: Initialize Web Audio API
    A->>I: Microphone access granted
    
    U->>I: Select Song Manager
    I->>S: Load saved songs
    S->>I: Return song list
    
    U->>I: Create/Edit song
    I->>I: Show piano roll editor
    U->>I: Place notes on timeline
    I->>S: Auto-save song data
    
    U->>I: Switch to Piano Game
    I->>G: Initialize game engine
    U->>I: Select song & press play
    
    loop Game Loop
        G->>I: Spawn falling tiles
        A->>I: Detect piano notes
        I->>G: Send detected notes
        G->>G: Check hit/miss
        G->>I: Update score display
        I->>U: Visual feedback + haptic
    end
    
    G->>I: Game over
    I->>S: Save high score
    I->>U: Show final score
```

### **5. 📱 Mobile UX Enhancements (Tối ưu di động)**

**Auto-collapsing Control Panel:**
- Tự động ẩn sau 5 giây khi chơi game
- Double-tap để hiển thị/ẩn
- Swipe up để mở rộng control panel

**Touch Gestures:**
- **Double-tap**: Toggle control panel
- **Swipe up**: Expand controls  
- **Swipe down**: Collapse controls
- **Long press**: Context menu (trong song editor)

**Haptic Feedback:**
- Rung nhẹ khi nhấn piano key
- Rung mạnh khi hit perfect
- Sử dụng Vibration API

**Performance Optimizations:**
- GPU acceleration cho animations
- Reduced motion support
- Auto-hide secondary controls
- 60fps target với requestAnimationFrame

### **6. 🎼 Song Manager Layout**

```mermaid
graph LR
    A[Song Manager] --> B[Song List Panel]
    A --> C[Piano Roll Editor]
    
    B --> B1[📱 Local Storage]
    B --> B2[☁️ Firebase Storage]
    B --> B3[➕ New Song]
    B --> B4[📥 Import Song]
    
    C --> C1[🎹 Piano Keys Reference]
    C --> C2[📏 Timeline Ruler]  
    C --> C3[🎵 Note Grid Canvas]
    C --> C4[🎛️ Tool Selection]
    
    C1 --> C1A[88 Piano Keys<br/>C1 to C8]
    
    C2 --> C2A[Beat Markers<br/>Bar Lines<br/>Time Signature]
    
    C3 --> C3A[✏️ Draw Notes]
    C3 --> C3B[✋ Select/Move Notes]
    C3 --> C3C[🗑️ Delete Notes]
    C3 --> C3D[📐 Resize Duration]
    
    C4 --> C4A[Select Tool]
    C4 --> C4B[Pencil Tool]
    C4 --> C4C[Eraser Tool]
    C4 --> C4D[Zoom In/Out]
```

### **7. 🎯 Key Features & Interactions**

**Real-time Audio Processing:**
- Web Audio API capture âm thanh từ microphone
- FFT analysis để detect notes (C1-C8)
- Real-time visualization với waveform display

**Cross-platform Storage:**
- **Local Storage**: Lưu songs offline
- **Firebase**: Sync songs across devices + user accounts
- **Auto-save**: Tự động lưu mỗi 2 giây trong editor

**Responsive Design:**
- **Mobile-first**: Tối ưu cho landscape gaming
- **Touch-friendly**: Large buttons, gesture support
- **Progressive Enhancement**: Works without login/internet

**Game Mechanics:**
- **Physics Engine**: Falling tiles với gravity simulation
- **Collision Detection**: Precise timing windows
- **Visual Effects**: Particle systems, glow effects
- **Scoring System**: Combo multipliers, perfect hits

### **8. 📊 Performance Metrics**

```
🎯 Target: 60 FPS animations
🔊 Audio Latency: <50ms detection
💾 Storage: Local + Cloud sync
📱 Mobile: Landscape-optimized
🎮 Responsive: <100ms touch feedback
```

### **9. 🔧 Technical Architecture**

**Frontend Stack:**
- HTML5 + CSS3 + JavaScript ES6+
- Web Audio API for real-time audio processing
- Canvas API for piano roll editor
- CSS Grid + Flexbox for responsive layout

**Backend Integration:**
- Firebase Authentication
- Firestore Database
- Local Storage fallback

**Mobile Optimizations:**
- PWA capabilities
- Touch gesture recognition
- Haptic feedback support
- Auto-orientation detection

### **10. 🎵 Audio Processing Flow**

```
Microphone Input 
    ↓
Web Audio API Capture
    ↓
FFT Analysis (Real-time)
    ↓
Frequency to Note Conversion
    ↓
Note Detection & Validation
    ↓
Game Engine Integration
    ↓
Visual Feedback + Scoring
```

---

## 💡 **Tóm tắt**

Giao diện Pink Poong Piano được thiết kế như một **Progressive Web App** với focus chính là **mobile gaming experience** kết hợp **real piano interaction**. Mọi element đều được tối ưu cho việc chơi game bằng cách đặt điện thoại trên piano thật và sử dụng âm thanh để điều khiển! 🎹✨

**Key Innovation:** Thay vì tap màn hình, người dùng chơi bằng cách bấm phím piano thật, điện thoại sẽ detect âm thanh và điều khiển game tương ứng. 