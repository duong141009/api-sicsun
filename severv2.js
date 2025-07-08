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

// --- Hiệu suất logic AI với khả năng thích ứng động ---
// Initialize with default values, will be loaded from file if exists
let logicPerformance = {
  logic1: { correct: 0, total: 0, accuracy: 0, consistency: 0, lastPredicted: null, lastActual: null },
  logic2: { correct: 0, total: 0, accuracy: 0, consistency: 0, lastPredicted: null, lastActual: null },
  logic3: { correct: 0, total: 0, accuracy: 0, consistency: 0, lastPredicted: null, lastActual: null },
  logic4: { correct: 0, total: 0, accuracy: 0, consistency: 0, lastPredicted: null, lastActual: null },
  logic5: { correct: 0, total: 0, accuracy: 0, consistency: 0, lastPredicted: null, lastActual: null },
  logic6: { correct: 0, total: 0, accuracy: 0, consistency: 0, lastPredicted: null, lastActual: null },
  logic7: { correct: 0, total: 0, accuracy: 0, consistency: 0, lastPredicted: null, lastActual: null },
  logic8: { correct: 0, total: 0, accuracy: 0, consistency: 0, lastPredicted: null, lastActual: null },
  logic9: { correct: 0, total: 0, accuracy: 0, consistency: 0, lastPredicted: null, lastActual: null },
  logic10: { correct: 0, total: 0, accuracy: 0, consistency: 0, lastPredicted: null, lastActual: null },
  logic11: { correct: 0, total: 0, accuracy: 0, consistency: 0, lastPredicted: null, lastActual: null },
  logic12: { correct: 0, total: 0, accuracy: 0, consistency: 0, lastPredicted: null, lastActual: null },
  logic13: { correct: 0, total: 0, accuracy: 0, consistency: 0, lastPredicted: null, lastActual: null },
  logic14: { correct: 0, total: 0, accuracy: 0, consistency: 0, lastPredicted: null, lastActual: null },
  logic15: { correct: 0, total: 0, accuracy: 0, consistency: 0, lastPredicted: null, lastActual: null },
  logic16: { correct: 0, total: 0, accuracy: 0, consistency: 0, lastPredicted: null, lastActual: null },
  logic17: { correct: 0, total: 0, accuracy: 0, consistency: 0, lastPredicted: null, lastActual: null },
  logic18: { correct: 0, total: 0, accuracy: 0, consistency: 0, lastPredicted: null, lastActual: null },
  logic19: { correct: 0, total: 0, accuracy: 0, consistency: 0, lastPredicted: null, lastActual: null },
  logic20: { correct: 0, total: 0, accuracy: 0, consistency: 0, lastPredicted: null, lastActual: null }, // Meta-Logic
  logic21: { correct: 0, total: 0, accuracy: 0, consistency: 0, lastPredicted: null, lastActual: null }, // Multi-Window V3
  logic22: { correct: 0, total: 0, accuracy: 0, consistency: 0, lastPredicted: null, lastActual: null }, // Super-powered Cau Analysis Logic (NEW)
  logic23: { correct: 0, total: 0, accuracy: 0, consistency: 0, lastPredicted: null, lastActual: null }, // New combined formulas logic
  logic24: { correct: 0, total: 0, accuracy: 0, consistency: 0, lastPredicted: null, lastActual: null }, // Pattern logic
};

// Function to save logicPerformance to file
async function saveLogicPerformance() {
  try {
    await fs.promises.writeFile(logicPerformanceFilePath, JSON.stringify(logicPerformance, null, 2), 'utf8');
    console.log("Logic performance saved to logic_performance.json");
  } catch (err) {
    console.error("Error saving logic performance:", err);
  }
}

// Function to load logicPerformance from file
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

// NOTE: Immediate load on startup is now handled in the `start` function
// (async () => {
//     await loadLogicPerformance();
// })();


// Đã điều chỉnh các ngưỡng để linh hoạt hơn
const HIGH_CONFIDENCE_THRESHOLD = 0.75; // Ngưỡng du_doan rất tự tin (slightly increased)
const MODERATE_CONFIDENCE_THRESHOLD = 0.60; // Ngưỡng du_doan trung bình (slightly increased)

function updateLogicPerformance(logicName, predicted, actual) {
  if (predicted === null || !logicPerformance[logicName]) return;

  const currentAcc = logicPerformance[logicName].accuracy;
  const currentTotal = logicPerformance[logicName].total;

  // Dynamic Decay: Adapt faster to market changes.
  let dynamicDecayFactor = 0.95; // Default
  if (currentTotal > 0 && currentAcc < 0.60) {
    dynamicDecayFactor = 0.85; // Stronger decay if accuracy is low
  } else if (currentTotal > 0 && currentAcc > 0.80) {
    dynamicDecayFactor = 0.98; // Weaker decay if accuracy is high
  }

  logicPerformance[logicName].correct = logicPerformance[logicName].correct * dynamicDecayFactor;
  logicPerformance[logicName].total = logicPerformance[logicName].total * dynamicDecayFactor;

  logicPerformance[logicName].total++;
  let wasCorrect = 0;
  if (predicted === actual) {
    logicPerformance[logicName].correct++;
    wasCorrect = 1;
  }

  logicPerformance[logicName].accuracy = logicPerformance[logicName].total > 0 ?
    (logicPerformance[logicName].correct / logicPerformance[logicName].total) : 0;

  // Consistency: Adaptive alpha for faster adaptation when accuracy is low
  const adaptiveAlphaConsistency = (currentAcc < 0.6) ? 0.3 : 0.1;
  logicPerformance[logicName].consistency = (logicPerformance[logicName].consistency * (1 - adaptiveAlphaConsistency)) + (wasCorrect * adaptiveAlphaConsistency);

  // Cap maximum accuracy if total samples are low to avoid overconfidence
  if (logicPerformance[logicName].total < 20 && logicPerformance[logicName].accuracy > 0.90) {
    logicPerformance[logicName].accuracy = 0.90;
  } else if (logicPerformance[logicName].total < 50 && logicPerformance[logicName].accuracy > 0.95) {
    logicPerformance[logicName].accuracy = 0.95;
  }

  // Update last predicted and actual results for tracking
  logicPerformance[logicName].lastPredicted = predicted;
  logicPerformance[logicName].lastActual = actual;
}

