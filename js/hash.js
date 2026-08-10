// ============================================================
// hash.js — MD5 y SHA-256 en JS puro (sin dependencias)
// Usados por md5sum, sha256sum y vt. Funcionan también con file://
// ============================================================

const _enc = new TextEncoder();

function utf8Bytes(str) {
  return _enc.encode(str);
}

// ---------------- MD5 (estructura RFC 1321, verificada) ----------------
const _K = [
  0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee, 0xf57c0faf, 0x4787c62a, 0xa8304613, 0xfd469501,
  0x698098d8, 0x8b44f7af, 0xffff5bb1, 0x895cd7be, 0x6b901122, 0xfd987193, 0xa679438e, 0x49b40821,
  0xf61e2562, 0xc040b340, 0x265e5a51, 0xe9b6c7aa, 0xd62f105d, 0x02441453, 0xd8a1e681, 0xe7d3fbc8,
  0x21e1cde6, 0xc33707d6, 0xf4d50d87, 0x455a14ed, 0xa9e3e905, 0xfcefa3f8, 0x676f02d9, 0x8d2a4c8a,
  0xfffa3942, 0x8771f681, 0x6d9d6122, 0xfde5380c, 0xa4beea44, 0x4bdecfa9, 0xf6bb4b60, 0xbebfbc70,
  0x289b7ec6, 0xeaa127fa, 0xd4ef3085, 0x04881d05, 0xd9d4d039, 0xe6db99e5, 0x1fa27cf8, 0xc4ac5665,
  0xf4292244, 0x432aff97, 0xab9423a7, 0xfc93a039, 0x655b59c3, 0x8f0ccc92, 0xffeff47d, 0x85845dd1,
  0x6fa87e4f, 0xfe2ce6e0, 0xa3014314, 0x4e0811a1, 0xf7537e82, 0xbd3af235, 0x2ad7d2bb, 0xeb86d391,
];
const _S = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
  5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
  4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
  6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
];

const _F = (x, y, z) => (x & y) | (~x & z);
const _G = (x, y, z) => (x & z) | (y & ~z);
const _H = (x, y, z) => x ^ y ^ z;
const _I = (x, y, z) => y ^ (x | ~z);
const _rotl = (x, n) => (x << n) | (x >>> (32 - n));
const _add = (x, y) => (x + y) | 0;
const _ff = (a, b, c, d, x, s, ac) => _add(_rotl(_add(_add(a, _add(_F(b, c, d), x)), ac), s), b);
const _gg = (a, b, c, d, x, s, ac) => _add(_rotl(_add(_add(a, _add(_G(b, c, d), x)), ac), s), b);
const _hh = (a, b, c, d, x, s, ac) => _add(_rotl(_add(_add(a, _add(_H(b, c, d), x)), ac), s), b);
const _ii = (a, b, c, d, x, s, ac) => _add(_rotl(_add(_add(a, _add(_I(b, c, d), x)), ac), s), b);

