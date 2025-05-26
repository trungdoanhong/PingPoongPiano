# 🔥 Firebase Setup Guide

## Vấn đề hiện tại
User chưa đăng nhập không thể xem bài hát Firebase vì **Firestore Security Rules** không cho phép anonymous read.

## ✅ Giải pháp: Cấu hình Firestore Security Rules

### 1. Truy cập Firebase Console
1. Đi tới [Firebase Console](https://console.firebase.google.com/)
2. Chọn project **pinkpoongpiano**
3. Vào **Firestore Database** → **Rules**

### 2. Cập nhật Security Rules

**Thay thế rules hiện tại bằng:**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read access to songs for everyone (including anonymous users)
    match /songs/{songId} {
      allow read: if true;
      allow write: if request.auth != null;
      allow delete: if request.auth != null && 
        (resource.data.userId == request.auth.uid || 
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
    }
    
    // Allow read/write access to users collection for authenticated users
    match /users/{userId} {
      allow read, write: if request.auth != null;
    }
    
    // Allow read/write access to test collection for testing
    match /test/{document} {
      allow read, write: if true;
    }
  }
}
```

### 3. Giải thích Rules

- **`allow read: if true;`** - Cho phép tất cả mọi người đọc bài hát (kể cả anonymous)
- **`allow write: if request.auth != null;`** - Chỉ user đã đăng nhập mới được tạo bài hát
- **`allow delete: if ...`** - Chỉ chủ sở hữu hoặc admin mới được xóa bài hát

### 4. Test sau khi cập nhật

1. Vào `http://localhost:3000`
2. **Không đăng nhập** - Vẫn thấy bài hát Firebase với icon 🌐
3. **Đăng nhập** - Thấy bài hát với quyền chỉnh sửa tương ứng

## 🔧 Alternative: Nếu không muốn cho anonymous read

Nếu bạn không muốn cho phép anonymous read, có thể:

1. **Tạo guest account** tự động cho anonymous users
2. **Sử dụng Firebase Anonymous Authentication**
3. **Chỉ hiển thị localStorage songs** cho anonymous users

## 📝 Current Status

- ✅ Code đã sẵn sàng handle cả hai trường hợp
- ❌ Firestore rules chưa cho phép anonymous read
- 🔄 Cần cập nhật rules theo hướng dẫn trên

## 🎯 Expected Result

Sau khi cập nhật rules:
- Anonymous users: Xem được bài hát Firebase (read-only)
- Authenticated users: Full permissions theo role
- Admin: Quản lý tất cả bài hát và users 