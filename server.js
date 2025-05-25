const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Mật khẩu server (phải khớp với client)
const SERVER_PASSWORD = 'Au123456';

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

// Hàm kiểm tra password
function validatePassword(req, res, next) {
    // Chỉ kiểm tra password cho POST, PUT, DELETE
    if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
        const password = req.body.password;
        if (!password || password !== SERVER_PASSWORD) {
            return res.status(401).json({ error: 'Unauthorized: Invalid password' });
        }
        // Xóa password khỏi request body trước khi xử lý
        delete req.body.password;
    }
    next();
}

// API Routes

// Lấy danh sách tất cả bài hát (không cần password)
app.get('/api/songs', (req, res) => {
    try {
        const songs = JSON.parse(fs.readFileSync(SONGS_FILE, 'utf8'));
        res.json(songs);
    } catch (error) {
        console.error('Error reading songs:', error);
        res.status(500).json({ error: 'Failed to read songs' });
    }
});

// Lấy thông tin một bài hát cụ thể (không cần password)
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

// Tạo bài hát mới (cần password)
app.post('/api/songs', validatePassword, (req, res) => {
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
        
        console.log(`Created new song: ${newSong.name} (ID: ${newSong.id})`);
        res.status(201).json(newSong);
    } catch (error) {
        console.error('Error creating song:', error);
        res.status(500).json({ error: 'Failed to create song' });
    }
});

// Cập nhật bài hát (cần password)
app.put('/api/songs/:id', validatePassword, (req, res) => {
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
        
        console.log(`Updated song: ${updatedSong.name} (ID: ${updatedSong.id})`);
        res.json(updatedSong);
    } catch (error) {
        console.error('Error updating song:', error);
        res.status(500).json({ error: 'Failed to update song' });
    }
});

// Xóa bài hát (cần password)
app.delete('/api/songs/:id', validatePassword, (req, res) => {
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
        
        console.log(`Deleted song: ${deletedSong.name} (ID: ${deletedSong.id})`);
        res.json(deletedSong);
    } catch (error) {
        console.error('Error deleting song:', error);
        res.status(500).json({ error: 'Failed to delete song' });
    }
});

// Route dọn dẹp dữ liệu (cần password)
app.post('/api/songs/cleanup', (req, res) => {
    try {
        // Kiểm tra password trước
        const password = req.body.password;
        if (!password || password !== SERVER_PASSWORD) {
            return res.status(401).json({ error: 'Unauthorized: Invalid password' });
        }
        
        // Lấy dữ liệu bài hát từ request
        let cleanedSongs;
        if (Array.isArray(req.body)) {
            // Nếu body là array, lấy tất cả trừ password
            cleanedSongs = req.body.filter(item => typeof item === 'object' && item.id);
        } else if (req.body.songs && Array.isArray(req.body.songs)) {
            // Nếu body có property songs
            cleanedSongs = req.body.songs;
        } else {
            return res.status(400).json({ error: 'Invalid data: expected array of songs' });
        }
        
        // Ghi đè toàn bộ dữ liệu
        fs.writeFileSync(SONGS_FILE, JSON.stringify(cleanedSongs, null, 2));
        
        console.log(`Cleaned up songs database. New count: ${cleanedSongs.length}`);
        res.json({ message: 'Database cleaned successfully', count: cleanedSongs.length });
    } catch (error) {
        console.error('Error cleaning songs:', error);
        res.status(500).json({ error: 'Failed to clean songs' });
    }
});

// Route cho trang chủ
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Khởi động server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Server password: ${SERVER_PASSWORD}`);
    console.log(`Open http://localhost:${PORT} in your browser`);
}); 