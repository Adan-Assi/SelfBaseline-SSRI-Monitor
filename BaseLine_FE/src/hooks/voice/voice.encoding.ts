// --- Base64 tables --------------------
const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const B64_DECODE: Record<string, number> = {};

for (let i = 0; i < 64; i++) {
  B64_DECODE[B64[i]] = i;
}

// --- Audio math helpers --------------------
export function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

export function dbTo01(db: number) {
  const minDb = -60;
  const maxDb = -5;
  const clamped = Math.max(minDb, Math.min(maxDb, db));

  return (clamped - minDb) / (maxDb - minDb);
}

// --- Base64 encoding --------------------
export function bytesToBase64(bytes: number[]): string {
  let result = "";

  for (let i = 0; i < bytes.length; i += 3) {
    const b1 = bytes[i];
    const b2 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b3 = i + 2 < bytes.length ? bytes[i + 2] : 0;

    result += B64[b1 >> 2];
    result += B64[((b1 & 3) << 4) | (b2 >> 4)];
    result += i + 1 < bytes.length ? B64[((b2 & 15) << 2) | (b3 >> 6)] : "=";
    result += i + 2 < bytes.length ? B64[b3 & 63] : "=";
  }

  return result;
}

export function base64ToBytes(b64: string): number[] {
  const bytes: number[] = [];
  let str = b64.replace(/[\r\n\s]/g, "");

  const mod = str.length % 4;
  if (mod === 2) str += "==";
  else if (mod === 3) str += "=";
  else if (mod === 1) return bytes;

  str = str.replace(/=/g, "");

  for (let i = 0; i < str.length; i += 4) {
    const c1 = B64_DECODE[str[i]] ?? 0;
    const c2 = B64_DECODE[str[i + 1]] ?? 0;

    const hasC3 = i + 2 < str.length;
    const hasC4 = i + 3 < str.length;

    const c3 = hasC3 ? (B64_DECODE[str[i + 2]] ?? 0) : undefined;
    const c4 = hasC4 ? (B64_DECODE[str[i + 3]] ?? 0) : undefined;

    bytes.push((c1 << 2) | (c2 >> 4));

    if (c3 !== undefined) {
      bytes.push(((c2 & 15) << 4) | (c3 >> 2));

      if (c4 !== undefined) {
        bytes.push(((c3 & 3) << 6) | c4);
      }
    }
  }

  return bytes;
}

// --- Little-endian helpers --------------------
function le32(v: number): number[] {
  return [v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, (v >> 24) & 0xff];
}

function le16(v: number): number[] {
  return [v & 0xff, (v >> 8) & 0xff];
}

// --- WAV building --------------------
export function buildWavBytes(params: {
  pcmBytes: number[];
  sampleRate: number;
  channels: number;
  bitDepth: number;
}) {
  const { pcmBytes, sampleRate, channels, bitDepth } = params;

  const pcmByteLen = pcmBytes.length;
  const byteRate = (sampleRate * channels * bitDepth) / 8;
  const blockAlign = (channels * bitDepth) / 8;

  const header: number[] = [
    0x52,
    0x49,
    0x46,
    0x46,
    ...le32(36 + pcmByteLen),
    0x57,
    0x41,
    0x56,
    0x45,
    0x66,
    0x6d,
    0x74,
    0x20,
    ...le32(16),
    ...le16(1),
    ...le16(channels),
    ...le32(sampleRate),
    ...le32(byteRate),
    ...le16(blockAlign),
    ...le16(bitDepth),
    0x64,
    0x61,
    0x74,
    0x61,
    ...le32(pcmByteLen),
  ];

  return header.concat(pcmBytes);
}
