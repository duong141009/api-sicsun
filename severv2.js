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

// Function to save logicPerformance to file
}

// Function to load logicPerformance from file
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

            // Trigger broadcast of new prediction after a new session is added to DB          }
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

// --- Prediction Logics (Upgraded & New) ---

// Logic 1: (Last session's last digit + last session's total) Even/Odd with historical trend
      totalCount++;
    }
  }

  if (totalCount > 5 && (correctCount / totalCount) >= 0.65) {
    return currentPrediction;
  }
  return null;
}

// Logic 2: Trend/Counter-trend based on historical analysis with dynamic threshold and time weighting
    if ((isEvenSID && session.result === "Tài") || (!isEvenSID && session.result === "Xỉu")) { // Even SID -> Tài, Odd SID -> Xỉu
      nghichScore += weight;
    }
  }

  const currentSessionIsEven = nextSessionId % 2 === 0;
  const totalScore = thuanScore + nghichScore;

  if (totalScore < 10) return null; // Not enough data points

  const thuanRatio = thuanScore / totalScore;
  const nghichRatio = nghichScore / totalScore;

  if (thuanRatio > nghichRatio + 0.15) { // If 'Thuan' trend is significantly stronger
    return currentSessionIsEven ? "Xỉu" : "Tài";
  } else if (nghichRatio > thuanRatio + 0.15) { // If 'Nghich' trend is significantly stronger
    return currentSessionIsEven ? "Tài" : "Xỉu";
  }
  return null;
}

// Logic 3: Average of last X session totals with standard deviation and trend prediction
  }

  if (average < 10.5 - (deviationFactor * stdDev) && isFalling) {
    return "Xỉu";
  } else if (average > 10.5 + (deviationFactor * stdDev) && isRising) {
    return "Tài";
  }
  return null;
}

// Logic 4: Pattern Matching (Based on result sequences)
      }
    }

    if (totalMatches < 3) continue; // Need at least 3 matches for a reliable prediction

    const taiConfidence = taiFollows / totalMatches;
    const xiuConfidence = xiuFollows / totalMatches;

    const MIN_PATTERN_CONFIDENCE = 0.70;

    if (taiConfidence >= MIN_PATTERN_CONFIDENCE && taiConfidence > maxConfidence) {
      maxConfidence = taiConfidence;
      bestPrediction = "Tài";
    } else if (xiuConfidence >= MIN_PATTERN_CONFIDENCE && xiuConfidence > maxConfidence) {
      maxConfidence = xiuConfidence;
      bestPrediction = "Xỉu";
    }
  }
  return bestPrediction;
}

// Logic 5: Dice total frequency distribution (Weighted by recency and peak detection)

  let mostFrequentSum = -1;
  let maxWeightedCount = 0;

  for (const sum in sumCounts) {
    if (sumCounts[sum] > maxWeightedCount) {
      maxWeightedCount = sumCounts[sum];
      mostFrequentSum = parseInt(sum);
    }
  }

  if (mostFrequentSum !== -1) {
    const minWeightedCountRatio = 0.08; // Minimum threshold for a sum to be considered significant
    const totalWeightedSum = Object.values(sumCounts).reduce((a, b) => a + b, 0);

    if (totalWeightedSum > 0 && (maxWeightedCount / totalWeightedSum) > minWeightedCountRatio) {
      // Check if it's a "peak" (i.e., its neighbors have significantly lower counts)
      const neighbors = [];
      if (sumCounts[mostFrequentSum - 1]) neighbors.push(sumCounts[mostFrequentSum - 1]);
      if (sumCounts[mostFrequentSum + 1]) neighbors.push(sumCounts[mostFrequentSum + 1]);

      const isPeak = neighbors.every(n => maxWeightedCount > n * 1.05); // 5% higher than neighbors

      if (isPeak) {
        if (mostFrequentSum <= 10) return "Xỉu";
        if (mostFrequentSum >= 11) return "Tài";
      }
    }
  }
  return null;
}

