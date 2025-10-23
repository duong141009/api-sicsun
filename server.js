import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

// Lưu pattern gần nhất (tối đa 20)
let patternHistory = "";

function updatePattern(result) {
  if (patternHistory.length >= 20) {
    patternHistory = patternHistory.slice(1);
  }
  patternHistory += result;
}

function getTaiXiu(sum) {
  return sum >= 11 ? 'Tài' : 'Xỉu';
}

function advancedPredictPattern(history) {
  if (history.length < 6) return { du_doan: "Chưa đủ dữ liệu", do_tin_cay: 0 };

  // Đếm chuỗi bệt gần nhất
  let lastChar = history[history.length - 1];
  let streakCount = 1;
  for (let i = history.length - 2; i >= 0; i--) {
    if (history[i] === lastChar) {
      streakCount++;
    } else {
      break;
    }
  }

  // Nếu bệt >= 3 → Dự đoán bệt tiếp tục
  if (streakCount >= 3) {
    return {
      du_doan: lastChar === 't' ? "Tài (Bệt)" : "Xỉu (Bệt)",
      do_tin_cay: 90
    };
  }

  // Kiểm tra pattern lặp lại (4 phiên gần đây)
  const patternLength = 4;
  const recentPattern = history.slice(-patternLength);
  let foundPattern = false;

  for (let i = history.length - patternLength * 2; i >= 0; i--) {
    if (history.slice(i, i + patternLength) === recentPattern) {
      foundPattern = true;
      break;
    }
  }

  if (foundPattern) {
    // Pattern đang lặp lại
    const nextChar = recentPattern[0];
    return {
      du_doan: nextChar === 't' ? "Tài (Lặp Pattern)" : "Xỉu (Lặp Pattern)",
      do_tin_cay: 70
    };
  }

  // Kiểm tra cầu giằng co
  const lastSix = history.slice(-6);
  if (/^(tx){3}$/.test(lastSix) || /^(xt){3}$/.test(lastSix)) {
    return {
      du_doan: lastChar === 't' ? "Xỉu (Giằng co)" : "Tài (Giằng co)",
      do_tin_cay: 60
    };
  }

  // Không rõ cầu → Đoán ngược
  return {
    du_doan: lastChar === 't' ? "Xỉu (Đảo cầu)" : "Tài (Đảo cầu)",
    do_tin_cay: 50
  };
}

app.get('/api/taixiu/lottery', async (req, res) => {
  try {
    const response = await fetch('https://1.bot/GetNewLottery/LT_TaixiuMD5');
    const json = await response.json();

    if (!json || json.state !== 1) {
      return res.status(500).json({ error: 'Dữ liệu không hợp lệ' });
    }

    const data = json.data;
    const dice = data.OpenCode.split(',').map(Number);
    const [d1, d2, d3] = dice;
    const sum = d1 + d2 + d3;
    const ket_qua = getTaiXiu(sum);
    const patternChar = ket_qua === "Tài" ? "t" : "x";

    updatePattern(patternChar);

    const { du_doan, do_tin_cay } = advancedPredictPattern(patternHistory);

    return res.json({
      id: "binhtool90",
      Phien: data.Expect,
      Xuc_xac_1: d1,
      Xuc_xac_2: d2,
      Xuc_xac_3: d3,
      Tong: sum,
      Ket_qua: ket_qua,
      Pattern: patternHistory,
      Du_doan: du_doan,
      Do_tin_cay: do_tin_cay + "%"
    });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi khi fetch dữ liệu', details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server đang chạy tại http://localhost:${PORT}`);
});
