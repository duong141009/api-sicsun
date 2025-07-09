const Fastify = require('fastify');
const WebSocket = require('ws');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Cấu hình server
const app = Fastify({ 
  logger: true,
  trustProxy: true
});

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || "DUONGGG_DEFAULT_KEY";

// Kết nối database
const db = new sqlite3.Database(path.resolve(__dirname, 'sun.sql'));

// Tạo bảng nếu chưa tồn tại
db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    sid INTEGER PRIMARY KEY,
    d1 INTEGER NOT NULL CHECK(d1 BETWEEN 1 AND 6),
    d2 INTEGER NOT NULL CHECK(d2 BETWEEN 1 AND 6),
    d3 INTEGER NOT NULL CHECK(d3 BETWEEN 1 AND 6),
    total INTEGER NOT NULL CHECK(total BETWEEN 3 AND 18),
    result TEXT NOT NULL CHECK(result IN ('Tài', 'Xỉu')),
    timestamp INTEGER NOT NULL
  )
`);

// WebSocket Sunwin
let sunwinConnection = null;
const connectedClients = new Set();

function connectToSunwin() {
  sunwinConnection = new WebSocket("wss://websocket.azhkthg1.net/websocket?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJhbW91bnQiOjB9.p56b5g73I9wyoVu4db679bOvVeFJWVjGDg_ulBXyav8");

  sunwinConnection.on('open', () => {
    console.log('🟢 Đã kết nối tới Sunwin WebSocket');
    
    // Gửi thông tin xác thực
    sunwinConnection.send(JSON.stringify([
      1,
      "MiniGame",
      "SC_trumtxlonhatvn",
      "trumtxlonhatvn",
      {
        info: "{\"ipAddress\":\"14.243.82.39\",\"userId\":\"96b15de1-7465-4bed-859a-5c965c95b61e\",\"username\":\"SC_trumtxlonhatvn\",\"timestamp\":1749292588380,\"refreshToken\":\"99ed0c6d5b234a6fae5302499dafccb0.e4c9d145b1994c98b51f41d888192cbc\"}",
        signature: "4247BBEA81ADD441E782834AAD73A36B10549697FDC2605F7D378425D66D1DD1B9B301B60FEEB490C4B172114400864B7CF2E86D9DDC1E99299A510DEB73A51653E3E5B92B1D8535613EDE3925D5509273D9239BA384EC914D491E974EAA7D643895EE14A9F4708B38D55461AB9B31AB0FFCD53858D69EB1C368F07DEA315BCA"
      }
    ]));
  });

  sunwinConnection.on('message', async (data) => {
    try {
      const json = JSON.parse(data);
      if (!Array.isArray(json) || !json[1]?.htr) return;

      const results = json[1].htr.sort((a, b) => a.sid - b.sid);

      for (const { sid, d1, d2, d3 } of results) {
        // Validate dữ liệu
        if (![d1, d2, d3].every(die => die >= 1 && die <= 6)) continue;
        
        const total = d1 + d2 + d3;
        if (total < 3 || total > 18) continue;

        // Kiểm tra phiên đã tồn tại chưa
        const exists = await new Promise(resolve => {
          db.get("SELECT 1 FROM sessions WHERE sid = ?", [sid], (err, row) => {
            resolve(!!row);
          });
        });

        if (!exists) {
          const result = total <= 10 ? "Xỉu" : "Tài";
          const timestamp = Date.now();

          await new Promise(resolve => {
            db.run(
              "INSERT INTO sessions VALUES (?, ?, ?, ?, ?, ?, ?)",
              [sid, d1, d2, d3, total, result, timestamp],
              resolve
            );
          });

          console.log(`📌 Đã lưu phiên ${sid}: ${result} (${d1},${d2},${d3})`);

          // Gửi tới tất cả clients đang kết nối
          const response = {
            phien_truoc: sid - 1,
            ket_qua: result,
            Dice: [d1, d2, d3],
            phien_hien_tai: sid,
            ngay: new Date(timestamp).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }),
            Id: "@duonggg1410"
          };

          connectedClients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify(response));
            }
          });
        }
      }
    } catch (error) {
      console.error('❌ Lỗi xử lý dữ liệu:', error);
    }
  });

  sunwinConnection.on('close', () => {
    console.log('🔴 Mất kết nối Sunwin. Đang thử kết nối lại sau 5s...');
    setTimeout(connectToSunwin, 5000);
  });

  sunwinConnection.on('error', (error) => {
    console.error('💥 Lỗi WebSocket:', error.message);
  });
}

// Đăng ký WebSocket plugin
app.register(require('@fastify/websocket'));

// Route chính
app.get('/', (request, reply) => {
  return {
    status: 'SERVER TÀI XỈU SUNWIN',
    message: 'Server đang hoạt động bình thường',
    endpoints: {
      api: `/api/sunwin?key=${API_KEY}`,
      websocket: `/api/taixiu/ws?key=${API_KEY}`,
      history: `/api/history?key=${API_KEY}`
    },
    timestamp: new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
    uptime: process.uptime().toFixed(2) + ' giây'
  };
});

// API lấy kết quả hiện tại
app.get('/api/sunwin', async (request, reply) => {
  if (request.query.key !== API_KEY) {
    return reply.code(403).send({ error: 'Sai key truy cập' });
  }

  const result = await new Promise(resolve => {
    db.get("SELECT * FROM sessions ORDER BY sid DESC LIMIT 1", (err, row) => {
      if (err) {
        console.error('Lỗi truy vấn DB:', err);
        resolve(null);
      } else {
        resolve(row);
      }
    });
  });

  if (!result) {
    return reply.code(404).send({ error: 'Chưa có dữ liệu' });
  }

  return {
    phien_truoc: result.sid - 1,
    ket_qua: result.result,
    Dice: [result.d1, result.d2, result.d3],
    phien_hien_tai: result.sid,
    ngay: new Date(result.timestamp).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }),
    Id: "@duonggg1410"
  };
});

// WebSocket endpoint cho client
app.get('/api/taixiu/ws', { websocket: true }, (connection, request) => {
  if (request.query.key !== API_KEY) {
    connection.socket.close();
    return;
  }

  connectedClients.add(connection.socket);
  console.log(`👤 Client kết nối (Tổng: ${connectedClients.size})`);

  // Gửi ngay kết quả gần nhất khi client kết nối
  db.get("SELECT * FROM sessions ORDER BY sid DESC LIMIT 1", (err, row) => {
    if (row) {
      connection.socket.send(JSON.stringify({
        phien_truoc: row.sid - 1,
        ket_qua: row.result,
        Dice: [row.d1, row.d2, row.d3],
        phien_hien_tai: row.sid,
        ngay: new Date(row.timestamp).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }),
        Id: "@duonggg1410"
      }));
    }
  });

  connection.socket.on('close', () => {
    connectedClients.delete(connection.socket);
    console.log(`👤 Client ngắt kết nối (Còn lại: ${connectedClients.size})`);
  });
});

// Khởi động server
app.listen({ port: PORT, host: '0.0.0.0' }, (err) => {
  if (err) {
    console.error('❌ Không thể khởi động server:', err);
    process.exit(1);
  }
  console.log(`🚀 Server đang chạy tại: http://localhost:${PORT}`);
  connectToSunwin(); // Bắt đầu kết nối tới Sunwin
});

// Xử lý tắt server
process.on('SIGINT', () => {
  console.log('🛑 Đang dừng server...');
  
  if (sunwinConnection) sunwinConnection.close();
  
  connectedClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.close();
    }
  });
  
  db.close();
  
  app.close(() => {
    console.log('✅ Server đã dừng');
    process.exit(0);
  });
});