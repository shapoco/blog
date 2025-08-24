(function () {
  const container = document.querySelector('#article_image2arrayContainer');
  const fileBox = document.createElement('input');
  const dropTarget = document.createElement('div');
  const origCanvas = document.createElement('canvas');
  const bgColorBox = document.createElement('input');
  const resetTrimButton = document.createElement('button');
  const trimCanvas = document.createElement('canvas');
  const widthBox = document.createElement('input');
  const heightBox = document.createElement('input');
  const scalingMethodBox = document.createElement('select');
  const offsetBox = document.createElement('input');
  const ditherBox = document.createElement('select');
  const contrastBox = document.createElement('input');
  const invertBox = document.createElement('input');
  const binaryCanvas = document.createElement('canvas');
  const binarizationErrorBox = document.createElement('span');
  const addressingBox = document.createElement('select');
  const codeColsBox = document.createElement('input');
  const indentBox = document.createElement('select');
  const arrayCode = document.createElement('pre');
  const codeGenErrorBox = document.createElement('p');
  const copyButton = document.createElement('button');

  let updateTrimCanvasTimeoutId = -1;
  let binarizeTimeoutId = -1;
  let generateCodeTimeoutId = -1;
  let binaryData = null;

  let worldX0 = 0, worldY0 = 0, zoom = 1;
  let trimL = 0, trimT = 0, trimR = 1, trimB = 1;

  class TrimState {
    static IDLE = 0;
    static DRAG_TOP = 1;
    static DRAG_RIGHT = 2;
    static DRAG_BOTTOM = 3;
    static DRAG_LEFT = 4;
  }
  trimUiState = TrimState.IDLE;

  function createNoWrap() {
    const span = document.createElement('span');
    span.style.whiteSpace = "nowrap";
    span.style.display = "inline-block";
    span.style.marginRight = "10px";
    return span;
  }

  function main() {

    {
      const h = document.createElement('h3');
      h.textContent = "画像の読み込み";
      container.appendChild(h);
    }

    {
      const p = document.createElement('p');
      p.style.textAlign = "center";
      fileBox.type = "file";
      fileBox.accept = "image/*";
      p.appendChild(fileBox);
      p.appendChild(document.createElement('br'));
      p.appendChild(document.createTextNode("または"));
      p.appendChild(document.createElement('br'));
      dropTarget.textContent = "ここにドロップ / 貼り付け";
      dropTarget.style.width = "100%";
      dropTarget.style.height = "100px";
      dropTarget.style.boxSizing = "border-box";
      dropTarget.style.borderRadius = "5px";
      dropTarget.style.backgroundColor = "#eee";
      dropTarget.style.textAlign = "center";
      dropTarget.style.lineHeight = "100px";
      p.appendChild(dropTarget);
      container.appendChild(p);
    }

    {
      const h = document.createElement('h3');
      h.textContent = "トリミング";
      container.appendChild(h);
    }
    {
      const p = document.createElement('p');

      {
        const span = createNoWrap();
        span.appendChild(document.createTextNode("透明部分の背景色: "));
        bgColorBox.type = "text";
        bgColorBox.value = "#000";
        bgColorBox.style.width = "60px";
        span.appendChild(bgColorBox);
        p.appendChild(span);
      }

      {
        const span = createNoWrap();
        resetTrimButton.textContent = "トリミングをリセット";
        span.appendChild(resetTrimButton);
        p.appendChild(span);
      }

      container.appendChild(p);

      p.querySelectorAll('input, button').forEach((el) => {
        el.addEventListener('change', () => {
          requestUpdateTrimCanvas();
          requestBinarize();
        });
        el.addEventListener('input', () => {
          requestUpdateTrimCanvas();
          requestBinarize();
        });
      });
    }

    {
      const p = document.createElement('p');
      p.style.textAlign = "center";
      trimCanvas.style.maxWidth = "100%";
      trimCanvas.style.boxSizing = "border-box";
      trimCanvas.style.border = "1px solid #444";
      trimCanvas.style.backgroundColor = "#444";
      p.appendChild(trimCanvas);
      container.appendChild(p);
    }

    {
      const h = document.createElement('h3');
      h.textContent = "2値化";
      container.appendChild(h);
    }

    {
      const p = document.createElement('p');

      {
        const span = createNoWrap();
        span.appendChild(document.createTextNode("出力サイズ: "));
        widthBox.type = "text";
        widthBox.maxLength = 4;
        widthBox.placeholder = "(none)";
        widthBox.style.width = "60px";
        span.appendChild(widthBox);
        span.appendChild(document.createTextNode(" x "));
        heightBox.type = "text";
        heightBox.maxLength = 4;
        heightBox.placeholder = "(none)";
        heightBox.style.width = "60px";
        span.appendChild(heightBox);
        span.appendChild(document.createTextNode(" px"));
        p.appendChild(span);
      }

      {
        const span = createNoWrap();
        span.appendChild(document.createTextNode("拡縮方法: "));
        scalingMethodBox.innerHTML = `
        <option value="zoom" selected>ズーム</option>
        <option value="fit">フィット</option>
        <option value="stretch">ストレッチ</option>
      `;
        span.appendChild(scalingMethodBox);
        p.appendChild(span);
      }

      {
        const span = createNoWrap();
        span.appendChild(document.createTextNode("明度オフセット: "));
        offsetBox.type = "text";
        offsetBox.value = "0";
        offsetBox.maxLength = 5;
        offsetBox.placeholder = "(auto)";
        offsetBox.style.width = "60px";
        span.appendChild(offsetBox);
        p.appendChild(span);
      }

      {
        const span = createNoWrap();
        span.appendChild(document.createTextNode("コントラスト: "));
        contrastBox.type = "text";
        contrastBox.value = "100";
        contrastBox.maxLength = 5;
        contrastBox.placeholder = "(100)";
        contrastBox.style.width = "60px";
        span.appendChild(contrastBox);
        span.appendChild(document.createTextNode("%"));
        p.appendChild(span);
      }

      {
        const span = createNoWrap();
        span.appendChild(document.createTextNode("ディザ: "));
        ditherBox.innerHTML = `
        <option value="none">なし</option>
        <option value="diffusion" selected>誤差拡散</option>
      `;
        span.appendChild(ditherBox);
        p.appendChild(span);
      }

      {
        const span = createNoWrap();
        invertBox.type = "checkbox";
        invertBox.id = "invertBox";
        span.appendChild(invertBox);
        const label = document.createElement('label');
        label.htmlFor = invertBox.id;
        label.appendChild(document.createTextNode("反転"));
        span.appendChild(label);
        p.appendChild(span);
      }

      container.appendChild(p);

      p.querySelectorAll('input, select').forEach((el) => {
        el.addEventListener('change', () => {
          requestBinarize();
        });
        el.addEventListener('input', () => {
          requestBinarize();
        });
      });
    }

    {
      const p = document.createElement('p');
      p.style.textAlign = "center";
      binaryCanvas.style.maxWidth = "100%";
      binaryCanvas.style.boxSizing = "border-box";
      binaryCanvas.style.border = "1px solid #444";
      binaryCanvas.style.backgroundColor = "#444";
      p.appendChild(binaryCanvas);
      binarizationErrorBox.style.color = "red";
      binarizationErrorBox.style.display = "none";
      p.appendChild(binarizationErrorBox);
      container.appendChild(p);
    }

    {
      const h = document.createElement('h3');
      h.textContent = "コード生成";
      container.appendChild(h);
    }

    {
      const p = document.createElement('p');

      {
        const span = createNoWrap();
        span.appendChild(document.createTextNode("アドレッシング: "));
        addressingBox.innerHTML = `
        <option value="h" selected>Horizontal</option>
        <option value="v">Vertical</option>
      `;
        span.appendChild(addressingBox);
        p.appendChild(span);
      }

      {
        const span = createNoWrap();
        span.appendChild(document.createTextNode("列数: "));
        codeColsBox.type = "text";
        codeColsBox.value = "16";
        codeColsBox.maxLength = 3;
        codeColsBox.style.width = "60px";
        span.appendChild(codeColsBox);
        p.appendChild(span);
      }

      {
        const span = createNoWrap();
        span.appendChild(document.createTextNode("インデント: "));
        indentBox.innerHTML = `
        <option value="sp2" selected>スペース x2</option>
        <option value="sp4">スペース x4</option>
        <option value="tab">タブ</option>
      `;
        span.appendChild(indentBox);
        p.appendChild(span);
      }

      container.appendChild(p);

      p.querySelectorAll('input, select').forEach((el) => {
        el.addEventListener('change', () => {
          requestGenerateCode();
        });
        el.addEventListener('input', () => {
          requestGenerateCode();
        });
      });
    }

    {
      const div = document.createElement('div');
      arrayCode.id = "arrayCode";
      arrayCode.classList.add('lang_cpp');
      div.appendChild(arrayCode);
      codeGenErrorBox.style.textAlign = "center";
      codeGenErrorBox.style.color = "red";
      codeGenErrorBox.style.display = "none";
      div.appendChild(codeGenErrorBox);
      container.appendChild(div);
    }

    {
      const p = document.createElement('p');
      p.style.textAlign = "right";
      copyButton.textContent = "コードをコピー";
      p.appendChild(copyButton);
      container.appendChild(p);
    }

    // ファイル選択
    fileBox.addEventListener('change', (e) => {
      loadFile(e.target.files[0]);
    });

    // ドラッグ & ドロップ
    dropTarget.addEventListener('dragover', (e) => {
      e.preventDefault();
    });
    dropTarget.addEventListener('dragleave', (e) => {
      e.preventDefault();
    });
    dropTarget.addEventListener('drop', (e) => {
      e.preventDefault();
      const items = e.dataTransfer.items;
      for (const item of items) {
        if (item.kind === 'file') {
          loadFile(item.getAsFile());
          break;
        }
      }
    });

    // 貼り付け
    dropTarget.addEventListener('paste', (e) => {
      const items = e.clipboardData.items;
      for (const item of items) {
        if (item.kind === 'file') {
          loadFile(item.getAsFile());
          break;
        }
      }
    });

    // トリミング操作
    trimCanvas.addEventListener('pointermove', (e) => {
      if (trimUiState == TrimState.IDLE) {
        switch (viewToTrimState(e.offsetX, e.offsetY)) {
          case TrimState.DRAG_LEFT: trimCanvas.style.cursor = "w-resize"; break;
          case TrimState.DRAG_TOP: trimCanvas.style.cursor = "n-resize"; break;
          case TrimState.DRAG_RIGHT: trimCanvas.style.cursor = "e-resize"; break;
          case TrimState.DRAG_BOTTOM: trimCanvas.style.cursor = "s-resize"; break;
          default: trimCanvas.style.cursor = "default"; break;
        }
      }
      else {
        const { x, y } = posToWorld(e.offsetX, e.offsetY);
        switch (trimUiState) {
          case TrimState.DRAG_LEFT: trimL = Math.min(x, trimR - 1); break;
          case TrimState.DRAG_TOP: trimT = Math.min(y, trimB - 1); break;
          case TrimState.DRAG_RIGHT: trimR = Math.max(x, trimL + 1); break;
          case TrimState.DRAG_BOTTOM: trimB = Math.max(y, trimT + 1); break;
        }
        requestUpdateTrimCanvas();
        requestBinarize();
      }
    });
    trimCanvas.addEventListener('pointerdown', (e) => {
      if (viewToTrimState(e.offsetX, e.offsetY) != TrimState.IDLE) {
        trimUiState = viewToTrimState(e.offsetX, e.offsetY);
        trimCanvas.style.cursor = "grabbing";
        trimCanvas.setPointerCapture(e.pointerId);
      }
    });
    trimCanvas.addEventListener('pointerup', (e) => {
      trimUiState = TrimState.IDLE;
      trimCanvas.style.cursor = "default";
      trimCanvas.releasePointerCapture(e.pointerId);
      requestUpdateTrimCanvas();
    });
    resetTrimButton.addEventListener('click', () => {
      resetTrim();
    });

    // コードのコピー
    copyButton.addEventListener('click', () => {
      if (!arrayCode.textContent) return;
      navigator.clipboard.writeText(arrayCode.textContent);
    });
  }

  /**
   * @param {File} file
   */
  function loadFile(file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        origCanvas.width = img.width;
        origCanvas.height = img.height;
        const ctx = origCanvas.getContext('2d', { willReadFrequently: true });
        ctx.clearRect(0, 0, img.width, img.height);
        ctx.drawImage(img, 0, 0);
        resetTrim();
        binarize();
        requestUpdateTrimCanvas();
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }

  function resetTrim() {
    trimL = 0;
    trimT = 0;
    trimR = origCanvas.width;
    trimB = origCanvas.height;
    requestUpdateTrimCanvas();
  }

  function getViewArea() {
    const margin = 20;
    const canvasW = trimCanvas.width;
    const canvasH = trimCanvas.height;
    const viewX0 = canvasW / 2;
    const viewY0 = canvasH / 2;
    const viewW = canvasW - margin * 2;
    const viewH = canvasH - margin * 2;
    return { viewX0, viewY0, viewW, viewH };
  }

  function posToView(x, y) {
    const { viewX0, viewY0, viewW, viewH } = getViewArea();
    return {
      x: viewX0 + (x - worldX0) * zoom,
      y: viewY0 + (y - worldY0) * zoom
    };
  }

  function posToWorld(x, y) {
    const { viewX0, viewY0, viewW, viewH } = getViewArea();
    return {
      x: (x - viewX0) / zoom + worldX0,
      y: (y - viewY0) / zoom + worldY0
    };
  }

  function viewToTrimState(x, y) {
    const { x: trimViewL, y: trimViewT } = posToView(trimL, trimT);
    const { x: trimViewR, y: trimViewB } = posToView(trimR, trimB);
    if (Math.abs(x - trimViewL) < 10) return TrimState.DRAG_LEFT;
    if (Math.abs(x - trimViewR) < 10) return TrimState.DRAG_RIGHT;
    if (Math.abs(y - trimViewT) < 10) return TrimState.DRAG_TOP;
    if (Math.abs(y - trimViewB) < 10) return TrimState.DRAG_BOTTOM;
    return TrimState.IDLE;
  }

  function requestUpdateTrimCanvas() {
    if (updateTrimCanvasTimeoutId >= 0) return;
    updateTrimCanvasTimeoutId = setTimeout(() => {
      updateTrimCanvas();
    }, 10);
  }

  function updateTrimCanvas() {
    if (updateTrimCanvasTimeoutId >= 0) {
      clearTimeout(updateTrimCanvasTimeoutId);
      updateTrimCanvasTimeoutId = -1;
    }

    const rect = container.getBoundingClientRect();
    trimCanvas.width = rect.width;
    trimCanvas.height = Math.ceil(rect.width / 2);

    const ctx = trimCanvas.getContext('2d', { willReadFrequently: true });

    const canvasW = trimCanvas.width;
    const canvasH = trimCanvas.height;

    const origW = origCanvas.width;
    const origH = origCanvas.height;

    ctx.clearRect(0, 0, canvasW, canvasH);

    const { viewX0, viewY0, viewW, viewH } = getViewArea();

    if (trimUiState == TrimState.IDLE) {
      const worldL = Math.min(trimL, 0);
      const worldR = Math.max(trimR, origW);
      const worldT = Math.min(trimT, 0);
      const worldB = Math.max(trimB, origH);
      const worldW = worldR - worldL;
      const worldH = worldB - worldT;
      worldX0 = (worldL + worldR) / 2;
      worldY0 = (worldT + worldB) / 2;
      const worldAspect = worldW / Math.max(1, worldH);
      const viewAspect = viewW / Math.max(1, viewH);
      if (worldAspect > viewAspect) {
        zoom = viewW / Math.max(1, worldW);
      }
      else {
        zoom = viewH / Math.max(1, worldH);
      }
    }

    const { x: trimViewL, y: trimViewT } = posToView(trimL, trimT);
    const { x: trimViewR, y: trimViewB } = posToView(trimR, trimB);

    ctx.fillStyle = bgColorBox.value;
    ctx.fillRect(trimViewL, trimViewT, trimViewR - trimViewL, trimViewB - trimViewT);

    const imgX = viewX0 - worldX0 * zoom;
    const imgY = viewY0 - worldY0 * zoom;
    const imgW = origCanvas.width * zoom;
    const imgH = origCanvas.height * zoom;
    ctx.drawImage(origCanvas, imgX, imgY, imgW, imgH);

    const lineWidth = 3;
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(trimViewL - lineWidth - 2, 0, lineWidth + 4, canvasH);
    ctx.fillRect(0, trimViewT - lineWidth - 2, canvasW, lineWidth + 4);
    ctx.fillRect(trimViewR - 2, 0, lineWidth + 4, canvasH);
    ctx.fillRect(0, trimViewB - 2, canvasW, lineWidth + 4);
    ctx.fillStyle = "#08F";
    ctx.fillRect(trimViewL - lineWidth, 0, lineWidth, canvasH);
    ctx.fillRect(0, trimViewT - lineWidth, canvasW, lineWidth);
    ctx.fillRect(trimViewR, 0, lineWidth, canvasH);
    ctx.fillRect(0, trimViewB, canvasW, lineWidth);
  }

  function requestBinarize() {
    if (binarizeTimeoutId >= 0) return;
    binarizeTimeoutId = setTimeout(() => {
      binarize();
    }, 500);
  }

  function binarize() {
    if (binarizeTimeoutId >= 0) {
      clearTimeout(binarizeTimeoutId);
      binarizeTimeoutId = -1;
    }

    try {
      const origCtx = origCanvas.getContext('2d', { willReadFrequently: true });

      const srcW = trimR - trimL;
      const srcH = trimB - trimT;
      let outW = srcW;
      let outH = srcH;

      // 出力サイズ決定
      if (widthBox.value && heightBox.value) {
        outW = parseInt(widthBox.value);
        outH = parseInt(heightBox.value);
        widthBox.placeholder = "";
        heightBox.placeholder = "";
      }
      else if (widthBox.value) {
        outW = parseInt(widthBox.value);
        outH = Math.ceil(srcH * (outW / srcW));
        widthBox.placeholder = "";
        heightBox.placeholder = "(" + outH + ")";
      }
      else if (heightBox.value) {
        outH = parseInt(heightBox.value);
        outW = Math.ceil(srcW * (outH / srcH));
        widthBox.placeholder = "(" + outW + ")";
        heightBox.placeholder = "";
      }
      else {
        if (outW > 128 || outH > 64) {
          const scale = Math.min(128 / outW, 64 / outH);
          outW = Math.floor(outW * scale);
          outH = Math.floor(outH * scale);
        }
        widthBox.placeholder = "(" + outW + ")";
        heightBox.placeholder = "(" + outH + ")";
      }

      // リサイズ
      const outCtx = binaryCanvas.getContext('2d', { willReadFrequently: true });
      binaryCanvas.width = outW;
      binaryCanvas.height = outH;
      {
        const srcX0 = (trimL + trimR) / 2;
        const srcY0 = (trimT + trimB) / 2;
        const srcAspect = srcW / srcH;
        const outAspect = outW / outH;
        let scaleX, scaleY;
        switch (scalingMethodBox.value) {
          case "zoom":
            if (srcAspect > outAspect) {
              scaleX = scaleY = outH / srcH;
            } else {
              scaleX = scaleY = outW / srcW;
            }
            break;
          case "fit":
            if (srcAspect > outAspect) {
              scaleX = scaleY = outW / srcW;
            } else {
              scaleX = scaleY = outH / srcH;
            }
            break;
          case "stretch":
            scaleX = outW / srcW;
            scaleY = outH / srcH;
            break;
          default:
            throw new Error("Unknown scaling method");
        }
        const dx = outW / 2 + (trimL - srcX0) * scaleX;
        const dy = outH / 2 + (trimT - srcY0) * scaleY;
        const dw = srcW * scaleX;
        const dh = srcH * scaleY;
        outCtx.fillStyle = bgColorBox.value;
        outCtx.fillRect(0, 0, outW, outH);
        outCtx.drawImage(origCanvas, trimL, trimT, srcW, srcH, dx, dy, dw, dh);
      }
      const outImageData = outCtx.getImageData(0, 0, outW, outH);
      const outRgbData = outImageData.data;
      const grayData = new Float32Array(outRgbData.length / 4);

      // グレースケール化
      let min = 255;
      let max = 0;
      let avg = 0;
      for (let i = 0; i < grayData.length; i++) {
        const r = outRgbData[i * 4];
        const g = outRgbData[i * 4 + 1];
        const b = outRgbData[i * 4 + 2];
        let gray = (0.299 * r + 0.587 * g + 0.114 * b) / 255 * 2 - 1;
        grayData[i] = gray;
        avg += gray;
        min = Math.min(min, gray);
        max = Math.max(max, gray);
      }
      avg /= grayData.length;

      // オフセット決定
      let offset = 0;
      if (offsetBox.value) {
        offset = parseFloat(offsetBox.value) / 255;
        offsetBox.placeholder = "";
      }
      else {
        offset = -avg;
        offsetBox.placeholder = "(" + Math.round(offset * 255) + ")";
      }

      // コントラスト決定
      let contrast = 1;
      if (contrastBox.value) {
        contrast = parseInt(contrastBox.value) / 100;
        contrastBox.placeholder = "";
      } else {
        if (max > min) contrast = 2 / (max - min);
        contrastBox.placeholder = "(" + Math.round(contrast * 100) + ")";
      }

      for (let i = 0; i < grayData.length; i++) {
        grayData[i] = (grayData[i] + offset) * contrast;
      }

      const diffusion = ditherBox.value === 'diffusion';
      const invert = invertBox.checked;

      // 二値化
      binaryData = new Uint8Array(outW * outH);
      for (let y = 0; y < outH; y++) {
        for (let x = 0; x < outW; x++) {
          const i = (y * outW + x);
          const gray = grayData[i];
          const binary = gray < 0 ? -1 : 1;

          let outBinary = binary <= 0 ? 0 : 255;
          if (invert) outBinary = 255 - outBinary;
          binaryData[i] = outBinary;
          outRgbData[i * 4] = outRgbData[i * 4 + 1] = outRgbData[i * 4 + 2] = outBinary;

          if (diffusion) {
            const error = gray - binary;
            if (x < outW - 1) {
              grayData[i + 1] += error * 7 / 16;
            }
            if (y < outH - 1) {
              if (x > 0) {
                grayData[i + outW - 1] += error * 3 / 16;
              }
              grayData[i + outW] += error * 5 / 16;
              if (x < outW - 1) {
                grayData[i + outW + 1] += error * 1 / 16;
              }
            }
          }
        }
      }

      outCtx.putImageData(outImageData, 0, 0);

      binaryCanvas.style.display = "inline-block";
      binarizationErrorBox.style.display = "none";

      generateCode();
    }
    catch (error) {
      binaryCanvas.style.display = "none";
      arrayCode.style.display = "none";
      binarizationErrorBox.style.display = "inline";
      binarizationErrorBox.textContent = error.message;
    }
  }

  function requestGenerateCode() {
    if (generateCodeTimeoutId !== -1) {
      clearTimeout(generateCodeTimeoutId);
    }
    generateCodeTimeoutId = setTimeout(() => {
      generateCode();
      generateCodeTimeoutId = -1;
    }, 500);
  }

  function generateCode() {
    if (!binaryData) {
      arrayCode.textContent = "";
      arrayCode.style.display = "block";
      codeGenErrorBox.style.display = "none";
      return;
    }

    try {

      // アドレッシング
      const vertical = addressingBox.value === 'v';

      // 列数決定
      let arrayCols = 16;
      if (codeColsBox.value) {
        arrayCols = parseInt(codeColsBox.value);
        codeColsBox.placeholder = "";
      } else {
        codeColsBox.placeholder = "(" + arrayCols + ")";
      }

      // インデント決定
      let indent = "  ";
      switch (indentBox.value) {
        case "sp2": indent = "  "; break;
        case "sp4": indent = "    "; break;
        case "tab": indent = "\t"; break;
        default:
          throw new Error("Unknown indent type");
      }

      const width = binaryCanvas.width;
      const height = binaryCanvas.height;
      const rows = Math.ceil(height / 8);

      const arrayData = new Uint8Array(rows * width);

      // バイト配列化
      for (let i = 0; i < width * rows; i++) {
        let x, row;
        if (vertical) {
          x = Math.floor(i / rows);
          row = i % rows;
        } else {
          x = i % width;
          row = Math.floor(i / width);
        }

        let byte = 0;
        for (let bit = 0; bit < 8; bit++) {
          y = row * 8 + bit;
          if (y >= height) break;
          const i = (y * width + x);
          byte |= ((binaryData[i] >= 128) ? 1 : 0) << bit;
        }
        arrayData[i] = byte;
      }

      // コード生成
      let code = "";
      code += `// ${width}x${height}px, ${vertical ? 'Vertical' : 'Horizontal'} Adressing, ${arrayData.length} Bytes\n`;
      code += "const uint8_t imageArray[] = {\n";
      for (let i = 0; i < arrayData.length; i++) {
        if (i % arrayCols == 0) code += indent;
        code += "0x" + arrayData[i].toString(16).padStart(2, '0') + ",";
        if ((i + 1) % arrayCols == 0 || i + 1 == arrayData.length) {
          code += "\n";
        }
        else {
          code += " ";
        }
      }
      code += "};";

      arrayCode.textContent = code;
      arrayCode.style.display = "block";
      codeGenErrorBox.style.display = "none";
    }
    catch (error) {
      arrayCode.style.display = "none";
      codeGenErrorBox.textContent = error.message;
      codeGenErrorBox.style.display = "block";
    }
  }

  main();

})();