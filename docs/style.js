
document.addEventListener('DOMContentLoaded', e => {
  // 画像だけの段落を中央寄せにする
  document.querySelectorAll('main p').forEach(p => {
    if (p.children.length == 1 && ['img', 'video', 'table', 'iframe'].includes(p.children[0].tagName.toLowerCase())) {
      p.style.textAlign = 'center';
    }
  });

  const linkDecorationRules = [
    { patterns: ['https://x.com/', 'https://twitter.com/'], icon_src: '/image/icon32_x.png' },
    { patterns: ['https://misskey.io/'], icon_src: '/image/icon32_misskey-io.png' },
    { patterns: ['https://bsky.app/'], icon_src: '/image/icon32_bluesky.png' },
    { patterns: ['https://github.com/'], icon_src: '/image/icon32_github.png' },
  ];

  // 特定のドメインへのリンクにアイコンを付与する
  document.querySelectorAll('a').forEach(a => {
    // 画像だけのリンクは除く
    if (a.textContent) {
      for (var rule of linkDecorationRules) {
        console.log(rule.patterns);
        if (rule.patterns.filter(p => a.href.startsWith(p)).length > 0) {
          const img = document.createElement('img');
          img.src = rule.icon_src;
          img.classList.add('link_icon');
          a.insertBefore(img, a.childNodes[0]);
          break;
        }
      };
    }
  });
});

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
