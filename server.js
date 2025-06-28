import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import net from 'net';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Hàm kiểm tra port có sẵn không
function findAvailablePort(startPort) {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.unref();
        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                resolve(findAvailablePort(startPort + 1));
            } else {
                reject(err);
            }
        });
        server.listen(startPort, () => {
            server.close(() => {
                resolve(startPort);
            });
        });
    });
}

// Middleware để serve static files
app.use(express.static(__dirname));

// Route cho trang chủ
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Khởi động server với port tự động
findAvailablePort(3000).then(port => {
    app.listen(port, () => {
        console.log(`🎹 Pink Poong Piano Server is running on port ${port}`);
        console.log(`📱 Open http://localhost:${port} in your browser`);
        console.log(`☁️ Using Firebase for data storage`);
    });
}).catch(err => {
    console.error('Failed to start server:', err);
}); 