function calculateStdDev(arr) {
  if (arr.length < 2) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const variance = arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / arr.length;
  return Math.sqrt(variance);
}

// Helper function to get dice frequencies
function getDiceFrequencies(history, limit) {
    const allDice = [];
    const effectiveHistory = history.slice(0, limit);
    effectiveHistory.forEach(s => {
        allDice.push(s.d1, s.d2, s.d3);
    });

    const diceFreq = new Array(7).fill(0); // Index 0 unused, 1-6 for dice faces
    allDice.forEach(d => {
        if (d >= 1 && d <= 6) {
            diceFreq[d]++;
        }
    });
    return diceFreq;
}

// Hàm ghi log cầu vào file cauapisun_log.jsonl
function logCauPattern(patternData) {
    fs.appendFile(cauLogFilePath, JSON.stringify(patternData) + '\n', (err) => {
        if (err) {
            console.error("Lỗi khi ghi log cầu:", err);
        }
    });
}

// Hàm đọc log cầu từ file cauapisun_log.jsonl
async function readCauLog() {
    return new Promise((resolve) => {
        fs.readFile(cauLogFilePath, 'utf8', (err, data) => {
            if (err) {
                if (err.code === 'ENOENT') {
                    return resolve([]); // File doesn't exist, return empty array
                }
                console.error("Lỗi khi đọc log cầu:", err);
                return resolve([]);
            }
            try {
                const lines = data.split('\n').filter(line => line.trim() !== '');
                const patterns = lines.map(line => JSON.parse(line));
                resolve(patterns);
            } catch (e) {
                console.error("Lỗi phân tích cú pháp log cầu:", e);
                resolve([]);
            }
        });
    });
}

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


// LOGIC 22: Super-powered Cau Analysis Logic (NEW)
// This logic aims to identify complex 'cau' (patterns/streaks) and their historical outcomes.
// It combines several sub-strategies for a robust pattern analysis.
function predictLogic22(history, cauLogData) {
    if (history.length < 15) return null; // Need sufficient history

    const resultsOnly = history.map(s => s.result === 'Tài' ? 'T' : 'X');
    const totalsOnly = history.map(s => s.total);

    let taiVotes = 0;
    let xiuVotes = 0;
    let totalContributionWeight = 0;

    // Sub-logic 22.1: Dynamic Streak Prediction
    // Predicts continuation or reversal of streaks based on historical breakage points.
    const currentStreakResult = resultsOnly[0];
    let currentStreakLength = 0;
    for(let i=0; i<resultsOnly.length; i++) {
        if(resultsOnly[i] === currentStreakResult) {
            currentStreakLength++;
        } else {
            break;
        }
    }

    if (currentStreakLength >= 3) { // Consider streaks of 3 or more
        let streakBreakCount = 0;
        let streakContinueCount = 0;
        const streakSearchWindow = Math.min(resultsOnly.length, 200);

        for (let i = currentStreakLength; i < streakSearchWindow; i++) {
            const potentialStreak = resultsOnly.slice(i, i + currentStreakLength);
            if (potentialStreak.every(r => r === currentStreakResult)) {
                // Check if the streak continued or broke in the historical data
                if (resultsOnly[i - 1]) { // The result immediately following this historical streak
                    if (resultsOnly[i - 1] === currentStreakResult) {
                        streakContinueCount++;
                    } else {
                        streakBreakCount++;
                    }
                }
            }
        }
        const totalStreakOccurrences = streakBreakCount + streakContinueCount;
        if (totalStreakOccurrences > 5) { // Need enough historical instances
            if (streakBreakCount / totalStreakOccurrences > 0.65) { // More likely to break
                if (currentStreakResult === 'T') xiuVotes += 1.5; else taiVotes += 1.5; // Predict reversal
                totalContributionWeight += 1.5;
            } else if (streakContinueCount / totalStreakOccurrences > 0.65) { // More likely to continue
                if (currentStreakResult === 'T') taiVotes += 1.5; else xiuVotes += 1.5; // Predict continuation
                totalContributionWeight += 1.5;
            }
        }
    }


    // Sub-logic 22.2: Alternating Pattern Recognition (e.g., TXT or XTX)
    if (history.length >= 4) {
        const lastFour = resultsOnly.slice(0, 4).join(''); // e.g., "TXTX"
        let patternMatches = 0;
        let taiFollows = 0;
        let xiuFollows = 0;

        const patternToMatch = lastFour.substring(0, 3); // TXT

        const searchLength = Math.min(resultsOnly.length, 150);
        for(let i = 0; i < searchLength - 3; i++) {
            const historicalPattern = resultsOnly.slice(i, i + 3).join('');
            if (historicalPattern === patternToMatch) {
                if (resultsOnly[i + 3] === 'T') taiFollows++;
                else xiuFollows++;
                patternMatches++;
            }
        }

        if (patternMatches > 4) { // Sufficient matches
            if (taiFollows / patternMatches > 0.70) {
                 taiVotes += 1.2; totalContributionWeight += 1.2;
            } else if (xiuFollows / patternMatches > 0.70) {
                 xiuVotes += 1.2; totalContributionWeight += 1.2;
            }
        }
    }

    // Sub-logic 22.3: Total Sum Sequence Analysis (e.g., 10-7-10 pattern)
    // This part now uses `cauLogData` for advanced learning
    if (history.length >= 2) {
        const lastTwoTotals = totalsOnly.slice(0, 2);
        const lastTwoResults = resultsOnly.slice(0, 2); // T/X for last two

        if (lastTwoTotals.length === 2) {
            const targetPatternKey = `${lastTwoTotals[1]}-${lastTwoResults[1]}_${lastTwoTotals[0]}-${lastTwoResults[0]}`;
            let taiFollows = 0;
            let xiuFollows = 0;
            let totalPatternMatches = 0;

            // Search in cauLogData (logged historical patterns)
            const relevantLogs = cauLogData.filter(log => log.patterns && log.patterns.sum_sequence_patterns);
            for (const log of relevantLogs) {
                for (const pattern of log.patterns.sum_sequence_patterns) {
                    if (pattern.key === targetPatternKey) {
                        totalPatternMatches++;
                        if (log.actual_result === "Tài") taiFollows++;
                        else xiuFollows++;
                    }
                }
            }
            if (totalPatternMatches > 3) { // Need a few matches
                if (taiFollows / totalPatternMatches > 0.70) { taiVotes += 1.0; totalContributionWeight += 1.0; }
                else if (xiuFollows / totalPatternMatches > 0.70) { xiuVotes += 1.0; totalContributionWeight += 1.0; }
            }
        }
    }


    // Final prediction based on weighted votes
    if (totalContributionWeight === 0) return null;

    if (taiVotes > xiuVotes * 1.1) { // Tai has significantly more votes
        return "Tài";
    } else if (xiuVotes > taiVotes * 1.1) { // Xiu has significantly more votes
        return "Xỉu";
    }

    return null;
}

