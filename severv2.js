const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors()); 
const Fastify = require("fastify");
const WebSocket = require("ws");
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const fastifyWebsocket = require('@fastify/websocket'); // Import the WebSocket plugin

const fastify = Fastify({ logger: true }); // Enable logger for better debugging
const PORT = process.env.PORT || 3000;

// Register the WebSocket plugin
fastify.register(fastifyWebsocket);

// --- Cấu hình API Key và Auth cho WebSocket ---
const API_KEY = "DUONGGG"; // Thay đổi key này bằng key của bạn

// Middleware for HTTP API (still keeping it for now, can be removed)
fastify.addHook("onRequest", async (request, reply) => {
  if (request.url.startsWith("/api/sunwin") || request.url.startsWith("/api/history-json")) {
    const urlKey = request.query.key;
    if (!urlKey || urlKey !== API_KEY) {
      return reply.code(403).send({ error: "Key sai mẹ rồi, liên hệ tele: @duonggg1410" });
    }
  }
});

// For WebSocket authentication
const authenticateWebSocket = (id, key) => {
  return key === API_KEY; // Simple key check
};

// --- Kết thúc cấu hình API Key ---

let ws = null; // For connecting to the external Sunwin WebSocket
let reconnectInterval = 1500;
let intervalCmd = null;

// --- Khởi tạo cơ sở dữ liệu ---
const dbPath = path.resolve(__dirname, 'sun.sql');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Lỗi kết nối cơ sở dữ liệu:", err.message);
  } else {
    console.log("Đã kết nối cơ sở dữ liệu SQLite.");
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
    `, (err) => {
      if (err) {
        console.error("Lỗi tạo bảng 'sessions':", err.message);
      } else {
        console.log("Bảng 'sessions' đã sẵn sàng.");
      }
    });
  }
});

// --- Cấu hình file log cầu ---
const cauLogFilePath = path.resolve(__dirname, 'cauapisun_log.jsonl');
const logicPerformanceFilePath = path.resolve(__dirname, 'logic_performance.json');


async function loadLogicPerformance() {
  try {
    const data = await fs.promises.readFile(logicPerformanceFilePath, 'utf8');
    const loadedPerformance = JSON.parse(data);
    // Merge loaded data with default to ensure new logics are initialized
    for (const key in logicPerformance) {
      if (loadedPerformance[key]) {
        Object.assign(logicPerformance[key], loadedPerformance[key]);
      }
    }
    console.log("Logic performance loaded from logic_performance.json");
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log("logic_performance.json not found. Initializing with default values.");
    } else {
      console.error("Error loading logic performance:", err);
    }
  }
}

 để linh hoạt hơn
const HIGH_CONFIDENCE_THRESHOLD = 0.75; // Ngưỡng du_doan rất tự tin (slightly increased)
const MODERATE_CONFIDENCE_THRESHOLD = 0.60; // Ngưỡng du_doan trung bình (slightly increased)





// Helper function to get dice frequencies


// Hàm ghi log cầu vào file cauapisun_log.jsonl


// Hàm đọc log cầu từ file cauapisun_log.jsonl
async 

// --- Kết nối WebSocket và xử lý dữ liệu (Kết nối tới Sunwin) ---
function sendCmd1005() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    const payload = [6, "MiniGame", "taixiuPlugin", { cmd: 1005 }];
    ws.send(JSON.stringify(payload));
  }
}

// Array to store connected WebSocket clients
const connectedClients = new Set();

// Function to broadcast predictions to all connected clients

        connectedClients.forEach(clientWs => {
            if (clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(JSON.stringify(predictionMessage));
            }
        });

        console.log(`\n--- Broadcasted Prediction for Session ${nextSessionId} ---`);
        console.log(`Final Prediction: ${finalPrediction}`);
        console.log(`Confidence: ${overallConfidence}% (${confidenceMessage})`);
        console.log(`Contributing Logics: ${contributingLogics.join(', ')}`);
        console.log(`Detected Pattern: ${detectedPatternString}`);
        console.log("------------------------------------------\n");
    });
}


function connectWebSocket() {
  ws = new WebSocket("wss://websocket.azhkthg1.net/websocket?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJhbW91bnQiOjB9.p56b5g73I9wyoVu4db679bOvVeFJWVjGDg_ulBXyav8");

  ws.on("open", () => {
    console.log("Đã kết nối WebSocket thành công đến Sunwin.");

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

        for (const newItem of incomingResults) { // Use for...of for async operations
          if (newItem.d1 === undefined || newItem.d2 === undefined || newItem.d3 === undefined ||
            newItem.d1 < 1 || newItem.d1 > 6 || newItem.d2 < 1 || newItem.d2 > 6 || newItem.d3 < 1 || newItem.d3 > 6) {
            console.warn(`Invalid dice data for session ${newItem.sid}. Skipping.`);
            continue;
          }

          const total = newItem.d1 + newItem.d2 + newItem.d3;
          if (total < 3 || total > 18) {
            console.warn(`Invalid total for session ${newItem.sid}. Skipping.`);
            continue;
          }

          const row = await new Promise((resolve, reject) => {
            db.get(`SELECT sid FROM sessions WHERE sid = ?`, [newItem.sid], (err, row) => {
              if (err) reject(err);
              else resolve(row);
            });
          });

          if (!row) {
            const result = (total >= 3 && total <= 10) ? "Xỉu" : "Tài";
            const timestamp = new Date().getTime();

            await new Promise((resolve, reject) => {
              db.run(`INSERT INTO sessions (sid, d1, d2, d3, total, result, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [newItem.sid, newItem.d1, newItem.d2, newItem.d3, total, result, timestamp],
                function (err) {
                  if (err) reject(err);
                  else {
                    console.log(`Added new session: ${newItem.sid} - Result: ${result}`);
                    resolve();
                  }
                }
              );
            });

            // After a new session is added, we can analyze and log patterns
            // Fetch history from DB for accurate pattern analysis
            db.all(`SELECT sid, d1, d2, d3, total, result FROM sessions ORDER BY sid DESC LIMIT 50`, (histErr, recentHistory) => {
                if (histErr) {
                    console.error("Error fetching history for cau logging:", histErr.message);
                    return;
                }
                const reversedHistory = recentHistory.reverse(); // Reverse to get oldest -> newest
                if (reversedHistory.length > 5) { // Need enough history to extract meaningful patterns
                    const patternsFound = analyzeAndExtractPatterns(reversedHistory);
                    if (Object.keys(patternsFound).length > 0) {
                        logCauPattern({
                            sid_before: newItem.sid, // The session ID *before* the result being logged
                            actual_result: result,
                            patterns: patternsFound,
                            timestamp: timestamp
                        });
                        console.log(`Logged cau patterns for session ${newItem.sid}.`);
                    }
                }
            });

            // Trigger broadcast of new prediction after a new session is added to DB}
        }
      }
    } catch (e) {
      console.error("Lỗi khi phân tích tin nhắn WebSocket từ Sunwin:", e);
    }
  });

  ws.on("close", () => {
    console.warn("Kết nối WebSocket đến Sunwin bị đóng. Đang thử kết nối lại...");
    clearInterval(intervalCmd);
    setTimeout(connectWebSocket, reconnectInterval);
  });

  ws.on("error", (err) => {
    console.error("Lỗi WebSocket từ Sunwin:", err.message);
    ws.close();
  });
}

