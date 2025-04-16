(function () {

function round(n, m) {
    const P = Math.round(Math.pow(10, m));
    return Math.round(n * P) / P;
}

params = [
    { speedInv: 1, radius: 1, phase: 0 },
    { speedInv: -4, radius: 1/6, phase: 180 },
    { speedInv: 4, radius: 1/6, phase: 0 },
    { speedInv: 4, radius: 1/10, phase: 0 },
    { speedInv: -4, radius: 1/10, phase: 180 },
    { speedInv: -4, radius: 1/14, phase: 180 },
    { speedInv: 4, radius: 1/14, phase: 0 },
    { speedInv: -1, radius: 0, phase: 0 },
    // シンプルバージョン:
    // { speedInv: 1, radius: 1, phase: 0 },
    // { speedInv: -4, radius: 1/6, phase: 0 },
    // { speedInv: 3, radius: 0, phase: 0 },[]
];

const P = 0;
const R = 3;
const T = 4;
let s = '';
let numNest = 0;
for (let p of params) {
    const x = round(R * p.radius * Math.cos((P + p.phase) * Math.PI / 180), 3);
    const y = round(R * p.radius * Math.sin((P + p.phase) * Math.PI / 180), 3);
    const speed = round(T / Math.abs(p.speedInv), 6);
    if (p.speedInv >= 0) {
        s += `\$[spin.speed=${speed}s `;
        numNest++;
    }
    else {
        s += `\$[spin.left,speed=${speed}s `;
        numNest++;
    }
    if (x != 0 && y != 0) {
        s += `\$[position.x=${x},y=${y} `;
        numNest++;
    }
    else if (y != 0) {
        s += `\$[position.y=${y} `;
        numNest++;
    }
    else if (x != 0) {
        s += `\$[position.x=${x} `;
        numNest++;
    }
}
s += `$[scale.x=2,y=2 :murakamisan_step:]`;
for (let i = 0; i < numNest; i++) {
    s += `]`;
}
s = `|￣￣￣￣￣￣￣￣￣￣|
|　　　　　　　　　　|
|　　　　　　　　　　|
|　　　　${s}　　　　|
|　　　　　　　　　　|
|　　　　　　　　　　|
|＿＿＿＿＿＿＿＿＿＿|`;

const div = document.querySelector('#article_mfm_square');
div.querySelector('pre').textContent = s;
arrangeArticleHtml(div);

})();