// LOGIC 23: New combined simple formulas
function predictLogic23(history) {
    if (history.length < 5) return null; // Need at least 5 sessions for these formulas

    const totals = history.map(s => s.total);
    const lastResults = history.map(s => s.result);
    const allDice = history.slice(0, Math.min(history.length, 10)).flatMap(s => [s.d1, s.d2, s.d3]); // Get dice from recent history
    const diceFreq = getDiceFrequencies(history, 10); // Get frequencies from recent 10 sessions

    const avg_total = totals.slice(0, Math.min(history.length, 10)).reduce((a, b) => a + b, 0) / Math.min(history.length, 10);

    const simplePredictions = [];

    // Translated formulas - adjusted for better potential stability
    if (history.length >= 2) {
        if ((totals[0] + totals[1]) % 2 === 0) simplePredictions.push("Tài"); else simplePredictions.push("Xỉu");
    }
    if (avg_total > 10.5) simplePredictions.push("Tài"); else simplePredictions.push("Xỉu");

    if (diceFreq[4] + diceFreq[5] > diceFreq[1] + diceFreq[2]) {
        simplePredictions.push("Tài");
    } else {
        simplePredictions.push("Xỉu");
    }

    if (history.filter(s => s.total > 10).length > history.length / 2) simplePredictions.push("Tài"); else simplePredictions.push("Xỉu");

    if (history.length >= 3) {
        if (totals.slice(0, 3).reduce((a, b) => a + b, 0) > 33) simplePredictions.push("Tài"); else simplePredictions.push("Xỉu");
    }
    if (history.length >= 5) {
        if (Math.max(...totals.slice(0, 5)) > 15) simplePredictions.push("Tài"); else simplePredictions.push("Xỉu");
    }
    if (history.length >= 5) {
        if (totals.slice(0, 5).filter(t => t > 10).length >= 3) simplePredictions.push("Tài"); else simplePredictions.push("Xỉu");
    }
    if (history.length >= 3) {
        if (totals.slice(0, 3).reduce((a, b) => a + b, 0) > 34) simplePredictions.push("Tài"); else simplePredictions.push("Xỉu");
    }
    if (history.length >= 2) {
        if (totals[0] > 10 && totals[1] > 10) simplePredictions.push("Tài"); else simplePredictions.push("Xỉu");
        if (totals[0] < 10 && totals[1] < 10) simplePredictions.push("Xỉu"); else simplePredictions.push("Tài"); // Predict reversal
    }

    // Add remaining formulas, but filter out highly similar or very weak ones for stability
    // Focusing on formulas with clearer conditions
    if (history.length >= 1) {
      if ((totals[0] + diceFreq[3]) % 2 === 0) simplePredictions.push("Tài"); else simplePredictions.push("Xỉu");
      if (diceFreq[2] > 3) simplePredictions.push("Tài"); else simplePredictions.push("Xỉu");
      if ([11, 12, 13].includes(totals[0])) simplePredictions.push("Tài"); else simplePredictions.push("Xỉu");
    }

    if (history.length >= 2) {
        if (totals[0] + totals[1] > 30) simplePredictions.push("Tài"); else simplePredictions.push("Xỉu");
    }
    if (allDice.filter(d => d > 3).length > 7) simplePredictions.push("Tài"); else simplePredictions.push("Xỉu");
    if (history.length >= 1) {
      if (totals[0] % 2 === 0) simplePredictions.push("Tài"); else simplePredictions.push("Xỉu");
    }
    if (allDice.filter(d => d > 3).length > 8) simplePredictions.push("Tài"); else simplePredictions.push("Xỉu");
    if (history.length >= 3) {
      if (totals.slice(0, 3).reduce((a, b) => a + b, 0) % 4 === 0) simplePredictions.push("Tài"); else simplePredictions.push("Xỉu");
      if (totals.slice(0, 3).reduce((a, b) => a + b, 0) % 3 === 0) simplePredictions.push("Tài"); else simplePredictions.push("Xỉu");
    }
    if (history.length >= 1) {
      if (totals[0] % 3 === 0) simplePredictions.push("Tài"); else simplePredictions.push("Xỉu");
      if (totals[0] % 5 === 0) simplePredictions.push("Tài"); else simplePredictions.push("Xỉu");
      if (totals[0] % 4 === 0) simplePredictions.push("Tài"); else simplePredictions.push("Xỉu");
    }
    if (diceFreq[4] > 2) simplePredictions.push("Tài"); else simplePredictions.push("Xỉu");

    // Count votes
    let taiVotes = 0;
    let xiuVotes = 0;
    simplePredictions.forEach(p => {
        if (p === "Tài") taiVotes++;
        else if (p === "Xỉu") xiuVotes++;
    });

    // If there's a clear majority, return the prediction
    // Increased threshold for higher confidence from this logic
    if (taiVotes > xiuVotes * 1.5) {
        return "Tài";
    } else if (xiuVotes > taiVotes * 1.5) {
        return "Xỉu";
    }
    return null; // No strong prediction from these simple formulas
}

