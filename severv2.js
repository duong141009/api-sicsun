const Fastify = require("fastify");
const WebSocket = require("ws");
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const fastifyWebsocket = require('@fastify/websocket');

const fastify = Fastify({ logger: true });
const PORT = process.env.PORT || 3000;
const API_KEY = "DUONGGG";

// --- Cấu hình Database ---
const dbPath = path.resolve(__dirname, 'sun.sql');
const db = new sqlite3.Database(dbPath);
db.run(`CREATE TABLE IF NOT EXISTS sessions (
  sid INTEGER PRIMARY KEY,
  d1 INTEGER NOT NULL,
  d2 INTEGER NOT NULL,
  d3 INTEGER NOT NULL,
  total INTEGER NOT NULL,
  result TEXT NOT NULL,
  timestamp INTEGER NOT NULL
)`);

// --- WebSocket Sunwin ---
let ws = null;
let reconnectTimer = null;
let callInterval = null;
const connectedClients = new Set();

function sendCmd1005() {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify([6, "MiniGame", "taixiuPlugin", { cmd: 1005 }]));
  }
}

function connectSunwinWS() {
  // Clear reconnect timer nếu có
  if (reconnectTimer) clearTimeout(reconnectTimer);
  
  ws = new WebSocket("wss://websocket.azhkthg1.net/websocket?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJhbW91bnQiOjB9.p56b5g73I9wyoVu4db679bOvVeFJWVjGDg_ulBXyav8");

  ws.on("open", () => {
    console.log("✅ Đã kết nối WebSocket Sunwin");
    
    // Gửi payload xác thực
    ws.send(JSON.stringify([
      1,
      "MiniGame",
      "SC_trumtxlonhatvn",
      "trumtxlonhatvn",
      {
        info: "{\"ipAddress\":\"14.243.82.39\",\"userId\":\"96b15de1-7465-4bed-859a-5c965c95b61e\",\"username\":\"SC_trumtxlonhatvn\",\"timestamp\":1749292588380,\"refreshToken\":\"99ed0c6d5b234a6fae5302499dafccb0.e4c9d145b1994c98b51f41d888192cbc\"}",
        signature: "4247BBEA81ADD441E782834AAD73A36B10549697FDC2605F7D378425D66D1DD1B9B301B60FEEB490C4B172114400864B7CF2E86D9DDC1E99299A510DEB73A51653E3E5B92B1D8535613EDE3925D5509273D9239BA384EC914D491E974EAA7D643895EE14A9F4708B38D55461AB9B31AB0FFCD53858D69EB1C368F07DEA315BCA"
      }
    ]));

    // Bắt đầu gọi định kỳ mỗi 2s
    if (callInterval) clearInterval(callInterval);
    callInterval = setInterval(sendCmd1005, 2000);
  });

  ws.on("message", async (data) => {
    try {
      const json = JSON.parse(data);
      if (Array.isArray(json) && json[1]?.htr) {
        const results = json[1].htr.sort((a, b) => a.sid - b.sid);
        
        for (const item of results) {
          // Validate dữ liệu
          if (![item.d1, item.d2, item.d3].every(d => d >= 1 && d <= 6)) continue;
          
          const total = item.d1 + item.d2 + item.d3;
          if (total < 3 || total > 18) continue;

          // Kiểm tra nếu phiên chưa tồn tại
          const exists = await new Promise(resolve => {
            db.get("SELECT sid FROM sessions WHERE sid = ?", [item.sid], (err, row) => {
              resolve(!!row);
            });
          });

          if (!exists) {
            const result = total <= 10 ? "Xỉu" : "Tài";
            const timestamp = Date.now();

            await new Promise(resolve => {
              db.run(
                "INSERT INTO sessions VALUES (?, ?, ?, ?, ?, ?, ?)",
                [item.sid, item.d1, item.d2, item.d3, total, result, timestamp],
                resolve
              );
            });

            console.log(`➡️ Đã lưu phiên ${item.sid}: ${result}`);

            // Broadcast tới các clients
            const response = {
              phien_truoc: item.sid - 1,
              ket_qua: result,
              Dice: [item.d1, item.d2, item.d3],
              phien_hien_tai: item.sid,
              ngay: new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }),
              Id: "@duonggg1410"
            };

            connectedClients.forEach(client => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(response));
              }
            });
          }
        }
      }
    } catch (err) {
      console.error("❌ Lỗi xử lý message:", err);
    }
  });

  ws.on("close", () => {
    console.log("🔴 Mất kết nối WebSocket. Sẽ kết nối lại sau 5s...");
    if (callInterval) clearInterval(callInterval);
    reconnectTimer = setTimeout(connectSunwinWS, 5000);
  });

  ws.on("error", (err) => {
    console.error("❌ WebSocket error:", err.message);
    ws.close();
  });
}

// --- API Endpoints ---
fastify.register(fastifyWebsocket);

// WebSocket API cho clients
fastify.get('/api/sunwin/taixiu/ws', { websocket: true }, (connection, req) => {
  if (req.query.key !== API_KEY) {
    connection.socket.close();
    return;
  }

  connectedClients.add(connection.socket);
  console.log(`👋 Client connected (${connectedClients.size} total)`);

  // Gửi phiên gần nhất ngay khi kết nối
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
    console.log(`👋 Client disconnected (${connectedClients.size} remaining)`);
  });
});

// API lấy phiên hiện tại
fastify.get('/api/sunwin', async (req, reply) => {
  if (req.query.key !== API_KEY) return reply.code(403).send({ error: "Invalid key" });

  const row = await new Promise(resolve => {
    db.get("SELECT * FROM sessions ORDER BY sid DESC LIMIT 1", (err, row) => resolve(row));
  });

  if (!row) return reply.send({ error: "No data" });

  reply.send({
    phien_truoc: row.sid - 1,
    ket_qua: row.result,
    Dice: [row.d1, row.d2, row.d3],
    phien_hien_tai: row.sid,
    ngay: new Date(row.timestamp).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }),
    Id: "@duonggg1410"
  });
});

// Khởi động
fastify.listen({ port: PORT, host: '0.0.0.0' }, (err) => {
  if (err) {
    console.error("❌ Lỗi khởi động server:", err);
    process.exit(1);
  }
  console.log(`🚀 Server chạy tại http://localhost:${PORT}`);
  connectSunwinWS(); // Bắt đầu kết nối WS
});