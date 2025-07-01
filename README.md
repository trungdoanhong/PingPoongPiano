# �� Pink Poong Piano

Một ứng dụng piano game web tương tác với chế độ chơi theo bài hát và song editor, được tối ưu hoá cho điện thoại di động.

## ✨ Tính năng

### 🎮 Piano Game
- Chơi piano tiles theo bài hát
- Hỗ trợ đầy đủ touch events cho mobile
- Hiệu ứng visual và âm thanh tuyệt đẹp
- Điểm số và độ chính xác
- Tối ưu hoá cho màn hình nằm ngang

### 🎵 Song Manager
- Tạo và chỉnh sửa bài hát với piano roll editor
- Import/Export bài hát định dạng JSON
- 3 bài demo có sẵn: Twinkle Twinkle Little Star, Happy Birthday, Scale Practice
- Responsive design cho mobile
- Auto-save và manual save

### 🎚️ Audio Analyzer
- Phân tích và hiển thị tần số âm thanh
- Ghi âm và phát hiện note
- Visualizer real-time

### 👑 Admin Panel
- Quản lý user và bài hát
- Thống kê hệ thống
- Chỉ dành cho admin

## 📱 Hướng dẫn sử dụng trên Mobile

### Khởi động
1. Mở ứng dụng trong trình duyệt
2. **Xoay điện thoại sang chế độ nằm ngang** để có trải nghiệm tốt nhất
3. Ứng dụng sẽ tự động tối ưu cho mobile

### Chơi Game
1. Từ màn hình chính, nhấn **"Song Manager"**
2. Chọn một trong 3 bài demo có sẵn
3. Nhấn nút **"Play"** bên cạnh tên bài hát
4. Game sẽ tự động chuyển sang chế độ chơi
5. **Chạm vào các cột piano** khi có tile rơi xuống
6. Cố gắng chạm đúng thời điểm để đạt điểm cao

### Tạo bài hát mới
1. Vào **Song Manager**
2. Nhấn **"New Song"**
3. Đặt tên bài hát và BPM
4. **Chạm vào note grid** để thêm note
5. Sử dụng toolbar để chọn tool:
   - ✏️ **Draw**: Thêm note
   - ✋ **Select**: Chọn note
   - 🗑️ **Erase**: Xóa note
6. Nhấn **▶️ Play** để nghe thử
7. Nhấn **Save** để lưu

### Controls trên Mobile
- **Menu**: Chuyển đổi giữa các chế độ
- **Speed +/-**: Điều chỉnh tốc độ game
- **Margin +/-**: Điều chỉnh lề màn hình
- **Fullscreen**: Chế độ toàn màn hình
- **Login**: Đăng nhập Google

## 🛠️ Cài đặt cho Development

### Prerequisites
- Node.js (v14 hoặc cao hơn)
- Trình duyệt web hiện đại
- Firebase project (tùy chọn)

### Chạy local
```bash
# Clone repository
git clone https://github.com/your-username/pink-poong-piano.git
cd pink-poong-piano

# Cài đặt dependencies (nếu có)
npm install

# Chạy server đơn giản
python -m http.server 8080
# hoặc
npx http-server

# Mở trình duyệt tại http://localhost:8080
```

### Firebase Setup (Tùy chọn)
1. Tạo Firebase project tại https://console.firebase.google.com
2. Enable Authentication và Firestore
3. Cập nhật `firebase-config.js` với config của bạn

## 📁 Cấu trúc Project

```
PingPoongPiano/
├── css/                    # CSS modules
│   ├── main.css           # CSS chính
│   ├── mobile.css         # Responsive mobile
│   ├── game.css           # Game styles
│   ├── song-manager.css   # Song editor styles
│   └── ...
├── js/                    # JavaScript modules
│   ├── app.js             # Main app
│   ├── game/              # Game logic
│   ├── song/              # Song manager
│   ├── ui/                # UI controls
│   ├── audio/             # Audio analyzer
│   └── utils/             # Utilities
├── index.html             # Main HTML file
├── firebase-config.js     # Firebase configuration
└── README.md
```

## 🎯 Key Features cho Mobile

### Touch Optimization
- **Enhanced touch events**: Hỗ trợ multi-touch và prevent scroll
- **Visual feedback**: Ripple effects và active states
- **Responsive layout**: Tự động điều chỉnh cho màn hình nhỏ
- **Orientation detection**: Thông báo xoay màn hình

### Performance
- **Efficient rendering**: Optimized game loop và animations
- **Memory management**: Cleanup particles và effects
- **Smooth scrolling**: Prevented where necessary
- **Audio optimization**: Resume AudioContext trên mobile

### UI/UX
- **Compact controls**: Optimized button sizes cho touch
- **Collapsible panels**: Song list có thể thu gọn
- **Safe area support**: Hỗ trợ notch devices
- **Loading states**: Proper feedback cho user

## 🚀 Deployment

### GitHub Pages
1. Fork repository này
2. Enable GitHub Pages trong Settings
3. Chọn branch `main` như source
4. Truy cập tại `https://your-username.github.io/pink-poong-piano`

### Netlify/Vercel
1. Connect GitHub repository
2. Set build command: `npm run build` (nếu có)
3. Set publish directory: `/` hoặc `/dist`
4. Deploy!

## 🐛 Troubleshooting

### Audio không phát
- Đảm bảo unmute device
- Chạm vào màn hình trước để enable AudioContext
- Kiểm tra browser permissions

### Touch không hoạt động
- Refresh trang
- Đảm bảo JavaScript enabled
- Thử trong trình duyệt khác

### Performance issues
- Close other apps để free RAM
- Thử lower device settings
- Refresh page occasionally

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Web Audio API documentation
- Firebase for backend services
- CSS Grid và Flexbox specifications
- Touch Events W3C specification

---

**Made with ❤️ for mobile piano gaming experience** 