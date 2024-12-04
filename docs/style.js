
document.addEventListener('DOMContentLoaded', e => {
  arrangeArticleHtml(document.querySelector('main'));
});

function arrangeArticleHtml(parent) {
  // 画像だけの段落を中央寄せにする
  parent.querySelectorAll('p').forEach(p => {
    if (p.children.length == 1 && ['img', 'video', 'table', 'iframe'].includes(p.children[0].tagName.toLowerCase())) {
      p.style.textAlign = 'center';
    }
  });

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

  // 特定のドメインへのリンクにアイコンを付与する
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
