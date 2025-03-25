/**
 * HTML向けに特殊文字をエスケープする
 * @param {string} s 
 * @returns {string}
 */
function escapeForHtml(s) {
  return (s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
    .replaceAll(" ", '&nbsp;')
    .replaceAll("　", '&#x3000;'));
}
