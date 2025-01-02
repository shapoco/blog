(function() {
  'use strict';

  // ピクセルの状態を示すフラグ
  const FLAG_HANDLED = 1 << 28;
  const FLAG_DIVERGED = 1 << 29;
  const FLAG_FINISHED = 1 << 30;
  const COUNT_MASK = (1 << 28) - 1;

  // 表示更新用のイベントコード
  const EVT_ITERATION = 1;
  const EVT_MEM_WRITE = 2;
  const EVT_MEM_READ = 3;

  // UI の内部的な解像度
  const UI_WIDTH = 1280;
  const UI_HEIGHT = 960;

  // 設定項目
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

  // UIクラス
  class MandelbrotUi {
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
      this.validateTimeoutId = null;
    }

    init() {
      this.canvas.width = UI_WIDTH;
      this.canvas.height = UI_HEIGHT;

      // 設定UIの生成
      const table = document.createElement('table');
      for (var category of CONFIG_ITEMS) {
        const tr = document.createElement('tr');
        const th = document.createElement('th');
        const td = document.createElement('td');
        th.innerHTML = category.label;
        for (var item of category.items) {
          const inputId = `article_${category.id}_${item.key}`;
          
          const label = document.createElement('label');
          label.htmlFor = inputId;
          label.innerHTML = ` ${item.label}:`;
          
          const input = document.createElement('input');
          input.id = inputId;
          input.type = 'text';
          if (item.init === null) {
            // 初期値が null の場合は省略可能とする
            input.value = '';
            input.placeholder = '(auto)';
          }
          else {
            input.value = item.init;
          }
          input.size = 4;
          input.addEventListener('change', ()=>this.requestConfigValidation());
          input.addEventListener('keydown', ()=>this.requestConfigValidation());

          item.ui = input;
          this.config[item.key] = item.init;

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
      this.abortButton.disabled = true;

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

    // パラメータの検証をリクエスト
    requestConfigValidation() {
      if (this.validateTimeoutId !== null) {
        window.clearTimeout(this.validateTimeoutId);
      }
      this.validateTimeoutId = window.setTimeout(() => this.completeConfigValidation(), 500);
    }

    // パラメータの検証を完了させる
    completeConfigValidation() {
      try {
        for (var category of CONFIG_ITEMS) {
          for (var item of category.items) {
            var valueStr = item.ui.value.trim();
            if (item.init === null && !valueStr) {
              this.config[item.key] = null;
            }
            else {
              const value = parseFloat(valueStr);
              if (item.type == 'int' && value != Math.floor(value)) {
                throw new Error('Value must be integer.');
              }
              if (value < item.min || item.max < value) {
                throw new Error('Value out of range.');
              }
              this.config[item.key] = value;
            }
            //item.ui.style.background = 'unset';
            item.ui.style.color = 'unset';
          }
        }
        this.startButton.disabled = false;
        return true;
      }
      catch(ex) {
        //item.ui.style.background = '#fcc';
        item.ui.style.color = '#f00';
        this.startButton.disabled = true;
        return false;
      }
    }

    // 処理の中断
    abort() {
      if (this.normalEngine) {
        this.normalEngine.abort();
        this.normalEngine = null;
      }
      if (this.fastEngine) {
        this.fastEngine.abort();
        this.fastEngine = null;
      }
      this.startButton.disabled = !this.completeConfigValidation();
      this.abortButton.disabled = true;
    }

    // 実行準備
    ready() {
      if (!this.completeConfigValidation()) return false;

      this.abort();
      const cfg = structuredClone(this.config);

      // 画像の高さが未指定の場合は幅と同じにする
      if (cfg.height === null) {
        cfg.height = cfg.width;
      }

      // キューの容量が指定されていない場合は自動決定する
      const preferredQueueDepth = (cfg.width + cfg.height) * 2;
      if (cfg.entryQueueDepth === null) {
        cfg.entryQueueDepth = preferredQueueDepth;
      }
      if (cfg.resultQueueDepth === null) {
        cfg.resultQueueDepth = preferredQueueDepth;
      }

      this.normalEngine = new EngineUi(new NormalEngine(cfg));
      this.fastEngine = new EngineUi(new FastEngine(cfg));
      this.lastMs = undefined;
      this.simTimeMs = 0;

      return true;
    }

    // 演算開始
    start() {
      if (!this.ready()) return;
      window.requestAnimationFrame((t)=>this.loop(t));
      this.abortButton.disabled = false;
      this.startButton.disabled = true;
    }

    // 更新処理
    loop(nowMs) {
      if (!this.normalEngine || !this.fastEngine) return;

      // フレームレートに応じて処理を進めるが、処理量には上限を設ける
      if (this.lastMs === undefined) {
        this.lastMs = nowMs;
      }
      const deltaMs = Math.min(100, nowMs - this.lastMs);
      this.lastMs = nowMs;

      this.simTimeMs += deltaMs;

      // 演算処理
      this.normalEngine.update(this.simTimeMs);
      this.fastEngine.update(this.simTimeMs);

      // 描画処理
      this.render(nowMs);

      if (this.normalEngine.busy() || this.fastEngine.busy()) {
        window.requestAnimationFrame((t)=>this.loop(t));
      }
      else {
        this.startButton.disabled = !this.completeConfigValidation();
        this.abortButton.disabled = true;
      }
    }

    // 描画処理
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

  // エンジン毎のUI
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

    // ピクセルの強調表示の色
    static COL_BUSY = '255 192 0'; // 処理中のピクセルの色
    static COL_READ = '0 255 128'; // メモリ読み出し中のピクセルの色
    static COL_WRITE = '255 64 0'; // メモリ書き込み中のピクセルの色

    constructor(engine) {
      this.cfg = engine.cfg;
      this.engine = engine;

      // バックバッファの生成
      this.pixelSize = Math.ceil(512 / this.cfg.width);
      this.canvas = document.createElement('canvas');
      this.canvas.width = this.cfg.width * this.pixelSize;
      this.canvas.height = this.cfg.height * this.pixelSize;
      const g = this.canvas.getContext('2d');
      g.fillStyle = '#404';
      g.fillRect(0, 0, this.canvas.width, this.canvas.height);
      
      // ピクセル強調表示の管理用辞書
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
      // 描画表示更新用キューからイベントを刈り取って表示を更新する
      this.updateBackbuffer(this.engine.eventQueue);
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

      // バックバッファの描画
      const imgW = viewW;
      const imgH = imgW;
      this.renderBackbuffer(nowMs, g, viewX, viewY, imgW, imgH);

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
      g.fillText(`${this.engine.numMemReads}`.padStart(countDigits, ' '), viewX + labelW, y + fontH);
      y += lineH;

      g.lineWidth = 3;
      g.strokeStyle = `rgb(${EngineUi.COL_WRITE})`;
      g.strokeRect(viewX, y, fontH, fontH);
      g.fillText('Mem. Write:', viewX + fontH * 3 / 2, y + fontH);
      g.fillText(`${this.engine.numMemWrites}`.padStart(countDigits, ' '), viewX + labelW, y + fontH);
      y += lineH;

      g.fillText('Rendering Time:', viewX, y + fontH);
      g.fillText(`${formatFloat(6, 2, this.engine.elapsedMs / 1000)}`.padEnd(6, ' ')+' sec', viewX + labelW, y + fontH);
      y += lineH;
    }

    // バックバッファの更新
    updateBackbuffer(eventQueue) {
      const pxSize = this.pixelSize;
      const g = this.canvas.getContext('2d');
      for (const evt of eventQueue) {
        if (evt.code != EVT_MEM_WRITE) continue; // メモリ書き込みイベント以外は無視
        const x = evt.x;
        const y = evt.y;
        const value = this.engine.mem[y * this.cfg.width + x];
        if (value & FLAG_FINISHED) {
          if (value & FLAG_DIVERGED) {
            // 発散したピクセル: パレットを補間して色を生成
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
          else {
            // 発散しなかったピクセル
            g.fillStyle = '#000';
          }
        }
        else if (value & FLAG_HANDLED) {
          // キューイング済みピクセル
          g.fillStyle = '#fff';
        }
        else if (value == 0) {
          // ゼロクリアされたピクセル
          g.fillStyle = '#008';
        }
        else {
          // 不明
          g.fillStyle = '#f00';
        }
        g.fillRect(x * pxSize, y * pxSize, pxSize, pxSize);
      }
    }
    
    // バックバッファの描画
    renderBackbuffer(nowMs, g, viewX, viewY, viewW, viewH) {
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

      // 強調表示の描画
      this.renderMarkers(nowMs, g, drawX, drawY, drawW, drawH, this.busyMarkers, EngineUi.COL_BUSY, true);
      this.renderMarkers(nowMs, g, drawX, drawY, drawW, drawH, this.readMarkers, EngineUi.COL_READ, false);
      this.renderMarkers(nowMs, g, drawX, drawY, drawW, drawH, this.writeMarkers, EngineUi.COL_WRITE, false);
    }

    // ピクセルの強調表示
    renderMarkers(nowMs, g, viewX, viewY, viewW, viewH, markers, rgb, fill) {
      const FADE_TIME_MS = 100; // フェードアウト時間
      const pixW = viewW / this.cfg.width;
      const pixH = viewH / this.cfg.height;
      g.lineWidth = 2;
      for(const key of Object.keys(markers)) {
        const marker = markers[key];
        var alpha = Math.max(0, Math.min(1, 1 - (nowMs - marker.tsMs) / FADE_TIME_MS));
        alpha = alpha * alpha;
        if (fill) {
          g.fillStyle = `rgba(${rgb} / ${alpha})`;
          g.fillRect(viewX + pixW * marker.x, viewY + pixH * marker.y, pixW, pixH);
        }
        else {
          g.lineWidth = 3;
          g.strokeStyle = `rgba(${rgb} / ${alpha})`;
          g.strokeRect(viewX + pixW * marker.x, viewY + pixH * marker.y, pixW, pixH);
        }
        if (alpha <= 0) {
          // フェードアウト時間が過ぎたものは削除
          delete markers[key];
        }
      }
    }
  }

  // エンジンの基底クラス
  class EngineBase {
    constructor(cfg) {
      this.cfg = cfg;
      
      // ワークメモリ
      this.mem = new Int32Array(cfg.width * cfg.height);

      // キュー
      this.entryQueue = new Queue(cfg.entryQueueDepth);
      this.resultQueue = new Queue(cfg.resultQueueDepth);

      // 処理速度調整用のクレジット
      this.iterCredit = 0;
      this.memCredit = 0;

      // 表示用のフィールド
      this.eventQueue = [];
      this.elapsedMs = 0;
      this.totalIters = 0;
      this.numMemWrites = 0;
      this.numMemReads = 0;
      this.numFinished = 0;
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
    
    // ワークメモリ書き込み
    memWrite(x, y, value) {
      this.mem[y * this.cfg.width + x] = value;
      this.numMemWrites++;
      this.memCredit--;
      this.eventQueue.push(new MandelbrotEvent(x, y, EVT_MEM_WRITE));
      if ((value & FLAG_FINISHED) != 0) {
        this.numFinished++;
      }
    }

    // ワークメモリ読み出し
    memRead(x, y) {
      this.numMemReads++;
      this.memCredit--;
      this.eventQueue.push(new MandelbrotEvent(x, y, EVT_MEM_READ));
      return this.mem[y * this.cfg.width + x];
    }
  }

  // 通常のマンデルブロ集合エンジン
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
      // エントリーキューへのタスク挿入
      while(this.y < this.cfg.height && !this.entryQueue.checkFull()) {
        this.entryQueue.push(new MandelbrotTask(this.cfg, this.x, this.y));
        
        // キューイングされたピクセルの表示のためにこっそりメモリ書き込み
        this.mem[this.y * this.cfg.width + this.x] = FLAG_HANDLED;
        this.eventQueue.push(new MandelbrotEvent(this.x, this.y, EVT_MEM_WRITE));
        
        this.x += 1;
        if (this.x >= this.cfg.width) {
          this.y += 1;
          this.x = 0;
        }
      }

      // 結果キューからの刈り取り --> メモリに反映して更新通知
      while (!this.resultQueue.empty() && this.memCredit > 0) {
        const task = this.resultQueue.pop();
        var value = task.n;
        if (task.diverged) value |= FLAG_DIVERGED;
        if (task.finished) value |= FLAG_FINISHED;
        this.memWrite(task.x, task.y, value);
      }
    }
  }
  
  // border tracing の実装
  class FastEngine extends EngineBase {
    // ステート定義
    static ST_INIT = 0; // ワークメモリの初期化
    static ST_WORK = 1; // 演算処理
    static ST_FILL = 2; // 塗りつぶし
    static ST_FINISHED = 3; // 完了

    constructor(cfg) {
      super(cfg);
      this.state = FastEngine.ST_INIT;
      this.x = 0;
      this.y = 0;
      this.fillValue = 0; // 塗りつぶし用の変数
    }

    busy() {
      return (this.state != FastEngine.ST_FINISHED) || super.busy();
    }

    onUpdating() {      
      while(this.memCredit > 0) {
        var busy = false;
        switch(this.state) {
          case FastEngine.ST_INIT: busy |= this.init(); break;
          case FastEngine.ST_WORK: busy |= this.work(); break;
          case FastEngine.ST_FILL: busy |= this.fill(); break;
        }
        if (!busy) break;
      }
    }

    // ワークメモリの初期化
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
        this.state = FastEngine.ST_WORK;
      }

      return true;
    }

    // 演算処理
    work() {
      const busy = !this.resultQueue.empty() && !this.entryQueue.checkFull(8);
      
      if (busy) {
        // 結果キューから pop してワークメモリに反映
        const task = this.resultQueue.pop();
        var value = task.n;
        value |= FLAG_HANDLED;
        if (task.diverged) value |= FLAG_DIVERGED;
        if (task.finished) value |= FLAG_FINISHED;
        this.memWrite(task.x, task.y, value);

        // 近傍ピクセルの取得
        // コードの簡略のため PixelInfo として取得
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

        // 近傍ピクセルと値を比較して境界線を見つける
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
        // タスクが無くなったら塗りつぶしへ移行
        this.state = FastEngine.ST_FILL;
        this.x = 0;
        this.y = 0;
      }

      return busy;
    }

    // ワークメモリからピクセル情報を取得する
    getPixelInfo(x, y) {
      if (0 <= x && x < this.cfg.width && 0 <= y && y < this.cfg.height) {
        return new PixelInfo(x, y, this.memRead(x, y));
      }
      else {
        return null;
      }
    }

    // 境界線の処理
    // a: 注目ピクセル
    // b: 境界線検出用の隣接ピクセル
    // c, d: 新たに処理対象とするピクセル
    //   |   |   |
    // --+---+---+--
    //   | d | c | 
    // --+---+---+--
    //   | b | a | 
    // --+---+---+--
    //   |   |   |
    compare(a, b, c, d) {
      if (b && b.finished && b.count != a.count) {
        // b ピクセルが処理完了済みかつ値が a と異なる
        // c, d が未処理であればエンキュー (重複しないように handled フラグを立てる)
        if (c && !c.handled) {
          c.handled = true;
          this.memWrite(c.x, c.y, FLAG_HANDLED);
          this.entryQueue.push(new MandelbrotTask(this.cfg, c.x, c.y));
        }
        if (d && !d.handled) {
          d.handled = true;
          this.memWrite(d.x, d.y, FLAG_HANDLED);
          this.entryQueue.push(new MandelbrotTask(this.cfg, d.x, d.y));
        }
      }
    }
    
    // 未処理ピクセルの塗りつぶし
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
        this.state = FastEngine.ST_FINISHED;
        return false;
      }

      return true;
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

    // マンデルブロ集合の反復処理
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

  const ui = new MandelbrotUi('article_mandelbrot_wrapper');
  ui.init();
})();  