const PATTERN_DATA = {
  "ttxttx": { tai: 80, xiu: 20 }, "xxttxx": { tai: 25, xiu: 75 },
  "ttxxtt": { tai: 75, xiu: 25 }, "txtxt": { tai: 60, xiu: 40 },
  "xtxtx": { tai: 40, xiu: 60 }, "ttx": { tai: 70, xiu: 30 },
  "xxt": { tai: 30, xiu: 70 }, "txt": { tai: 65, xiu: 35 },
  "xtx": { tai: 35, xiu: 65 }, "tttt": { tai: 85, xiu: 15 },
  "xxxx": { tai: 15, xiu: 85 }, "ttttt": { tai: 88, xiu: 12 },
  "xxxxx": { tai: 12, xiu: 88 }, "tttttt": { tai: 92, xiu: 8 },
  "xxxxxx": { tai: 8, xiu: 92 }, "tttx": { tai: 75, xiu: 25 },
  "xxxt": { tai: 25, xiu: 75 }, "ttxtx": { tai: 78, xiu: 22 },
  "xxtxt": { tai: 22, xiu: 78 }, "txtxtx": { tai: 82, xiu: 18 },
  "xtxtxt": { tai: 18, xiu: 82 }, "ttxtxt": { tai: 85, xiu: 15 },
  "xxtxtx": { tai: 15, xiu: 85 }, "txtxxt": { tai: 83, xiu: 17 },
  "xtxttx": { tai: 17, xiu: 83 }, "ttttttt": { tai: 95, xiu: 5 },
  "xxxxxxx": { tai: 5, xiu: 95 }, "tttttttt": { tai: 97, xiu: 3 },
  "xxxxxxxx": { tai: 3, xiu: 97 }, "txtx": { tai: 60, xiu: 40 },
  "xtxt": { tai: 40, xiu: 60 }, "txtxt": { tai: 65, xiu: 35 },
  "xtxtx": { tai: 35, xiu: 65 }, "txtxtxt": { tai: 70, xiu: 30 },
  "xtxtxtx": { tai: 30, xiu: 70 }
};

// MODIFIED TO ONLY RETURN THE ACTUAL CAU STRING
function analyzePatterns(lastResults) {
  if (!lastResults || lastResults.length === 0) return [null, "Không có dữ liệu"];

  // Convert "Tài" to "T" and "Xỉu" to "X"
  const resultsShort = lastResults.map(r => r === "Tài" ? "T" : "X");

  // Get the most recent sessions for the actual cau string (e.g., 10 sessions)
  const displayLength = Math.min(resultsShort.length, 10);
  const recentSequence = resultsShort.slice(0, displayLength).join('');

  // Return null for prediction and the actual cau string
  return [null, `: ${recentSequence}`];
}


function predictLogic24(history) {
  if (!history || history.length < 5) return null;
  const lastResults = history.map(s => s.result);
  const totals = history.map(s => s.total);
  const allDice = history.flatMap(s => [s.d1, s.d2, s.d3]);
  const diceFreq = new Array(7).fill(0);
  allDice.forEach(d => { if (d >= 1 && d <= 6) diceFreq[d]++; });

  const avg_total = totals.slice(0, Math.min(history.length, 10)).reduce((a, b) => a + b, 0) / Math.min(history.length, 10);
  const votes = [];

  // Simple formulas with specific conditions
  if (history.length >= 2) {
    if ((totals[0] + totals[1]) % 2 === 0) votes.push("Tài"); else votes.push("Xỉu");
  }
  if (avg_total > 10.5) votes.push("Tài"); else votes.push("Xỉu");

  if (diceFreq[4] + diceFreq[5] > diceFreq[1] + diceFreq[2]) {
    votes.push("Tài");
  } else {
    votes.push("Xỉu");
  }

  if (history.filter(s => s.total > 10).length > history.length / 2) votes.push("Tài"); else votes.push("Xỉu");

  if (history.length >= 3) {
    if (totals.slice(0, 3).reduce((a, b) => a + b, 0) > 33) votes.push("Tài"); else votes.push("Xỉu");
  }
  if (history.length >= 5) {
    if (Math.max(...totals.slice(0, 5)) > 15) votes.push("Tài"); else votes.push("Xỉu");
  }

  // Pattern-based voting
  const patternSeq = lastResults.slice(0, 3).reverse().map(r => r === "Tài" ? "t" : "x").join("");
  if (PATTERN_DATA[patternSeq]) {
    const prob = PATTERN_DATA[patternSeq];
    if (prob.tai > prob.xiu + 15) votes.push("Tài");
    else if (prob.xiu > prob.tai + 15) votes.push("Xỉu");
  }

  const [patternPred, patternDesc] = analyzePatterns(lastResults); // This returns null for patternPred now
  if (patternPred) votes.push(patternPred); // Will not add prediction to votes with current analyzePatterns

  const taiCount = votes.filter(v => v === "Tài").length;
  const xiuCount = votes.filter(v => v === "Xỉu").length;

  if (taiCount + xiuCount < 4) return null; // Require at least 4 valid votes

  // Stricter majority requirement for Logic 24 to be useful as a distinct logic
  if (taiCount >= xiuCount + 3) return "Tài"; // Needs at least 3 more Tai votes
  if (xiuCount >= taiCount + 3) return "Xỉu"; // Needs at least 3 more Xiu votes
  return null;
}

