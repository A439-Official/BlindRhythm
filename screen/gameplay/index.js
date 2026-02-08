const Utils = require("../../scripts/utils.js");
const THREE = require("three");
const { ipcRenderer } = require("electron");
const { EffectComposer } = require("three/addons/postprocessing/EffectComposer.js");
const { RenderPass } = require("three/addons/postprocessing/RenderPass.js");
const { ShaderPass } = require("three/addons/postprocessing/ShaderPass.js");
const { OutputPass } = require("three/addons/postprocessing/OutputPass.js");
const Model = require("../../scripts/models.js");
const { color } = require("three/src/nodes/TSL.js");

function disposeObject(obj) {
    if (!obj) return;
    obj.children?.forEach((child) => disposeObject(child));
    obj.geometry?.dispose();
    if (obj.material) {
        (Array.isArray(obj.material) ? obj.material : [obj.material]).filter(Boolean).forEach((material) => material.dispose());
    }
    obj.dispose?.();
}

const scene = Utils.createScene();
const camera = Utils.createCamera();
const renderer = Utils.createRenderer();

// 后处理
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
let customShaderPass = {};
const uniforms = {
    resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    time: { value: 0 },
    tDiffuse: { value: null },
};
const outputPass = new OutputPass();

// 杂七杂八的变量
let data;
let bgTexture;
let playing = false;
let startGameTime;
let golbalTime = 0;
let audio;
let audioPlayed = false;
let map;
let groups = [];
let keys = [false, false, false, false]; // 按键状态
let keysLastFrame = [...keys];
let acc = 1;
let accLastFrame = acc;

// 游玩设置
const scrollSpeed = 10;
const maxViewDistance = 10;
let offset = 0;

// 判定
// Perfect  100%    <=36ms
// Great    75%     36ms<t<=72ms
// Good     25%     72ms<t<=128ms
// Miss     0%      128ms<t
const judgementTime = [36, 72, 128];
const judgementText = ["Perfect", "Great", "Good", "Miss"];
const judgementColor = [0x19ff71, 0xc7ff57, 0xfff233, 0xff545d];
const judgementACC = [1, 0.8, 0.3, 0];

// 存放判定信息
// time: 时间
// offset: 偏差
// type: 结果
let judgements = [];

(async () => {
    data = await Utils.data();
    const song = await ipcRenderer.invoke("get-song-by-dir", data.dir);
    const mapdata = await ipcRenderer.invoke("song-file", `${data.dir}/${data.mapID}.brm`);
    map = JSON.parse(mapdata);
    loadGame(song);
})();

async function loadGame(songInfo) {
    offset = await Utils.getConfig("offset", 0);

    // 加载游戏
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(songInfo.backgroundFile ? `song:///${data.dir}/${songInfo.backgroundFile}` : "res:///textures/Illustration.png", (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        bgTexture = texture;
    });

    // 加载音频
    audio = await Utils.loadAudio(`${data.dir}/${songInfo.audioFile}`);

    composer.addPass(renderPass);
    // 自定义着色器后处理
    await Promise.all(
        map.shaders.map(async (shader) => {
            try {
                const vertexShader = await ipcRenderer.invoke("song-file", `${data.dir}/shaders/${shader}.vert`);
                const fragmentShader = await ipcRenderer.invoke("song-file", `${data.dir}/shaders/${shader}.frag`);
                if (vertexShader || fragmentShader) {
                    customShaderPass[shader] = new ShaderPass({ uniforms, vertexShader, fragmentShader });
                    composer.addPass(customShaderPass[shader]);
                }
            } catch (e) {}
        }),
    );
    composer.addPass(outputPass);

    map.notes.sort((a, b) => {
        return a.time - b.time;
    });

    playing = true;
    startGameTime = golbalTime;
}

function getColor(time) {
    const colors = [0xffffff, 0xfc3636, 0x0093fd, 0x813bc6, 0xf2c94c, 0xd34b8c, 0xf2994a, 0x00d1ff, 0x27b06e];
    let lastbpm = null;
    for (const bpm of map.bpms) {
        if ((bpm.time || 0) > time) {
            break;
        }
        lastbpm = bpm;
    }
    if (lastbpm === null) {
        lastbpm = map.bpms[0];
    }
    if ((lastbpm.bpm || 0) === 0) {
        return 0;
    }
    const modValues = [1, 2, 3, 4, 6, 8, 12, 16];
    for (let i = 0; i < 8; i++) {
        const modValue = 1 / modValues[i];
        const timeValue = ((time - (lastbpm.time || 0)) / 60000) * (lastbpm.bpm || 0);
        if (Math.abs(Utils.mod(timeValue, modValue)) < 1 / 96) {
            return colors[i + 1];
        }
    }
    return colors[0];
}

function inn(x) {
    return Math.max(Math.min(x, maxViewDistance), 0);
}

