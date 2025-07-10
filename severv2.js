const Fastify = require("fastify");
const WebSocket = require("ws");
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const app = Fastify({ logger: false });
app.register(require('@fastify/cors'));

const API_KEY = "DUONGGG";
const dbPath = path.resolve(__dirname, 'sun.sql');
let ws = null;
let intervalCmd = null;
let latestSession = null;

// Middleware API key
app.addHook("onRequest", async (request, reply) => {
  if (request.url.startsWith("/api")) {
    const urlKey = request.query.key;
    if (!urlKey || urlKey !== API_KEY) {
      return reply.code(403).send({ error: "Key sai mẹ rồi, liên hệ tele: @duonggg1410" });
    }
  }
});

// Init DB
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error("Lỗi DB:", err.message);
  else {
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
    console.log("DB sẵn sàng.");
  }
});

// Endpoint trả lịch sử
app.get('/api/history-json', async (request, reply) => {
  db.all(`SELECT sid, d1, d2, d3, total, result, timestamp FROM sessions ORDER BY sid DESC LIMIT 50`, (err, rows) => {
    if (err) {
      reply.code(500).send({ error: "Lỗi truy vấn DB" });
    } else {
      reply.send(rows.map(row => ({
        phien: row.sid,
        ket_qua: row.result,
        xuc_xac: [row.d1, row.d2, row.d3],
        tong: row.total,
        thoi_gian: new Date(row.timestamp).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }),
        id: "@duonggg1410"
      })));
    }
  });
});

// Endpoint trả phiên hiện tại
app.get('/api/game', async (request, reply) => {
  if (!latestSession) {
    return reply.send({ message: "Chưa có dữ liệu phiên nào" });
  }
  const row = latestSession;
  reply.send({
    phien: row.sid,
    ket_qua: row.result,
    xuc_xac: [row.d1, row.d2, row.d3],
    tong: row.total,
    thoi_gian: new Date(row.timestamp).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }),
    id: "@duonggg1410"
  });
});

// Route mặc định
app.get("/", async (request, reply) => {
  reply.send({ status: "✅ Sunwin server đang chạy ngon lành!" });
});

function sendCmd1005() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    const payload = [6, "MiniGame", "taixiuPlugin", { cmd: 1005 }];
    ws.send(JSON.stringify(payload));
  }
}

function connectWebSocket() {
  ws = new WebSocket("wss://websocket.azhkthg1.net/websocket?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJhbW91bnQiOjB9.p56b5g73I9wyoVu4db679bOvVeFJWVjGDg_ulBXyav8");

  ws.on("open", () => {
    console.log("Đã kết nối WebSocket đến Sunwin");

    const authPayload = [
      1,
      "MiniGame",
      "SC_trumtxlonhatvn",
      "trumtxlonhatvn",
      {
        info: "{\"ipAddress\":\"14.243.82.39\",\"userId\":\"96b15de1-7465-4bed-859a-5c965c95b61e\",\"username\":\"SC_trumtxlonhatvn\",\"timestamp\":1749292588380,\"refreshToken\":\"99ed0c6d5b234a6fae5302499dafccb0.e4c9d145b1994c98b51f41d888192cbc\"}",
        signature: "4247BBEA81ADD441E782834AAD73A36B10549697FDC2605F7D378425D66D1DD1B9B301B60FEEB490C4B172114400864B7CF2E86D9DDC1E99299A510DEB73A51653E3E5B92B1D8535613EDE3925D5509273D9239BA384EC914D491E974EAA7D643895EE14A9F4708B38D55461AB9B31AB0FFCD53858D69EB1C368F07DEA315BCA"
      }
    ];

    ws.send(JSON.stringify(authPayload));
    clearInterval(intervalCmd);
    intervalCmd = setInterval(sendCmd1005, 2000);
  });

  ws.on("message", async (data) => {
    try {
      const json = JSON.parse(data);
      if (Array.isArray(json) && json[1]?.htr) {
        const incomingResults = json[1].htr.sort((a, b) => a.sid - b.sid);

        for (const item of incomingResults) {
          if ([item.d1, item.d2, item.d3].some(v => v < 1 || v > 6)) continue;
          const total = item.d1 + item.d2 + item.d3;
          const result = (total >= 3 && total <= 10) ? "Xỉu" : "Tài";
          const timestamp = Date.now();

          latestSession = {
            sid: item.sid,
            d1: item.d1,
            d2: item.d2,
            d3: item.d3,
            total,
            result,
            timestamp
          };

          db.get("SELECT sid FROM sessions WHERE sid = ?", [item.sid], (err, row) => {
            if (!row) {
              db.run(
                `INSERT INTO sessions (sid, d1, d2, d3, total, result, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [item.sid, item.d1, item.d2, item.d3, total, result, timestamp],
                (err) => {
                  if (!err) console.log(`Đã lưu phiên ${item.sid}`);
                }
              );
            }
          });
        }
      }
    } catch (e) {
      console.error("Lỗi parse WS:", e);
    }
  });

  ws.on("close", () => {
    console.warn("WS đóng, thử lại sau...");
    clearInterval(intervalCmd);
    setTimeout(connectWebSocket, 3000);
  });

  ws.on("error", (err) => {
    console.error("Lỗi WS:", err.message);
    ws.close();
  });
}

connectWebSocket();

const PORT = process.env.PORT || 3000;
app.listen({ port: PORT, host: "0.0.0.0" }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Server đang chạy tại: ${address}`);
});
