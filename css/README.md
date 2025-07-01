# 🎨 CSS Architecture - Pink Poong Piano

Cấu trúc CSS đã được refactor thành các module riêng biệt để dễ quản lý và bảo trì.

## 📁 Cấu trúc CSS Modules

```
css/
├── main.css           # File chính import tất cả modules
├── base.css           # Reset, typography, basic styles
├── layout.css         # Layout chính, containers
├── game.css           # Piano tiles game styles
├── controls.css       # Control panel và UI controls
├── user-auth.css      # Authentication styles
├── song-manager.css   # Song editor và piano roll
├── audio-analyzer.css # Audio visualization
├── admin.css          # Admin panel styles
├── mobile.css         # Responsive design
└── README.md          # Tài liệu này
```

## 🧩 Chi tiết từng Module

### 1. **base.css** - Nền tảng
- CSS Reset (`*` selector)
- Typography (Poppins font)
- Body và background styles
- Basic button styles
- Orientation message

### 2. **layout.css** - Bố cục
- Game container chính
- Layout cho các modes khác nhau
- Start screen và game over
- Mode switching logic

### 3. **game.css** - Game Piano Tiles
- Game board và columns
- Piano keys (white/black)
- Falling tiles animations
- Visual effects (ripples, particles, flashes)
- Hit/miss animations

### 4. **controls.css** - Điều khiển UI
- Control panel layout
- Menu dropdown
- Speed/margin controls
- Fullscreen button
- Restart controls

### 5. **user-auth.css** - Xác thực
- User panel
- Login/logout buttons
- User info display
- Role badges
- Save mode selection

### 6. **song-manager.css** - Quản lý bài hát
- Song list container
- Piano roll editor
- Grid notes và piano keys
- Playback controls
- Duration buttons
- Drag & drop styles

### 7. **audio-analyzer.css** - Phân tích âm thanh
- Audio controls
- Waveform canvas
- Note detection display
- Recording buttons

### 8. **admin.css** - Quản trị
- Admin panel layout
- User management
- Song management
- Statistics cards
- Role management

### 9. **mobile.css** - Responsive
- Mobile landscape optimizations
- Portrait orientation handling
- Touch-friendly controls
- Small screen adjustments
- Tablet optimizations

## 🔄 Migration từ styles.css

### Trước (1 file lớn):
```css
/* styles.css - 3546 dòng */
* { margin: 0; padding: 0; }
.control-panel { ... }
.game-board { ... }
.song-manager { ... }
/* ... 3500+ dòng khác */
```

### Sau (9 modules):
```css
/* css/main.css */
@import url('base.css');
@import url('layout.css');
@import url('game.css');
/* ... */
```

## ✅ Lợi ích

1. **Dễ quản lý**: Mỗi module có trách nhiệm riêng
2. **Dễ debug**: Tìm CSS theo tính năng
3. **Dễ maintain**: Sửa một module không ảnh hưởng khác
4. **Tái sử dụng**: Có thể import riêng lẻ nếu cần
5. **Performance**: Browser cache tốt hơn
6. **Collaboration**: Team có thể làm việc song song

## 🚀 Sử dụng

### Import trong HTML:
```html
<link rel="stylesheet" href="css/main.css?v=2024">
```

### Import riêng lẻ (nếu cần):
```html
<link rel="stylesheet" href="css/base.css">
<link rel="stylesheet" href="css/game.css">
```

### Thêm module mới:
1. Tạo file `css/new-feature.css`
2. Thêm vào `css/main.css`: `@import url('new-feature.css');`

## 🔧 Development Guidelines

### Khi sửa CSS:
1. **Xác định module**: CSS thuộc về tính năng nào?
2. **Sửa đúng file**: Không sửa `main.css` trừ khi add module mới
3. **Test thoroughly**: Kiểm tra trên mobile và desktop
4. **Keep organized**: Giữ CSS trong từng module gọn gàng

### Quy tắc đặt tên:
- **BEM methodology**: `.block__element--modifier`
- **Semantic names**: `.song-editor` thay vì `.blue-box`
- **Consistent prefixes**: `#admin-panel`, `.admin-content`

## 📱 Responsive Strategy

CSS mobile được tách riêng trong `mobile.css` với:
- Mobile-first approach
- Breakpoints rõ ràng
- Touch-friendly controls
- Optimized cho landscape gaming

## 🎯 Performance

- **File size**: 9 files nhỏ thay vì 1 file lớn
- **Caching**: Browser cache từng module riêng
- **Loading**: Parallel download
- **Maintenance**: Chỉ reload module cần thiết

---

**💡 Tip**: Khi debug CSS, sử dụng DevTools để xem CSS từ file nào đang áp dụng! 