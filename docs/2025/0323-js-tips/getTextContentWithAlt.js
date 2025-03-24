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
