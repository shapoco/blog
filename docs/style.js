
document.addEventListener('DOMContentLoaded', e => {
  // 画像だけの段落を中央寄せにする
  document.querySelectorAll('main p').forEach(p => {
    if (p.children.length == 1 && ['img', 'video', 'table', 'iframe'].includes(p.children[0].tagName.toLowerCase())) {
      p.style.textAlign = 'center';
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
