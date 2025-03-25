# [メモ] JavaScript 備忘録

JavaScript 関連の雑多なメモ。主に UserScript の作成時に使う。随時追加する

## HTML要素 a と b の共通の親要素

HTML 要素を直接的に特定するのが難しい場合に、その配下に存在することが分かっている特徴的で見つけやすい 2 つの子要素を使って目的の要素を特定する用。

```js:findCommonParent.js
/**
 * 要素 a と b の共通の親要素を返す
 * @param {HTMLElement} a 
 * @param {HTMLElement} b 
 * @param {number} maxDistance
 * @returns {HTMLElement|null}
 */
function findCommonParent(a, b, maxDistance = 99999) {
  let parents = [];
  let distA = 0, distB = 0;
  while (a.parentElement && distA++ < maxDistance) {
    parents.push(a.parentElement);
    a = a.parentElement;
  }
  while (b.parentElement && distB++ < maxDistance) {
    if (parents.includes(b.parentElement)) {
      return b.parentElement;
    }
    b = b.parentElement;
  }
  return null;
}
```

## HTML要素内の画像を alt に置き換えつつ textContent を取得する

X (Twitter) の本文で emoji が IMG 要素になってるのを emoji に戻す用。

```js:getTextContentWithAlt.js
/**
 * 画像の alt を含む textContent を返す
 * @param {HTMLElement} elm
 * @returns {string}
*/
function getTextContentWithAlt(elm) {
  if (elm) {
    if (elm.nodeType === Node.TEXT_NODE) {
      return elm.nodeValue;
    }
    else if (elm.nodeType === Node.ELEMENT_NODE) {
      if (elm.tagName.toLowerCase() === 'img') {
        return elm.alt;
      }
      else if (elm.tagName.toLowerCase() === 'br') {
        return '\n';
      }
      else {
        let text = '';
        for (let child of elm.childNodes) {
          text += getTextContentWithAlt(child);
        }
        return text;
      }
    }
  }
  return '';
}
```

## HTML向けのエスケーピング

```js:escapeForHtml.js
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
```