connectWebSocket();

// Route JSON render:
fastify.get("/api/history-json", async (request, reply) => {
  return new Promise((resolve, reject) => {
    db.all(`SELECT sid, d1, d2, d3, total, result, timestamp FROM sessions ORDER BY sid ASC`, (err, rows) => {
      if (err) {
        console.error("Lỗi khi truy vấn DB để xuất JSON:", err.message);
        reply.status(500).send("Lỗi nội bộ server khi xuất dữ liệu.");
        return reject("Lỗi nội bộ server khi xuất dữ liệu.");
      }

      const validHistory = rows.filter(item =>
        item.d1 !== undefined && item.d2 !== undefined && item.d3 !== undefined &&
        item.d1 >= 1 && item.d1 <= 6 && item.d2 >= 1 && item.d2 <= 6 && item.d3 >= 1 && item.d3 <= 6 &&
        item.total >= 3 && item.total <= 18
      );

      const jsonFilePath = path.resolve(__dirname, 'sun_history.json');
      fs.writeFile(jsonFilePath, JSON.stringify(validHistory, null, 2), (writeErr) => {
        if (writeErr) {
          console.error("Lỗi khi ghi file JSON:", writeErr.message);
          reply.status(500).send("Lỗi nội bộ server khi ghi file JSON.");
          return reject("Lỗi nội bộ server khi ghi file JSON.");
        }
        console.log(`Đã xuất lịch sử phiên ra: ${jsonFilePath}`);
        reply.type('application/json').send(JSON.stringify(validHistory, null, 2));
        resolve();
      });
    });
  });
});
