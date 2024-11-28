
document.addEventListener('DOMContentLoaded', e => {
    // 画像 1 枚だけの段落の画像とテーブルを中央寄せにする
    document.querySelectorAll('main p').forEach(p => {
        if (p.children.length == 1 && ['img', 'table'].includes(p.children[0].tagName.toLowerCase())) {
            p.style.textAlign = 'center';
        }
    });
});
