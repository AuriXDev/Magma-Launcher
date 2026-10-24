// Минимальный ZIP-писатель без зависимостей (парный к zip-extract.js): deflate через zlib.deflateRawSync,
// уже сжатые форматы (.jar/.zip/.png…) кладутся без сжатия. Без zip64 - архив до 4 ГБ.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
const STORED_EXT = /\.(jar|zip|png|jpe?g|gz|ogg|mp3|mp4|webp|7z|rar|mca)$/i;

function dosTime(d) {
  const y = Math.max(1980, d.getFullYear());
  return {
    time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
    date: ((y - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()
  };
}

class ZipWriter {
  constructor(file) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    this.file = file;
    this.tmp = file + '.part';
    this.fd = fs.openSync(this.tmp, 'w');
    this.pos = 0;
    this.central = [];
    this.names = new Set();
  }
  _write(buf) { fs.writeSync(this.fd, buf, 0, buf.length, this.pos); this.pos += buf.length; }
  // name - путь внутри архива с «/»; data - Buffer; mtime - Date (необязательно)
  add(name, data, mtime) {
    name = String(name).replace(/\\/g, '/').replace(/^\/+/, '');
    if (!name || this.names.has(name)) return false;
    this.names.add(name);
    const isDir = name.endsWith('/');
    if (isDir) data = Buffer.alloc(0);
    const crc = crc32(data);
    const stored = isDir || STORED_EXT.test(name) || data.length < 64;
    const body = stored ? data : zlib.deflateRawSync(data, { level: 6 });
    const method = stored || body.length >= data.length ? 0 : 8;
    const payload = method === 0 ? data : body;
    if (this.pos + payload.length > 0xFFFFFF00) throw new Error('Архив больше 4 ГБ - не поддерживается');
    const nameBuf = Buffer.from(name, 'utf8');
    const { time, date } = dosTime(mtime instanceof Date ? mtime : new Date());
    const h = Buffer.alloc(30);
    h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(0x0800, 6); h.writeUInt16LE(method, 8);
    h.writeUInt16LE(time, 10); h.writeUInt16LE(date, 12); h.writeUInt32LE(crc, 14);
    h.writeUInt32LE(payload.length, 18); h.writeUInt32LE(data.length, 22); h.writeUInt16LE(nameBuf.length, 26); h.writeUInt16LE(0, 28);
    const offset = this.pos;
    this._write(h); this._write(nameBuf); if (payload.length) this._write(payload);
    this.central.push({ nameBuf, crc, method, csize: payload.length, size: data.length, time, date, offset, isDir });
    return true;
  }
  addFile(name, file) {
    const st = fs.statSync(file);
    return this.add(name, fs.readFileSync(file), new Date(st.mtimeMs));
  }
  // рекурсивно добавить папку; filter(relPosix, isDir) → false пропускает
  addDir(prefix, dir, filter) {
    const walk = (abs, rel) => {
      let items = [];
      try { items = fs.readdirSync(abs, { withFileTypes: true }); } catch (e) { return; }
      for (const it of items) {
        const r = rel ? rel + '/' + it.name : it.name;
        if (filter && filter(r, it.isDirectory()) === false) continue;
        const full = path.join(abs, it.name);
        if (it.isDirectory()) walk(full, r);
        else if (it.isFile()) { try { this.addFile((prefix ? prefix.replace(/\/?$/, '/') : '') + r, full); } catch (e) {} }
      }
    };
    walk(dir, '');
  }
  finish() {
    const start = this.pos;
    for (const c of this.central) {
      const e = Buffer.alloc(46);
      e.writeUInt32LE(0x02014b50, 0); e.writeUInt16LE(20, 4); e.writeUInt16LE(20, 6); e.writeUInt16LE(0x0800, 8); e.writeUInt16LE(c.method, 10);
      e.writeUInt16LE(c.time, 12); e.writeUInt16LE(c.date, 14); e.writeUInt32LE(c.crc, 16);
      e.writeUInt32LE(c.csize, 20); e.writeUInt32LE(c.size, 24); e.writeUInt16LE(c.nameBuf.length, 28);
      e.writeUInt32LE(c.isDir ? 0x10 : 0, 38); e.writeUInt32LE(c.offset, 42);
      this._write(e); this._write(c.nameBuf);
    }
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(this.central.length, 8); end.writeUInt16LE(this.central.length, 10);
    end.writeUInt32LE(this.pos - start, 12); end.writeUInt32LE(start, 16);
    this._write(end);
    fs.closeSync(this.fd); this.fd = null;
    fs.renameSync(this.tmp, this.file);
    return this.central.length;
  }
  abort() {
    try { if (this.fd != null) fs.closeSync(this.fd); } catch (e) {}
    this.fd = null;
    try { fs.unlinkSync(this.tmp); } catch (e) {}
  }
}

module.exports = { ZipWriter, crc32 };