// Logic 6: Correlation between last session ID's last digit and Total
    }
  }

  const totalVotes = taiVotes + xiuVotes;
  if (totalVotes < 5) return null; // Not enough matching patterns

  const voteDifferenceRatio = Math.abs(taiVotes - xiuVotes) / totalVotes;

  if (voteDifferenceRatio > 0.25) { // If there's a significant bias
    if (taiVotes > xiuVotes) return "Tài";
    if (xiuVotes > taiVotes) return "Xỉu";
  }
  return null;
}

// Logic 7: Trend Following (Streaks)
  }
  if (recentResults.every(r => r === "Xỉu")) {
    const nextFew = history.slice(effectiveStreakLength, effectiveStreakLength + 2);
    if (nextFew.length === 2 && nextFew.filter(s => s.result === "Xỉu").length >= 1) {
      return "Xỉu";
    }
  }
  return null;
}

// Logic 8: Mean Reversion / Volatility Analysis
  }

  // Predict reversal if current total deviates significantly and there's a recent strong trend
  if (lastSessionTotal > longTermAverage + dynamicDeviationThreshold && isLast5Rising) {
    return "Xỉu"; // Reversion to mean
  }
  else if (lastSessionTotal < longTermAverage - dynamicDeviationThreshold && isLast5Falling) {
    return "Tài"; // Reversion to mean
  }

  return null;
}

// Logic 9: Consecutive Counter
    maxTaiStreak = Math.max(maxTaiStreak, currentTaiStreakForHistory);
    maxXiuStreak = Math.max(maxXiuStreak, currentXiuStreakForHistory);
  }

  const dynamicThreshold = Math.max(4, Math.floor(Math.max(maxTaiStreak, maxXiuStreak) * 0.5)); // Predict reversal if current streak approaches historical max

  const mostRecentResult = history[0].result;
  let currentConsecutiveCount = 0;
  for (let i = 0; i < history.length; i++) {
    if (history[i].result === mostRecentResult) {
      currentConsecutiveCount++;
    } else {
      break;
    }
  }

  if (currentConsecutiveCount >= dynamicThreshold) {
    // If current streak is long enough, check historical tendencies after such streaks
    if (currentConsecutiveCount >= 3) { // Only analyze reversals for streaks of 3 or more
      let totalReversals = 0;
      let totalContinuations = 0;
      // Search for past instances of similar streaks
      for (let i = currentConsecutiveCount; i < history.length - currentConsecutiveCount; i++) {
        const potentialStreak = history.slice(i, i + currentConsecutiveCount);
        if (potentialStreak.every(s => s.result === mostRecentResult)) {
          if (history[i - 1] && history[i - 1].result !== mostRecentResult) { // If the streak broke
            totalReversals++;
          } else if (history[i - 1] && history[i - 1].result === mostRecentResult) { // If the streak continued
             totalContinuations++;
          }
        }
      }
      if (totalReversals + totalContinuations > 3 && totalReversals > totalContinuations * 1.3) { // If reversals are significantly more common
        return mostRecentResult === "Tài" ? "Xỉu" : "Tài"; // Predict reversal
      }
    }
  }
  return null;
}

// Logic 10: Streak Momentum
    }
  }
  if (recentResults.every(r => r === "Xỉu")) {
    const xiuCountInWider = widerHistory.filter(r => r === "Xỉu").length;
    if (xiuCountInWider / STABILITY_CHECK_LENGTH >= 0.75) {
      if (predictLogic9(history) !== "Tài") {
        return "Xỉu";
      }
    }
  }
  return null;
}

// Logic 11: Reversal Patterns
        }
      }

      if (totalPatternOccurrences < patternDef.minOccurrences) continue; // Not enough historical occurrences

      const patternAccuracy = matchCount / totalPatternOccurrences;
      if (patternAccuracy >= 0.68) { // If historical accuracy is high
        const weightedConfidence = patternAccuracy * patternDef.weight;
        if (weightedConfidence > maxWeightedConfidence) {
          maxWeightedConfidence = weightedConfidence;
          bestPatternMatch = patternDef.predict;
        }
      }
    }
  }
  return bestPatternMatch;
}