// LOGIC 20: Rule-based Neural Network (Meta-Logic / Ensemble)
// Upgrade: Self-learning from cauapisun_log.jsonl
function analyzeAndExtractPatterns(history) {
    const patterns = {};

    // Pattern 1: Sum sequence pattern (e.g., total-result_total-result)
    if (history.length >= 2) {
        patterns.sum_sequence_patterns = [
            { key: `${history[0].total}-${history[0].result === 'Tài' ? 'T' : 'X'}_${history[1]?.total}-${history[1]?.result === 'Tài' ? 'T' : 'X'}` }
        ];
    }
    // Pattern 2: Last streak (result and length)
    if (history.length >= 1) {
        let currentStreakLength = 0;
        const currentResult = history[0].result;
        for (let i = 0; i < history.length; i++) {
            if (history[i].result === currentResult) {
                currentStreakLength++;
            } else {
                break;
            }
        }
        if (currentStreakLength > 0) {
            patterns.last_streak = { result: currentResult === 'Tài' ? 'T' : 'X', length: currentStreakLength };
        }
    }
    // Add more pattern extraction here as needed for self-learning
    // E.g., Alternating patterns: "TXT", "XTX"
    if (history.length >= 3) {
      const resultsShort = history.slice(0, 3).map(s => s.result === 'Tài' ? 'T' : 'X').join('');
      if (resultsShort === 'TXT' || resultsShort === 'XTX') {
        patterns.alternating_pattern = resultsShort;
      }
    }

    return patterns;
}

async function predictLogic20(history, logicPerformance, cauLogData) { // Added cauLogData as a parameter
  if (history.length < 30) return null;

  let taiVotes = 0;
  let xiuVotes = 0;
  const contributingLogicsNames = new Set(); // To keep track of unique contributing logics

  const signals = [
    { logic: 'logic1', baseWeight: 0.8 },
    { logic: 'logic2', baseWeight: 0.7 },
    { logic: 'logic3', baseWeight: 0.9 },
    { logic: 'logic4', baseWeight: 1.2 },
    { logic: 'logic5', baseWeight: 0.6 },
    { logic: 'logic6', baseWeight: 0.8 },
    { logic: 'logic7', baseWeight: 1.0 },
    { logic: 'logic8', baseWeight: 0.7 },
    { logic: 'logic9', baseWeight: 1.1 },
    { logic: 'logic10', baseWeight: 0.9 },
    { logic: 'logic11', baseWeight: 1.3 },
    { logic: 'logic12', baseWeight: 0.7 },
    { logic: 'logic13', baseWeight: 1.2 },
    { logic: 'logic14', baseWeight: 0.8 },
    { logic: 'logic15', baseWeight: 0.6 },
    { logic: 'logic16', baseWeight: 0.7 },
    { logic: 'logic17', baseWeight: 0.9 },
    { logic: 'logic18', baseWeight: 1.3 },
    { logic: 'logic19', baseWeight: 0.9 },
    { logic: 'logic21', baseWeight: 1.5 },
    { logic: 'logic22', baseWeight: 1.8 }, // New logic, higher weight
    { logic: 'logic23', baseWeight: 1.0 }, // New logic for combined formulas
    { logic: 'logic24', baseWeight: 1.1 } // Add logic24 here
  ];

  const lastSession = history[0];
  const nextSessionId = lastSession.sid + 1;

  const childPredictions = {
    logic1: predictLogic1(lastSession, history),
    logic2: predictLogic2(nextSessionId, history),
    logic3: predictLogic3(history),
    logic4: predictLogic4(history),
    logic5: predictLogic5(history),
    logic6: predictLogic6(lastSession, history),
    logic7: predictLogic7(history),
    logic8: predictLogic8(history),
    logic9: predictLogic9(history),
    logic10: predictLogic10(history),
    logic11: predictLogic11(history),
    logic12: predictLogic12(lastSession, history),
    logic13: predictLogic13(history),
    logic14: predictLogic14(history),
    logic15: predictLogic15(history),
    logic16: predictLogic16(history),
    logic17: predictLogic17(history),
    logic18: predictLogic18(history),
    logic19: predictLogic19(history),
    logic21: predictLogic21(history),
    logic22: predictLogic22(history, cauLogData), // Pass cauLogData to Logic 22
    logic23: predictLogic23(history), // Call new logic
    logic24: predictLogic24(history), // Call logic24
  };

  signals.forEach(signal => {
    const prediction = childPredictions[signal.logic];
    if (prediction !== null && logicPerformance[signal.logic]) {
      const acc = logicPerformance[signal.logic].accuracy;
      const consistency = logicPerformance[signal.logic].consistency;

      // Only contribute if logic has enough data and acceptable performance
      if (logicPerformance[signal.logic].total > 3 && acc > 0.35 && consistency > 0.25) {
        const effectiveWeight = signal.baseWeight * ((acc + consistency) / 2);

        if (prediction === "Tài") {
          taiVotes += effectiveWeight;
        } else {
          xiuVotes += effectiveWeight;
        }
        contributingLogicsNames.add(signal.logic); // Add to set
      }
    }
  });

  // --- Self-learning from cauapisun_log.jsonl (Powerful AI Self-Learning) ---
  const currentPatterns = analyzeAndExtractPatterns(history.slice(0, Math.min(history.length, 50)));

  let cauTaiBoost = 0;
  let cauXiuBoost = 0;

  if (cauLogData.length > 0) {
      const recentCauLogs = cauLogData.slice(Math.max(0, cauLogData.length - 200)); // Consider only the 200 most recent logs
      const patternMatchScores = {}; // { patternKey: { tai: count, xiu: count } }

      for (const patternType in currentPatterns) {
          const currentPatternValue = currentPatterns[patternType];

          if (patternType === 'sum_sequence_patterns' && Array.isArray(currentPatternValue)) {
              currentPatternValue.forEach(cp => {
                  const patternKey = cp.key;
                  if (patternKey) {
                      recentCauLogs.forEach(logEntry => {
                          if (logEntry.patterns && logEntry.patterns.sum_sequence_patterns) {
                              const foundMatch = logEntry.patterns.sum_sequence_patterns.some(lp => lp.key === patternKey);
                              if (foundMatch) {
                                  if (!patternMatchScores[patternKey]) {
                                      patternMatchScores[patternKey] = { tai: 0, xiu: 0 };
                                  }
                                  if (logEntry.actual_result === "Tài") patternMatchScores[patternKey].tai++;
                                  else patternMatchScores[patternKey].xiu++;
                              }
                          }
                      });
                  }
              });
          } else if (currentPatternValue && typeof currentPatternValue === 'object' && currentPatternValue.result && currentPatternValue.length) {
              // Handle patterns.last_streak
              const patternKey = `last_streak_${currentPatternValue.result}_${currentPatternValue.length}`;
              recentCauLogs.forEach(logEntry => {
                  if (logEntry.patterns && logEntry.patterns.last_streak) {
                      const logStreak = logEntry.patterns.last_streak;
                      if (logStreak.result === currentPatternValue.result && logStreak.length === currentPatternValue.length) {
                          if (!patternMatchScores[patternKey]) {
                              patternMatchScores[patternKey] = { tai: 0, xiu: 0 };
                          }
                          if (logEntry.actual_result === "Tài") patternMatchScores[patternKey].tai++;
                          else patternMatchScores[patternKey].xiu++;
                      }
                  }
              });
          } else if (currentPatternValue) {
              // Simple string patterns like "TXT" or "XTX"
              const patternKey = `${patternType}_${currentPatternValue}`;
              recentCauLogs.forEach(logEntry => {
                  if (logEntry.patterns && logEntry.patterns[patternType] === currentPatternValue) {
                      if (!patternMatchScores[patternKey]) {
                          patternMatchScores[patternKey] = { tai: 0, xiu: 0 };
                      }
                      if (logEntry.actual_result === "Tài") patternMatchScores[patternKey].tai++;
                      else patternMatchScores[patternKey].xiu++;
                  }
              });
          }
      }

      // Aggregate boosts from learned patterns
      for (const key in patternMatchScores) {
          const stats = patternMatchScores[key];
          const totalMatches = stats.tai + stats.xiu;
          if (totalMatches > 3) { // Need at least 3 matches to be reliable
              const taiRatio = stats.tai / totalMatches;
              const xiuRatio = stats.xiu / totalMatches;

              const CAU_LEARNING_THRESHOLD = 0.70; // Confidence threshold for learned patterns

              if (taiRatio >= CAU_LEARNING_THRESHOLD) {
                  cauTaiBoost += (taiRatio - 0.5) * 2; // Stronger boost for higher confidence
              } else if (xiuRatio >= CAU_LEARNING_THRESHOLD) {
                  cauXiuBoost += (xiuRatio - 0.5) * 2;
              }
          }
      }
  }

  // Apply boosts from learned patterns to total votes
  taiVotes += cauTaiBoost * 2; // Multiplied by 2 to increase impact of learned patterns
  xiuVotes += cauXiuBoost * 2;
  // console.log(`Cau Boost: Tài +${(cauTaiBoost * 2).toFixed(2)}, Xỉu +${(cauXiuBoost * 2).toFixed(2)}`);


  const totalWeightedVotes = taiVotes + xiuVotes;
  if (totalWeightedVotes < 1.5) return null; // Not enough strong signals

  // Predict based on weighted majority
  if (taiVotes > xiuVotes * 1.08) {
    return "Tài";
  } else if (xiuVotes > taiVotes * 1.08) {
    return "Xỉu";
  }
  return null;
}

