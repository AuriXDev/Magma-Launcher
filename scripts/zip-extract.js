const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const EOCD_SIG = 0x06054b50;
const CD_SIG = 0x02014b50;
const LFH_SIG = 0x04034b50;

function findEOCD(buf) {
  const max = Math.min(buf.length, 65557);
  for (let i = buf.length - 22; i >= buf.length - max; i--) {
    if (i < 0) break;
    if (buf.readUInt32LE(i) === EOCD_SIG) return i;
  }
  return -1;
}

function listEntries(buf) {
  const eocd = findEOCD(buf);
  if (eocd < 0) throw new Error('Не ZIP: EOCD не найден');
  const totalEntries = buf.readUInt16LE(eocd + 10);
  const cdOffset = buf.readUInt32LE(eocd + 16);
  const entries = [];
  let p = cdOffset;
  for (let i = 0; i < totalEntries; i++) {
    if (buf.readUInt32LE(p) !== CD_SIG) throw new Error('Повреждён CD');
    const method = buf.readUInt16LE(p + 10);
    const csize = buf.readUInt32LE(p + 20);
    const usize = buf.readUInt32LE(p + 24);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localHeaderOffset = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    entries.push({ name, method, csize, usize, localHeaderOffset });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

function readFile(buf, entry) {
  const p = entry.localHeaderOffset;
  if (buf.readUInt32LE(p) !== LFH_SIG) throw new Error('Повреждён LFH');
  const nameLen = buf.readUInt16LE(p + 26);
  const extraLen = buf.readUInt16LE(p + 28);
  const dataStart = p + 30 + nameLen + extraLen;
  const raw = buf.slice(dataStart, dataStart + entry.csize);
  if (entry.method === 0) return raw;
  if (entry.method === 8) return zlib.inflateRawSync(raw);
  throw new Error('Неподдерживаемый метод сжатия: ' + entry.method);
}
function extractAll(buf, targetDir, excludePrefix = []) {
  const entries = listEntries(buf);
  const written = [];
  for (const e of entries) {
    if (e.name.endsWith('/')) continue; // директория
    if (excludePrefix.some(pr => e.name.startsWith(pr))) continue;
    const out = path.join(targetDir, e.name);
    const outAbs = path.resolve(out);
    const baseAbs = path.resolve(targetDir);
    if (!outAbs.startsWith(baseAbs + path.sep) && outAbs !== baseAbs) continue; // zip-slip защита
    try { fs.mkdirSync(path.dirname(out), { recursive: true }); } catch (err) {}
    try {
      const data = readFile(buf, e);
      fs.writeFileSync(out, data);
      written.push(out);
    } catch (err) {
      console.warn('zip: не удалось распаковать', e.name, err.message);
    }
  }
  return written;
}

module.exports = { listEntries, readFile, extractAll };
