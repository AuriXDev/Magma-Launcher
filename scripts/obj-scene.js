(function () {
  'use strict';
  const CAM_Z = 3, FOV = 45 * Math.PI / 180;
  const HALF_H = CAM_Z * Math.tan(FOV / 2);

  function parseMtl(text) {
    const mats = {};
    let cur = null;
    (text || '').split(/\r?\n/).forEach(line => {
      const p = line.trim().split(/\s+/);
      if (p[0] === 'newmtl') { cur = mats[p.slice(1).join(' ')] = { kd: [0.8, 0.8, 0.8] }; }
      else if (p[0] === 'Kd' && cur) cur.kd = [+p[1], +p[2], +p[3]];
      else if (p[0] === 'map_Kd' && cur) cur.map = true;
    });
    return mats;
  }

  function parseObj(text, mtlText) {
    const mats = parseMtl(mtlText);
    const v = [], vt = [], vn = [];
    const pos = [], nrm = [], uv = [], col = [];
    let kd = [0.85, 0.85, 0.85];
    const idx = (s, len) => { const i = parseInt(s, 10); return i < 0 ? len + i : i - 1; };
    text.split(/\r?\n/).forEach(line => {
      const p = line.trim().split(/\s+/);
      switch (p[0]) {
        case 'v': v.push([+p[1], +p[2], +p[3]]); break;
        case 'vt': vt.push([+p[1], +p[2]]); break;
        case 'vn': vn.push([+p[1], +p[2], +p[3]]); break;
        case 'usemtl': { const m = mats[p.slice(1).join(' ')]; kd = m ? (m.map ? [1, 1, 1] : m.kd) : [0.85, 0.85, 0.85]; break; }
        case 'f': {
          const verts = p.slice(1).map(s => {
            const [a, b, c] = s.split('/');
            return { v: v[idx(a, v.length)], t: b ? vt[idx(b, vt.length)] : null, n: c ? vn[idx(c, vn.length)] : null };
          }).filter(x => x.v);
          for (let i = 1; i + 1 < verts.length; i++) {
            const tri = [verts[0], verts[i], verts[i + 1]];
            let fn = null;
            if (tri.some(x => !x.n)) {
              const [a, b, c] = tri.map(x => x.v);
              const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
              fn = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
            }
            tri.forEach(x => {
              pos.push(...x.v); nrm.push(...(x.n || fn));
              uv.push(...(x.t || [0, 0])); col.push(...kd);
            });
          }
          break;
        }
      }
    });
    let min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < pos.length; i += 3) for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], pos[i + k]); max[k] = Math.max(max[k], pos[i + k]); }
    const c = [0, 1, 2].map(k => (min[k] + max[k]) / 2);
    let r = 0;
    for (let i = 0; i < pos.length; i += 3) r = Math.max(r, Math.hypot(pos[i] - c[0], pos[i + 1] - c[1], pos[i + 2] - c[2]));
    r = r || 1;
    for (let i = 0; i < pos.length; i += 3) for (let k = 0; k < 3; k++) pos[i + k] = (pos[i + k] - c[k]) / r;
    return { pos: new Float32Array(pos), nrm: new Float32Array(nrm), uv: new Float32Array(uv), col: new Float32Array(col), count: pos.length / 3 };
  }

  function mul(a, b) {
    const o = new Float32Array(16);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
    return o;
  }
  const ident = () => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  function persp(aspect) {
    const f = 1 / Math.tan(FOV / 2), n = 0.1, fa = 100;
    return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (fa + n) / (n - fa), -1, 0, 0, 2 * fa * n / (n - fa), 0]);
  }
  function trans(x, y, z) { const m = ident(); m[12] = x; m[13] = y; m[14] = z; return m; }
  function scl(s) { const m = ident(); m[0] = m[5] = m[10] = s; return m; }
  function rot(axis, deg) {
    const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a), m = ident();
    if (axis === 'x') { m[5] = c; m[6] = s; m[9] = -s; m[10] = c; }
    if (axis === 'y') { m[0] = c; m[2] = -s; m[8] = s; m[10] = c; }
    if (axis === 'z') { m[0] = c; m[1] = s; m[4] = -s; m[5] = c; }
    return m;
  }

  const VS = `
    attribute vec3 aPos; attribute vec3 aNrm; attribute vec2 aUv; attribute vec3 aCol;
    uniform mat4 uMvp; uniform mat4 uRot;
    varying vec3 vN; varying vec2 vUv; varying vec3 vCol;
    void main(){ gl_Position = uMvp * vec4(aPos,1.0); vN = (uRot * vec4(aNrm,0.0)).xyz; vUv = aUv; vCol = aCol; }`;
  const FS = `
    precision mediump float;
    varying vec3 vN; varying vec2 vUv; varying vec3 vCol;
    uniform sampler2D uTex; uniform bool uHasTex;
    void main(){
      vec3 base = vCol * (uHasTex ? texture2D(uTex, vUv).rgb : vec3(1.0));
      vec3 n = normalize(vN);
      float d = max(dot(n, normalize(vec3(0.4, 0.7, 0.9))), 0.0);
      float rim = pow(1.0 - max(n.z, 0.0), 2.0) * 0.25;
      gl_FragColor = vec4(base * (0.45 + 0.65 * d) + vec3(0.31, 0.65, 0.42) * rim, 1.0);
    }`;

  class ObjScene {
    constructor(canvas) {
      this.canvas = canvas;
      this.gl = canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: false });
      this.t = { x: 0, y: 0, scale: 0.6, rx: 0, ry: 0, rz: 0, spin: { x: false, y: false, z: false }, speed: 12 };
      this.model = null;
      this.raf = 0;
      this.t0 = performance.now();
      this.paused = false;
      if (!this.gl) return;
      const gl = this.gl;
      const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
      const prog = gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
      gl.linkProgram(prog);
      this.prog = prog;
      this.loc = {
        aPos: gl.getAttribLocation(prog, 'aPos'), aNrm: gl.getAttribLocation(prog, 'aNrm'),
        aUv: gl.getAttribLocation(prog, 'aUv'), aCol: gl.getAttribLocation(prog, 'aCol'),
        uMvp: gl.getUniformLocation(prog, 'uMvp'), uRot: gl.getUniformLocation(prog, 'uRot'),
        uTex: gl.getUniformLocation(prog, 'uTex'), uHasTex: gl.getUniformLocation(prog, 'uHasTex')
      };
      this.ro = new ResizeObserver(() => this.render());
      this.ro.observe(canvas);
    }
    setModel(data) {
      const gl = this.gl;
      if (!gl || !data || !data.obj) { this.model = null; this.render(); return; }
      const m = parseObj(data.obj, data.mtl);
      const buf = (arr) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, arr, gl.STATIC_DRAW); return b; };
      this.model = { count: m.count, pos: buf(m.pos), nrm: buf(m.nrm), uv: buf(m.uv), col: buf(m.col), tex: null };
      if (data.texUrl) {
        const img = new Image();
        img.onload = () => {
          if (!this.model) return;
          const tex = gl.createTexture();
          gl.bindTexture(gl.TEXTURE_2D, tex);
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          this.model.tex = tex;
          this.render();
        };
        img.src = data.texUrl;
      }
      this.render();
      this.loop();
    }
    setTransform(t) {
      this.t = { ...this.t, ...t, spin: { ...this.t.spin, ...((t && t.spin) || {}) } };
      this.render();
      this.loop();
    }
    getTransform() { return JSON.parse(JSON.stringify(this.t)); }
    spinning() { const s = this.t.spin || {}; return !this.paused && (s.x || s.y || s.z) && this.t.speed > 0; }
    loop() {
      if (this.raf || !this.spinning()) return;
      const tick = () => {
        this.raf = 0;
        if (!this.canvas.isConnected || !this.spinning()) return;
        this.render();
        this.raf = requestAnimationFrame(tick);
      };
      this.raf = requestAnimationFrame(tick);
    }
    setPaused(p) { this.paused = p; if (!p) this.loop(); }
    render() {
      const gl = this.gl;
      if (!gl) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(this.canvas.clientWidth * dpr)), h = Math.max(1, Math.round(this.canvas.clientHeight * dpr));
      if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
      gl.viewport(0, 0, w, h);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      const m = this.model;
      if (!m) return;
      const t = this.t, aspect = w / h;
      const sec = (performance.now() - this.t0) / 1000;
      const sp = t.spin || {}, add = sec * (t.speed || 0);
      const R = mul(rot('z', t.rz + (sp.z ? add : 0)), mul(rot('y', t.ry + (sp.y ? add : 0)), rot('x', t.rx + (sp.x ? add : 0))));
      const model = mul(trans(t.x * 2 * HALF_H * aspect, -t.y * 2 * HALF_H, 0), mul(R, scl(t.scale * HALF_H)));
      const mvp = mul(persp(aspect), mul(trans(0, 0, -CAM_Z), model));
      gl.enable(gl.DEPTH_TEST);
      gl.useProgram(this.prog);
      gl.uniformMatrix4fv(this.loc.uMvp, false, mvp);
      gl.uniformMatrix4fv(this.loc.uRot, false, R);
      const attr = (loc, b, n) => { if (loc < 0) return; gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, n, gl.FLOAT, false, 0, 0); };
      attr(this.loc.aPos, m.pos, 3); attr(this.loc.aNrm, m.nrm, 3); attr(this.loc.aUv, m.uv, 2); attr(this.loc.aCol, m.col, 3);
      gl.uniform1i(this.loc.uHasTex, m.tex ? 1 : 0);
      if (m.tex) { gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, m.tex); gl.uniform1i(this.loc.uTex, 0); }
      gl.drawArrays(gl.TRIANGLES, 0, m.count);
    }
    dispose() {
      if (this.raf) cancelAnimationFrame(this.raf);
      this.raf = 0;
      if (this.ro) this.ro.disconnect();
      const ext = this.gl && this.gl.getExtension('WEBGL_lose_context');
      if (ext) ext.loseContext();
    }
  }

  window.MglObjScene = ObjScene;
})();
