const Utils = require("../../scripts/utils.js");
const THREE = require("three");
const { EffectComposer } = require("three/addons/postprocessing/EffectComposer.js");
const { RenderPass } = require("three/addons/postprocessing/RenderPass.js");
const { UnrealBloomPass } = require("three/addons/postprocessing/UnrealBloomPass.js");
const { OutputPass } = require("three/addons/postprocessing/OutputPass.js");

// 场景
const scene = new THREE.Scene();

// 摄像机
const camera = Utils.createCamera();

// 渲染器
const renderer = Utils.createRenderer();

// My Logo
const logo = new THREE.TextureLoader().load("res:///textures/A439.png");
const logoMaterial = new THREE.SpriteMaterial({ map: logo });
const logoObject = new THREE.Sprite(logoMaterial);
scene.add(logoObject);
logoObject.scale.set(4.39, 4.39, 1);
logoObject.material.opacity = 0;

// 后处理
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);
const unrealBloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.1, 0.25, 0);
composer.addPass(unrealBloomPass);
const outputPass = new OutputPass();
composer.addPass(outputPass);

// 动画循环
function animate() {
    requestAnimationFrame(animate);
    const time = Utils.time();

    Utils.anim(time, 0, 1, (t) => {
        logoObject.material.opacity = t;
    });
    Utils.anim(time, 2, 3, (t) => {
        logoObject.material.opacity = 1 - t;
    });
    if (time > 3) {
        logoObject.material.opacity = 0;
        Utils.to("mainmenu");
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