// Function to get overall volatility of the game for contextual analysis
function getOverallVolatility(history) {
  if (history.length < 30) return 0;
  const recentTotals = history.slice(0, Math.min(120, history.length)).map(s => s.total);
  return calculateStdDev(recentTotals);
}

// --- HTTP API endpoint for one-off prediction (kept for compatibility/testing) ---
fastify.get("/api/sunwin", async (request, reply) => {
  return new Promise((resolve, reject) => {
    db.all(`SELECT sid, d1, d2, d3, total, result, timestamp FROM sessions ORDER BY sid DESC LIMIT 1000`, async (err, rows) => {
      if (err) {
        console.error("Lỗi khi truy vấn DB:", err.message);
        reply.status(500).send({ error: "Lỗi nội bộ server." });
        return reject("Lỗi nội bộ server.");
      }

      const history = rows.filter(item =>
        item.d1 !== undefined && item.d2 !== undefined && item.d3 !== undefined &&
        item.d1 >= 1 && item.d1 <= 6 && item.d2 >= 1 && item.d2 <= 6 && item.d3 >= 1 && item.d3 <= 6 &&
        item.total >= 3 && item.total <= 18
      );

      const currentTimestamp = new Date().toLocaleString("vi-VN", {
        timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
      });

      if (history.length < 5) {
        reply.type('application/json').send({
          "phien_truoc": null,
          "ket_qua": null,
          "Dice": null,
          "phien_hien_ai": null,
          "du_doan": null,
          "do_tin_cay": "0.00%",
          "cau": "Chưa đủ dữ liệu",
          "ngay": currentTimestamp,
          "Id": "Duonggg1410"
        });
        return resolve();
      }

      const lastSession = history[0];
      const nextSessionId = lastSession.sid + 1;

      // --- Make prediction for the *current* (next) session ---
      let finalPrediction = null;
      let overallConfidence = "0.00";
      let confidenceMessage = "Không có tín hiệu mạnh để du_doan";
      let contributingLogics = [];
      let detectedPatternString = "";

      const cauLogDataForPrediction = await readCauLog();

      const logicsToEvaluate = [
        { name: 'logic1', predict: predictLogic1(lastSession, history) },
        { name: 'logic2', predict: predictLogic2(nextSessionId, history) },
        { name: 'logic3', predict: predictLogic3(history) },
        { name: 'logic4', predict: predictLogic4(history) },
        { name: 'logic5', predict: predictLogic5(history) },
        { name: 'logic6', predict: predictLogic6(lastSession, history) },
        { name: 'logic7', predict: predictLogic7(history) },
        { name: 'logic8', predict: predictLogic8(history) },
        { name: 'logic9', predict: predictLogic9(history) },
        { name: 'logic10', predict: predictLogic10(history) },
        { name: 'logic11', predict: predictLogic11(history) },
        { name: 'logic12', predict: predictLogic12(lastSession, history) },
        { name: 'logic13', predict: predictLogic13(history) },
        { name: 'logic14', predict: predictLogic14(history) },
        { name: 'logic15', predict: predictLogic15(history) },
        { name: 'logic16', predict: predictLogic16(history) },
        { name: 'logic17', predict: predictLogic17(history) },
        { name: 'logic18', predict: predictLogic18(history) },
        { name: 'logic19', predict: predictLogic19(history) },
        { name: 'logic21', predict: predictLogic21(history) },
        { name: 'logic22', predict: predictLogic22(history, cauLogDataForPrediction) },
        { name: 'logic23', predict: predictLogic23(history) },
        { name: 'logic24', predict: predictLogic24(history) },
      ];

      const allValidPredictions = [];
      for (const l of logicsToEvaluate) {
        const prediction = l.predict;
        if (prediction !== null && logicPerformance[l.name]) {
          const acc = logicPerformance[l.name].accuracy;
          const consistency = logicPerformance[l.name].consistency;
          if (logicPerformance[l.name].total > 2 && acc > 0.30 && consistency > 0.20) {
            allValidPredictions.push({ logic: l.name, prediction: prediction, accuracy: acc, consistency: consistency });
          }
        }
      }

      const logic20Result = await predictLogic20(history, logicPerformance, cauLogDataForPrediction);
      if (logic20Result !== null && logicPerformance.logic20.total > 5 && logicPerformance.logic20.accuracy >= 0.45) {
          allValidPredictions.push({
              logic: 'logic20',
              prediction: logic20Result,
              accuracy: logicPerformance.logic20.accuracy,
              consistency: logicPerformance.logic20.consistency
          });
      }

      allValidPredictions.sort((a, b) => (b.accuracy * b.consistency) - (a.accuracy * a.consistency));

      let taiWeightedVote = 0;
      let xiuWeightedVote = 0;
      let totalEffectiveWeight = 0;
      let usedLogics = new Set();

      for (const p of allValidPredictions) {
          const effectiveWeight = p.accuracy * p.consistency * (p.logic === 'logic20' ? 1.8 : (p.logic === 'logic22' ? 1.5 : (p.logic === 'logic23' ? 0.9 : (p.logic === 'logic24' ? 1.1 : 1.0))));

          if (effectiveWeight > 0.1) {
              if (p.prediction === "Tài") {
                  taiWeightedVote += effectiveWeight;
              } else {
                  xiuWeightedVote += effectiveWeight;
              }
              totalEffectiveWeight += effectiveWeight;
              if (!usedLogics.has(p.logic)) {
                  contributingLogics.push(`${p.logic} (${(p.accuracy * 100).toFixed(1)}%)`);
                  usedLogics.add(p.logic);
              }
          }
          if (contributingLogics.length >= 5) break;
      }

      if (totalEffectiveWeight > 0) {
        const taiConfidence = taiWeightedVote / totalEffectiveWeight;
        const xiuConfidence = xiuWeightedVote / totalEffectiveWeight;

        if (taiConfidence > xiuConfidence * 1.08 && taiConfidence >= 0.50) {
            finalPrediction = "Tài";
            overallConfidence = (taiConfidence * 100).toFixed(2);
            confidenceMessage = "Tin cậy";
            if (taiConfidence >= HIGH_CONFIDENCE_THRESHOLD) confidenceMessage = "Rất tin cậy";
        } else if (xiuConfidence > taiConfidence * 1.08 && xiuConfidence >= 0.50) {
            finalPrediction = "Xỉu";
            overallConfidence = (xiuConfidence * 100).toFixed(2);
            confidenceMessage = "Tin cậy";
            if (xiuConfidence >= HIGH_CONFIDENCE_THRESHOLD) confidenceMessage = "Rất tin cậy";
        } else {
            if (lastSession) {
                finalPrediction = lastSession.result;
                overallConfidence = "50.00";
                confidenceMessage = "Thấp (du_doan theo xu hướng gần nhất)";
                contributingLogics = ["Fallback: Theo phien_truoc"];
            } else {
                finalPrediction = null;
                overallConfidence = "0.00";
                confidenceMessage = "Thấp";
                contributingLogics = ["Chưa có đủ lịch sử để đánh giá"];
            }
        }
      } else {
          if (lastSession) {
              finalPrediction = lastSession.result;
              overallConfidence = "50.00";
              confidenceMessage = "Thấp (du_doan theo xu hướng gần nhất)";
              contributingLogics = ["Fallback: Theo phien_truoc"];
          } else {
              finalPrediction = null;
              overallConfidence = "0.00";
              confidenceMessage = "Thấp";
              contributingLogics = ["Chưa có đủ lịch sử để đánh giá"];
          }
      }

      const MAX_OVERALL_CONFIDENCE_DISPLAY = 97.00;
      if (overallConfidence !== "N/A") {
        overallConfidence = Math.min(parseFloat(overallConfidence), MAX_OVERALL_CONFIDENCE_DISPLAY).toFixed(2);
      }

      if (contributingLogics.length === 0 && allValidPredictions.length > 0) {
          contributingLogics.push(`${allValidPredictions[0].logic} (chủ đạo)`);
      } else if (contributingLogics.length === 0) {
          contributingLogics.push("Không có logic nào đạt ngưỡng");
      }

      const [patternPred, patternDesc] = analyzePatterns(history.map(item => item.result));
      detectedPatternString = patternDesc;


      const lastSessionDice = lastSession ? [lastSession.d1, lastSession.d2, lastSession.d3] : null;
      const lastSessionIdDisplay = lastSession ? lastSession.sid : null;
      const lastSessionResultDisplay = lastSession ? lastSession.result : null;

      reply.type('application/json').send({
        "phien_truoc": lastSessionIdDisplay,
        "ket_qua": lastSessionResultDisplay,
        "Dice": lastSessionDice,
        "phien_hien_tai": nextSessionId,
        "du_doan": finalPrediction,
        "do_tin_cay": `${overallConfidence}%`,
        "cau": detectedPatternString,
        "ngay": currentTimestamp,
        "Id": "Duonggg1410"
      });
      resolve();
    });
  });
});

