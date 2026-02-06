const Utils = require("../../scripts/utils.js");
const THREE = require("three");
const { ipcRenderer } = require("electron");
const { EffectComposer } = require("three/addons/postprocessing/EffectComposer.js");
const { RenderPass } = require("three/addons/postprocessing/RenderPass.js");
const { ShaderPass } = require("three/addons/postprocessing/ShaderPass.js");
const { OutputPass } = require("three/addons/postprocessing/OutputPass.js");
const Model = require("../../scripts/models.js");
const { max } = require("three/src/nodes/TSL.js");

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

(async () => {
    const data = await Utils.data();
    const song = await ipcRenderer.invoke("get-song-by-dir", data.dir);
    const mapdata = await ipcRenderer.invoke("song-file", `${data.dir}/${data.mapID}.brm`);
    map = JSON.parse(mapdata);
    loadGame(data, song);
})();

// 杂七杂八的变量
let bgTexture;
let playing = false;
let startGameTime;
let golbalTime = 0;
let audio;
let audioPlayed = false;
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let map;
let groups = [];
let keys = [false, false, false, false]; // 按键状态
let keysLastFrame = [...keys];

// 存放判定信息
// time: 时间
// offset: 偏差
// type: 结果
let judgements = [];

async function loadGame(data, songInfo) {
    // 加载游戏
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(songInfo.backgroundFile ? `song:///${data.dir}/${songInfo.backgroundFile}` : "res:///textures/Illustration.png", (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        bgTexture = texture;
    });

    // 加载音频
    const audioData = await ipcRenderer.invoke("song-file-bytes", `${data.dir}/${songInfo.audioFile}`);
    audio = audioContext.createBufferSource();
    audio.buffer = await audioContext.decodeAudioData(audioData.buffer);
    audio.connect(audioContext.destination);

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
    startgame();
}

function startgame() {
    // 开始游戏
    console.log("game running...");
    playing = true;
    startGameTime = golbalTime;
}

function getColor(time) {
    const colors = [0xffffff, 0xfc3636, 0x0093fd, 0x813bc6, 0xf2c94c, 0xd34b8c, 0xf2994a, 0x00d1ff, 0x27b06e];
    let lastbpm = map.bpms.find((bpm) => (bpm.time || 0) > time) || map.bpms[0];
    if (!lastbpm.bpm) {
        return 0;
    }
    const modValues = [1, 2, 3, 4, 6, 8, 12, 16];
    const timeValue = ((time - (lastbpm.time || 0)) / 60000) * lastbpm.bpm;
    for (let i = 0; i < 8; i++) {
        if (Math.abs(Utils.mod(timeValue, 1 / modValues[i])) < 1 / 96) {
            return colors[i + 1];
        }
    }
    return colors[0];
}

function updateJudgement(songtime) {
    // 更新判定

    for (let i = 0; i < map.notes.length; i++) {}

    keysLastFrame = [...keys];
}

// 游玩设置
const scrollSpeed = 8;
const maxViewDistance = 10;

function inn(x) {
    return Math.max(Math.min(x, maxViewDistance), 0);
}

let lt = Utils.time();
function animate() {
    requestAnimationFrame(animate);
    lt = golbalTime;
    golbalTime = Utils.time();
    const fps = 1 / (golbalTime - lt);
    const songTime = golbalTime - startGameTime - 4.39;

    // 判定
    // Perfect  100%
    // Great    75%
    // Good     25%
    // Miss     0%
    const judgementTime = [32, 64, 128];

    // 刷新
    groups.forEach((group) => {
        scene.remove(group);
    });
    groups = [];

    // 添加物体
    if (Model._texturesLoaded) {
        defaultgroup = new THREE.Group();
        for (i = 0; i < 4; i++) {
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
                            arrow = Model.getArrow(getColor(note.time));
                            arrow.position.set(0, 2.5 - (note.time / 1000 - songTime) * scrollSpeed, 0);
                            arrow.rotation.set(0, 0, (r / 180) * Math.PI);
                            track.add(arrow);
                        }
                        if (note.stopTime) {
                            arrowBody = Model.getHold({ x: 0, y: 2.5, z: -0.0001 }, { x: 0, y: -1, z: 0 }, inn((note.time / 1000 - songTime) * scrollSpeed), inn((note.stopTime / 1000 - songTime) * scrollSpeed), (t) => {
                                return {
                                    x: 0,
                                    y: 0,
                                    z: 0,
                                };
                            });
                            if (arrowBody) {
                                track.add(arrowBody);
                                holdend = Model.getHoldEnd();
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

    // 更新背景
    if (bgTexture) {
        const aspect = bgTexture.image.width / bgTexture.image.height / (window.innerWidth / window.innerHeight);
        bgTexture.offset.set(aspect > 1 ? (1 - 1 / aspect) / 2 : 0, aspect > 1 ? 0 : (1 - aspect) / 2);
        bgTexture.repeat.set(aspect > 1 ? 1 / aspect : 1, aspect > 1 ? 1 : aspect);
        scene.background = bgTexture;
    }

    // 显示FPS
    document.getElementById("fps").textContent = `FPS: ${Math.floor(fps)}`;

    // 在songTime等于0时播放音乐
    if (songTime >= 0 && !audioPlayed) {
        audio.start();
        audioPlayed = true;
    }

    uniforms.time.value = golbalTime;

    // 更新着色器
    for (const shader in customShaderPass) {
        for (const key in customShaderPass[shader].uniforms) {
            customShaderPass[shader].uniforms[key].value = uniforms[key].value;
        }
    }
    composer.render();
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