export function md5(str) {
  const bytes = utf8Bytes(str);
  const n = bytes.length;
  const totalLen = (((n + 8) >> 6) + 1) << 6;
  const data = new Uint8Array(totalLen);
  data.set(bytes);
  data[n] = 0x80;
  const dv = new DataView(data.buffer);
  dv.setUint32(totalLen - 8, (n * 8) >>> 0, true);
  dv.setUint32(totalLen - 4, 0, true);

  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;

  for (let i = 0; i < totalLen; i += 64) {
    const M = new Uint32Array(16);
    for (let j = 0; j < 16; j++) M[j] = dv.getUint32(i + j * 4, true);
    let a = a0, b = b0, c = c0, d = d0;
    // Ronda 1
    a = _ff(a, b, c, d, M[0], _S[0], _K[0]); d = _ff(d, a, b, c, M[1], _S[1], _K[1]); c = _ff(c, d, a, b, M[2], _S[2], _K[2]); b = _ff(b, c, d, a, M[3], _S[3], _K[3]);
    a = _ff(a, b, c, d, M[4], _S[4], _K[4]); d = _ff(d, a, b, c, M[5], _S[5], _K[5]); c = _ff(c, d, a, b, M[6], _S[6], _K[6]); b = _ff(b, c, d, a, M[7], _S[7], _K[7]);
    a = _ff(a, b, c, d, M[8], _S[8], _K[8]); d = _ff(d, a, b, c, M[9], _S[9], _K[9]); c = _ff(c, d, a, b, M[10], _S[10], _K[10]); b = _ff(b, c, d, a, M[11], _S[11], _K[11]);
    a = _ff(a, b, c, d, M[12], _S[12], _K[12]); d = _ff(d, a, b, c, M[13], _S[13], _K[13]); c = _ff(c, d, a, b, M[14], _S[14], _K[14]); b = _ff(b, c, d, a, M[15], _S[15], _K[15]);
    // Ronda 2
    a = _gg(a, b, c, d, M[1], _S[16], _K[16]); d = _gg(d, a, b, c, M[6], _S[17], _K[17]); c = _gg(c, d, a, b, M[11], _S[18], _K[18]); b = _gg(b, c, d, a, M[0], _S[19], _K[19]);
    a = _gg(a, b, c, d, M[5], _S[20], _K[20]); d = _gg(d, a, b, c, M[10], _S[21], _K[21]); c = _gg(c, d, a, b, M[15], _S[22], _K[22]); b = _gg(b, c, d, a, M[4], _S[23], _K[23]);
    a = _gg(a, b, c, d, M[9], _S[24], _K[24]); d = _gg(d, a, b, c, M[14], _S[25], _K[25]); c = _gg(c, d, a, b, M[3], _S[26], _K[26]); b = _gg(b, c, d, a, M[8], _S[27], _K[27]);
    a = _gg(a, b, c, d, M[13], _S[28], _K[28]); d = _gg(d, a, b, c, M[2], _S[29], _K[29]); c = _gg(c, d, a, b, M[7], _S[30], _K[30]); b = _gg(b, c, d, a, M[12], _S[31], _K[31]);
    // Ronda 3
    a = _hh(a, b, c, d, M[5], _S[32], _K[32]); d = _hh(d, a, b, c, M[8], _S[33], _K[33]); c = _hh(c, d, a, b, M[11], _S[34], _K[34]); b = _hh(b, c, d, a, M[14], _S[35], _K[35]);
    a = _hh(a, b, c, d, M[1], _S[36], _K[36]); d = _hh(d, a, b, c, M[4], _S[37], _K[37]); c = _hh(c, d, a, b, M[7], _S[38], _K[38]); b = _hh(b, c, d, a, M[10], _S[39], _K[39]);
    a = _hh(a, b, c, d, M[13], _S[40], _K[40]); d = _hh(d, a, b, c, M[0], _S[41], _K[41]); c = _hh(c, d, a, b, M[3], _S[42], _K[42]); b = _hh(b, c, d, a, M[6], _S[43], _K[43]);
    a = _hh(a, b, c, d, M[9], _S[44], _K[44]); d = _hh(d, a, b, c, M[12], _S[45], _K[45]); c = _hh(c, d, a, b, M[15], _S[46], _K[46]); b = _hh(b, c, d, a, M[2], _S[47], _K[47]);
    // Ronda 4
    a = _ii(a, b, c, d, M[0], _S[48], _K[48]); d = _ii(d, a, b, c, M[7], _S[49], _K[49]); c = _ii(c, d, a, b, M[14], _S[50], _K[50]); b = _ii(b, c, d, a, M[5], _S[51], _K[51]);
    a = _ii(a, b, c, d, M[12], _S[52], _K[52]); d = _ii(d, a, b, c, M[3], _S[53], _K[53]); c = _ii(c, d, a, b, M[10], _S[54], _K[54]); b = _ii(b, c, d, a, M[1], _S[55], _K[55]);
    a = _ii(a, b, c, d, M[8], _S[56], _K[56]); d = _ii(d, a, b, c, M[15], _S[57], _K[57]); c = _ii(c, d, a, b, M[6], _S[58], _K[58]); b = _ii(b, c, d, a, M[13], _S[59], _K[59]);
    a = _ii(a, b, c, d, M[4], _S[60], _K[60]); d = _ii(d, a, b, c, M[11], _S[61], _K[61]); c = _ii(c, d, a, b, M[2], _S[62], _K[62]); b = _ii(b, c, d, a, M[9], _S[63], _K[63]);
    a0 = _add(a0, a); b0 = _add(b0, b); c0 = _add(c0, c); d0 = _add(d0, d);
  }
  // El digest MD5 se serializa con cada palabra de 32 bits en orden
  // little-endian (byte 0 primero), como hace md5sum.
  const wordLE = (v) => {
    let s = "";
    for (let i = 0; i < 4; i++) s += ((v >>> (i * 8)) & 0xff).toString(16).padStart(2, "0");
    return s;
  };
  return wordLE(a0) + wordLE(b0) + wordLE(c0) + wordLE(d0);
}

// ---------------- SHA-256 ----------------
const _K256 = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

export function sha256(str) {
  const bytes = utf8Bytes(str);
  const n = bytes.length;
  const totalLen = (((n + 8) >> 6) + 1) << 6;
  const data = new Uint8Array(totalLen);
  data.set(bytes);
  data[n] = 0x80;
  const dv = new DataView(data.buffer);
  dv.setUint32(totalLen - 4, n * 8 >>> 0);
  dv.setUint32(totalLen - 8, Math.floor(n * 8 / 0x100000000));

  const h = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  const rotr = (x, n) => (x >>> n) | (x << (32 - n));

  for (let i = 0; i < totalLen; i += 64) {
    const w = new Uint32Array(64);
    for (let j = 0; j < 16; j++) w[j] = dv.getUint32(i + j * 4, false);
    for (let j = 16; j < 64; j++) {
      const s0 = rotr(w[j - 15], 7) ^ rotr(w[j - 15], 18) ^ (w[j - 15] >>> 3);
      const s1 = rotr(w[j - 2], 17) ^ rotr(w[j - 2], 19) ^ (w[j - 2] >>> 10);
      w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0;
    }
    let a = h[0], b = h[1], c = h[2], d = h[3], e = h[4], f = h[5], g = h[6], hh = h[7];
    for (let j = 0; j < 64; j++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (hh + S1 + ch + _K256[j] + w[j]) | 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) | 0;
      hh = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    h[0] = (h[0] + a) | 0; h[1] = (h[1] + b) | 0; h[2] = (h[2] + c) | 0; h[3] = (h[3] + d) | 0;
    h[4] = (h[4] + e) | 0; h[5] = (h[5] + f) | 0; h[6] = (h[6] + g) | 0; h[7] = (h[7] + hh) | 0;
  }
  const hex = (v) => ("00000000" + (v >>> 0).toString(16)).slice(-8);
  return Array.from(h, hex).join("");
}
