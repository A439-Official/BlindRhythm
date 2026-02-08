const { ipcRenderer } = require("electron");
const Utils = require("../../scripts/utils.js");

let data;

(async () => {
    data = await Utils.data();
    const map = await await ipcRenderer.invoke("get-song-by-dir", data.data.dir);

    console.log(data);

    document.body.style.backgroundImage = `url("song:///${data.data.dir}/${map.backgroundFile}")`;

    const title = document.getElementById("title");
    title.innerText = map.title;

    const difficulty = document.getElementById("difficulty");
    map.maps.forEach((m) => {
        if (m.id === data.data.mapID) {
            difficulty.innerText = m.name;
        }
    });

    const acc = document.getElementById("acc");
    let a = 0;
    let b = 0;
    data.judgements.forEach((j) => {
        a += data.judgementACC[j.type];
        b++;
    });
    c = (a / b) * 100;
    acc.innerText = `${c.toFixed(2)}%`;

    for (let i = 0; i < data.judgementText.length; i++) {
        const d = document.getElementById(`${data.judgementText[i].toLowerCase()}`);
        let e = 0;
        for (let j = 0; j < data.judgements.length; j++) {
            if (data.judgements[j].type === i) {
                e++;
            }
        }
        d.innerText = `${data.judgementText[i]}: ${e}`;
    }

    update();
})();

function update() {
    const offset = document.getElementById("offset");
    const ctx = offset.getContext("2d");
    const displayWidth = offset.clientWidth;
    const displayHeight = offset.clientHeight;
    if (offset.width !== displayWidth || offset.height !== displayHeight) {
        offset.width = displayWidth;
        offset.height = displayHeight;
    }
    ctx.clearRect(0, 0, offset.width, offset.height);
    ctx.strokeStyle = "rgb(127, 127, 127)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, offset.height / 2);
    ctx.lineTo(offset.width, offset.height / 2);
    ctx.stroke();
    data.judgements.forEach((j) => {
        const x = (j.time / 1000 / data.songLength) * offset.width;
        const y = offset.height * (0.5 + ((j.offset / data.judgementTime[data.judgementTime.length - 1]) * 1000) / 2);
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, 2 * Math.PI);
        ctx.fillStyle = Utils.hexToRGBA(data.judgementColor[j.type]);
        ctx.fill();
    });
    requestAnimationFrame(update);
}