// --- WebSocket API endpoint for real-time predictions ---
fastify.get("/api/sunwin/taixiu/ws", { websocket: true }, (connection, req) => {
    const { socket } = connection;
    const { id, key } = req.query;

    if (!authenticateWebSocket(id, key)) {
        socket.send(JSON.stringify({ error: "Authentication failed. Invalid ID or Key." }));
        socket.close();
        return;
    }

    console.log(`New WebSocket client connected: ${id}`);
    connectedClients.add(socket);

    // Immediately send the current prediction to the new client
    // Đã bỏ broadcastPrediction

    socket.on('message', message => {
        console.log(`Received message from ${id}: ${message}`);
        // Optionally handle messages from client (e.g., request specific data)
        // For now, it's a push-only API.
    });

    socket.on('close', () => {
        console.log(`WebSocket client disconnected: ${id}`);
        connectedClients.delete(socket);
    });

    socket.on('error', error => {
        console.error(`WebSocket error for ${id}:`, error);
        connectedClients.delete(socket);
    });
});


// --- API endpoint to export historical data to JSON ---
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

// Function to initialize logicPerformance from cauapisun_log.jsonl on startup
async function initializeLogicPerformanceFromLog() {
    console.log("Initializing logic performance from historical cau log data...");
    const cauLogData = await readCauLog();
    if (cauLogData.length === 0) {
        console.log("No historical cau log data found for initialization.");
        return;
    }

    // Create a temporary "history" array from the cauLogData to simulate past sessions
    // This is a simplified reconstruction for the purpose of initializing logicPerformance
    const reconstructedHistory = [];
    cauLogData.forEach(entry => {
        // We only care about the actual_result for updating logicPerformance
        // Other fields like sid, d1, d2, d3, total are not directly reconstructable
        // and only relevant for the original session data from DB.
        // For logic performance, we just need the actual outcome and the predicted outcome.
        reconstructedHistory.push({ result: entry.actual_result });
    });

    if (reconstructedHistory.length > 1) {
        // Loop through the reconstructed history to simulate past updates to logicPerformance
        // We go from older data to newer data to properly build up accuracy/consistency
        // For this specific initialization, we will only directly impact logic20, as it's the
        // meta-logic that learns from `cauapisun_log.jsonl`
        for (let i = 0; i < reconstructedHistory.length -1; i++) { // Iterate up to the second-to-last entry
            const actualResult = reconstructedHistory[i].result; // The result of the current log entry
            // Simulate history leading up to this log entry.
            // This is a simplified history: `cauLogData` itself.
            // In a real scenario, you'd need the full sessions data for accurate historical context.
            // But for initializing logic20 based on *its* specific learning from cauLogData,
            // we can pass a slice of cauLogData that would have been available at that time.
            const simulatedHistoryForLogic20 = cauLogData.slice(i + 1).map(entry => ({result: entry.actual_result}));
            // We need a proper history object for predictLogic20, but the data inside cauLogData
            // only gives us `actual_result`.
            // For a more accurate replay for *all* logics, you'd need to fetch full session data for each point.
            // As predictLogic20 is designed to learn from `cauLogData`, we pass it the relevant slice.
            if (simulatedHistoryForLogic20.length > 30) { // ensure enough history for logic20
                const logic20_prediction = await predictLogic20(simulatedHistoryForLogic20, logicPerformance, cauLogData.slice(0, i)); // Pass relevant cauLogData
                if (logic20_prediction !== null) {
                    updateLogicPerformance('logic20', logic20_prediction, actualResult);
                }
            }
        }
        console.log("Logic performance initialized for Logic20 from historical cau log data.");
        await saveLogicPerformance(); // Save after initialization
    } else {
        console.log("Not enough historical cau log data to meaningfully initialize logic performance for Logic20.");
    }
}


