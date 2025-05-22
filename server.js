const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Đường dẫn tới thư mục lưu trữ bài hát
const SONGS_DIR = path.join(__dirname, 'data');
const SONGS_FILE = path.join(SONGS_DIR, 'songs.json');

// Tạo thư mục data nếu chưa tồn tại
if (!fs.existsSync(SONGS_DIR)) {
    fs.mkdirSync(SONGS_DIR, { recursive: true });
}

// Tạo file songs.json nếu chưa tồn tại
if (!fs.existsSync(SONGS_FILE)) {
    fs.writeFileSync(SONGS_FILE, JSON.stringify([]));
}

// Middleware
app.use(cors()); // Cho phép cross-origin requests
app.use(bodyParser.json()); // Parse JSON request body
app.use(express.static(__dirname)); // Serve static files

// API Routes

// Lấy danh sách tất cả bài hát
app.get('/api/songs', (req, res) => {
    try {
        const songs = JSON.parse(fs.readFileSync(SONGS_FILE, 'utf8'));
        res.json(songs);
    } catch (error) {
        console.error('Error reading songs:', error);
        res.status(500).json({ error: 'Failed to read songs' });
    }
});

// Lấy thông tin một bài hát cụ thể
app.get('/api/songs/:id', (req, res) => {
    try {
        const songs = JSON.parse(fs.readFileSync(SONGS_FILE, 'utf8'));
        const song = songs.find(s => s.id === req.params.id);
        
        if (!song) {
            return res.status(404).json({ error: 'Song not found' });
        }
        
        res.json(song);
    } catch (error) {
        console.error('Error reading song:', error);
        res.status(500).json({ error: 'Failed to read song' });
    }
});

// Tạo bài hát mới
app.post('/api/songs', (req, res) => {
    try {
        const songs = JSON.parse(fs.readFileSync(SONGS_FILE, 'utf8'));
        const newSong = req.body;
        
        // Thêm id nếu chưa có
        if (!newSong.id) {
            newSong.id = 'song_' + Date.now();
        }
        
        // Kiểm tra tính hợp lệ của bài hát
        if (!newSong.name || !Array.isArray(newSong.notes)) {
            return res.status(400).json({ error: 'Invalid song data' });
        }
        
        // Thêm bài hát mới vào danh sách
        songs.push(newSong);
        
        // Lưu lại danh sách bài hát
        fs.writeFileSync(SONGS_FILE, JSON.stringify(songs, null, 2));
        
        res.status(201).json(newSong);
    } catch (error) {
        console.error('Error creating song:', error);
        res.status(500).json({ error: 'Failed to create song' });
    }
});

// Cập nhật bài hát
app.put('/api/songs/:id', (req, res) => {
    try {
        const songs = JSON.parse(fs.readFileSync(SONGS_FILE, 'utf8'));
        const songIndex = songs.findIndex(s => s.id === req.params.id);
        
        if (songIndex === -1) {
            return res.status(404).json({ error: 'Song not found' });
        }
        
        const updatedSong = req.body;
        updatedSong.id = req.params.id; // Đảm bảo id không thay đổi
        
        // Kiểm tra tính hợp lệ của bài hát
        if (!updatedSong.name || !Array.isArray(updatedSong.notes)) {
            return res.status(400).json({ error: 'Invalid song data' });
        }
        
        // Cập nhật bài hát
        songs[songIndex] = updatedSong;
        
        // Lưu lại danh sách bài hát
        fs.writeFileSync(SONGS_FILE, JSON.stringify(songs, null, 2));
        
        res.json(updatedSong);
    } catch (error) {
        console.error('Error updating song:', error);
        res.status(500).json({ error: 'Failed to update song' });
    }
});

// Xóa bài hát
app.delete('/api/songs/:id', (req, res) => {
    try {
        const songs = JSON.parse(fs.readFileSync(SONGS_FILE, 'utf8'));
        const songIndex = songs.findIndex(s => s.id === req.params.id);
        
        if (songIndex === -1) {
            return res.status(404).json({ error: 'Song not found' });
        }
        
        // Xóa bài hát
        const deletedSong = songs.splice(songIndex, 1)[0];
        
        // Lưu lại danh sách bài hát
        fs.writeFileSync(SONGS_FILE, JSON.stringify(songs, null, 2));
        
        res.json(deletedSong);
    } catch (error) {
        console.error('Error deleting song:', error);
        res.status(500).json({ error: 'Failed to delete song' });
    }
});

// Route cho trang chủ
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Khởi động server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser`);
}); 