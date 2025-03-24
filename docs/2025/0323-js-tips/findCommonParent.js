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
