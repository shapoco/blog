(function () {

function round(n, m) {
    const P = Math.round(Math.pow(10, m));
    return Math.round(n * P) / P;
}

params = [
    { speedInv: 1, radius: 1, phase: 90 },
    { speedInv: -2, radius: 1, phase: 90 },
    { speedInv: 1, radius: 0, phase: 90 },
    { speedInv: 3, radius: 1/3, phase: 270 },
    { speedInv: -6, radius: 1/3, phase: 270 },
    { speedInv: 3, radius: 0, phase: 270 },
    { speedInv: 5, radius: 1/5, phase: 90 },
    { speedInv: -10, radius: 1/5, phase: 90 },
    { speedInv: 5, radius: 0, phase: 90 },
    // { speedInv: 7, radius: 1/7, phase: 270 },
    // { speedInv: -14, radius: 1/7, phase: 270 },
    // { speedInv: 7, radius: 0, phase: 90 },
];

const P = 0;
const R = 2;
const T = 1;
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
s += ':murakamisan_step:';
//s += `$[spin.left,speed=4s $[scale.x=2,y=2 :murakamisan_step:]]`;
//s += `\$[scale.x=2,y=2 :murakamisan_step:]`;
for (let i = 0; i < numNest; i++) {
    s += `]`;
}
s = `|
|　　　|￣￣￣|　　　|￣￣￣|
|　　　|　　　|　　　|　　　|${s}
|￣￣￣|￣￣￣|￣￣￣|￣￣￣|￣￣
|＿＿＿|　　　|＿＿＿|　　　|＿...
|`;

const div = document.querySelector('#article_mfm_uniform_linear');
div.querySelector('pre').textContent = s;
arrangeArticleHtml(div);

})();
