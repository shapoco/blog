(function () {

function round(n, m) {
    const P = Math.round(Math.pow(10, m));
    return Math.round(n * P) / P;
}

let s = '';
const N = 7;
const T = 30;
const colors = ['028', '28f', '4cf', 'fff'];
const M = colors.length;
for (let j = 0; j < M; j++) {
    let line = ``;
    const ballScale = round(Math.pow((M - 1 - j) / (M - 1), 1) + 0.5, 1);
    const ball = `\$[position.y=-3 \$[scale.x=${ballScale} \$[scale.y=${ballScale} ●]]]`;
    for (let i = 0; i < N; i++) {
        const speed = round(T / (i + 8), 4);
        const x=round(-i, 1);
        line += `\$[position.x=${x} \$[spin.speed=${speed}s ${ball}]]`;
    }
    if (j <= 1) {
        line = `\$[blur ${line}]`;
    }
    const y = round(((M - 1) / 2 - j) * 1.35, 2);
    s += `\$[fg.color=${colors[j]} \$[position.y=${y} ${line}]]\n`;
}
const SPC = '　　　　　　　　　　　　　　　　　　　　　　　　';
s = `<center>\$[bg.color=002 ${SPC}\n\n\n\n${s}\n$[position.x=4,y=-5 $[scale.x=1.25 **$[fg.color=0cf ブラウザ]\n$[fg.color=888 システム設定]**]]\n${SPC}]</center>`;

const div = document.querySelector('#article_mfm_ps2');
div.querySelector('pre').textContent = s;
arrangeArticleHtml(div);

})();
