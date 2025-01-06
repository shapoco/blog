(function() {
  'use strict';

  // 実行間隔
  const INTERVAL_MS = 20;

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
  const DEFAULT_UI_WIDTH = 1280;
  const DEFAULT_UI_HEIGHT = 960;

  // 設定項目
  const CONFIG_REAL = { urlArg: 'sr', type: 'float', key: 'real', label: 're', init: -0.5, min: -2, max: 2 };
  const CONFIG_IMAG = { urlArg: 'si', type: 'float', key: 'imag', label: 'im', init: 0, min: -2, max: 2 };
  const CONFIG_ITEMS = [
    {
      label: 'Image',
      items: [
        { urlArg: 'iw', type: 'int', key: 'width', label: 'Width', unit: 'px', init: 128, min: 8, max: 1024, radix: 2 },
        { urlArg: 'ih', type: 'int', key: 'height', label: 'Height', unit: 'px', init: null, min: 8, max: 1024, radix: 2 },
      ]
    },
    {
      label: 'Scene',
      items: [
        CONFIG_REAL,
        CONFIG_IMAG,
        { urlArg: 'sz', type: 'float', key: 'zoom', label: 'Zoom', init: '2^-1', min: -2, max: (2**50), radix: 2 },
        { urlArg: 'sm', type: 'int', key: 'maxIter', label: 'Max Iterations', init: 100, min: 1, max: 10000, radix: 10 },
      ],
    },
    {
      label: 'Engine<br>Spec',
      items: [
        { urlArg: 'ei', type: 'int', key: 'iterPerSec', label: 'Iteration', unit: 'iter/sec', init: null, min: 1, max: 1000 * 1000, radix: 10 },
        { urlArg: 'ee', type: 'int', key: 'entryQueueDepth', label: 'Entry Queue Size', unit: 'px', init: null, min: 1, max: 65536, radix: 2 },
        { urlArg: 'er', type: 'int', key: 'resultQueueDepth', label: 'Result Queue Size', unit: 'px', init: null, min: 1, max: 65536, radix: 2 },
        //{ urlArg: 'es', type: 'bool', key: 'usePriority', label: 'Use Priority for Tracing', init: true },
      ]
    },
    {
      label: 'Memory<br>Spec',
      items: [
        { urlArg: 'mm', type: 'int', key: 'memOpPerSec', label: 'Memory', unit: 'op/sec', init: null, min: 1, max: 1000 * 1000, radix: 10 },
        { urlArg: 'mc', type: 'int', key: 'cacheOpPerSec', label: 'Cache', unit: 'op/sec', init: null, min: 1, max: 1000 * 1000, radix: 10 },
        { urlArg: 'ms', type: 'int', key: 'cacheLineSize', label: 'Cache Line Size', unit: 'px', init: null, min: 1, max: 65536, radix: 2 },
        { urlArg: 'mn', type: 'int', key: 'numCacheLines', label: 'Number of Cache Lines', init: null, min: 0, max: 1024, radix: 2 },
      ]
    },
  ];

  // UIクラス
  class MandelbrotUi {
    constructor(wrapperId) {
      this.canvas = document.createElement('canvas');
      this.canvas.width = DEFAULT_UI_WIDTH;
      this.canvas.height = DEFAULT_UI_HEIGHT;

      const viewW = this.canvas.width;
      const viewH = this.canvas.height;
      this.fontHeight = viewH / 40;
      const margin = Math.floor(viewW / 40);
      this.uiMargin = margin;
      const engineW = Math.floor((viewW - margin * 3) / 2);
      const engineH = viewH - this.fontHeight - margin * 3;
      this.rasterEngineUi = new EngineUi('Raster Scan', new Rect(margin, margin, engineW, engineH));
      this.fastEngineUi = new EngineUi('Border Tracing', new Rect(margin * 2 + engineW, margin, engineW, engineH));
      this.engineUis = [
        this.rasterEngineUi,
        this.fastEngineUi,
      ];

      this.hovered = false;
      this.cursorX = 0;
      this.cursorY = 0;

      this.imageHovered = false;
      this.imagePixelX = 0;
      this.imagePixelY = 0;

      this.wrapper = document.querySelector(`#${wrapperId}`);
      this.startButton = document.createElement('button');
      this.stopButton = document.createElement('button');
      this.nextConfig = {};
      this.lastConfig = {};
      this.simTimeMs = 0;
      this.validateTimeoutId = null;

      this.updateIntervalId = null;
      this.waitingToRender = false;

      this.compareResult = null;
      this.fpsCounter = new FpsCounter();
    }

    init() {
      // 設定UIの生成
      const table = document.createElement('table');
      for (let category of CONFIG_ITEMS) {
        const tr = document.createElement('tr');
        const th = document.createElement('th');
        const td = document.createElement('td');
        th.innerHTML = category.label;
        for (let item of category.items) {
          const inputId = `article_${category.id}_${item.key}`;
          const uiHeight = '3ex';
          
          const label = document.createElement('label');
          label.htmlFor = inputId;
          label.innerHTML = ` ${item.label}: `;
          
          const input = document.createElement('input');
          input.id = inputId;
          input.style.height = uiHeight;
          input.style.boxSizing = 'border-box';
          input.style.lineHeight = uiHeight;
          input.style.verticalAlign = 'middle';
          input.style.margin = '0px';
          if (item.type == 'bool') {
            input.type = 'checkbox';
            input.checked = !!item.init;
          }
          else {
            input.type = 'text';
            if (item.init === null) {
              // 初期値が null の場合は省略可能とする
              input.value = '';
              input.placeholder = 'auto';
            }
            else {
              input.value = item.init;
            }
            input.style.width = '6em';
          }
          input.addEventListener('change', ()=>this.requestConfigValidation());
          input.addEventListener('keydown', ()=>this.requestConfigValidation());

          item.ui = input;
          this.nextConfig[item.key] = item.init;

          const span = document.createElement('span');
          span.style.display = 'inline-block';
          span.style.borderRight = 'solid 1px #888';
          span.style.padding = '0.5ex 0.5em';
          span.appendChild(label);
          span.appendChild(input);

          if (item.radix) {
            const updown = [
              { label: '▴', step: 1 },
              { label: '▾', step: -1 },
            ];
            for (let ud of updown) {
              const button = document.createElement('button');
              button.type = 'button';
              button.innerHTML = ud.label;
              button.style.height = uiHeight;
              button.style.width = '1.5em';
              button.style.lineHeight = uiHeight;
              button.style.boxSizing = 'border-box';
              button.style.margin = '0px';
              button.style.padding = '0px';
              button.style.verticalAlign = 'middle';
              span.appendChild(button);
              button.addEventListener('click', (evt) => {
                const radix = parseExpr(item.ui.value).radix;
                var value = this.nextConfig[item.key];
                if (item.radix == 2) {
                  if (value == 0 && ud.step > 0) {
                    value = 1;
                  }
                  else {
                    value *= 2 ** ud.step;
                  }
                }
                else {
                  const log10 = Math.floor(Math.log10(value * (1 + ud.step / 10000)));
                  value += ud.step * (10 ** log10);
                }
                if (item.type == 'int') {
                  value = Math.floor(value);
                }
                item.ui.value = toExpr(Math.max(item.min, Math.min(item.max, value)), radix);
                this.completeConfigValidation();
              });
            }
          }
          
          if (item.unit) {
            const unit = document.createElement('span');
            unit.innerHTML = ' ' + item.unit;
            span.appendChild(unit);
          }

          td.appendChild(span);
          td.appendChild(document.createTextNode('\n'));
        }
        tr.appendChild(th);
        tr.appendChild(td);
        table.appendChild(tr);
      }
      this.wrapper.appendChild(table);

      this.startButton.type = 'button';
      this.stopButton.type = 'button';
      this.startButton.innerHTML = 'Start';
      this.stopButton.innerHTML = 'Stop';
      this.stopButton.disabled = true;

      const pControl = document.createElement('p');
      pControl.style.textAlign = 'center';
      pControl.appendChild(this.startButton);
      pControl.appendChild(document.createTextNode('\n'));
      pControl.appendChild(this.stopButton);
      this.wrapper.appendChild(pControl);

      const pCanvas = document.createElement('p');
      pCanvas.appendChild(this.canvas);
      this.wrapper.appendChild(pCanvas);

      this.canvas.addEventListener('mouseenter', (evt)=>{ this.onMouseEnter(evt); });
      this.canvas.addEventListener('mousemove', (evt)=>{ this.onMouseMove(evt); });
      this.canvas.addEventListener('mouseout', (evt)=>{ this.onMouseOut(evt); });
      this.canvas.addEventListener('click', (evt)=>{ this.onMouseClick(evt); });

      this.startButton.addEventListener('click', ()=>this.start());
      this.stopButton.addEventListener('click', ()=>this.stop());

      this.configFromUrl();
      this.ready();
      this.completeRender(0);
      // this.start();
    }

    onMouseEnter(evt) {
      this.hovered = true;
      this.requestRender();
    }

    onMouseMove(evt) {
      const xy = this.cursorToClient(evt);
      const x = xy[0], y = xy[1];
      this.cursorX = x;
      this.cursorY = y;
      if (!this.isEngineBusy() && this.engineUis.some(eui => eui.imageRectToParent().contains(x, y))) {
        this.canvas.style.cursor = 'pointer';
      }
      else {
        this.canvas.style.cursor = 'auto';
      }
      this.requestRender();
    }

    onMouseOut(evt) {
      this.hovered = false;
      this.canvas.style.cursor = 'auto';
      this.requestRender();
    }

    onMouseClick(evt) {
      const xy = this.cursorToClient(evt);
      const x = xy[0], y = xy[1];
      this.engineUis.forEach(eui => {
        if (eui.imageRectToParent().contains(x, y)) {
          const c = eui.parentToComplex(x, y);
          CONFIG_REAL.ui.value = c[0];
          CONFIG_IMAG.ui.value = c[1];
        }
      });
      this.completeConfigValidation();
    }

    cursorToClient(evt) {
      const canvasRect = this.canvas.getBoundingClientRect();
      return [
        evt.offsetX * this.canvas.width / canvasRect.width,
        evt.offsetY * this.canvas.height / canvasRect.height
      ];
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
        var cfg = this.configFromForm();

        this.fixConfig(cfg);

        for (var category of CONFIG_ITEMS) {
          for (var item of category.items) {
            if (item.type != 'bool' && !item.ui.value.trim()) {
              item.ui.placeholder = `(${cfg[item.key]})`;
            }
          }
        }

        this.startButton.disabled = false;
        this.requestRender();
        return true;
      }
      catch(ex) {
        item.ui.style.color = '#f00';
        this.startButton.disabled = true;
        return false;
      }
    }

    configFromForm() {
      var cfg = this.nextConfig;
      for (var category of CONFIG_ITEMS) {
        for (var item of category.items) {
          if (item.type == 'bool') {
            cfg[item.key] = item.ui.checked;
          }
          else {
            var valueStr = item.ui.value.trim();
            if (item.init === null && !valueStr) {
              cfg[item.key] = null;
            }
            else {
              const value = parseExpr(valueStr).value;
              if (item.type == 'int' && value != Math.floor(value)) {
                throw new Error('Value must be integer.');
              }
              if (value < item.min || item.max < value) {
                throw new Error('Value out of range.');
              }
              cfg[item.key] = value;
            }
            item.ui.style.color = 'unset';
          }
        }
      }
      return cfg;
    }

    // 値の自動決定
    fixConfig(cfg) {
      // 画像の高さの自動決定
      if (cfg.height === null) {
        cfg.height = cfg.width;
      }

      // キュー容量の自動決定
      const preferredQueueDepth = (cfg.width + cfg.height) * 4;
      if (cfg.entryQueueDepth === null) {
        cfg.entryQueueDepth = preferredQueueDepth;
      }
      if (cfg.resultQueueDepth === null) {
        cfg.resultQueueDepth = preferredQueueDepth;
      }

      const exp10wh = Math.round(10 ** Math.floor(Math.log10(cfg.width * cfg.height)));
      const preferredPerf = Math.floor(cfg.width * cfg.height / exp10wh) * exp10wh;

      // エンジン性能の自動決定
      if (cfg.iterPerSec === null) {
        cfg.iterPerSec = preferredPerf;
      }

      // メインメモリ性能の自動決定
      if (cfg.memOpPerSec === null) {
        cfg.memOpPerSec = Math.ceil(preferredPerf / 10);
      }

      // キャッシュ性能の自動決定
      if (cfg.cacheOpPerSec === null) {
        cfg.cacheOpPerSec =  preferredPerf;
      }

      // キャッシュラインサイズの自動決定
      if (cfg.numCacheLines === null) {
        cfg.numCacheLines = 16;
      }

      // キャッシュラインサイズの自動決定
      if (cfg.cacheLineSize === null) {
        cfg.cacheLineSize = 1024;
      }
      
      for (var category of CONFIG_ITEMS) {
        for (var item of category.items) {
          if (item.type == 'int' || item.type == 'float') {
            cfg[item.key] = Math.max(item.min, Math.min(item.max, cfg[item.key]));
          }
        }
      }
    }

    // 設定をURLに反映
    configToUrl() {
      var url = window.location.href.replaceAll(/#.+$/g, '');

      var autoCfg = this.configFromForm();
      for (var category of CONFIG_ITEMS) {
        for (var item of category.items) {
          if (item.init === null) {
            autoCfg[item.key] = null;
          }
        }
      }
      this.fixConfig(autoCfg);

      var defaultCfg = {};
      for (var category of CONFIG_ITEMS) {
        for (var item of category.items) {
          if (item.init === null) {
            defaultCfg[item.key] = autoCfg[item.key];
          }
          else {
            defaultCfg[item.key] = parseExpr(item.init).value;
          }
        }
      }
      this.fixConfig(defaultCfg);

      var args = [];
      for (var category of CONFIG_ITEMS) {
        for (var item of category.items) {
          var value = this.lastConfig[item.key];
          if (value == defaultCfg[item.key]) continue;
          if (item.type == 'bool') {
            value = value ? '1' : '0';
          }
          else {
            value = toExpr(value, -1);
          }
          args.push(`${item.urlArg}=${encodeURIComponent(value)}`)
        }
      }

      if (args.length > 0) {
        url += '#' + args.join('&')
      }

      window.location.href = url;
    }

    // URLから設定をロード
    configFromUrl() {
      let cfgs = {};
      for (var category of CONFIG_ITEMS) {
        for (var item of category.items) {
          cfgs[item.urlArg] = item;
        }
      }

      const args = window.location.href.replaceAll(/^.+#/g, '').split('&');
      for (let kvStr of args) {
        try {
          const kv = kvStr.split('=');
          if (kv.length != 2) {
            throw new Error('Invalid argument format');
          }

          let key, value;
          [key, value] = kv.map(s => decodeURIComponent(s));
          if (!(key in cfgs)) {
            throw new Error('Unknown argument');
          }

          const cfg = cfgs[key];
          if (cfg.type == 'bool') {
            cfg.ui.checked = (parseInt(value) == 1);
          }
          else {
            value = parseExpr(value).value;
            
            //if (cfg.radix) {
            //  value = toExpr(value, cfg.radix);
            //}
            if (cfg.init) {
              value = toExpr(value, parseExpr(cfg.init).radix);
            }
            else {
              value = toExpr(value, 0);
            }
            cfg.ui.value = value;
          }
        }
        catch(ex) {
          console.error(`${ex.message}: '${kvStr}'`);
        }
      }

      this.requestConfigValidation();
    }

    // 実行中か否か
    isEngineBusy() {
      return this.engineUis.some(eui => eui.engine && eui.engine.busy());
    }

    // 処理の中断
    stop() {
      if (this.updateIntervalId !== null) {
        window.clearInterval(this.updateIntervalId);
        this.updateIntervalId = null;
      }
      this.engineUis.forEach(e => e.stop());
      this.compareResult = null;
      this.startButton.disabled = !this.completeConfigValidation();
      this.stopButton.disabled = true;
    }

    // 実行準備
    ready() {
      if (!this.completeConfigValidation()) return false;

      this.stop();
      const cfg = structuredClone(this.nextConfig);
      this.lastConfig = cfg;

      this.rasterEngineUi.init(new RasterScanEngine(cfg));
      this.fastEngineUi.init(new FastEngine(cfg));
      this.compareResult = null;

      this.simTimeMs = 0;

      return true;
    }

    // 演算開始
    start() {
      if (!this.ready()) return;

      this.configToUrl();

      this.engineUis.forEach(e => e.start());
      this.compareResult = null;

      this.updateIntervalId = window.setInterval(() => this.loop(), INTERVAL_MS);

      this.stopButton.disabled = false;
      this.startButton.disabled = true;

      this.fpsCounter.init();
    }

    // 更新処理
    loop() {
      this.simTimeMs += INTERVAL_MS;

      // 演算処理
      this.engineUis.forEach(e => e.update(this.simTimeMs));

      if (!this.isEngineBusy()) {
        // 全ての処理が終了したら停止
        this.stop();
      }
      
      const completed = this.engineUis.every(eui => eui.engine && eui.engine.completed());
      if (!this.compareResult && completed) {
        // 完了時の処理
        const arrayA = this.rasterEngineUi.engine.mem;
        const arrayB = this.fastEngineUi.engine.mem;
        const numPixels = this.lastConfig.width * this.lastConfig.height;
        var numErrors = 0;
        for (var i = 0; i < numPixels; i++) {
          const a = arrayA[i];
          const b = arrayB[i];
          const aFinished = (a & FLAG_FINISHED) != 0;
          const bFinished = (b & FLAG_FINISHED) != 0;
          const aCount = a & COUNT_MASK;
          const bCount = b & COUNT_MASK;
          if (!aFinished || !bFinished || aCount != bCount) {
            numErrors++;
          }
        }
        this.compareResult = new CompareResult();
        this.compareResult.numTotalPixels = numPixels;
        this.compareResult.numErrorPixels = numErrors;
        this.compareResult.speedRatio = this.rasterEngineUi.engine.elapsedMs / this.fastEngineUi.engine.elapsedMs;
      }
      
      // 再描画
      this.requestRender();
    }

    // 再描画要求
    requestRender() {
      if (this.waitingToRender) return;
      this.waitingToRender = true;
      window.requestAnimationFrame((t)=>this.completeRender(t));
    }

    // 描画処理
    completeRender(nowMs) {
      this.waitingToRender = false;

      this.fpsCounter.update(nowMs);

      const g = this.canvas.getContext('2d');

      const viewW = this.canvas.width;
      const viewH = this.canvas.height;

      g.fillStyle = '#000';
      g.fillRect(0, 0, viewW, viewH);

      // エンジン毎のUIを描画
      this.engineUis.forEach(eui => eui.render(nowMs, g));

      // ターゲット座標とツールチップの描画
      this.engineUis.forEach(eui => this.renderCursor(nowMs, g, eui));

      // 処理結果の描画
      this.renderResult(g)

      // フレームレートの描画
      this.renderFps(g);

      if (this.engineUis.some(eui => eui.animationInProgress())) {
        this.requestRender();
      }
    }

    renderCursor(nowMs, g, eui) {
      if (!eui.engine || !eui.engine.scene) return;

      const scene = eui.engine.scene;
      const fontH = Math.round(eui.imageViewBounds.height / 30);

      const imgRect = eui.imageRectToParent();

      {
        const xy = eui.complexToScreen(this.nextConfig.real, this.nextConfig.imag);
        const x = xy[0];
        const y = xy[1];
        g.fillStyle = 'rgba(0 0 0 /50%)';
        g.fillRect(x - 2, y - 16 / 2 - 1, 4, 16 + 2);
        g.fillRect(x - 16 / 2 - 1, y - 2, 16 + 2, 4);
        g.fillStyle = '#fff';
        g.fillRect(x - 1, y - 16 / 2, 2, 16);
        g.fillRect(x - 16 / 2, y - 1, 16, 2);
      }
    
      if (this.hovered) {
        const cursorX = this.cursorX;
        const cursorY = this.cursorY;
        if (imgRect.contains(cursorX, cursorY)) {
          const c = eui.parentToComplex(cursorX, cursorY);
          const reText = `re:${formatFloat(3 + 8, 8, c[0])}`;
          const imText = `im:${formatFloat(3 + 8, 8, c[1])}`;

          g.font = `${fontH}px monospace`;
          const tipW = Math.max(g.measureText(reText).width, g.measureText(imText).width);
          const tipX = Math.round(cursorX - tipW / 2);
          const tipY = Math.round(cursorY - fontH * 2.5);
          g.fillStyle = 'rgba(0 0 0 /50%)';
          g.fillRect(tipX, tipY, tipW, fontH * 2);
          g.fillStyle = '#fff';
          g.fillText(reText, tipX, tipY + fontH);
          g.fillText(imText, tipX, tipY + fontH * 2);
        }
      }
    }
    
    // フレームレートの描画
    renderFps(g) {
      if (!this.isEngineBusy()) return;
      const fontH = this.fontHeight;
      const text = `${formatFloat(6, 2, this.fpsCounter.fps)} FPS`;
      g.font = `${fontH}px monospace`;
      g.fillStyle = '#888';
      g.fillText(text, this.canvas.width - g.measureText(text).width, fontH);
    }

    // 処理結果の描画
    renderResult(g) {
      if (!this.compareResult) return;

      const result = this.compareResult;
      const fontH = this.fontHeight;
      const success = (result.numErrorPixels == 0) && (result.speedRatio > 1);
      var text = `Completed. `;
      if (result.numErrorPixels == 0) {
        text += 'No errors found. ';
      }
      else {
        const errPercent = result.numErrorPixels * 100 / result.numTotalPixels;
        const fracWidth = Math.max(2, -Math.log10(errPercent) + 1);
        text += `${result.numErrorPixels} pixel (${formatFloat(fracWidth, fracWidth, errPercent)}%) error found. `;
      }
      text += `Border tracing is x${formatFloat(4, 2, result.speedRatio)} ${result.speedRatio > 1 ? 'faster' : 'slower'} than raster scan.`;
      const x = this.uiMargin;
      const y = this.engineUis[0].bounds.bottom() + this.uiMargin;
      g.font = `${fontH}px monospace`;
      g.fillStyle = success ? '#0f0' : '#f00';
      g.fillText(text, x, y + fontH);
    }
  }

  class CompareResult {
    constructor() {
      this.numTotalPixels = 0;
      this.numErrorPixels = 0;
      this.speedRatio = 0;
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

    constructor(title, bounds) {
      this.title = title;
      this.bounds = bounds;

      this.margin = Math.floor(bounds.height / 40);
      this.titleFontHeight = bounds.height / 40;
      this.imageViewBounds = new Rect(0, this.titleFontHeight + this.margin, bounds.width, bounds.width);
      this.imageContentBounds = new Rect(0, this.titleFontHeight + this.margin, bounds.width, bounds.width);

      this.cfg = null;
      this.engine = null;
      
      this.canvas = document.createElement('canvas');
      this.prepareBackBuffer(256, 256);

      // ピクセル強調表示の管理用辞書
      this.busyMarkers = {};
      this.writeMarkers = {};
      this.readMarkers = {};
    }

    init(engine) {
      this.engine = engine;
      this.cfg = engine.cfg;

      // バックバッファの生成
      const pxSize = Math.ceil(1024 / (this.cfg.width + this.cfg.height));
      this.prepareBackBuffer(pxSize * this.cfg.width, pxSize * this.cfg.height);
      
      this.busyMarkers = {};
      this.writeMarkers = {};
      this.readMarkers = {};
    }

    prepareBackBuffer(buffW, buffH) {
      this.canvas.width = buffW;
      this.canvas.height = buffH;
      const g = this.canvas.getContext('2d');
      g.fillStyle = '#404';
      g.fillRect(0, 0, buffW, buffH);
      
      const view = this.imageViewBounds;
      const draw = this.imageContentBounds;
      draw.x = 0;
      draw.y = 0;
      draw.width = view.width;
      draw.height = view.height;
      if (view.width / view.height > buffW / buffH) {
        draw.width = view.height * buffW / buffH;
        draw.x = (view.width - draw.width) / 2;
      }
      else {
        draw.height = view.width * buffH / buffW;
        draw.y = (view.height - draw.height) / 2;
      }
    }

    animationInProgress() {
      if (!this.engine || !this.cfg) return false;
      return (
        this.engine.busy() ||
        this.engine.eventQueue.length > 0 ||
        Object.keys(this.busyMarkers).length > 0 ||
        Object.keys(this.readMarkers).length > 0 ||
        Object.keys(this.writeMarkers).length > 0
      );
    }

    start() {
      if (this.engine) {
        this.engine.start();
      }
    }

    stop() {
      if (this.engine) {
        this.engine.stop();
      }
    }

    update(simTimeMs) {
      if (this.engine) {
        this.engine.update(simTimeMs);
      }
    }

    render(nowMs, g) {
      const viewW = this.bounds.width;
      const viewH = this.bounds.height;
      
      g.save();
      g.translate(this.bounds.x, this.bounds.y);

      g.font = `${this.titleFontHeight}px monospace`;
      g.fillStyle = '#fff';
      g.fillText(this.title, 0, this.titleFontHeight);

      if (this.engine && this.cfg) {
        // 描画表示更新用キューからイベントを刈り取って表示を更新する
        this.updateBackbuffer(this.engine.eventQueue);
        for (const evt of this.engine.eventQueue) {
          const key = evt.y * this.cfg.width + evt.x;
          const rect = new PixelMarker(nowMs, evt.x, evt.y);
          switch(evt.code) {
            case EVT_ITERATION: this.busyMarkers[key] = rect; break;
            case EVT_MEM_READ: this.readMarkers[key] = rect; break;
            case EVT_MEM_WRITE: this.writeMarkers[key] = rect; break;
          }
        }
        this.engine.eventQueue = [];
      }
      
      // バックバッファの描画
      this.renderBackbuffer(nowMs, g);

      // 統計情報の描画
      this.renderStats(nowMs, g);

      if (this.engine.completed()) {
        const text = 'Completed.';
        g.fillText(text, viewW - g.measureText(text).width, viewH);
      }

      g.restore();
    }

    // バックバッファの更新
    updateBackbuffer(eventQueue) {
      const g = this.canvas.getContext('2d');
      const pixW = this.canvas.width / this.cfg.width;
      const pixH = this.canvas.height / this.cfg.height;
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
        g.fillRect(x * pixW, y * pixH, pixW, pixH);
      }
    }
    
    // バックバッファの描画
    renderBackbuffer(nowMs, g) {
      const viewW = this.imageViewBounds.width;
      const viewH = this.imageViewBounds.height;
      const drawW = this.imageContentBounds.width;
      const drawH = this.imageContentBounds.height;

      g.save();
      g.translate(this.imageViewBounds.x, this.imageViewBounds.y);

      g.fillStyle = '#444';
      g.fillRect(0, 0, viewW, viewH);

      {
        g.save();
        g.translate(this.imageContentBounds.x, this.imageContentBounds.y);
        
        // 画像描画
        g.drawImage(this.canvas, 0, 0, drawW, drawH);

        // 強調表示の描画
        this.renderMarkers(nowMs, g, drawW, drawH, this.busyMarkers, EngineUi.COL_BUSY, true);
        this.renderMarkers(nowMs, g, drawW, drawH, this.readMarkers, EngineUi.COL_READ, false);
        this.renderMarkers(nowMs, g, drawW, drawH, this.writeMarkers, EngineUi.COL_WRITE, false);

        g.restore();
      }

      g.lineWidth = 1;
      g.strokeStyle = '#888';
      g.strokeRect(0, 0, viewW, viewH);

      g.restore();
    }

    // ピクセルの強調表示
    renderMarkers(nowMs, g, viewW, viewH, markers, rgb, fill) {
      const FADE_TIME_MS = 0; // フェードアウト時間
      const pixW = viewW / this.cfg.width;
      const pixH = viewH / this.cfg.height;
      g.lineWidth = 2;
      for(const key of Object.keys(markers)) {
        const marker = markers[key];
        var alpha = 0;
        if (FADE_TIME_MS > 0) {
          alpha = Math.max(0, Math.min(1, 1 - (nowMs - marker.tsMs) / FADE_TIME_MS));
          alpha = alpha * alpha;
        }
        else {
          alpha = marker.tsMs > 0 ? 1 : 0;
          marker.tsMs = -1;
        }
        if (fill) {
          g.fillStyle = `rgba(${rgb} / ${alpha})`;
          g.fillRect(pixW * marker.x, pixH * marker.y, pixW, pixH);
        }
        else {
          g.lineWidth = 3;
          g.strokeStyle = `rgba(${rgb} / ${alpha})`;
          g.strokeRect(pixW * marker.x, pixH * marker.y, pixW, pixH);
        }
        if (alpha <= 0) {
          // フェードアウト時間が過ぎたものは削除
          delete markers[key];
        }
      }
    }

    // 統計情報の描画
    renderStats(nowMs, g) {
      const viewW = this.bounds.width;
      const viewH = this.bounds.height;
      
      var progress = 0;
      var entryQueueRatio = 0;
      var resultQueueUsage = 0;
      var totalIters = 0;
      var numMemReads = 0;
      var numMemWrites = 0;
      var readHitRate = 0;
      var writeHitRate = 0;
      var elapsedMs = 0;
      var counterWidth = 4;

      if (this.engine && this.cfg) {
        progress = this.engine.numFinished / (this.cfg.width * this.cfg.height);
        entryQueueRatio = this.engine.entryQueue.count() / this.cfg.entryQueueDepth;
        resultQueueUsage = this.engine.resultQueue.count() / this.cfg.resultQueueDepth;
        totalIters = this.engine.totalIters;
        numMemReads = this.engine.numMemReads + this.engine.numCacheReads;
        numMemWrites = this.engine.numMemWrites + this.engine.numCacheWrites;
        if (numMemReads > 0) readHitRate = this.engine.numCacheReads / numMemReads;
        if (numMemWrites > 0) writeHitRate = this.engine.numCacheWrites / numMemWrites;
        elapsedMs = this.engine.elapsedMs;
        counterWidth = Math.ceil(Math.log10(this.cfg.width * this.cfg.height * this.cfg.maxIter));
      }

      const lineH = Math.floor((viewH - this.imageViewBounds.bottom() - this.margin) / 7);
      const fontH = Math.ceil(lineH * 3 / 4);
      g.font = `${fontH}px monospace`;
      const labelW = Math.ceil(g.measureText('m').width * 16);
      const percentW = Math.ceil(g.measureText('_100.0%').width);
      
      var y = this.imageViewBounds.bottom() + this.margin;

      g.fillStyle = '#fff';
      g.fillText('Progress: ', 0, y + fontH);
      g.fillText(`${formatFloat(5, 1, 100 * progress)}% `, labelW, y + fontH);
      g.fillRect(labelW + percentW, y, progress * (viewW - labelW - percentW), fontH);
      y += lineH;
    
      g.fillStyle = '#fff';
      g.fillText('Entry Queue: ', 0, y + fontH);
      g.fillText(`${formatFloat(5, 1, 100 * entryQueueRatio)}% `, labelW, y + fontH);
      g.fillRect(labelW + percentW, y, entryQueueRatio * (viewW - labelW - percentW), fontH);
      y += lineH;
    
      g.fillStyle = '#fff';
      g.fillText('Result Queue: ', 0, y + fontH);
      g.fillText(`${formatFloat(5, 1, 100 * resultQueueUsage)}% `, labelW, y + fontH);
      g.fillRect(labelW + percentW, y, resultQueueUsage * (viewW - labelW - percentW), fontH);
      y += lineH;

      g.lineWidth = 3;
      g.strokeStyle = `rgb(${EngineUi.COL_BUSY})`;
      g.strokeRect(0, y, fontH, fontH);
      g.fillText('Iterations:', fontH * 3 / 2, y + fontH);
      var totalItersStr = `${totalIters}`.padStart(counterWidth, ' ');
      if (elapsedMs > 0) {
        const load = totalIters / (elapsedMs * this.cfg.iterPerSec / 1000);
        totalItersStr += ` (Load:${formatFloat(6, 2, load * 100)}%)`;
      }
      g.fillText(totalItersStr, labelW, y + fontH);
      y += lineH;

      g.lineWidth = 3;
      g.strokeStyle = `rgb(${EngineUi.COL_READ})`;
      g.strokeRect(0, y, fontH, fontH);
      g.fillText('Mem. Read:', fontH * 3 / 2, y + fontH);
      var memReadStr = `${numMemReads}`.padStart(counterWidth, ' ');
      if (numMemReads > 0) memReadStr += ` (CHR:${formatFloat(6, 2, readHitRate * 100)}%)`;
      g.fillText(memReadStr, labelW, y + fontH);
      y += lineH;

      g.lineWidth = 3;
      g.strokeStyle = `rgb(${EngineUi.COL_WRITE})`;
      g.strokeRect(0, y, fontH, fontH);
      g.fillText('Mem. Write:', fontH * 3 / 2, y + fontH);
      var memWriteStr = `${numMemWrites}`.padStart(counterWidth, ' ');
      if (numMemWrites > 0) memWriteStr += ` (CHR:${formatFloat(6, 2, writeHitRate * 100)}%)`;
      g.fillText(memWriteStr, labelW, y + fontH);
      y += lineH;

      g.fillText('Rendering Time:', 0, y + fontH);
      g.fillText(`${formatFloat(6, 2, elapsedMs / 1000)}`.padEnd(6, ' ')+' sec', labelW, y + fontH);
      y += lineH;

    }

    imageRectToParent() {
      return new Rect(
        this.bounds.x + this.imageViewBounds.x + this.imageContentBounds.x,
        this.bounds.y + this.imageViewBounds.y + this.imageContentBounds.y,
        this.imageContentBounds.width,
        this.imageContentBounds.height
      );
    }

    parentToComplex(x, y) {
      if (!this.engine || !this.engine.scene) return [0, 0];
      const imgRect = this.imageRectToParent();
      x = (x - imgRect.x + 0.5) * this.cfg.width / (imgRect.width - 1) - 0.5;
      y = (y - imgRect.y + 0.5) * this.cfg.height / (imgRect.height - 1) - 0.5;
      return this.engine.scene.xyToComplex(x, y);
    }

    complexToScreen(r, i) {
      if (!this.engine || !this.engine.scene) return [0, 0];
      const imgRect = this.imageRectToParent();
      const xy = this.engine.scene.complexToXy(r, i);
      xy[0] = imgRect.x + (xy[0] - 0.5) * (imgRect.width - 1) / this.cfg.width + 0.5;
      xy[1] = imgRect.y + (xy[1] - 0.5) * (imgRect.height - 1) / this.cfg.height + 0.5;
      return xy;
    }
  }

  // エンジンの基底クラス
  class EngineBase {
    constructor(cfg, allowStack) {
      this.cfg = cfg;
      this.scene = new MandelbrotScene(cfg);
      
      // ワークメモリ
      this.mem = new Int32Array(cfg.width * cfg.height);
      this.cachedLineIndexes = [];

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
      this.numCacheWrites = 0;
      this.numCacheReads = 0;
      this.numFinished = 0;

      this.running = false;
    }

    busy() { 
      return (
        (this.entryQueue.length > 0) ||
        (this.resultQueue.length > 0)
      );
    }

    start() {
      this.running = true;
      this.completedFlag = false;
      this.onStart();
    }
    
    stop() {
      this.running = false;
      this.onStop();
    }

    update(simTimeMs) {
      if (!this.running) return;

      // 経過時間
      const deltaMs = simTimeMs - this.elapsedMs;
      this.elapsedMs = simTimeMs;

      // 実行速度調整するためのクレジット生成
      // 借金がある場合はそれも加味する
      this.iterCredit = Math.min(0, this.iterCredit);
      this.memCredit = Math.min(0, this.memCredit);
      this.iterCredit += deltaMs * this.cfg.iterPerSec / 1000;
      this.memCredit += deltaMs / 1000;

      this.onUpdating();
      this.calculate();
    
      this.onUpdating();
      this.calculate();
    
      if (!this.busy()) {
        this.stop();
      }
    }
    
    calculate() {
      // クレジットが無くなるまでマンデルブロ集合演算処理
      while(this.iterCredit > 0 && !this.entryQueue.empty() && !this.resultQueue.checkFull()) {
        const task = this.entryQueue.peek();
        const numIters = task.calculate(this.iterCredit);
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
      this.memCredit -= this.getMemOpCost(x, y, true);
      this.eventQueue.push(new MandelbrotEvent(x, y, EVT_MEM_WRITE));
      if ((value & FLAG_FINISHED) != 0) {
        this.numFinished++;
      }
    }

    // ワークメモリ読み出し
    memRead(x, y) {
      this.memCredit -= this.getMemOpCost(x, y, false);
      this.eventQueue.push(new MandelbrotEvent(x, y, EVT_MEM_READ));
      return this.mem[y * this.cfg.width + x];
    }

    getCacheLineIndex(x, y) {
      return Math.floor((y * this.cfg.width + x) / this.cfg.cacheLineSize);
    }

    getMemOpCost(x, y, isWrite) {
      const iLine = this.getCacheLineIndex(x, y);
      if (this.cachedLineIndexes.includes(iLine)) {
        if (isWrite) {
          this.numCacheWrites++;
        }
        else {
          this.numCacheReads++;
        }
        this.cachedLineIndexes = this.cachedLineIndexes.filter(p => p != iLine);
        this.cachedLineIndexes.push(iLine);
        return 1 / this.cfg.cacheOpPerSec;
      }
      else {
        if (isWrite) {
          this.numMemWrites++;
        }
        else {
          this.numMemReads++;
        }
        if (this.cachedLineIndexes.length >= this.cfg.numCacheLines) {
          this.cachedLineIndexes.shift();
        }
        if (this.cachedLineIndexes.length < this.cfg.numCacheLines) {
          this.cachedLineIndexes.push(iLine);
        }
        return 1 / this.cfg.memOpPerSec;
      }
    }
  }

  // 通常のマンデルブロ集合エンジン
  class RasterScanEngine extends EngineBase {
    constructor(cfg) {
      super(cfg, false);
      this.vars = {
        x: 0,
        y: 0,
        busy: false,
      };
    }

    busy() {
      return this.vars.busy || super.busy();
    }

    completed() {
      return !this.busy() && (this.vars.y >= this.cfg.height);
    }

    onStart() {
      this.vars.busy = true;
    }

    onStop() {
      this.vars.busy = false;
    }

    onUpdating() {
      var vars = this.vars;

      // エントリーキューへのタスク挿入
      while(vars.y < this.cfg.height && !this.entryQueue.checkFull()) {
        this.entryQueue.push(new MandelbrotTask(this.scene, vars.x, vars.y, false));
        
        // キューイングされたピクセルの表示のためにこっそりメモリ書き込み
        this.mem[vars.y * this.cfg.width + vars.x] = FLAG_HANDLED;
        this.eventQueue.push(new MandelbrotEvent(vars.x, vars.y, EVT_MEM_WRITE));
        
        vars.x += 1;
        if (vars.x >= this.cfg.width) {
          vars.y += 1;
          vars.x = 0;
        }
      }

      // 結果キューからの刈り取り --> メモリに反映して更新通知
      while (!this.resultQueue.empty() && this.memCredit > 0) {
        const task = this.resultQueue.pop();
        var value = task.count;
        if (task.diverged) value |= FLAG_DIVERGED;
        if (task.finished) value |= FLAG_FINISHED;
        this.memWrite(task.x, task.y, value);
      }

      if (vars.y >= this.cfg.height && this.entryQueue.empty() && this.resultQueue.empty()) {
        vars.busy = false;
      }
    }
  }
  
  // border tracing の実装
  class FastEngine extends EngineBase {
    // ステート定義
    static ST_IDLE = 0; // アイドル
    static ST_INIT = 1; // ワークメモリの初期化
    static ST_WORK = 2; // 演算処理
    static ST_FILL = 3; // 塗りつぶし
    static ST_FINISHED = 4; // 完了

    constructor(cfg) {
      super(cfg, true);
      this.vars = {
        state: FastEngine.ST_IDLE,
        x: 0,
        y: 0,
        fillValue: 0,
      };
    }

    busy() {
      return (this.vars.state != FastEngine.ST_IDLE && this.vars.state != FastEngine.ST_FINISHED) || super.busy();
    }

    completed() {
      return !this.busy() && (this.vars.state == FastEngine.ST_FINISHED);
    }

    onStart() {
      this.vars.state = FastEngine.ST_INIT;
    }

    onStop() {
      if (this.vars.state != FastEngine.ST_FINISHED) {
        this.vars.state = FastEngine.ST_IDLE;
      }
    }

    onUpdating() {      
      while(this.memCredit > 0) {
        var busy = false;
        switch(this.vars.state) {
          case FastEngine.ST_INIT: busy |= this.init(); break;
          case FastEngine.ST_WORK: busy |= this.work(); break;
          case FastEngine.ST_FILL: busy |= this.fill(); break;
        }
        if (!busy) break;
      }
    }

    // ワークメモリの初期化
    init() {
      var vars = this.vars;

      const edgeH = (vars.y == 0) || (vars.y == this.cfg.height - 1);
      const edgeV = (vars.x == 0) || (vars.x == this.cfg.width - 1);
      const edge = edgeH || edgeV;

      if (this.entryQueue.checkFull()) {
        return false;
      }

      var value = 0;
      if (edge) {
        //const priority = this.cfg.usePriority && edgeH;
        const priority = false;
        this.entryQueue.push(new MandelbrotTask(this.scene, vars.x, vars.y, priority));
        value |= FLAG_HANDLED;
      }
      this.memWrite(vars.x, vars.y, value);
      
      vars.x++;
      if (vars.x >= this.cfg.width) {
        vars.y++;
        vars.x = 0;
      }
      if (vars.y >= this.cfg.height) {
        vars.x = 0;
        vars.y = 0;
        vars.state = FastEngine.ST_WORK;
      }

      return true;
    }

    // 演算処理
    work() {
      var vars = this.vars;
      
      const busy = !this.resultQueue.empty() && !this.entryQueue.checkFull(8);

      if (busy) {
        // 結果キューから pop してワークメモリに反映
        const task = this.resultQueue.pop();
        const cx = task.x;
        const cy = task.y;
        const priority = task.highPriority;

        var value = task.count;
        value |= FLAG_HANDLED;
        if (task.diverged) value |= FLAG_DIVERGED;
        if (task.finished) value |= FLAG_FINISHED;
        this.memWrite(task.x, task.y, value);

        // 近傍ピクセルの取得
        // コードの簡略のため PixelInfo として取得
        const c = new PixelInfo(cx, cy, value);
        const l = this.getPixelInfo(cx - 1, cy);
        const r = this.getPixelInfo(cx + 1, cy);
        const u = this.getPixelInfo(cx, cy - 1);
        const d = this.getPixelInfo(cx, cy + 1);
        const lu = this.getPixelInfo(cx - 1, cy - 1);
        const ru = this.getPixelInfo(cx + 1, cy - 1);
        const ld = this.getPixelInfo(cx - 1, cy + 1);
        const rd = this.getPixelInfo(cx + 1, cy + 1);

        // 近傍ピクセルと値を比較して境界線を見つける
        this.compare(c, u, l, lu, priority);
        this.compare(c, d, l, ld, priority);
        this.compare(c, u, r, ru, priority);
        this.compare(c, d, r, rd, priority);
        this.compare(c, l, u, lu, priority);
        this.compare(c, r, u, ru, priority);
        this.compare(c, l, d, ld, priority);
        this.compare(c, r, d, rd, priority);
      }

      if (this.entryQueue.empty() && this.resultQueue.empty()) {
        // タスクが無くなったら塗りつぶしへ移行
        vars.state = FastEngine.ST_FILL;
        vars.x = 0;
        vars.y = 0;
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
    compare(a, b, c, d, priority) {
      if (b && b.finished && b.count != a.count) {
        // b ピクセルが処理完了済みかつ値が a と異なる
        // c, d が未処理であればエンキュー (重複しないように handled フラグを立てる)
        this.pushNeighbors(c, priority);
        this.pushNeighbors(d, priority);
      }
    }

    pushNeighbors(d, priority) {
      if (d && !d.handled) {
        d.handled = true;
        this.memWrite(d.x, d.y, FLAG_HANDLED);
        this.entryQueue.push(new MandelbrotTask(this.scene, d.x, d.y, priority));
      }
    }
    
    // 未処理ピクセルの塗りつぶし
    fill() {
      var vars = this.vars;

      const edge =
        (vars.x == 0) ||
        (vars.x == this.cfg.width - 1) ||
        (vars.y == 0) ||
        (vars.y == this.cfg.height - 1);

      var value = this.memRead(vars.x, vars.y);
      if (value == 0) {
        this.memWrite(vars.x, vars.y, vars.fillValue);
      }
      else {
        vars.fillValue = value;
      }

      vars.x++;
      if (vars.x >= this.cfg.width) {
        vars.y++;
        vars.x = 0;
      }
      if (vars.y >= this.cfg.height) {
        vars.x = 0;
        vars.y = 0;
        vars.state = FastEngine.ST_FINISHED;
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

  class MandelbrotScene {
    constructor(cfg) {
      this.cfg = cfg;

      const range = 1 / cfg.zoom;

      this.realRange = range;
      this.imagRange = range;
      if (cfg.width > cfg.height) {
        this.imagRange = this.realRange * cfg.height / cfg.width;
      }
      else {
        this.realRange = this.imagRange * cfg.width / cfg.height;
      }
      this.realMin = cfg.real - this.realRange / 2;
      this.realMax = cfg.real + this.realRange / 2;
      this.imagMin = cfg.imag - this.imagRange / 2;
      this.imagMax = cfg.imag + this.imagRange / 2;
    }

    // 画像内の座標から複素数に変換
    xyToComplex(x, y) {
      return [
        this.realMin + this.realRange * (x + 0.5) / (this.cfg.width - 1),
        this.imagMin + this.imagRange * (y + 0.5) / (this.cfg.height - 1),
      ];
    }

    // 輻輳数から画像内の座標に変換
    complexToXy(r, i) {
      return [
        (this.cfg.width - 1) * (r - this.realMin) / this.realRange + 0.5,
        (this.cfg.height - 1) * (i - this.imagMin) / this.imagRange + 0.5,
      ];
    }
  }

  class MandelbrotTask {
    constructor(scene, x, y, highPriority) {
      this.scene = scene;
      this.x = x;
      this.y = y;
      this.highPriority = highPriority;

      const c = scene.xyToComplex(x, y);
      this.cReal = c[0];
      this.cImag = c[1];

      this.zReal = 0;
      this.zImag = 0;
      this.count = 0;

      this.finished = false;
      this.diverged = false;
    }

    // マンデルブロ集合の反復処理
    calculate(iterCredit) {
      const maxIter = this.scene.cfg.maxIter;
      const a = this.cReal;
      const b = this.cImag;
      var x = this.zReal;
      var y = this.zImag;
      var n = this.count;
      var diverged = this.diverged;
      var finished = this.finished;
      var steps = 0;
      while (!finished && steps < iterCredit) {
        const xx = x * x;
        const yy = y * y;
        const xy = x * y;
        diverged = (xx + yy >= 4);
        finished = (n >= maxIter) || diverged;
        x = xx - yy + a;
        y = 2 * xy + b;
        n++;
        steps++;
      }
      this.zReal = x;
      this.zImag = y;
      this.count = n;
      this.diverged = diverged;
      this.finished = finished;
      return steps;
    }
  }

  class PixelMarker {
    constructor(tsMs, x, y) {
      this.tsMs = tsMs;
      this.x = x;
      this.y = y;
    }
  }

  class Queue {
    constructor(depth) {
      this.depth = depth;
      this.array0 = [];
      this.array1 = [];
      this.fullFlag = false;
    }

    count() {
      return this.array0.length + this.array1.length;
    }

    empty(numPop = 1) {
      return this.count() < numPop;
    }

    checkFull(numPush = 1) {
      this.fullFlag = this.count() + numPush >= this.depth;
      return this.fullFlag;
    }

    push(item) {
      if (this.count() >= this.depth) throw new Error('Queue overflow');
      if (item.highPriority && this.array0.length < this.depth) {
        this.array0.push(item);
      }
      else {
        this.array1.push(item);
      }
    }

    pop() {
      if (this.count() <= 0) throw new Error('Queue underflow');
      this.fullFlag = false;
      if (this.array0.length > 0) {
        return this.array0.shift();
      }
      else {
        return this.array1.shift();
      }
    }

    peek() {
      if (this.count() <= 0) throw new Error('Queue underflow');
      if (this.array0.length > 0) {
        return this.array0[0];
      }
      else {
        return this.array1[0];
      }
    }

    clear() {
      this.fullFlag = false;
      this.array0 = [];
      this.array1 = [];
    }
  }

  class Rect {
    constructor(x = 0, y = 0, w = 0, h = 0) {
      this.x = x;
      this.y = y;
      this.width = w;
      this.height = h;
    }

    right() { return this.x + this.width; }
    bottom() { return this.y + this.height; }
    contains(x, y) { return (this.x <= x && x < this.right() && this.y <= y && y < this.bottom()); }
  }

  class FpsCounter {
    constructor() {
      this.startMs = null;
      this.accum = 0;
      this.fps = 0;
    }

    init() {
      this.startMs = null;
      this.accum = 0;
      this.fps = 0;
    }

    update(nowMs) {
      if (this.startMs === null) {
        this.startMs = nowMs;
        this.accum = 0;
        this.fps = 0;
      }

      this.accum += 1;
      
      const elapsedMs = nowMs - this.startMs;
      if (elapsedMs >= 1000) {
        this.fps = this.accum * 1000 / elapsedMs;
        this.startMs = nowMs;
        this.accum = 0;
      }
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

  function parseExpr(s) {
    if (typeof(s) != 'string') {
      return { value: s, radix: null };
    }
    const mPow = s.match(/^\s*([\+\-]?[0-9]+(\.[0-9]+)?)\s*\^\s*([\+\-]?[0-9]+(\.[0-9]+)?)\s*$/);
    const mExp10 = s.match(/^\s*([\+\-]?[0-9]+(\.[0-9]+)?)\s*[eE]\s*([\+\-]?[0-9]+)\s*$/);
    if (mPow) {
      //console.log(`'${s}' '${m[1]}' '${m[2]}' '${m[3]}' --> ${parseFloat(m[1]) ** parseFloat(m[3])}`)
      return {
        value: parseFloat(mPow[1]) ** parseFloat(mPow[3]),
        radix: 2,
      };
    }
    else if (mExp10) {
      //console.log(`'${s}' '${m[1]}' '${m[2]}' '${m[3]}' --> ${parseFloat(m[1]) ** parseFloat(m[3])}`)
      return {
        value: parseFloat(mExp10[1]) * (10 ** parseFloat(mExp10[3])),
        radix: 10,
      };
    }
    else {
      return {
        value: parseFloat(s),
        radix: null,
      };
    }
  }

  function toExpr(val, expRadix = 0) {
    const raw = val.toString();
    const exp2 = `${val < 0 ? '-' : ''}2^${(Math.log2(Math.abs(val))).toString()}`; 
    const log10 = Math.floor(Math.log10(Math.abs(val)));
    const exp10 = `${val < 0 ? '-' : ''}${(val / (10 ** log10)).toString()}e${log10}`;

    if (expRadix < 0) { 
      if (raw.length < exp2.length && raw.length < exp10.length) {
        expRadix = 0;
      }
      else if (exp2.length < exp10.length) {
        expRadix = 2;
      }
      else {
        expRadix = 10;
      }
    }

    switch (expRadix) {
      case 2: return exp2;
      case 10:  return exp10;
      default: return raw;
    }
  }

  const ui = new MandelbrotUi('article_mandelbrot_wrapper');
  ui.init();
})();  
