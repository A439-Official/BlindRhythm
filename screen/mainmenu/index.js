const Utils = require("../../scripts/utils.js");
const THREE = require("three");
const { EffectComposer } = require("three/addons/postprocessing/EffectComposer.js");
const { RenderPass } = require("three/addons/postprocessing/RenderPass.js");
const { UnrealBloomPass } = require("three/addons/postprocessing/UnrealBloomPass.js");
const { OutputPass } = require("three/addons/postprocessing/OutputPass.js");
const Model = require("../../scripts/models.js");
const RadioSelectionManager = require("../../scripts/radioManager.js");

// 场景
const scene = Utils.createScene();

// 摄像机
const camera = Utils.createCamera();

// 渲染器
const renderer = Utils.createRenderer();

// 标题文本
let title;
Model.createText("BlindRhythm", "white", 0.75, "res:///fonts/ResourceHanRoundedCN-Regular.ttf", (textObj) => {
    title = textObj;
    scene.add(title);
    title.position.set(0, 0, 0);
});

// 后处理
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);
const unrealBloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1, 0.1, 0);
composer.addPass(unrealBloomPass);
const outputPass = new OutputPass();
composer.addPass(outputPass);

// Arrows
let arrows = [];

setTimeout(() => {
    while (arrows.length < 5) {
        arrow = Model.getArrow(0xfc3636);
        if (arrow) {
            arrows.push(arrow);
            scene.add(arrows[arrows.length - 1]);
        }
    }
}, 100);

// 动画循环
function animate() {
    requestAnimationFrame(animate);
    const time = Utils.time();
    if (title) {
        Utils.anim(time, 0, 1, (t) => {
            title.position.y = 5 - Utils.cubicBezier(0, 1, 1, 1)(t) * 2;
            unrealBloomPass.strength = 1 - t * 0.9;
        });
    }
    for (let i = 0; i < arrows.length; i++) {
        arrows[i].rotation.z = (90 / 180) * Math.PI + Math.sin(time / (2 ^ 1.5) + i * 8) * Math.PI - Math.sin(time / (2 ^ 0.5) + i * 8) * Math.PI;
    }
    composer.render();
}
animate();

// 监听窗口大小变化
window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});

// 初始化菜单选项管理器
const menuItems = [
    { element: document.getElementById("songselect-btn"), action: () => Utils.to("songselect") },
    { element: document.getElementById("settings-btn"), action: () => Utils.to("settings") },
    { element: document.getElementById("quit-btn"), action: () => Utils.quit() },
];

const menuManager = new RadioSelectionManager({
    items: menuItems,
    onConfirm: (item) => item.action(),
});
