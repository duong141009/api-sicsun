const Fastify = require("fastify");
const WebSocket = require("ws");
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fastifyWebsocket = require('@fastify/websocket');

const fastify = Fastify({ logger: true });
const PORT = process.env.PORT || 3000;
fastify.register(fastifyWebsocket);

const API_KEY = "DUONGGG";

// Middleware xác thực key (giữ nguyên nếu cần)
fastify.addHook("onRequest", async (request, reply) => {
  if (request.url.startsWith("/api/history")) {
    const urlKey = request.query.key;
    if (!urlKey || urlKey !== API_KEY) {
      return reply.code(403).send({ error: "Sai key truy cập" });
    }
  }
});

// DB setup
const dbPath = path.resolve(__dirname, 'sun.sql');
const db = new sqlite3.Database(dbPath, (err) => {
  if (!err) {
    db.run(`
      CREATE TABLE IF NOT EXISTS sessions (
        sid INTEGER PRIMARY KEY,
        d1 INTEGER NOT NULL,
        d2 INTEGER NOT NULL,
        d3 INTEGER NOT NULL,
        total INTEGER NOT NULL,
        result TEXT NOT NULL,
        timestamp INTEGER NOT NULL
      )
    `);
  }
});

// Kết nối WebSocket
let ws = null;
function sendCmd1005() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    const payload = [6, "MiniGame", "taixiuPlugin", { cmd: 1005 }];
    ws.send(JSON.stringify(payload));
  }
}

function connectWebSocket() {
  ws = new WebSocket("wss://s68.b68cdn.com/socket.io/?EIO=3&transport=websocket");

  ws.on("open", () => {
    console.log("🟢 Đã kết nối WebSocket Sunwin.");
    sendCmd1005();
    setInterval(sendCmd1005, 2000);
  });

  ws.on("message", async (data) => {
    try {
      const json = JSON.parse(data);
      if (Array.isArray(json) && json[1]?.htr) {
        const results = json[1].htr.sort((a, b) => a.sid - b.sid);
        for (const item of results) {
          const row = await new Promise((resolve) => {
            db.get(`SELECT sid FROM sessions WHERE sid = ?`, [item.sid], (err, row) => {
              resolve(row);
            });
          });

          if (!row) {
            db.run(`INSERT INTO sessions (sid, d1, d2, d3, total, result, timestamp)
                    VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [item.sid, item.d1, item.d2, item.d3, item.total, item.total > 10 ? "Tài" : "Xỉu", Date.now()]
            );
            console.log(`+ Phiên ${item.sid} đã ghi.`);
          }
        }
      }
    } catch (e) {
      console.error("Lỗi xử lý WebSocket:", e.message);
    }
  });

  ws.on("close", () => {
    console.warn("🔁 WebSocket ngắt. Thử kết nối lại...");
    setTimeout(connectWebSocket, 1500);
  });
}

connectWebSocket();

// API trả dữ liệu phiên gần nhất
fastify.get("/api/history", async (req, reply) => {
  db.all(`SELECT * FROM sessions ORDER BY sid DESC LIMIT 100`, (err, rows) => {
    if (err) return reply.send({ error: "DB lỗi" });
    reply.send(rows);
  });
});

// Route mặc định
fastify.get("/", async () => ({
  status: "Server OK",
  time: new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
}));

// Khởi chạy server
fastify.listen({ port: PORT, host: "0.0.0.0" }, () => {
  console.log(`🚀 Server chạy tại cổng ${PORT}`);
});