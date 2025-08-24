(function () {
  const container = document.querySelector('#article_image2arrayContainer');
  const fileBox = document.createElement('input');
  const dropTarget = document.createElement('div');
  const origCanvas = document.createElement('canvas');
  const widthBox = document.createElement('input');
  const heightBox = document.createElement('input');
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

  let binarizeTimeoutId = -1;
  let generateCodeTimeoutId = -1;
  let binaryData = null;

  function createNoWrap() {
    const span = document.createElement('span');
    span.style.whiteSpace = "nowrap";
    span.style.display = "inline-block";
    span.style.marginRight = "10px";
    return span;
  }

  function main() {

    {
      const h = document.createElement('h4');
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
      const h = document.createElement('h4');
      h.textContent = "オリジナル画像";
      container.appendChild(h);
    }

    {
      const p = document.createElement('p');
      p.style.textAlign = "center";
      origCanvas.style.maxWidth = "100%";
      origCanvas.style.boxSizing = "border-box";
      origCanvas.style.border = "1px solid #444";
      origCanvas.style.backgroundColor = "#444";
      p.appendChild(origCanvas);
      container.appendChild(p);
    }

    {
      const h = document.createElement('h4');
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
      const h = document.createElement('h4');
      h.textContent = "配列コード";
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
        ctx.drawImage(img, 0, 0);
        binarize();
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }

  function requestBinarize() {
    if (binarizeTimeoutId >= 0) {
      clearTimeout(binarizeTimeoutId);
    }
    binarizeTimeoutId = setTimeout(() => {
      binarize();
    }, 500);
  }

  function binarize() {
    try {
      const origCtx = origCanvas.getContext('2d', { willReadFrequently: true });

      let outWidth = origCanvas.width;
      let outHeight = origCanvas.height;

      // 出力サイズ決定
      if (widthBox.value && heightBox.value) {
        outWidth = parseInt(widthBox.value);
        outHeight = parseInt(heightBox.value);
        widthBox.placeholder = "";
        heightBox.placeholder = "";
      }
      else if (widthBox.value) {
        outWidth = parseInt(widthBox.value);
        outHeight = Math.ceil(origCanvas.height * (outWidth / origCanvas.width));
        widthBox.placeholder = "";
        heightBox.placeholder = "(" + outHeight + ")";
      }
      else if (heightBox.value) {
        outHeight = parseInt(heightBox.value);
        outWidth = Math.ceil(origCanvas.width * (outHeight / origCanvas.height));
        widthBox.placeholder = "(" + outWidth + ")";
        heightBox.placeholder = "";
      }
      else {
        if (outWidth > 256 || outHeight > 256) {
          const max = Math.max(outWidth, outHeight);
          outWidth = Math.floor(outWidth * (256 / max));
          outHeight = Math.floor(outHeight * (256 / max));
        }
        widthBox.placeholder = "(" + outWidth + ")";
        heightBox.placeholder = "(" + outHeight + ")";
      }

      // リサイズ
      const outCtx = binaryCanvas.getContext('2d', { willReadFrequently: true });
      binaryCanvas.width = outWidth;
      binaryCanvas.height = outHeight;
      outCtx.drawImage(origCanvas, 0, 0, outWidth, outHeight);
      const outImageData = outCtx.getImageData(0, 0, outWidth, outHeight);
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
      binaryData = new Uint8Array(outWidth * outHeight);
      for (let y = 0; y < outHeight; y++) {
        for (let x = 0; x < outWidth; x++) {
          const i = (y * outWidth + x);
          const gray = grayData[i];
          const binary = gray < 0 ? -1 : 1;

          let outBinary = binary <= 0 ? 0 : 255;
          if (invert) outBinary = 255 - outBinary;
          binaryData[i] = outBinary;
          outRgbData[i * 4] = outRgbData[i * 4 + 1] = outRgbData[i * 4 + 2] = outBinary;

          if (diffusion) {
            const error = gray - binary;
            if (x < outWidth - 1) {
              grayData[i + 1] += error * 7 / 16;
            }
            if (y < outHeight - 1) {
              if (x > 0) {
                grayData[i + outWidth - 1] += error * 3 / 16;
              }
              grayData[i + outWidth] += error * 5 / 16;
              if (x < outWidth - 1) {
                grayData[i + outWidth + 1] += error * 1 / 16;
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
      arrayCode.style.display = "none";
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