function addJudgement(time, offset, type) {
    if (type === undefined) {
        // 非强制判定
        const absOffset = Math.abs(offset);
        type = judgementTime.findIndex((t) => absOffset <= t / 1000);
        type = type === -1 ? 3 : type;
    }
    console.log(judgementText[type]);
    judgements.push({ time, offset, type });

    // 计算ACC
    let a = 0;
    let b = 0;
    judgements.forEach((j) => {
        a += judgementACC[j.type];
        b++;
    });
    acc = a / b;
}

function updateJudgement(songTime) {
    let keyChecked = [false, false, false, false]; // 重复判定标记
    for (let i = 0; i < map.notes.length; i++) {
        const note = map.notes[i];
        if (note.checked) {
            continue;
        }
        if (note.time / 1000 - judgementTime[2] / 1000 > songTime) {
            break;
        }
        if ((note.stopTime || note.time) / 1000 + judgementTime[2] / 1000 < songTime) {
            if (note.holding) {
                // 长条忘记松手了（可以酌情考虑一下给Good）
                note.holding = false;
                note.checked = true;
                addJudgement(note.stopTime, 0, 2);
                keyChecked[note.track - 1] = true;
                continue;
            }
            // 为什么你只是看着！（震怒）
            note.checked = true;
            addJudgement(songTime * 1000, 0, 3);
            continue;
        }
        if (keyChecked[note.track - 1]) {
            continue;
        }
        if (!note.checked) {
            if (note.stopTime) {
                // 长条
                if (note.holding) {
                    // 按住的长条
                    if (songTime < (note.stopTime - judgementTime[2]) / 1000) {
                        if (!keys[note.track - 1]) {
                            // 哦亲爱的你又多了一个小姐
                            note.holding = false;
                            note.checked = true;
                            addJudgement(songTime * 1000, 0, 3);
                            keyChecked[note.track - 1] = true;
                            continue;
                        }
                    } else {
                        if (!keys[note.track - 1]) {
                            note.holding = false;
                            note.checked = true;
                            addJudgement(note.stopTime, songTime - note.stopTime / 1000);
                            keyChecked[note.track - 1] = true;
                        }
                    }
                } else {
                    if (keys[note.track - 1] && !keysLastFrame[note.track - 1]) {
                        note.holding = true;
                        addJudgement(note.time, songTime - note.time / 1000);
                        keyChecked[note.track - 1] = true;
                    }
                }
            } else {
                // 单按
                if (Math.abs(songTime - note.time / 1000) <= judgementTime[2] / 1000) {
                    if (keys[note.track - 1] && !keysLastFrame[note.track - 1]) {
                        note.checked = true;
                        addJudgement(note.time, songTime - note.time / 1000);
                        keyChecked[note.track - 1] = true;
                    }
                }
            }
        }
    }
    keysLastFrame = [...keys];
}

