const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

const API_URL = 'https://api.wsktnus8.net/v2/history/getLastResult?gameId=ktrng_3979&size=100&tableId=39791215743193&curPage=1';

let lastUpdate = 0;
const MIN_UPDATE_DELAY = 15000; // 15 giây

const HISTORY_FILE = path.join(__dirname, 'prediction_history.json');
const CSV_FILE = path.join(__dirname, 'history_data.csv');

let historyData = [];
let lastPrediction = {
    phien: null,
    du_doan: null,
    doan_vi: []
};

// -------------------------------------
// Lịch sử dự đoán
function loadPredictionHistory() {
    try {
        if (fs.existsSync(HISTORY_FILE)) {
            return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
        }
    } catch (e) {
        console.error("Lỗi load lịch sử:", e.message);
    }
    return [];
}

function savePredictionHistory(data) {
    try {
        fs.writeFileSync(HISTORY_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("Lỗi save lịch sử:", e.message);
    }
}

function appendPredictionHistory(record) {
    const all = loadPredictionHistory();
    all.push(record);
    savePredictionHistory(all);
}

// -------------------------------------
// Lưu CSV
function saveHistoryToCSV(history) {
    if (!history.length) return;

    const header = 'Phien,X1,X2,X3,Tong,Ket_qua\n';

    const rows = history.slice(0, 100).map(item => {
        const a = item.facesList?.[0] || 0;
        const b = item.facesList?.[1] || 0;
        const c = item.facesList?.[2] || 0;
        const sum = item.score || 0;
        const ketqua = getResultType(item);
        return `${item.gameNum},${a},${b},${c},${sum},${ketqua}`;
    }).join('\n');

    try {
        fs.writeFileSync(CSV_FILE, header + rows, 'utf8');
    } catch (e) {
        console.error("Lỗi lưu CSV:", e.message);
    }
}

// -------------------------------------
// Update API an toàn
async function safeUpdateHistory() {
    const now = Date.now();
    if (now - lastUpdate < MIN_UPDATE_DELAY) return;

    try {
        const res = await axios.get(API_URL, { timeout: 5000 });

        if (res?.data?.data?.resultList) {
            historyData = res.data.data.resultList;
            saveHistoryToCSV(historyData);
            lastUpdate = now;
            console.log("✓ Cập nhật API thành công");
        }
    } catch (e) {
        console.error("Lỗi cập nhật:", e.message);
    }
}

// -------------------------------------
function getResultType(s) {
    if (!s?.facesList) return "";
    const [a, b, c] = s.facesList;
    if (a === b && b === c) return "Bão";
    return s.score >= 11 ? "Tài" : "Xỉu";
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

    const avg = history.slice(0, 5).reduce((a,b) => a + b.score, 0) / 5;
    return avg >= 10.5 ? "Tài" : "Xỉu";
}

function calcSumFrequency(history, prediction) {
    const range = prediction === "Tài"
        ? [11,12,13,14,15,16,17]
        : [4,5,6,7,8,9,10];

    const freq = {};

    history.forEach(item => {
        if (range.includes(item.score)) {
            freq[item.score] = (freq[item.score] || 0) + 1;
        }
    });

    return Object.keys(freq).map(n => parseInt(n));
}

function predictTopSums(history, prediction) {
    const sums = calcSumFrequency(history, prediction);
    return sums.slice(0, 3);
}

// -------------------------------------
// report-result
app.post('/report-result', (req, res) => {
    const { phien, ket_qua_thuc } = req.body;

    if (!phien || !ket_qua_thuc) {
        return res.status(400).json({ error: "Thiếu dữ liệu" });
    }

    const pred = loadPredictionHistory();
    const idx = pred.findIndex(p => p.phien === phien);

    if (idx === -1) return res.status(404).json({ error: "Không tìm thấy phiên" });

    pred[idx].ket_qua_thuc = ket_qua_thuc;

    savePredictionHistory(pred);

    res.json({ success: true });
});

// -------------------------------------
// predict (KHÔNG gọi API)
app.get('/predict', (req, res) => {
    const latest = historyData[0] || {};
    const phien = latest.gameNum || "0";

    const predHist = loadPredictionHistory();

    if (phien !== lastPrediction.phien) {
        const du_doan = predictMain(historyData);
        const doan_vi = predictTopSums(historyData, du_doan);

        lastPrediction = { phien, du_doan, doan_vi };

        appendPredictionHistory({
            phien,
            du_doan,
            doan_vi,
            ket_qua_thuc: null,
            timestamp: Date.now()
        });
    }

    res.json({
        Id: "binhtool90",
        Phien: parseInt(phien.replace("#", "")) + 1 || 0,
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

// -------------------------------------
// history (KHÔNG gọi API)
app.get('/history', (req, res) => {
    const data = historyData.slice(0, 100).map(item => ({
        Phien: item.gameNum,
        X1: item.facesList?.[0] || 0,
        X2: item.facesList?.[1] || 0,
        X3: item.facesList?.[2] || 0,
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

// -------------------------------------
// Khởi động server
app.listen(PORT, () => {
    console.log(`🤖 Server chạy tại PORT ${PORT}`);

    // Chờ 5 giây cho server ổn định rồi mới bắt đầu update
    setTimeout(() => {

        safeUpdateHistory(); // Gọi 1 lần khi start

        // Sau đó update đúng 15 giây/lần
        setInterval(safeUpdateHistory, MIN_UPDATE_DELAY);

    }, 5000);
});
