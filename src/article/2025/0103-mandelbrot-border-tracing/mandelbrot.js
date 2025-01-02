(function() {
  'use strict';

  const FLAG_HANDLED = 1 << 28;
  const FLAG_DIVERGED = 1 << 29;
  const FLAG_FINISHED = 1 << 30;
  const COUNT_MASK = (1 << 28) - 1;

  const EVT_ITERATION = 1;
  const EVT_MEM_WRITE = 2;
  const EVT_MEM_READ = 3;

  const CONFIG_ITEMS = [
    {
      label: 'Image',
      items: [
        { type: 'int', key: 'width', label: 'Width', init: 64, min: 8, max: 1024, ui: null },
        { type: 'int', key: 'height', label: 'Height', init: null, min: 8, max: 1024, ui: null },
      ]
    },
    {
      label: 'Scene',
      items: [
        { type: 'float', key: 'a', label: 'a', init: -0.5, min: -2, max: 2, ui: null },
        { type: 'float', key: 'b', label: 'b', init: 0, min: -2, max: 2, ui: null },
        { type: 'float', key: 'range', label: 'Range', init: 2, min: 0, max: 4, ui: null },
        { type: 'int', key: 'maxIter', label: 'Max Iterations', init: 100, min: 1, max: 1000, ui: null },
      ],
    },
    {
      label: 'Engine<br>Spec',
      items: [
        { type: 'int', key: 'iterPerSec', label: 'Iteration/sec', init: 10000, min: 1, max: 1000 * 1000, ui: null },
        { type: 'int', key: 'memPerSec', label: 'Memory Op./sec', init: 10000, min: 1, max: 1000 * 1000, ui: null },
        { type: 'int', key: 'entryQueueDepth', label: 'Entry Queue Depth', init: null, min: 1, max: 65536, ui: null },
        { type: 'int', key: 'resultQueueDepth', label: 'Result Queue Depth', init: null, min: 1, max: 65536, ui: null },
      ]
    }
  ];

  class MandelUi {
    constructor(wrapperId) {
      this.canvas = document.createElement('canvas');
      this.wrapper = document.querySelector(`#${wrapperId}`);
      this.startButton = document.createElement('button');;
      this.abortButton = document.createElement('button');;
      this.config = {};
      this.lastMs = undefined;
      this.simTimeMs = 0;
      this.normalEngine = null;
      this.fastEngine = null;
    }

    init() {
      this.canvas.width = 1280;
      this.canvas.height = 960;

      const table = document.createElement('table');
      for (var category of CONFIG_ITEMS) {
        const tr = document.createElement('tr');
        const th = document.createElement('th');
        const td = document.createElement('td');
        th.innerHTML = category.label;
        for (var prop of category.items) {
          const inputId = `article_${category.id}_${prop.key}`;
          
          const label = document.createElement('label');
          label.htmlFor = inputId;
          label.innerHTML = ` ${prop.label}:`;
          
          const input = document.createElement('input');
          input.id = inputId;
          input.type = 'text';
          if (prop.init === null) {
            input.value = '';
            input.placeholder = '(auto)';
          }
          else {
            input.value = prop.init;
          }
          input.size = 4;
          input.addEventListener('change', (function(t, p) {
            return ()=>t.inputChanged(p);
          })(this, prop));

          prop.ui = input;
          this.config[prop.key] = prop.init;

          const span = document.createElement('span');
          span.style.whiteSpace = 'nowrap';
          span.appendChild(label);
          span.appendChild(input);
          
          td.appendChild(span);
          td.appendChild(document.createTextNode('\n'));
        }
        tr.appendChild(th);
        tr.appendChild(td);
        table.appendChild(tr);
      }
      this.wrapper.appendChild(table);

      this.startButton.type = 'button';
      this.startButton.innerHTML = 'Start';
      this.abortButton.type = 'button';
      this.abortButton.innerHTML = 'Abort';

      const pControl = document.createElement('p');
      pControl.style.textAlign = 'center';
      pControl.appendChild(this.startButton);
      pControl.appendChild(document.createTextNode('\n'));
      pControl.appendChild(this.abortButton);
      this.wrapper.appendChild(pControl);

      const pCanvas = document.createElement('p');
      pCanvas.appendChild(this.canvas);
      this.wrapper.appendChild(pCanvas);

      this.startButton.addEventListener('click', ()=>this.start());
      this.abortButton.addEventListener('click', ()=>this.abort());

      this.ready();
      this.render();
      // this.start();
    }

    inputChanged(prop) {
      try {
        var valueStr = prop.ui.value.trim();
        if (prop.init === null && !valueStr) {
          this.config[prop.key] = null;
        }
        else {
          const value = parseFloat(valueStr);
          if (prop.type == 'int' && value != Math.floor(value)) {
            throw new Error('Value must be integer.');
          }
          if (value < prop.min || prop.max < value) {
            throw new Error('Value out of range.');
          }
          this.config[prop.key] = value;
        }
        prop.ui.style.background = 'unset';
        prop.ui.style.color = 'unset';
      }
      catch(ex) {
        prop.ui.style.background = '#fcc';
        prop.ui.style.color = '#c00';
      }
    }

    abort() {
      if (this.normalEngine) {
        this.normalEngine.abort();
        this.normalEngine = null;
      }
      if (this.fastEngine) {
        this.fastEngine.abort();
        this.fastEngine = null;
      }
    }

    ready() {
      this.abort();
      const cfg = structuredClone(this.config);

      if (cfg.height === null) {
        cfg.height = cfg.width;
      }

      const preferredQueueDepth = (cfg.width + cfg.height) * 2;
      if (cfg.entryQueueDepth === null) {
        cfg.entryQueueDepth = preferredQueueDepth;
      }
      if (cfg.resultQueueDepth === null) {
        cfg.resultQueueDepth = preferredQueueDepth;
      }

      this.normalEngine = new EngineUi(new NormalEngine(cfg));
      this.fastEngine = new EngineUi(new FastMandel(cfg));
      this.lastMs = undefined;
      this.simTimeMs = 0;
    }

    start() {
      this.ready();
      window.requestAnimationFrame((t)=>this.loop(t));
    }

    loop(nowMs) {
      if (!this.normalEngine || !this.fastEngine) return;

      if (this.lastMs === undefined) {
        this.lastMs = nowMs;
      }
      const deltaMs = Math.min(100, nowMs - this.lastMs);
      this.lastMs = nowMs;

      this.simTimeMs += deltaMs;

      this.normalEngine.update(this.simTimeMs);
      this.fastEngine.update(this.simTimeMs);

      this.render(nowMs);

      if (this.normalEngine.busy() || this.fastEngine.busy()) {
        window.requestAnimationFrame((t)=>this.loop(t));
      }
    }

    render(nowMs) {
      const g = this.canvas.getContext('2d');

      const w = this.canvas.width;
      const h = this.canvas.height;

      const margin = Math.floor(w / 40);
      const viewW = Math.floor((w - margin * 3) / 2);
      const viewH = h - margin * 2;

      g.fillStyle = '#000';
      g.fillRect(0, 0, w, h);

      if (this.normalEngine) {
        const engine = this.normalEngine;
        engine.render(nowMs, g, margin, margin, viewW, viewH);
      }

      if (this.fastEngine) {
        const engine = this.fastEngine;
        engine.render(nowMs, g, margin * 2 + viewW, margin, viewW, viewH);
      }
    }
  }

  class EngineUi {
    static PALETTE = (function(){
      const a = 64;
      const b = 192;
      const p = 16;
      return [
        [0, 0, 0],
        [a - p, a - p, a + p],
        [b - p, b + p, b + p],
        [255, 255, 255],
        [b + p, b + p, b - p],
        [a + p, a - p, a - p],
      ];
    })();
    static COL_BUSY = '255 192 0';
    static COL_READ = '0 255 128';
    static COL_WRITE = '255 64 0';

    constructor(engine) {
      this.cfg = engine.cfg;
      this.engine = engine;

      this.pixelSize = Math.ceil(512 / this.cfg.width);
      this.canvas = document.createElement('canvas');
      this.canvas.width = this.cfg.width * this.pixelSize;
      this.canvas.height = this.cfg.height * this.pixelSize;
      const g = this.canvas.getContext('2d');
      g.fillStyle = '#404';
      g.fillRect(0, 0, this.canvas.width, this.canvas.height);
      
      this.busyMarkers = {};
      this.writeMarkers = {};
      this.readMarkers = {};
    }

    busy() {
      return (
        this.engine.busy() ||
        this.engine.eventQueue.length > 0 ||
        Object.keys(this.busyMarkers).length > 0 ||
        Object.keys(this.readMarkers).length > 0 ||
        Object.keys(this.writeMarkers).length > 0
      );
    }

    abort() {
      this.engine.abort();
    }

    update(simTimeMs) {
      this.engine.update(simTimeMs);
    }

    render(nowMs, g, viewX, viewY, viewW, viewH) {
      this.updateImage(this.engine.eventQueue);
      for (const evt of this.engine.eventQueue) {
        const x = evt.x;
        const y = evt.y;
        const key = evt.y * this.cfg.width + evt.x;
        const rect = new PixelMarker(nowMs, evt.x, evt.y);
        switch(evt.code) {
          case EVT_ITERATION: this.busyMarkers[key] = rect; break;
          case EVT_MEM_READ: this.readMarkers[key] = rect; break;
          case EVT_MEM_WRITE: this.writeMarkers[key] = rect; break;
        }
      }
      this.engine.eventQueue = [];
      
      const margin = Math.floor(viewH / 40);

      const imgW = viewW;
      const imgH = imgW;
      this.renderImage(nowMs, g, viewX, viewY, imgW, imgH);

      const lineH = Math.floor((viewH - margin - imgH) / 7);
      const fontH = Math.ceil(lineH * 3 / 4);
      g.font = `${fontH}px monospace`;

      const labelW = Math.ceil(g.measureText('m').width * 16);
      const percentW = Math.ceil(g.measureText('_100.0%').width);

      var y = viewY + imgH + margin;

      const countDigits = Math.ceil(Math.log10(this.cfg.width * this.cfg.height * this.cfg.maxIter));

      {
        var p = this.engine.numFinished / (this.cfg.width * this.cfg.height);
        g.fillStyle = '#fff';
        g.fillText('Progress: ', viewX, y + fontH);
        g.fillText(`${formatFloat(5, 1, 100 * p)}% `, viewX + labelW, y + fontH);
        g.fillRect(viewX + labelW + percentW, y, p * (viewW - labelW - percentW), fontH);
        y += lineH;
      }
      
      {
        var p = this.engine.entryQueue.count() / this.cfg.entryQueueDepth;
        g.fillStyle = '#fff';
        g.fillText('Entry Queue: ', viewX, y + fontH);
        g.fillText(`${formatFloat(5, 1, 100 * p)}% `, viewX + labelW, y + fontH);
        g.fillRect(viewX + labelW + percentW, y, p * (viewW - labelW - percentW), fontH);
        y += lineH;
      }
      
      {
        var p = this.engine.resultQueue.count() / this.cfg.resultQueueDepth;
        g.fillStyle = '#fff';
        g.fillText('Result Queue: ', viewX, y + fontH);
        g.fillText(`${formatFloat(5, 1, 100 * p)}% `, viewX + labelW, y + fontH);
        g.fillRect(viewX + labelW + percentW, y, p * (viewW - labelW - percentW), fontH);
        y += lineH;
      }

      g.lineWidth = 3;
      g.strokeStyle = `rgb(${EngineUi.COL_BUSY})`;
      g.strokeRect(viewX, y, fontH, fontH);
      g.fillText('Iterations:', viewX + fontH * 3 / 2, y + fontH);
      g.fillText(`${this.engine.totalIters}`.padStart(countDigits, ' '), viewX + labelW, y + fontH);
      y += lineH;

      g.lineWidth = 3;
      g.strokeStyle = `rgb(${EngineUi.COL_READ})`;
      g.strokeRect(viewX, y, fontH, fontH);
      g.fillText('Mem. Read:', viewX + fontH * 3 / 2, y + fontH);
      g.fillText(`${this.engine.memNumReads}`.padStart(countDigits, ' '), viewX + labelW, y + fontH);
      y += lineH;

      g.lineWidth = 3;
      g.strokeStyle = `rgb(${EngineUi.COL_WRITE})`;
      g.strokeRect(viewX, y, fontH, fontH);
      g.fillText('Mem. Write:', viewX + fontH * 3 / 2, y + fontH);
      g.fillText(`${this.engine.memNumWrites}`.padStart(countDigits, ' '), viewX + labelW, y + fontH);
      y += lineH;

      g.fillText('Rendering Time:', viewX, y + fontH);
      g.fillText(`${formatFloat(6, 2, this.engine.elapsedMs / 1000)}`.padEnd(6, ' ')+' sec', viewX + labelW, y + fontH);
      y += lineH;
    }

    updateImage(eventQueue) {
      const pxSize = this.pixelSize;
      const g = this.canvas.getContext('2d');
      for (const evt of eventQueue) {
        if (evt.code != EVT_MEM_WRITE) continue;
        const x = evt.x;
        const y = evt.y;
        const value = this.engine.mem[y * this.cfg.width + x];
        if (value & FLAG_FINISHED) {
          if (value & FLAG_DIVERGED) {
            var p = value & COUNT_MASK;
            p /= EngineUi.PALETTE.length;
            p %= EngineUi.PALETTE.length;
            const i0 = Math.floor(p);
            const i1 = (i0 + 1) % EngineUi.PALETTE.length;
            const f1 = p - i0;
            const f0 = 1 - f1;
            const rgb0 = EngineUi.PALETTE[i0];
            const rgb1 = EngineUi.PALETTE[i1];
            const rgb = [
              Math.floor(rgb0[0] * f0 + rgb1[0] * f1),
              Math.floor(rgb0[1] * f0 + rgb1[1] * f1),
              Math.floor(rgb0[2] * f0 + rgb1[2] * f1),
            ];
            g.fillStyle = `rgb(${rgb[0]} ${rgb[1]} ${rgb[2]})`;
          }
          else  {
            g.fillStyle = '#000';
          }
        }
        else if (value & FLAG_HANDLED) {
          g.fillStyle = '#0cf';
        }
        else if (value == 0) {
          g.fillStyle = '#008';
        }
        else {
          g.fillStyle = '#f00';
        }
        g.fillRect(x * pxSize, y * pxSize, pxSize, pxSize);
      }
    }
    
    renderImage(nowMs, g, viewX, viewY, viewW, viewH) {
      const imgW = this.canvas.width;
      const imgH = this.canvas.height;
      var drawX = viewX;
      var drawY = viewY;
      var drawW = viewW;
      var drawH = viewH;
      if (viewW / viewH > imgW / imgH) {
        drawW = viewH * imgW / imgH;
        drawX = viewX + (viewW - drawW) / 2;
      }
      else {
        drawH = viewW * imgH / imgW;
        drawY = viewY + (viewH - drawH) / 2;
      }

      g.fillStyle = '#444';
      g.fillRect(viewX, viewY, viewW, viewH);

      g.drawImage(this.canvas, drawX, drawY, drawW, drawH);

      g.lineWidth = 1;
      g.strokeStyle = '#888';
      g.strokeRect(viewX, viewY, viewW, viewH);

      this.renderRects(nowMs, g, drawX, drawY, drawW, drawH, this.busyMarkers, EngineUi.COL_BUSY, true);
      this.renderRects(nowMs, g, drawX, drawY, drawW, drawH, this.readMarkers, EngineUi.COL_READ, false);
      this.renderRects(nowMs, g, drawX, drawY, drawW, drawH, this.writeMarkers, EngineUi.COL_WRITE, false);
    }

    renderRects(nowMs, g, viewX, viewY, viewW, viewH, rects, rgb, fill) {
      const FADE_TIME_MS = 100;
      const pixW = viewW / this.cfg.width;
      const pixH = viewH / this.cfg.height;
      g.lineWidth = 2;
      for(const key of Object.keys(rects)) {
        const rect = rects[key];
        var alpha = Math.max(0, Math.min(1, 1 - (nowMs - rect.tsMs) / FADE_TIME_MS));
        alpha = alpha * alpha;
        if (fill) {
          g.fillStyle = `rgba(${rgb} / ${alpha})`;
          g.fillRect(viewX + pixW * rect.x, viewY + pixH * rect.y, pixW, pixH);
        }
        else {
          g.lineWidth = 3;
          g.strokeStyle = `rgba(${rgb} / ${alpha})`;
          g.strokeRect(viewX + pixW * rect.x, viewY + pixH * rect.y, pixW, pixH);
        }
        if (alpha <= 0) {
          delete rects[key];
        }
      }
    }
  }

  class EngineBase {
    constructor(cfg) {
      this.cfg = cfg;
      
      this.mem = new Int32Array(cfg.width * cfg.height);
      this.entryQueue = new Queue(cfg.entryQueueDepth);
      this.resultQueue = new Queue(cfg.resultQueueDepth);

      this.iterCredit = 0;
      this.memCredit = 0;

      this.totalIters = 0;
      this.memNumWrites = 0;
      this.memNumReads = 0;
      this.eventQueue = [];
      this.numFinished = 0;

      this.elapsedMs = 0;
    }

    abort() {
      this.entryQueue.clear();
      this.resultQueue.clear();
      this.eventQueue = [];
    }

    busy() { 
      return !this.entryQueue.empty() || !this.resultQueue.empty(); 
    }

    update(simTimeMs) {
      if (!this.busy()) return;

      // 経過時間
      const deltaMs = simTimeMs - this.elapsedMs;
      this.elapsedMs = simTimeMs;

      // 実行速度調整するためのクレジット生成
      // 前回のクレジットがマイナスの場合はそれも加味する
      this.iterCredit = Math.min(0, this.iterCredit);
      this.memCredit = Math.min(0, this.memCredit);
      this.iterCredit += deltaMs * this.cfg.iterPerSec / 1000;
      this.memCredit += deltaMs * this.cfg.memPerSec / 1000;

      // 制御処理の実行 (サブクラス)
      this.onUpdating();
      
      // クレジットが無くなるまでマンデルブロ集合演算処理
      while(this.iterCredit > 0 && !this.entryQueue.empty() && !this.resultQueue.checkFull()) {
        const task = this.entryQueue.peek();
        const numIters = task.process(this.iterCredit);
        this.totalIters += numIters;
        this.iterCredit -= numIters;
        this.eventQueue.push(new MandelbrotEvent(task.x, task.y, EVT_ITERATION));
        if (task.finished) {
          this.entryQueue.pop();
          this.resultQueue.push(task);
        }
      }

    }
    
    memWrite(x, y, value) {
      this.mem[y * this.cfg.width + x] = value;
      this.memNumWrites++;
      this.memCredit--;
      this.eventQueue.push(new MandelbrotEvent(x, y, EVT_MEM_WRITE));
      if ((value & FLAG_FINISHED) != 0) {
        this.numFinished++;
      }
    }

    memRead(x, y) {
      this.memNumReads++;
      this.memCredit--;
      this.eventQueue.push(new MandelbrotEvent(x, y, EVT_MEM_READ));
      return this.mem[y * this.cfg.width + x];
    }
  }

  class NormalEngine extends EngineBase {
    constructor(cfg) {
      super(cfg);
      this.x = 0;
      this.y = 0;
    }

    busy() {
      return (this.y < this.cfg.height) || super.busy();
    }

    onUpdating() {
      while(this.y < this.cfg.height && !this.entryQueue.checkFull()) {
        this.entryQueue.push(new MandelbrotTask(this.cfg, this.x, this.y));
        this.x += 1;
        if (this.x >= this.cfg.width) {
          this.y += 1;
          this.x = 0;
        }
      }

      while (!this.resultQueue.empty() && this.memCredit > 0) {
        const task = this.resultQueue.pop();
        var value = task.n;
        if (task.diverged) value |= FLAG_DIVERGED;
        if (task.finished) value |= FLAG_FINISHED;
        this.memWrite(task.x, task.y, value);
      }
    }
  }
  
  class FastMandel extends EngineBase {
    static ST_INIT = 0;
    static ST_WORK = 1;
    static ST_FILL = 2;
    static ST_FINISHED = 3;

    constructor(cfg) {
      super(cfg);
      this.state = FastMandel.ST_INIT;
      this.x = 0;
      this.y = 0;
      this.fillValue = 0;
    }

    busy() {
      return (this.state != FastMandel.ST_FINISHED) || super.busy();
    }

    onUpdating() {      
      while(this.memCredit > 0) {
        var busy = false;
        switch(this.state) {
          case FastMandel.ST_INIT: busy |= this.init(); break;
          case FastMandel.ST_WORK: busy |= this.work(); break;
          case FastMandel.ST_FILL: busy |= this.fill(); break;
        }
        if (!busy) break;
      }
    }

    init() {
      if (this.entryQueue.checkFull()) {
        return false;
      }

      const edge =
        (this.x == 0) ||
        (this.x == this.cfg.width - 1) ||
        (this.y == 0) ||
        (this.y == this.cfg.height - 1);

      var value = 0;
      if (edge) {
        this.entryQueue.push(new MandelbrotTask(this.cfg, this.x, this.y));
        value |= FLAG_HANDLED;
      }
      this.memWrite(this.x, this.y, value);
      
      this.x++;
      if (this.x >= this.cfg.width) {
        this.y++;
        this.x = 0;
      }
      if (this.y >= this.cfg.height) {
        this.x = 0;
        this.y = 0;
        this.state = FastMandel.ST_WORK;
      }

      return true;
    }

    work() {
      const busy = !this.resultQueue.empty() && !this.entryQueue.checkFull(8);
      
      if (busy) {
        const task = this.resultQueue.pop();

        var value = task.n;
        value |= FLAG_HANDLED;
        if (task.diverged) value |= FLAG_DIVERGED;
        if (task.finished) value |= FLAG_FINISHED;
        this.memWrite(task.x, task.y, value);

        const cx = task.x;
        const cy = task.y;

        const c = this.getPixelInfo(cx, cy);
        const l = this.getPixelInfo(cx - 1, cy);
        const r = this.getPixelInfo(cx + 1, cy);
        const u = this.getPixelInfo(cx, cy - 1);
        const d = this.getPixelInfo(cx, cy + 1);
        const lu = this.getPixelInfo(cx - 1, cy - 1);
        const ru = this.getPixelInfo(cx + 1, cy - 1);
        const ld = this.getPixelInfo(cx - 1, cy + 1);
        const rd = this.getPixelInfo(cx + 1, cy + 1);
        this.compare(c, l, u, lu);
        this.compare(c, r, u, ru);
        this.compare(c, l, d, ld);
        this.compare(c, r, d, rd);
        this.compare(c, u, l, lu);
        this.compare(c, d, l, ld);
        this.compare(c, u, r, ru);
        this.compare(c, d, r, rd);
      }

      if (this.resultQueue.empty() && !super.busy()) {
        this.state = FastMandel.ST_FILL;
        this.x = 0;
        this.y = 0;
      }

      return busy;
    }

    fill() {
      const edge =
        (this.x == 0) ||
        (this.x == this.cfg.width - 1) ||
        (this.y == 0) ||
        (this.y == this.cfg.height - 1);

      var value = this.memRead(this.x, this.y);
      if (value == 0) {
        this.memWrite(this.x, this.y, this.fillValue);
      }
      else {
        this.fillValue = value;
      }

      this.x++;
      if (this.x >= this.cfg.width) {
        this.y++;
        this.x = 0;
      }
      if (this.y >= this.cfg.height) {
        this.x = 0;
        this.y = 0;
        this.state = FastMandel.ST_FINISHED;
        return false;
      }

      return true;
    }

    getPixelInfo(x, y) {
      if (0 <= x && x < this.cfg.width && 0 <= y && y < this.cfg.height) {
        return new PixelInfo(x, y, this.memRead(x, y));
      }
      else {
        return null;
      }
    }

    compare(c, l, u, lu) {
      if (l && l.finished && l.count != c.count) {
        if (u && !u.handled) {
          u.handled = true;
          this.memWrite(u.x, u.y, FLAG_HANDLED);
          this.entryQueue.push(new MandelbrotTask(this.cfg, u.x, u.y));
        }
        if (lu && !lu.handled) {
          lu.handled = true;
          this.memWrite(lu.x, lu.y, FLAG_HANDLED);
          this.entryQueue.push(new MandelbrotTask(this.cfg, lu.x, lu.y));
        }
      }
    }
  }

  class PixelInfo {
    constructor(x, y, val) {
      this.x = x;
      this.y = y;
      this.count = val & COUNT_MASK;
      this.finished = (val & FLAG_FINISHED) != 0;
      this.handled = (val & FLAG_HANDLED) != 0;
    }
  }

  class MandelbrotEvent {
    constructor(x, y, code) {
      this.code = code;
      this.x = x;
      this.y = y;
    }
  }

  class PixelMarker {
    constructor(tsMs, x, y) {
      this.tsMs = tsMs;
      this.x = x;
      this.y = y;
    }
  }

  class MandelbrotTask {
    constructor(cfg, x, y) {
      this.cfg = cfg;
      this.x = x;
      this.y = y;

      var rangeX = cfg.range;
      var rangeY = cfg.range;
      if (cfg.width > cfg.height) {
        rangeY = rangeX * cfg.height / cfg.width;
      }
      else {
        rangeX = rangeY * cfg.width / cfg.height;
      }
      const a0 = cfg.a - rangeX / 2;
      const a1 = cfg.a + rangeX / 2;
      const b0 = cfg.b - rangeY / 2;
      const b1 = cfg.b + rangeY / 2;
      this.a = a0 + (a1 - a0) * x / cfg.width;
      this.b = b0 + (b1 - b0) * y / cfg.height;

      this.r = 0;
      this.i = 0;
      this.n = 0;

      this.finished = false;
      this.diverged = false;
    }

    process(iterStep) {
      const maxIter = this.cfg.maxIter;
      const a = this.a;
      const b = this.b;
      var r = this.r;
      var i = this.i;
      var n = this.n;
      var diverged = this.diverged;
      var finished = this.finished;
      var numIters = 0;
      while (!finished && numIters < iterStep) {
        const rr = r * r;
        const ii = i * i;
        const ri = r * i;
        diverged = (rr + ii >= 4);
        finished = (n >= maxIter) || diverged;
        r = rr - ii + a;
        i = 2 * ri + b;
        n++;
        numIters++;
      }
      this.r = r;
      this.i = i;
      this.n = n;
      this.diverged = diverged;
      this.finished = finished;
      return numIters;
    }
  }

  class Queue {
    constructor(depth) {
      this.depth = depth;
      this.array = [];
      this.fullFlag = false;
    }

    count() {
      return this.array.length;
    }

    empty(numPop = 1) {
      return this.array.length < numPop;
    }

    checkFull(numPush = 1) {
      this.fullFlag = this.array.length + numPush >= this.depth;
      return this.fullFlag;
    }

    push(item) {
      if (this.array.length >= this.depth) throw new Error('Queue overflow');
      this.array.push(item);
    }

    pop() {
      if (this.array.length <= 0) throw new Error('Queue underflow');
      this.fullFlag = false;
      return this.array.shift();
    }

    peek() {
      if (this.array.length <= 0) throw new Error('Queue underflow');
      return this.array[0];
    }

    clear() {
      this.fullFlag = false;
      this.array = [];
    }
  }

  function formatFloat(width, fracWidth, value) {
    const neg = value < 0;
    if (neg) value = -value;

    var digits = [];

    if (fracWidth > 0) {
      for (var i = 0; i < fracWidth; i++) {
        value *= 10;
      }
      value = Math.round(value);
      for (var i = 0; i < fracWidth; i++) {
        digits.unshift(`${value % 10}`);
        value = Math.floor(value / 10);
      }
      digits.unshift('.');
    }
    else {
      value = Math.round(value);
    }

    digits.unshift(`${value}`);
    if (neg) digits.unshift('-');

    return digits.join('').padStart(width, ' ');
  }

  const ui = new MandelUi('article_mandelbrot_wrapper');
  ui.init();
})();  
