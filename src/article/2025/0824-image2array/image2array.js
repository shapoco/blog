(function () {

  function toElementArray(children = []) {
    for (let i = 0; i < children.length; i++) {
      if (typeof children[i] === "string") {
        children[i] = document.createTextNode(children[i]);
      }
    }
    return children;
  }

  function createHeader(text) {
    const h = document.createElement('h3');
    h.textContent = text;
    return h;
  }

  function createParagraph(children = []) {
    const p = document.createElement('p');
    toElementArray(children).forEach(child => p.appendChild(child));
    return p;
  }

  function createNoWrap(children = []) {
    const span = document.createElement('span');
    span.style.whiteSpace = "nowrap";
    span.style.display = "inline-block";
    span.style.marginRight = "10px";
    toElementArray(children).forEach(child => span.appendChild(child));
    return span;
  }

  function makeTextBox(value = "", placeholder = "", maxLength = 100) {
    const input = document.createElement('input');
    input.type = "text";
    input.value = value;
    input.placeholder = placeholder;
    input.style.width = "50px";
    input.style.textAlign = "right";
    input.maxLength = maxLength;
    return input;
  }

  function makeSelectBox(dict = {}, defaultValue = "") {
    const select = document.createElement('select');
    for (const [value, label] of Object.entries(dict)) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      select.appendChild(option);
    }
    select.value = defaultValue;
    return select;
  }

  function makeCheckBox(labelText) {
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = "checkbox";
    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(labelText));
    return checkbox;
  }

  function makeButton(text = "") {
    const button = document.createElement('button');
    button.textContent = text;
    return button;
  }

  const container = document.querySelector('#article_image2arrayContainer');
  const hiddenFileBox = document.createElement('input');
  const dropTarget = document.createElement('div');
  const origCanvas = document.createElement('canvas');
  const bgColorBox = makeTextBox("#000");
  const resetTrimButton = makeButton("トリミングをリセット");
  const trimCanvas = document.createElement('canvas');
  const widthBox = makeTextBox("", "(auto)", 4);
  const heightBox = makeTextBox("", "(auto)", 4);
  const scalingMethodBox = makeSelectBox({
    zoom: "ズーム",
    fit: "フィット",
    stretch: "ストレッチ",
  }, "zoom");
  const offsetBox = makeTextBox("0", "(auto)", 5);
  const ditherBox = makeSelectBox({
    none: "なし",
    diffusion: "誤差拡散",
  }, "diffusion");
  const contrastBox = makeTextBox("100", "(auto)", 5);
  const invertBox = makeCheckBox("明度反転");
  const binaryCanvas = document.createElement('canvas');
  const binarizationErrorBox = document.createElement('span');
  const addressingBox = makeSelectBox({
    h: "Horizontal",
    v: "Vertical",
  }, "h");
  const codeColsBox = makeTextBox("16", "", 3);
  const indentBox = makeSelectBox({
    sp2: "スペース x2",
    sp4: "スペース x4",
    tab: "タブ",
  }, "sp2");
  const arrayCode = document.createElement('pre');
  const codeGenErrorBox = document.createElement('p');
  const copyButton = makeButton("コードをコピー");

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

  function main() {

    container.appendChild(createHeader("画像の読み込み"));

    {
      // 「ファイルが選択されていません」の表示が邪魔なので button で wrap する
      hiddenFileBox.type = "file";
      hiddenFileBox.accept = "image/*";
      hiddenFileBox.style.display = "none";
      const fileBrowseButton = makeButton("ファイルを選択");
      fileBrowseButton.addEventListener('click', () => {
        hiddenFileBox.click();
      });

      dropTarget.style.width = "100%";
      dropTarget.style.padding = "50px 0px 50px 0px";
      dropTarget.style.boxSizing = "border-box";
      dropTarget.style.borderRadius = "5px";
      dropTarget.style.backgroundColor = "#eee";
      dropTarget.style.textAlign = "center";
      dropTarget.appendChild(fileBrowseButton);
      dropTarget.appendChild(document.createTextNode(" またはここにドロップ / 貼り付け"));

      const p = createParagraph([dropTarget]);
      p.style.textAlign = "center";
      container.appendChild(p);
    }

    container.appendChild(createHeader("トリミング"));

    {
      const p = createParagraph([
        createNoWrap(["透明部分の背景色: ", bgColorBox]),
        createNoWrap([resetTrimButton]),
      ]);
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
      trimCanvas.style.maxWidth = "100%";
      trimCanvas.style.boxSizing = "border-box";
      trimCanvas.style.backgroundColor = "#444";
      const p = createParagraph([trimCanvas]);
      p.style.textAlign = "center";
      container.appendChild(p);
    }

    container.appendChild(createHeader("2値化"));

    {
      const p = createParagraph([
        createNoWrap(["出力サイズ: ", widthBox, " x ", heightBox, " px",]),
        createNoWrap(["拡縮方法: ", scalingMethodBox]),
        createNoWrap(["明度オフセット: ", offsetBox]),
        createNoWrap(["コントラスト: ", contrastBox, "%"]),
        createNoWrap(["ディザリング: ", ditherBox]),
        createNoWrap([invertBox.parentNode]),
      ]);
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
      binaryCanvas.style.maxWidth = "100%";
      binaryCanvas.style.boxSizing = "border-box";
      binaryCanvas.style.border = "1px solid #444";
      binaryCanvas.style.backgroundColor = "#444";
      binarizationErrorBox.style.color = "red";
      binarizationErrorBox.style.display = "none";
      const p = createParagraph([
        binaryCanvas,
        binarizationErrorBox
      ]);
      p.style.textAlign = "center";
      container.appendChild(p);
    }

    container.appendChild(createHeader("コード生成"));

    {
      const p = createParagraph([
        createNoWrap(["アドレッシング: ", addressingBox]),
        createNoWrap(["列数: ", codeColsBox]),
        createNoWrap(["インデント: ", indentBox])
      ]);

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
      const p = createParagraph([
        copyButton
      ]);
      p.style.textAlign = "right";
      container.appendChild(p);
    }

    // ファイル選択
    hiddenFileBox.addEventListener('change', (e) => {
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
        switch (trimViewToNextState(e.offsetX, e.offsetY)) {
          case TrimState.DRAG_LEFT: trimCanvas.style.cursor = "w-resize"; break;
          case TrimState.DRAG_TOP: trimCanvas.style.cursor = "n-resize"; break;
          case TrimState.DRAG_RIGHT: trimCanvas.style.cursor = "e-resize"; break;
          case TrimState.DRAG_BOTTOM: trimCanvas.style.cursor = "s-resize"; break;
          default: trimCanvas.style.cursor = "default"; break;
        }
      }
      else {
        const { x, y } = trimViewToWorld(e.offsetX, e.offsetY);
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
      if (trimViewToNextState(e.offsetX, e.offsetY) != TrimState.IDLE) {
        trimUiState = trimViewToNextState(e.offsetX, e.offsetY);
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

  // トリミングのリセット
  function resetTrim() {
    trimL = 0;
    trimT = 0;
    trimR = origCanvas.width;
    trimB = origCanvas.height;
    requestUpdateTrimCanvas();
    requestBinarize();
  }

  // トリミングUIのビュー領域の取得
  function getTrimViewArea() {
    const margin = 20;
    const canvasW = trimCanvas.width;
    const canvasH = trimCanvas.height;
    const viewX0 = canvasW / 2;
    const viewY0 = canvasH / 2;
    const viewW = canvasW - margin * 2;
    const viewH = canvasH - margin * 2;
    return { viewX0, viewY0, viewW, viewH };
  }

  // トリミングUIのワールド座標をビュー座標に変換
  function trimWorldToView(x, y) {
    const { viewX0, viewY0, viewW, viewH } = getTrimViewArea();
    return {
      x: viewX0 + (x - worldX0) * zoom,
      y: viewY0 + (y - worldY0) * zoom
    };
  }

  // トリミングUIのビュー座標をワールド座標に変換
  function trimViewToWorld(x, y) {
    const { viewX0, viewY0, viewW, viewH } = getTrimViewArea();
    return {
      x: (x - viewX0) / zoom + worldX0,
      y: (y - viewY0) / zoom + worldY0
    };
  }

  // ポイントされているビュー座標からトリミングUIの次の状態を取得
  function trimViewToNextState(x, y) {
    const { x: trimViewL, y: trimViewT } = trimWorldToView(trimL, trimT);
    const { x: trimViewR, y: trimViewB } = trimWorldToView(trimR, trimB);
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

    const canvasW = trimCanvas.width;
    const canvasH = trimCanvas.height;

    const origW = origCanvas.width;
    const origH = origCanvas.height;

    const { viewX0, viewY0, viewW, viewH } = getTrimViewArea();

    if (trimUiState == TrimState.IDLE) {
      // ビューに触れていない間に座標系を調整
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

    const { x: trimViewL, y: trimViewT } = trimWorldToView(trimL, trimT);
    const { x: trimViewR, y: trimViewB } = trimWorldToView(trimR, trimB);

    const ctx = trimCanvas.getContext('2d', { willReadFrequently: true });
    ctx.clearRect(0, 0, canvasW, canvasH);

    ctx.fillStyle = bgColorBox.value;
    ctx.fillRect(trimViewL, trimViewT, trimViewR - trimViewL, trimViewB - trimViewT);

    // 画像描画
    {
      const dx = viewX0 - worldX0 * zoom;
      const dy = viewY0 - worldY0 * zoom;
      const dw = origCanvas.width * zoom;
      const dh = origCanvas.height * zoom;
      ctx.drawImage(origCanvas, dx, dy, dw, dh);
    }

    // トリミングのガイド線描画
    {
      const lineWidth = 3;
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillRect(trimViewL - lineWidth - 2, 0, lineWidth + 4, canvasH);
      ctx.fillRect(0, trimViewT - lineWidth - 2, canvasW, lineWidth + 4);
      ctx.fillRect(trimViewR - 2, 0, lineWidth + 4, canvasH);
      ctx.fillRect(0, trimViewB - 2, canvasW, lineWidth + 4);
      ctx.fillStyle = "#FFF";
      ctx.fillRect(trimViewL - lineWidth, 0, lineWidth, canvasH);
      ctx.fillRect(0, trimViewT - lineWidth, canvasW, lineWidth);
      ctx.fillRect(trimViewR, 0, lineWidth, canvasH);
      ctx.fillRect(0, trimViewB, canvasW, lineWidth);
    }
  }

  function requestBinarize() {
    if (binarizeTimeoutId >= 0) return;
    binarizeTimeoutId = setTimeout(() => {
      binarize();
    }, 300);
  }

  function binarize() {
    if (binarizeTimeoutId >= 0) {
      clearTimeout(binarizeTimeoutId);
      binarizeTimeoutId = -1;
    }

    try {
      const origCtx = origCanvas.getContext('2d', { willReadFrequently: true });

      const srcW = Math.round(trimR - trimL);
      const srcH = Math.round(trimB - trimT);
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

      // トリミングの適用
      {
        const outCtx = binaryCanvas.getContext('2d', { willReadFrequently: true });
        binaryCanvas.width = outW;
        binaryCanvas.height = outH;

        {
          // 自動拡大表示
          const borderWidth = 1;
          const rect = container.getBoundingClientRect();
          const viewW = rect.width - (borderWidth * 2);
          const viewH = Math.ceil(viewW / 2);
          const zoom = Math.floor(Math.min(viewW / outW, viewH / outH));
          binaryCanvas.style.width = `${outW * zoom + (borderWidth * 2)}px`;
          binaryCanvas.style.height = 'auto';
          binaryCanvas.style.imageRendering = 'pixelated';
        }

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
      }

      // 量子化の適用
      {
        const outCtx = binaryCanvas.getContext('2d', { willReadFrequently: true });
        const outImageData = outCtx.getImageData(0, 0, outW, outH);
        const srcRgbData = outImageData.data;
        const outRgbData = new Uint8Array(srcRgbData.length);
        const grayData = new Float32Array(srcRgbData.length / 4);

        // グレースケール化
        let min = 255;
        let max = 0;
        let avg = 0;
        for (let i = 0; i < grayData.length; i++) {
          const r = srcRgbData[i * 4];
          const g = srcRgbData[i * 4 + 1];
          const b = srcRgbData[i * 4 + 2];
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
            outRgbData[i * 4 + 3] = 255;

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

        outImageData.data.set(outRgbData);
        outCtx.putImageData(outImageData, 0, 0);

        binaryCanvas.style.display = "inline-block";
        binarizationErrorBox.style.display = "none";

        generateCode();
      }

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
    }, 300);
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