/* ============================================================
   utils/body.js — parse body JSON dengan batas ukuran (anti DoS)
   ============================================================ */
const MAX_BYTES = 1024 * 1024; // 1MB cukup untuk save-game blob

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", chunk => {
      size += chunk.length;
      if (size > MAX_BYTES) { req.destroy(); reject(new Error("Body terlalu besar")); return; }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8"))); }
      catch { reject(new Error("JSON tidak valid")); }
    });
    req.on("error", reject);
  });
}

module.exports = { readJsonBody };
