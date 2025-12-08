const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());
const PORT = 3000;

const API_URL = 'https://api.wsktnus8.net/v2/history/getLastResult?gameId=ktrng_3979&size=100&tableId=39791215743193&curPage=1';

// Thời gian update tối thiểu giữa 2 lần gọi API (ms)
let lastUpdate = 0;
const MIN_UPDATE_DELAY = 8000;

// Lưu file
const HISTORY_FILE = path.join(__dirname, 'prediction_history.json');
const CSV_FILE = path.join(__dirname, 'history_data.csv');

let historyData = [];
let lastPrediction = {
    phien: null,
    du_doan: null,
    doan_vi: []
};

// -----------------------------------------
// Load lịch sử dự đoán
function loadPredictionHistory() {
    try {
        if (fs.existsSync(HISTORY_FILE)) {
            return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
        }
    } catch (e) {
        console.error('Lỗi đọc lịch sử:', e.message);
    }
    return [];
}

function savePredictionHistory(data) {
    try {
        fs.writeFileSync(HISTORY_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Lỗi lưu lịch sử:', e.message);
    }
}

function appendPredictionHistory(record) {
    const all = loadPredictionHistory();
    all.push(record);
    savePredictionHistory(all);
}

// -----------------------------------------
// Lưu CSV
function saveHistoryToCSV(history) {
    if (!Array.isArray(history) || history.length === 0) return;

    const header = 'Phien,Xuc_xac_1,Xuc_xac_2,Xuc_xac_3,Tong,Ket_qua\n';

    const rows = history.slice(0, 100).map(item => {
        const a = item.facesList?.[0] || 0;
        const b = item.facesList?.[1] || 0;
        const c = item.facesList?.[2] || 0;
        const sum = item.score || 0;
        const result = getResultType(item);
        return `${item.gameNum},${a},${b},${c},${sum},${result}`;
    }).join('\n');

    try {
        fs.writeFileSync(CSV_FILE, header + rows, 'utf8');
    } catch (e) {
        console.error('Lỗi lưu CSV:', e.message);
    }
}

// -----------------------------------------
// Update lịch sử an toàn (chống spam API)
async function safeUpdateHistory() {
    const now = Date.now();

    // Nếu lần update trước < 8 giây → bỏ qua để tránh 429
    if (now - lastUpdate < MIN_UPDATE_DELAY) return;

    try {
        const res = await axios.get(API_URL, { timeout: 5000 });
        if (res?.data?.data?.resultList) {
            historyData = res.data.data.resultList;
            saveHistoryToCSV(historyData);
            lastUpdate = now;
        }
    } catch (e) {
        console.error('Lỗi cập nhật:', e.message);
    }
}

// -----------------------------------------
function getResultType(session) {
    if (!session || !session.facesList) return "";
    const [a, b, c] = session.facesList;
    if (a === b && b === c) return "Bão";
    return session.score >= 11 ? "Tài" : "Xỉu";
}

function generatePattern(history, len = 10) {
    return history.slice(0, len)
        .map(s => getResultType(s).charAt(0))
        .reverse()
        .join('');
}

function predictMain(history) {
    if (history.length < 10) return "Tài";

    const recent = generatePattern(history, 6);

    if (recent.startsWith("TTT")) return "Xỉu";
    if (recent.startsWith("XXX")) return "Tài";

    const avg = history.slice(0, 5).reduce((acc, s) => acc + s.score, 0) / 5;
    return avg >= 10.5 ? "Tài" : "Xỉu";
}

function calcSumFrequency(history, prediction, top = 3) {
    const range = prediction === "Tài"
        ? [11,12,13,14,15,16,17]
        : [4,5,6,7,8,9,10];

    const freq = {};

    history.forEach(item => {
        const sum = item.score;
        if (range.includes(sum)) {
            freq[sum] = (freq[sum] || 0) + 1;
        }
    });

    const sorted = Object.entries(freq)
        .sort((a,b) => b[1] - a[1])
        .map(e => parseInt(e[0]));

    for (const val of range) {
        if (!sorted.includes(val)) sorted.push(val);
    }

    return sorted.slice(0, top);
}

function calcPredictionAccuracy(predHistory) {
    const stats = {};

    predHistory.forEach(rec => {
        if (!rec.doan_vi || !rec.ket_qua_thuc) return;

        rec.doan_vi.forEach(sum => {
            if (!stats[sum]) stats[sum] = {correct:0, total:0};
            stats[sum].total++;
            if (rec.du_doan === rec.ket_qua_thuc) stats[sum].correct++;
        });
    });

    const accuracy = {};
    Object.entries(stats).forEach(([sum, obj]) => {
        accuracy[sum] = obj.total > 0 ? (obj.correct / obj.total) : 0;
    });

    return accuracy;
}

function predictTopSumsWithAccuracy(prediction, history, predHistory, top=3) {
    const sumsFreq = calcSumFrequency(history, prediction, 10);
    const accuracy = calcPredictionAccuracy(predHistory);

    const sorted = sumsFreq.sort((a,b) => {
        const accA = accuracy[a] || 0;
        const accB = accuracy[b] || 0;
        return accB - accA;
    });

    return sorted.slice(0, top);
}

// -----------------------------------------
// Ghi kết quả thực tế
app.post('/report-result', (req, res) => {
    const { phien, ket_qua_thuc } = req.body;

    if (!phien || !ket_qua_thuc) {
        return res.status(400).json({ error: "Thiếu phien hoặc ket_qua_thuc" });
    }

    const predHist = loadPredictionHistory();
    const idx = predHist.findIndex(p => p.phien === phien);

    if (idx === -1) return res.status(404).json({ error: "Không tìm thấy dự đoán phiên này" });

    predHist[idx].ket_qua_thuc = ket_qua_thuc;
    savePredictionHistory(predHist);

    res.json({ success: true });
});

// -----------------------------------------
// Endpoint dự đoán
app.get('/predict', async (req, res) => {
    await safeUpdateHistory();

    const latest = historyData[0] || {};
    const currentPhien = latest.gameNum;
    const predHist = loadPredictionHistory();

    if (currentPhien !== lastPrediction.phien) {
        const du_doan = predictMain(historyData);
        const doan_vi = predictTopSumsWithAccuracy(du_doan, historyData, predHist, 3);

        lastPrediction = { phien: currentPhien, du_doan, doan_vi };

        appendPredictionHistory({
            phien: currentPhien,
            du_doan,
            doan_vi,
            ket_qua_thuc: null,
            timestamp: Date.now()
        });
    }

    res.json({
        Id: "binhtool90",
        Phien: currentPhien ? parseInt(currentPhien.replace('#', '')) + 1 : 0,
        Xuc_xac_1: latest.facesList?.[0] || 0,
        Xuc_xac_2: latest.facesList?.[1] || 0,
        Xuc_xac_3: latest.facesList?.[2] || 0,
        Tong: latest.score || 0,
        Ket_qua: getResultType(latest),
        Pattern: generatePattern(historyData),
        Du_doan: lastPrediction.du_doan,
        doan_vi: lastPrediction.doan_vi
    });
});

// -----------------------------------------
// Endpoint lấy lịch sử
app.get('/history', async (req, res) => {
    await safeUpdateHistory();

    const data = historyData.slice(0, 100).map(item => ({
        Phien: item.gameNum,
        Xuc_xac_1: item.facesList?.[0] || 0,
        Xuc_xac_2: item.facesList?.[1] || 0,
        Xuc_xac_3: item.facesList?.[2] || 0,
        Tong: item.score || 0,
        Ket_qua: getResultType(item)
    }));

    res.json({
        Id: "Dwong1410",
        Tong_phien: data.length,
        Pattern: generatePattern(historyData),
        Lich_su: data
    });
});

// -----------------------------------------
// Khởi động server + cron update
app.listen(PORT, () => {
    console.log(`🤖 Server dự đoán chạy tại http://localhost:${PORT}`);
    setInterval(safeUpdateHistory, 12000); // update 12 giây / lần
});
