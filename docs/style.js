

document.addEventListener('DOMContentLoaded', e => {
  arrangeArticleHtml(document.querySelector('main'));
});

function arrangeArticleHtml(parent) {
  // 画像だけの段落を中央寄せにする
  parent.querySelectorAll('p').forEach(p => {
    if (p.children.length == 1 && ['img', 'video', 'iframe'].includes(p.children[0].tagName.toLowerCase())) {
      p.style.textAlign = 'center';
    }
  });

  // 特定のドメインへのリンクにアイコンを付与する
  const linkDecorationRules = [
    { patterns: ['/', './', '../', /http:\/\/localhost(:[0-9]+)?\//, 'https://blog.shapoco.net/'], iconSrc: '/image/icon32_local.png' },
    { patterns: ['https://x.com/', 'https://twitter.com/'], iconSrc: '/image/icon32_x.png' },
    { patterns: ['https://misskey.io/'], iconSrc: '/image/icon32_misskey-io.png' },
    { patterns: ['https://bsky.app/'], iconSrc: '/image/icon32_bluesky.png' },
    { patterns: ['https://github.com/'], iconSrc: '/image/icon32_github.png' },
    { patterns: ['https://www.youtube.com/'], iconSrc: '/image/icon32_youtube.png' },
    { patterns: ['https://www.nicovideo.jp/'], iconSrc: '/image/icon32_niconico.png' },
    { patterns: ['https://akizukidenshi.com/'], iconSrc: '/image/icon32_akizukidenshi.png' },
    { patterns: ['https://www.switch-science.com/'], iconSrc: '/image/icon32_switch-science.png' },
    { patterns: [/https:\/\/([\w-]+\.)?booth\.pm\//], iconSrc: '/image/icon32_booth.png' },
  ];
  parent.querySelectorAll('a').forEach(a => {
    // 画像だけのリンクは除く
    if (a.textContent) {
      for (var rule of linkDecorationRules) {
        const matches = rule.patterns.filter(p => {
          return typeof(p) == 'string' ?
            a.href.startsWith(p) :
            !!a.href.match(p);
        });
        if (matches.length > 0) {
          const img = document.createElement('img');
          img.src = rule.iconSrc;
          img.classList.add('link_icon');
          a.insertBefore(img, a.childNodes[0]);
          break;
        }
      };
    }
  });

  // コードブロックのマークアップ
  const STYLE_KEYWORD = 'color: #44c;';
  const STYLE_STRING = 'color: #c44;';
  const STYLE_COMMENT = 'color: #080; font-style: italic;';
  const STYLE_MACRO = 'color: #c48;';
  const STYLE_CONST = 'color: #880;';
  const STYLE_EMBEDDED = 'color: #84c;';
  const STYLE_LITERAL = 'color: #c44;';
  const STYLE_DIFF_ADD = 'background: #dfd; color: #080;';
  const STYLE_DIFF_DEL = 'background: #fdd; color: #800;';

  // 典型的なルール
  const RULE_LITERAL_CSTYLE_DEC = { style: STYLE_LITERAL, pattern: /\b[0-9_]+(\.[0-9_]+)?(e[0-9]+)?(u?l?|l?f|)\b/i };
  const RULE_LITERAL_CSTYLE_HEX = { style: STYLE_LITERAL, pattern: /\b0x[0-9a-f_]+u?l?\b/i };
  const RULE_LITERAL_CSTYLE_OCT = { style: STYLE_LITERAL, pattern: /\b0[0-7]+u?l?\b/i };
  const RULE_LITERAL_CSTYLE_BIN = { style: STYLE_LITERAL, pattern: /\b0b[01]+u?l?\b/i };
  const RULE_LARGE_CONST_ID = { style: STYLE_CONST, pattern: /\b[A-Z][A-Z0-9_]*\b/ };

  const langCxx = {
    rangeRules: [
      {style: STYLE_COMMENT, start: '//', end: '\n', escapeChar: null},
      {style: STYLE_COMMENT, start: '/*', end: '*/', escapeChar: null},
      {style: STYLE_STRING, start: "'", end: "'", escapeChar: '\\'},
      {style: STYLE_STRING, start: '"', end: '"', escapeChar: '\\'},
      {style: STYLE_MACRO, start: '#', end: '\n', escapeChar: '\\'},
    ],
    regExpRules: [
      {
        style: STYLE_KEYWORD,
        pattern: new RegExp(
          '\\b(asm|auto|bool|break|case|catch|char|class|const|constexpr|' +
          'const_cast|continue|default|delete|do|double|dynamic_cast|else|' +
          'enum|explicit|export|extern|false|float|for|friend|goto|if|' +
          'inline|int|long|mutable|namespace|new|operator|private|' +
          'protected|public|register|reinterpret_cast|return|short|signed|' +
          'sizeof|static|static_cast|struct|switch|template|this|throw|' +
          'true|try|typedef|typeid|typename|union|unsigned|using|virtual|' +
          'void|volatile|wchar_t|while)\\b')
      },
      { style: STYLE_KEYWORD, pattern: /\bu?int(8|16|32|64)_t\b/ },
      RULE_LARGE_CONST_ID,
      RULE_LITERAL_CSTYLE_DEC,
      RULE_LITERAL_CSTYLE_HEX,
      RULE_LITERAL_CSTYLE_OCT,
      RULE_LITERAL_CSTYLE_BIN,
    ],
  };

  const langIno = Object.assign({}, langCxx);
  langIno.regExpRules.push({
    style: STYLE_EMBEDDED,
    pattern: new RegExp(
      '\\b((attach|detach)Interrupt|(low|high)Byte|(no)?interrupts|abs|' +
      'analog(Read|Write|(Read|Write)Resolution|Reference)|' +
      'bit(Read|Write|Set|Clear|)|constrain|cos|delay(Microseconds)?|' +
      'digital(Read|Write)|map|max|micros|millis|min|noTone|pinMode|pow|' +
      'pulseIn|random(Seed)?|shift(In|Out)|sin|sqrt|tan|tone)\\b')
  });
  langIno.regExpRules.push({
    style: STYLE_EMBEDDED,
    pattern: new RegExp(
      '\\b(String|Serial|SoftwareSerial|Stepper|Wire|SPI|Servo|' +
      'LiquidCrystal|SD|File)\\b')
  });

  const langJavaScript = {
    rangeRules: [
      {style: STYLE_COMMENT, start: '//', end: '\n', escapeChar: null},
      {style: STYLE_COMMENT, start: '/*', end: '*/', escapeChar: null},
      {style: STYLE_STRING, start: "'", end: "'", escapeChar: '\\'},
      {style: STYLE_STRING, start: '"', end: '"', escapeChar: '\\'},
    ],
    regExpRules: [
      {
        style: STYLE_KEYWORD,
        pattern: new RegExp(
          '\\b(break|case|catch|class|const|continue|debugger|default|' +
          'delete|do|else|export|extends|false|finally|for|function|if|' +
          'import|in|instanceof|let|new|null|return|super|switch|this|' +
          'throw|true|try|typeof|var|void|while|with)\\b')
      },
      { style: STYLE_CONST, pattern: /\b[A-Z][A-Z0-9_]*\b/ },
      RULE_LARGE_CONST_ID,
      RULE_LITERAL_CSTYLE_DEC,
      RULE_LITERAL_CSTYLE_HEX,
      RULE_LITERAL_CSTYLE_OCT,
      RULE_LITERAL_CSTYLE_BIN,
    ],
  };

  const langDiff = {
    rangeRules: [
      {style: STYLE_DIFF_ADD, start: '+ ', end: '\n', escapeChar: null},
      {style: STYLE_DIFF_DEL, start: '- ', end: '\n', escapeChar: null},
    ],
    regExpRules: [],
  };

  const langs = {
    cxx: langCxx,
    cpp: langCxx,
    'c++': langCxx,
    js: langJavaScript,
    json: langJavaScript,
    diff: langDiff,
  };

  const exts = {
    ino: langIno,
  };

  parent.querySelectorAll('pre').forEach(pre => {
    // ルールの選択
    var lang = null;

    // 拡張子から選択
    for (var extName in exts) {
      if (pre.title.endsWith(extName)) {
        lang = exts[extName];
        break;
      }
    }
    
    if (!lang) {
      // 言語から選択
      for (var langName in langs) {
        if (pre.classList.contains(`lang_${langName}`)) {
          lang = langs[langName];
          break;
        }
      }
    }

    if (lang) {
      // 未定義のルールを補う
      if (!lang.rangeRules) lang.rangeRules = [];
      if (!lang.regExpRules) lang.regExpRules = [];
      // 強調表示
      pre.innerHTML = applyRangeRules(lang, pre.textContent);
    }

    const wrap = document.createElement('div');
    wrap.classList.add('pre_wrap');
    if (pre.title) {
      const header = document.createElement('h5');
      header.innerHTML = escapeForHtml(pre.title);
      wrap.appendChild(header);
    }
    pre.parentNode.insertBefore(wrap, pre);
    pre.remove();
    wrap.appendChild(pre);
  });
}

function applyRangeRules(lang, code) {
  const lex = new SimpleLexer(code);
  var html = '';
  var activeRangeRule = null;
  var fragment = '';
  while (!lex.eos()) {
    if (!activeRangeRule) {
      // 範囲ルールの開始判定
      for (var r of lang.rangeRules) {
        if (lex.tryEat(r.start)) {
          activeRangeRule = r;
          html += applyRegexpRules(lang, fragment);
          fragment = r.start;
          break;
        }
      }
      if (!activeRangeRule) {
        // 通常の文字
        fragment += lex.eat();
      }
    }
    else {
      // エスケープ文字のスキップ
      if (activeRangeRule.escapeChar && lex.tryEat(activeRangeRule.escapeChar)) {
        fragment += activeRangeRule.escapeChar;
      }
      // 範囲ルールの終了判定
      if (lex.tryEat(activeRangeRule.end)) {
        fragment += activeRangeRule.end;
        html += `<span style="${activeRangeRule.style}">${escapeForHtml(fragment)}</span>`;
        activeRangeRule = null;
        fragment = '';
      }
      else {
        fragment += lex.eat();
      }
    }
  }
  return html + applyRegexpRules(lang, fragment);
}

function applyRegexpRules(lang, fragment) {
  const POS_MAX = fragment.length + 1;
  var html = '';
  while (fragment.length > 0) {
    var mStart = POS_MAX;
    var mLen = 0;
    var mRule = null;
    for (var r of lang.regExpRules) {
      const m = fragment.match(r.pattern);
      if (m && m.index < mStart) {
        mStart = m.index;
        mLen = m[0].length;
        mRule = r;
      }
    }
    if (mStart < POS_MAX) {
      mEnd = mStart + mLen;
      html += escapeForHtml(fragment.substring(0, mStart));
      html += `<span style="${mRule.style}">${escapeForHtml(fragment.substring(mStart, mEnd))}</span>`;
      fragment = fragment.substring(mEnd);
    }
    else {
      break;
    }
  }
  return html + escapeForHtml(fragment);
}

function genenerateArticleLinkCard(article) {
  html = '';
  html += `<a class="link_card" href="${article.url}">`;
  html += `  <article>`;
  html += `    <div class="card_image" style="background-image: url(${article.card_image_url});">&nbsp;</div>`;
  html += `    <div class="card_body">`;
  html += `      <h3>${article.title} <span class="header_info">(${article.date})<span></h3>`;
  html += `      <p>${article.description}</p>`;
  html += `    </div>`;
  html += `  </article>`;
  html += `</a>`;
  return html;
}

class SimpleLexer {
  constructor(input) {
    this.input = input;
    this.pos = 0;
  }

  eos() {
    return this.pos >= this.input.length;
  }

  tryEat(key) {
    if (this.input.substring(this.pos, this.pos + key.length) == key) {
      this.eat(key.length);
      return true;
    }
    else {
      return false;
    }
  }
        
  expect(key) {
    if (this.tryEat(key)) {
      return key;
    }
    else {
      throw new Error(`"${key}" is expected.`);
    }
  }

  peek(n = 1) {
    return this.input.substring(this.pos, this.pos + n);
  }
        
  eat(n = 1) {
    if (this.pos + n > this.input.length) {
      throw new Error('Unexpected EOS');
    }
    var ret = this.peek(n);
    this.pos += n;
    return ret;
  }

  backTo(p) {
    this.pos = p;
  }
}

function escapeForHtml(text) {
  text = text.replaceAll('&', '&amp;')
  text = text.replaceAll('"', '&quot;')
  text = text.replaceAll("'", '&#39;')
  text = text.replaceAll('<', '&lt;')
  text = text.replaceAll('>', '&gt;')
  return text;
}