// Logic 12: Even/Odd SID and Streak Counter with Adaptive Window
  }

  let taiVotes = 0;
  let xiuVotes = 0;

  const analysisWindow = Math.min(history.length, 250);
  for (let i = 0; i < analysisWindow - 1; i++) {
    const currentHistSession = history[i];
    const prevHistSession = history[i + 1];
    const prevHistSessionParity = prevHistSession.sid % 2;

    let histConsecutiveCount = 0;
    for (let j = i + 1; j < analysisWindow; j++) {
      if (history[j].result === prevHistSession.result) {
        histConsecutiveCount++;
      } else {
        break;
      }
    }

    // Match both SID parity and current streak length
    if (prevHistSessionParity === nextSessionParity && histConsecutiveCount === currentConsecutiveCount) {
      if (currentHistSession.result === "Tài") {
        taiVotes++;
      } else {
        xiuVotes++;
      }
    }
  }

  const totalVotes = taiVotes + xiuVotes;
  if (totalVotes < 6) return null; // Need sufficient matching historical contexts

  if (taiVotes / totalVotes >= 0.68) return "Tài";
  if (xiuVotes / totalVotes >= 0.68) return "Xỉu";

  return null;
}

// Logic 13: Adaptive Streak Predictor
  }

  if (currentStreakLength < 1) return null;

  const streakStats = {}; // Stores how often a streak of length X led to Tài/Xỉu
  const analysisWindow = Math.min(history.length, 500);

  for (let i = 0; i < analysisWindow - 1; i++) {
    const sessionResult = history[i].result; // Result AFTER the streak
    const prevSessionResult = history[i + 1].result; // Result starting the streak

    let tempStreakLength = 1;
    for (let j = i + 2; j < analysisWindow; j++) {
      if (history[j].result === prevSessionResult) {
        tempStreakLength++;
      } else {
        break;
      }
    }

    if (tempStreakLength > 0) {
      const streakKey = `${prevSessionResult}_${tempStreakLength}`;
      if (!streakStats[streakKey]) {
        streakStats[streakKey] = { 'Tài': 0, 'Xỉu': 0 };
      }
      streakStats[streakKey][sessionResult]++;
    }
  }

  const currentStreakKey = `${mostRecentResult}_${currentStreakLength}`;
  if (streakStats[currentStreakKey]) {
    const stats = streakStats[currentStreakKey];
    const totalFollowUps = stats['Tài'] + stats['Xỉu'];

    if (totalFollowUps < 5) return null; // Need enough historical follow-ups

    const taiProb = stats['Tài'] / totalFollowUps;
    const xiuProb = stats['Xỉu'] / totalFollowUps;

    const CONFIDENCE_THRESHOLD = 0.65;

    if (taiProb >= CONFIDENCE_THRESHOLD) {
      return "Tài";
    } else if (xiuProb >= CONFIDENCE_THRESHOLD) {
      return "Xỉu";
    }
  }
  return null;
}

// Logic 14: Moving Average Deviation
  }
  else if (shortAvg < longAvg - (longStdDev * 0.8)) { // Significantly below long-term average
    const last2Results = history.slice(0, 2).map(s => s.result);
    if (last2Results.length === 2 && last2Results.every(r => r === "Xỉu")) { // If last two were Xỉu (momentum down)
      return "Tài"; // Predict reversal
    }
  }
  return null;
}

// Logic 15: Even/Odd Total Group Analysis
  }

  if (totalEven < 20 || totalOdd < 20) return null; // Need sufficient data for both even/odd totals

  const lastSessionTotal = history[0].total;
  const isLastTotalEven = lastSessionTotal % 2 === 0;

  const minDominance = 0.65; // A result type must dominate within its parity group

  if (isLastTotalEven) {
    if (evenCounts["Tài"] / totalEven >= minDominance) return "Tài";
    if (evenCounts["Xỉu"] / totalEven >= minDominance) return "Xỉu";
  } else {
    if (oddCounts["Tài"] / totalOdd >= minDominance) return "Tài";
    if (oddCounts["Xỉu"] / totalOdd >= minDominance) return "Xỉu";
  }
  return null;
}

