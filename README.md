# 🎹 Pink Poong Piano

A modern Piano Tiles game with Firebase integration, featuring real-time music creation, user authentication, and cloud storage.

## ✨ Features

### 🎮 Game Features
- **Piano Tiles Gameplay**: Classic falling tiles rhythm game
- **Real-time Audio**: Microphone input for pitch detection
- **Visual Effects**: Particles, ripples, and smooth animations
- **Responsive Design**: Works on desktop and mobile devices

### 🎵 Music Creation
- **Song Editor**: Create custom songs with visual note grid
- **Real-time Preview**: Test songs while editing
- **Import/Export**: Share songs as JSON files
- **Multiple Note Durations**: Support for various note lengths

### ☁️ Firebase Integration
- **Google Authentication**: Secure user login
- **Cloud Storage**: Save songs to Firebase Firestore
- **Role-based Permissions**: Admin, Moderator, and User roles
- **Real-time Sync**: Automatic data synchronization

### 👥 User Management
- **Admin Panel**: Manage users and songs (admin only)
- **Storage Indicators**: Visual indicators for local vs cloud songs
- **Filter System**: Filter songs by storage type
- **Statistics**: View storage usage statistics

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- Firebase project with Firestore enabled

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd PingPongPiano
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Firebase**
   - Update `firebase-config.js` with your Firebase project credentials
   - Set up Firestore security rules (see below)

4. **Start the server**
   ```bash
   npm start
   ```

5. **Open in browser**
   ```
   http://localhost:3000
   ```

## 🔧 Firebase Setup

### Firestore Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow read: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'moderator'];
    }
    
    // Songs collection
    match /songs/{songId} {
      allow read: if request.auth != null;
      allow create, update: if request.auth != null && 
        (request.auth.uid == resource.data.userId || 
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'moderator']);
      allow delete: if request.auth != null && 
        (request.auth.uid == resource.data.userId || 
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
    }
  }
}
```

### Admin Setup
1. Sign in with your Google account
2. Manually set your role to 'admin' in Firestore users collection
3. Or use the "Force Admin" button for testing

## 🎯 User Roles

- **👑 Admin**: Full access to all features, user management, delete any songs
- **🛡️ Moderator**: Can save to Firebase, manage own songs
- **👤 User**: Local storage only, can play all songs

## 📱 Usage

### Playing Songs
1. Select a song from the list
2. Click "Play" to start the game
3. Tap falling tiles in rhythm with the music

### Creating Songs
1. Click "New Song" in Song Manager
2. Use the visual editor to place notes
3. Test with "Play" button
4. Save locally or to Firebase (with permissions)

### Storage Types
- **☁️ Firebase**: Songs saved to cloud (admin/moderator)
- **💾 Local**: Songs saved to browser storage
- **⚠️ Unsaved**: Temporary songs not yet saved

## 🛠️ Development

### Project Structure
```
├── index.html          # Main game interface
├── script.js           # Game logic and Firebase integration
├── styles.css          # Styling and animations
├── firebase-config.js  # Firebase configuration
├── server.js           # Static file server
└── package.json        # Dependencies
```

### Key Components
- **Game Engine**: Piano tiles gameplay logic
- **Song Manager**: CRUD operations for songs
- **Firebase Integration**: Authentication and data storage
- **Audio System**: Microphone input and note detection
- **Admin Panel**: User and song management

## 🔄 Migration from REST API

This version has been migrated from a REST API backend to Firebase:
- ✅ Removed local file storage
- ✅ Implemented Firebase Firestore
- ✅ Added Google Authentication
- ✅ Role-based access control
- ✅ Real-time data synchronization

## 📝 License

MIT License - feel free to use and modify!

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

**🎵 Enjoy creating and playing music with Pink Poong Piano! 🎵** 