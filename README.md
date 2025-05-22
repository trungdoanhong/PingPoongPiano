# Piano Tiles Game

Ứng dụng Piano Tiles với trình soạn nhạc và khả năng lưu trữ bài hát trên server.

## Tính năng

- Chơi game Piano Tiles với bài hát "Happy Birthday" mặc định
- Phân tích âm thanh từ microphone
- Quản lý và soạn nhạc với các chức năng:
  - Tạo bài hát mới
  - Chỉnh sửa bài hát
  - Lưu bài hát
  - Xuất/nhập bài hát
  - Xóa bài hát
  - Phát thử bài hát

## Cài đặt

### Yêu cầu

- Node.js (v14 trở lên)
- npm hoặc yarn

### Cài đặt dependencies

```bash
npm install
# hoặc
yarn install
```

### Khởi động server

```bash
npm start
# hoặc
yarn start
```

Sau khi khởi động, mở trình duyệt và truy cập: http://localhost:3000

## Sử dụng

### Chế độ Piano Game

- Nhấp vào các ô đen khi chúng xuất hiện
- Điều chỉnh tốc độ và lề của game bằng các nút điều khiển

### Chế độ Audio Analyzer

- Nhấp vào "Start Recording" để bắt đầu phân tích âm thanh
- Nhấp vào "Stop Recording" để dừng phân tích

### Chế độ Song Manager

- Nhấp vào "New Song" để tạo bài hát mới
- Nhấp vào lưới để thêm nốt nhạc
- Chọn độ dài nốt từ các nút bên dưới
- Xóa nốt bằng cách nhấn Ctrl+Click vào nốt
- Lưu bài hát và phát thử
- Nhấp vào "Play" để chơi bài hát trong game

## Lưu trữ

Ứng dụng sử dụng server Node.js để lưu trữ bài hát, nếu server không khả dụng sẽ tự động chuyển sang sử dụng localStorage của trình duyệt.

## Phát triển

Để chạy ở chế độ phát triển với nodemon:

```bash
npm run dev
# hoặc
yarn dev
``` 