// Logic 16: Total Modulo Pattern
    moduloPatterns[moduloValue][currentSessionResult]++;
  }

  const lastSessionTotal = history[0].total;
  const currentModuloValue = lastSessionTotal % MODULO_N;

  if (moduloPatterns[currentModuloValue]) {
    const stats = moduloPatterns[currentModuloValue];
    const totalCount = stats['Tài'] + stats['Xỉu'];

    if (totalCount < 7) return null; // Need sufficient historical occurrences for this modulo value

    const taiProb = stats['Tài'] / totalCount;
    const xiuProb = stats['Xỉu'] / totalCount;

    const CONFIDENCE_THRESHOLD = 0.65;

    if (taiProb >= CONFIDENCE_THRESHOLD) {
      return "Tài";
    } else if (xiuProb >= CONFIDENCE_THRESHOLD) {
      return "Xỉu";
    }
  }
  return null;
}

// LOGIC 17: Historical Total Distribution Anomaly Detection

  const meanTotal = totals.reduce((a, b) => a + b, 0) / totals.length;
  const stdDevTotal = calculateStdDev(totals);

  const lastSessionTotal = history[0].total;

  const deviation = Math.abs(lastSessionTotal - meanTotal);
  const zScore = stdDevTotal > 0 ? deviation / stdDevTotal : 0;

  const Z_SCORE_THRESHOLD = 1.5; // If current total is 1.5 standard deviations away from the mean

  if (zScore >= Z_SCORE_THRESHOLD) {
    if (lastSessionTotal > meanTotal) { // If unusually high
      return "Xỉu"; // Predict reversion
    } else { // If unusually low
      return "Tài"; // Predict reversion
    }
  }
  return null;
}

// LOGIC 18: Consecutive Dice Parity Analysis
    patternStats[patternKey][currentSessionResult]++;
  }

  const lastSession = history[0];
  const currentP1 = lastSession.d1 % 2;
  const currentP2 = lastSession.d2 % 2;
  const currentP3 = lastSession.d3 % 2;
  const currentPatternKey = `${currentP1}-${currentP2}-${currentP3}`;

  if (patternStats[currentPatternKey]) {
    const stats = patternStats[currentPatternKey];
    const totalCount = stats['Tài'] + stats['Xỉu'];

    if (totalCount < 8) return null; // Need sufficient historical occurrences for this pattern

    const taiProb = stats['Tài'] / totalCount;
    const xiuProb = stats['Xỉu'] / totalCount;

    const CONFIDENCE_THRESHOLD = 0.65;

    if (taiProb >= CONFIDENCE_THRESHOLD) {
      return "Tài";
    } else if (xiuProb >= CONFIDENCE_THRESHOLD) {
      return "Xỉu";
    }
  }
  return null;
}

// LOGIC 19: Time-Weighted Average Prediction
  }

  const totalScore = taiScore + xiuScore;
  if (totalScore < 10) return null; // Not enough weighted data

  const taiRatio = taiScore / totalScore;
  const xiuRatio = xiuScore / totalScore;

  const BIAS_THRESHOLD = 0.10; // If one result type has 10% more weighted score

  if (taiRatio > xiuRatio + BIAS_THRESHOLD) {
    return "Tài";
  } else if (xiuRatio > taiRatio + BIAS_THRESHOLD) {
    return "Xỉu";
  }
  return null;
}