let lt = Utils.time();
function animate() {
    lt = golbalTime;
    golbalTime = Utils.time();
    const fps = 1 / (golbalTime - lt);

    // 检查歌曲是否结束
    if (audioPlayed) {
        if (audio.getCurrentTime() > audio.getDuration() + 2) {
            Utils.to("result", {
                judgements: judgements,
                data: data,
                judgementACC: judgementACC,
                judgementColor: judgementColor,
                judgementText: judgementText,
                judgementTime: judgementTime,
                songLength: audio.getDuration(),
            });
        }
    }

    let songTime = golbalTime - startGameTime - 4.39;
    if (audio && audio.isPlaying()) {
        if (Math.abs(audio.getCurrentTime() - offset / 1000 - songTime) > 0.05) {
            songTime = audio.getCurrentTime() - offset / 1000;
        }
    }

    // 播放音乐
    if (golbalTime - startGameTime - 4.39 >= -offset / 1000 && !audioPlayed) {
        audio.play();
        audioPlayed = true;
    }

    // 进行判定
    if (map && playing) {
        updateJudgement(songTime);
    }

    // 绘制（我不会模型复用:sad:）
    groups.forEach((group) => {
        disposeObject(group);
        scene.remove(group);
    });
    groups = [];
    if (Model._texturesLoaded && map) {
        const defaultgroup = new THREE.Group();
        for (let i = 0; i < 4; i++) {
            const track = new THREE.Group();
            track.position.set((i - 1.5) * 1.75, 0, 0);
            const receptor = Model.getArrow(keys[i] ? 0x7f7f7f : 0x000000);
            receptor.position.set(0, 2.5, 0);
            const r = [90, 180, 0, -90][i];
            receptor.rotation.set(0, 0, (r / 180) * Math.PI);
            track.add(receptor);
            map.notes.forEach((note) => {
                if (note.track - 1 === i) {
                    if ((note.stopTime || note.time) / 1000 - songTime > 0 && note.time / 1000 - songTime < maxViewDistance / scrollSpeed) {
                        if (note.time / 1000 - songTime > 0) {
                            const arrow = Model.getArrow(getColor(note.time));
                            arrow.position.set(0, 2.5 - (note.time / 1000 - songTime) * scrollSpeed, 0);
                            arrow.rotation.set(0, 0, (r / 180) * Math.PI);
                            track.add(arrow);
                        }
                        if (note.stopTime) {
                            const arrowBody = Model.getHold({ x: 0, y: 2.5, z: -0.0001 }, { x: 0, y: -1, z: 0 }, inn((note.time / 1000 - songTime) * scrollSpeed), inn((note.stopTime / 1000 - songTime) * scrollSpeed));
                            if (arrowBody) {
                                track.add(arrowBody);
                                const holdend = Model.getHoldEnd();
                                holdend.position.set(0, 2.5 - inn((note.stopTime / 1000 - songTime) * scrollSpeed), -0.0001);
                                track.add(holdend);
                            }
                        }
                    }
                }
            });
            defaultgroup.add(track);
        }
        scene.add(defaultgroup);
        groups.push(defaultgroup);
    }

    // 更新判定
    const judgeElement = document.getElementById("judge");
    if (judgements[judgements.length - 1]) {
        const lastJudgement = judgements[judgements.length - 1];
        judgeElement.innerHTML = `${judgementText[lastJudgement.type]}`;
        judgeElement.style.fontSize = `${6 + 0.5 * (1 / (0.75 + songTime - lastJudgement.time / 1000)) ** 4}vh`;
        judgeElement.style.color = Utils.hexToRGBA(judgementColor[lastJudgement.type]);
    } else {
        judgeElement.innerHTML = "";
    }
    const offsetDisplay = document.getElementById("offset");
    offsetDisplay.width = window.innerHeight / 4;
    offsetDisplay.height = window.innerHeight / 32;
    const ctx = offsetDisplay.getContext("2d");
    ctx.clearRect(0, 0, offsetDisplay.width, offsetDisplay.height);
    ctx.fillStyle = "#00000043";
    ctx.fillRect(0, 0, offsetDisplay.width, offsetDisplay.height);
    ctx.lineWidth = offsetDisplay.height / 4;
    for (let i = judgementTime.length - 1; i >= 0; i--) {
        ctx.strokeStyle = Utils.hexToRGBA(judgementColor[i]);
        ctx.beginPath();
        ctx.moveTo(offsetDisplay.width * (0.5 - judgementTime[i] / judgementTime[judgementTime.length - 1] / 2), offsetDisplay.height / 2);
        ctx.lineTo(offsetDisplay.width * (0.5 + judgementTime[i] / judgementTime[judgementTime.length - 1] / 2), offsetDisplay.height / 2);
        ctx.stroke();
    }
    ctx.lineWidth = offsetDisplay.height / 8;
    judgements.forEach((judge) => {
        if (songTime - judge.time / 1000 < 1) {
            ctx.strokeStyle = Utils.hexToRGBA(judgementColor[judge.type], 1 - (songTime - judge.time / 1000));
            ctx.beginPath();
            ctx.moveTo(offsetDisplay.width * (0.5 + (judge.offset * 1000) / judgementTime[judgementTime.length - 1] / 2), 0);
            ctx.lineTo(offsetDisplay.width * (0.5 + (judge.offset * 1000) / judgementTime[judgementTime.length - 1] / 2), offsetDisplay.height);
            ctx.stroke();
        }
    });

    // 更新acc
    const accDisplay = document.getElementById("acc");
    accDisplay.innerHTML = `${(accLastFrame * 100).toFixed(2)}%`;
    accLastFrame = accLastFrame * 0.9 + acc * 0.1;

    // 更新背景
    if (bgTexture) {
        const aspect = bgTexture.image.width / bgTexture.image.height / (window.innerWidth / window.innerHeight);
        bgTexture.offset.set(aspect > 1 ? (1 - 1 / aspect) / 2 : 0, aspect > 1 ? 0 : (1 - aspect) / 2);
        bgTexture.repeat.set(aspect > 1 ? 1 / aspect : 1, aspect > 1 ? 1 : aspect);
        scene.background = bgTexture;
    }

    // 更新着色器
    uniforms.time.value = golbalTime;
    for (const shader in customShaderPass) {
        for (const key in customShaderPass[shader].uniforms) {
            customShaderPass[shader].uniforms[key].value = uniforms[key].value;
        }
    }
    composer.render();
    requestAnimationFrame(animate);
    // setTimeout(animate, 1000 / 240);
}
animate();

window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
    uniforms.resolution.value.set(window.innerWidth, window.innerHeight);
});

["keydown", "keyup"].forEach((type) => {
    window.addEventListener(type, (event) => {
        const keyMap = { e: 0, f: 1, j: 2, i: 3 };
        if (event.key in keyMap) {
            keys[keyMap[event.key]] = type === "keydown";
        }
    });
});

window.addEventListener("blur", () => keys.fill(false));

window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        Utils.to("songselect");
    }
});
