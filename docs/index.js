
document.addEventListener('DOMContentLoaded', e => {
    // 画像だけの段落を中央寄せにする
    document.querySelectorAll('main p').forEach(p => {
        if (p.children.length == 1 && ['img', 'table', 'iframe'].includes(p.children[0].tagName.toLowerCase())) {
            p.style.textAlign = 'center';
        }
    });
});