// LOGIC 21: Multi-Window V3
// Sub-function: Markov Chain Weighted V3
function markovWeightedV3(patternArr) {
  if (patternArr.length < 3) return null;
  const transitions = {};
  const lastResult = patternArr[patternArr.length - 1];
  const secondLastResult = patternArr.length > 1 ? patternArr[patternArr.length - 2] : null;

  for (let i = 0; i < patternArr.length - 1; i++) {
    const current = patternArr[i];
    const next = patternArr[i + 1];
    const key = current + next;
    if (!transitions[key]) {
      transitions[key] = { 'T': 0, 'X': 0 };
    }
    if (i + 2 < patternArr.length) { // Predict the result after "current-next"
      transitions[key][patternArr[i + 2]]++;
    }
  }

  if (secondLastResult && lastResult) {
    const currentTransitionKey = secondLastResult + lastResult;
    if (transitions[currentTransitionKey]) {
      const stats = transitions[currentTransitionKey];
      const total = stats['T'] + stats['X'];
      if (total > 3) {
        if (stats['T'] / total > 0.60) return "Tài";
        if (stats['X'] / total > 0.60) return "Xỉu";
      }
    }
  }
  return null;
}

// Sub-function: Repeating Pattern V3
function repeatingPatternV3(patternArr) {
  if (patternArr.length < 4) return null;
  const lastThree = patternArr.slice(-3).join('');
  const lastFour = patternArr.slice(-4).join('');

  let taiFollows = 0;
  let xiuFollows = 0;
  let totalMatches = 0;

  for (let i = 0; i < patternArr.length - 4; i++) {
    const sliceThree = patternArr.slice(i, i + 3).join('');
    const sliceFour = patternArr.slice(i, i + 4).join('');

    let isMatch = false;
    if (lastThree === sliceThree) { // Match last 3
      isMatch = true;
    } else if (lastFour === sliceFour) { // Match last 4
      isMatch = true;
    }

    if (isMatch && i + 4 < patternArr.length) {
      totalMatches++;
      if (patternArr[i + 4] === 'T') {
        taiFollows++;
      } else {
        xiuFollows++;
      }
    }
  }

  if (totalMatches < 3) return null;
  if (taiFollows / totalMatches > 0.65) return "Tài";
  if (xiuFollows / totalMatches > 0.65) return "Xỉu";
  return null;
}

// Sub-function: Detect Bias V3
function detectBiasV3(patternArr) {
  if (patternArr.length < 5) return null;
  let taiCount = 0;
  let xiuCount = 0;

  patternArr.forEach(result => {
    if (result === 'T') taiCount++;
    else xiuCount++;
  });

  const total = taiCount + xiuCount;
  if (total === 0) return null;

  const taiRatio = taiCount / total;
  const xiuRatio = xiuCount / total;

  if (taiRatio > 0.60) return "Tài";
  if (xiuRatio > 0.60) return "Xỉu";
  return null;
}

// Logic 21: Combines Multi-Window V3 strategies

    // Repeating Pattern Prediction
    const repeatRes = repeatingPatternV3(subPattern.slice().reverse()); // Pass a copy and reverse for repeat pattern
    if (repeatRes) {
      voteCounts[repeatRes] += weight * 0.15;
      totalWeightSum += weight * 0.15;
    }

    // Bias Detection
    const biasRes = detectBiasV3(subPattern);
    if (biasRes) {
      voteCounts[biasRes] += weight * 0.15;
      totalWeightSum += weight * 0.15;
    }
  }

  if (totalWeightSum === 0) return null;

  if (voteCounts.Tài > voteCounts.Xỉu * 1.08) { // If Tai has significantly more weighted votes
    return "Tài";
  } else if (voteCounts.Xỉu > voteCounts.Tài * 1.08) { // If Xiu has significantly more weighted votes
    return "Xỉu";
  } else {
    return null;
  }
}

// LOGIC 22: Super-powered Cau Analysis Logic (NEW)
// This logic aims to identify complex 'cau' (patterns/streaks) and their historical outcomes.
// It combines several sub-strategies for a robust pattern analysis.
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

async         contributingLogicsNames.add(signal.logic); // Add to set
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
  if (count >= 3) return last5[last5.length - 1];
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