// Start Fastify server
const start = async () => {
  try {
    await loadLogicPerformance(); // Load existing performance before starting
    await initializeLogicPerformanceFromLog(); // Further initialize logic20's performance from cau log data

    const address = await fastify.listen({ port: PORT, host: "0.0.0.0" }); // Bind to 0.0.0.0 for external access
    console.log(`Server Fastify đang chạy tại ${address}`);
    console.log(`HTTP API (for testing): http://localhost:${PORT}/api/sunwin?key=${API_KEY}`);
    console.log(`History JSON (for testing): http://localhost:${PORT}/api/history-json?key=${API_KEY}`);
    console.log(`WebSocket API (use ws:// with public IP): ws://YOUR_PUBLIC_IP:${PORT}/api/sunwin/taixiu/ws?id=dangduongtool&key=${API_KEY}`);
  } catch (err) {
    console.error("Lỗi khi khởi động server Fastify:", err);
    process.exit(1);
  }
};
start();
function logic25(history) {
  const last5 = history.slice(-5);
  let count = 1;
  for (let i = last5.length - 1; i > 0; i--) {
    if (last5[i] === last5[i - 1]) count++;
    else break;
  }
  if (count >= 3) return last5[last5.length - 1];
  return null;
}

function logic26(history) {
  const last5 = history.slice(-5);
  const taiCount = last5.filter(r => r === 'T').length;
  const xiuCount = last5.filter(r => r === 'X').length;
  if (taiCount >= 7) return 'X'; 
  if (xiuCount >= 7) return 'T'; 
  return null;
}

// WebSocket endpoint for clients to receive predictions
fastify.get("/ws/sunwin", { websocket: true }, (connection, req) => {
  const { key } = req.query;
  if (key !== API_KEY) {
    connection.socket.send(JSON.stringify({ error: "Sai key truy cập WebSocket!" }));
    connection.socket.close();
    return;
  }

  connectedClients.add(connection.socket);
  console.log("Client mới đã kết nối WebSocket.");

  connection.socket.on("close", () => {
    connectedClients.delete(connection.socket);
    console.log("Client đã ngắt kết nối WebSocket.");
  });

  connection.socket.send(JSON.stringify({ message: "Kết nối thành công tới Sunwin WebSocket Server!" }));
});

// --- Add default route to prevent 404 on "/"
fastify.get('/', async (request, reply) => {
  return {
    status: '✅ Server is running!',
    uptime: `${process.uptime().toFixed(2)}s`,
    timestamp: new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
  };
});
