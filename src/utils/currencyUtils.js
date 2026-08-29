/**
 * Smart currency and duration parser and formatter
 */

function parseCurrency(input) {
  if (input === null || input === undefined) return 0;
  if (typeof input === "number") return isNaN(input) ? 0 : Math.max(0, Math.floor(input));

  let str = input.toString().toLowerCase().trim();
  if (!str || str === "-" || str === "0") return 0;

  // Hapus prefix Rp, IDR, spasi
  str = str.replace(/^rp\s*|^idr\s*/i, "").trim();

  // Deteksi format 'k' / 'rb' / 'ribu' (misal: 500k, 250rb, 50ribu)
  if (/[0-9.,]+\s*(k|rb|ribu)$/i.test(str)) {
    const numPart = str.replace(/(k|rb|ribu)$/i, "").trim().replace(/,/g, ".");
    const val = parseFloat(numPart);
    return isNaN(val) ? 0 : Math.round(val * 1000);
  }

  // Deteksi format 'jt' / 'm' / 'juta' (misal: 1.5jt, 2m, 1juta)
  if (/[0-9.,]+\s*(jt|juta|m)$/i.test(str)) {
    const numPart = str.replace(/(jt|juta|m)$/i, "").trim().replace(/,/g, ".");
    const val = parseFloat(numPart);
    return isNaN(val) ? 0 : Math.round(val * 1000000);
  }

  // Deteksi format angka dengan titik pemisah ribuan (misal: 500.000 atau 1.500.000)
  if (/^\d{1,3}(\.\d{3})+$/.test(str)) {
    const clean = str.replace(/\./g, "");
    const val = parseInt(clean, 10);
    return isNaN(val) ? 0 : val;
  }

  // Deteksi format angka biasa dengan pemisah koma atau titik desimal
  const cleaned = str.replace(/[^0-9]/g, "");
  const val = parseInt(cleaned, 10);
  return isNaN(val) ? 0 : val;
}

function formatRupiah(amount) {
  const num = typeof amount === "number" ? amount : parseCurrency(amount);
  if (num === 0) return "Rp 0";
  return `Rp ${num.toLocaleString("id-ID")}`;
}

function calculatePaymentDetails(totalInput, dpInput) {
  const total = parseCurrency(totalInput);
  let dp = 0;
  if (dpInput !== undefined && dpInput !== null && dpInput !== "") {
    dp = parseCurrency(dpInput);
  } else {
    dp = total;
  }

  const sisa = Math.max(0, total - dp);
  const isLunas = sisa === 0 && total > 0;
  const isZero = total === 0;

  let statusText = "Lunas";
  if (isZero) {
    statusText = "Sesuai Kesepakatan / Belum Diatur";
  } else if (dp === 0) {
    statusText = `Belum Bayar (Sisa: ${formatRupiah(total)})`;
  } else if (!isLunas) {
    const percent = Math.round((dp / total) * 100);
    statusText = `DP Terbayar ${percent}% (Sisa: ${formatRupiah(sisa)})`;
  }

  return {
    total,
    dp,
    sisa,
    isLunas,
    isZero,
    statusText,
    totalFormatted: isZero ? "Sesuai kesepakatan" : formatRupiah(total),
    dpFormatted: isZero ? "Rp 0" : formatRupiah(dp),
    sisaFormatted: isZero ? "Rp 0" : formatRupiah(sisa),
  };
}

function parseDuration(input) {
  if (!input) return { ms: 7 * 24 * 60 * 60 * 1000, durationText: "7 Hari", days: 7, hours: 168 };
  const str = input.toString().toLowerCase().trim();

  // Deteksi jam: 24h, 24 jam, 12jam, 48h, 1.5h
  if (/[0-9.,]+\s*(h|jam|hour|hours)$/i.test(str)) {
    const num = parseFloat(str.replace(/(h|jam|hour|hours)$/i, "").trim().replace(/,/g, "."));
    const hours = isNaN(num) || num <= 0 ? 24 : num;
    const ms = Math.round(hours * 60 * 60 * 1000);
    return {
      ms,
      days: hours / 24,
      hours,
      durationText: `${hours} Jam`,
    };
  }

  // Deteksi hari: 7d, 7 hari, 14hari, 30days
  if (/[0-9.,]+\s*(d|hari|day|days)$/i.test(str)) {
    const num = parseFloat(str.replace(/(d|hari|day|days)$/i, "").trim().replace(/,/g, "."));
    const days = isNaN(num) || num <= 0 ? 7 : num;
    const ms = Math.round(days * 24 * 60 * 60 * 1000);
    return {
      ms,
      days,
      hours: days * 24,
      durationText: `${days} Hari`,
    };
  }

  // Deteksi menit (misal: 30m, 10 menit)
  if (/[0-9.,]+\s*(m|menit|min|mins|minute|minutes)$/i.test(str)) {
    const num = parseFloat(str.replace(/(m|menit|min|mins|minute|minutes)$/i, "").trim().replace(/,/g, "."));
    const minutes = isNaN(num) || num <= 0 ? 30 : num;
    const ms = Math.round(minutes * 60 * 1000);
    return {
      ms,
      days: minutes / (24 * 60),
      hours: minutes / 60,
      durationText: `${minutes} Menit`,
    };
  }

  // Default: Angka murni dianggap hari
  const pureNum = parseFloat(str.replace(/,/g, "."));
  const days = isNaN(pureNum) || pureNum <= 0 ? 7 : pureNum;
  const ms = Math.round(days * 24 * 60 * 60 * 1000);
  return {
    ms,
    days,
    hours: days * 24,
    durationText: `${days} Hari`,
  };
}

function modifyDuration(currentExpiryMs, inputStr) {
  if (!inputStr) {
    return {
      newExpiryMs: currentExpiryMs,
      operationType: "none",
      changeText: "Tidak ada perubahan",
      durationText: "0 Hari",
    };
  }

  const str = inputStr.toString().trim();
  const now = Date.now();
  const baseExpiry = Math.max(now, currentExpiryMs || now);

  // 1. Subtraction (-1d, -24h)
  if (str.startsWith("-")) {
    const rawVal = str.slice(1).trim();
    const parsed = parseDuration(rawVal);
    const newExpiryMs = Math.max(now + 5 * 60 * 1000, baseExpiry - parsed.ms);
    return {
      newExpiryMs,
      operationType: "subtract",
      changeText: `Dikurangi ${parsed.durationText}`,
      durationText: parsed.durationText,
    };
  }

  // 2. Addition (+3d, +24h)
  if (str.startsWith("+")) {
    const rawVal = str.slice(1).trim();
    const parsed = parseDuration(rawVal);
    const newExpiryMs = baseExpiry + parsed.ms;
    return {
      newExpiryMs,
      operationType: "add",
      changeText: `Ditambah ${parsed.durationText} (Diperpanjang)`,
      durationText: parsed.durationText,
    };
  }

  // 3. Set total duration ('set 14d' or '14d')
  const cleanVal = str.replace(/^set\s*/i, "").trim();
  const parsed = parseDuration(cleanVal);
  const newExpiryMs = now + parsed.ms;
  return {
    newExpiryMs,
    operationType: "set",
    changeText: `Diatur ulang menjadi ${parsed.durationText}`,
    durationText: parsed.durationText,
  };
}

module.exports = {
  parseCurrency,
  formatRupiah,
  calculatePaymentDetails,
  parseDuration,
  modifyDuration,
};
