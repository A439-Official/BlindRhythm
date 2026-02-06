const { ipcRenderer } = require("electron");
const THREE = require("three");

class Utils {
    static pageStartTime = Date.now();

    static renderer = null;
    static camera = null;
    static scene = null; // 添加场景静态属性

    static time() {
        return (Date.now() - this.pageStartTime) / 1000;
    }

    static to(pageId) {
        ipcRenderer.invoke("change-page", pageId);
    }

    static quit() {
        ipcRenderer.invoke("quit");
    }

    static async data() {
        return await ipcRenderer.invoke("page-data");
    }

    // 创建场景函数
    static createScene(options = {}) {
        this.scene = new THREE.Scene();

        // 设置场景背景色
        if (options.backgroundColor) {
            this.scene.background = new THREE.Color(options.backgroundColor);
        }

        // 添加雾效
        if (options.fog) {
            const fogOptions = options.fog;
            if (fogOptions.type === "linear") {
                this.scene.fog = new THREE.Fog(fogOptions.color || 0xffffff, fogOptions.near || 1, fogOptions.far || 1000);
            } else if (fogOptions.type === "exponential") {
                this.scene.fog = new THREE.FogExp2(fogOptions.color || 0xffffff, fogOptions.density || 0.0025);
            }
        }

        this.addDefaultLights();
        return this.scene;
    }

    static addDefaultLights() {
        if (!this.scene) return;

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
        this.scene.add(ambientLight);
        ambientLight.position.set(0, 0, 100);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 5);
        directionalLight.position.set(0, 0, 10000);
        this.scene.add(directionalLight);
    }

    static createCamera() {
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.z = 5;
        return this.camera;
    }

    static createRenderer() {
        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.getElementById("renderer").appendChild(this.renderer.domElement);

        return this.renderer;
    }

    static cubicBezier(p1x, p1y, p2x, p2y) {
        const cx = 3 * p1x;
        const bx = 3 * (p2x - p1x) - cx;
        const ax = 1 - cx - bx;

        const cy = 3 * p1y;
        const by = 3 * (p2y - p1y) - cy;
        const ay = 1 - cy - by;

        function sampleCurveX(t) {
            return ((ax * t + bx) * t + cx) * t;
        }

        function solveCurveX(x, epsilon = 1e-6) {
            let t0, t1, t2, x2;
            t2 = x;
            for (let i = 0; i < 8; i++) {
                x2 = sampleCurveX(t2) - x;
                if (Math.abs(x2) < epsilon) return t2;

                const d2 = (3 * ax * t2 + 2 * bx) * t2 + cx;
                if (Math.abs(d2) < 1e-6) break;

                t2 = t2 - x2 / d2;
            }
            t0 = 0;
            t1 = 1;
            t2 = x;
            if (t2 < t0) return t0;
            if (t2 > t1) return t1;
            while (t0 < t1) {
                x2 = sampleCurveX(t2);
                if (Math.abs(x2 - x) < epsilon) return t2;
                if (x > x2) t0 = t2;
                else t1 = t2;
                t2 = (t1 - t0) * 0.5 + t0;
            }
            return t2;
        }

        return function (t) {
            const t2 = solveCurveX(t);
            return ((ay * t2 + by) * t2 + cy) * t2;
        };
    }

    static anim(t, t1, t2, func) {
        if (t1 < t && t < t2) {
            func((t - t1) / (t2 - t1));
        }
    }

    /**
     * 加载并播放音乐文件
     * @param {string} audioPath - 音频文件路径
     * @returns {Promise<Object>} 返回包含音频控制方法的对象
     */
    static async loadAndPlayAudio(audioPath) {
        try {
            // 获取音频文件数据
            const audioData = await ipcRenderer.invoke("song-file-bytes", audioPath);

            // 创建音频上下文
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();

            // 创建音频源
            const audioSource = audioContext.createBufferSource();

            // 解码音频数据
            const decodedData = await audioContext.decodeAudioData(audioData.buffer);
            audioSource.buffer = decodedData;

            // 连接到音频输出
            audioSource.connect(audioContext.destination);

            return {
                /**
                 * 播放音频
                 * @param {number} [when=0] - 何时开始播放（秒）
                 * @param {number} [offset=0] - 从音频的哪个位置开始播放（秒）
                 */
                play: (when = 0, offset = 0) => {
                    audioSource.start(when, offset);
                },

                /**
                 * 停止播放
                 */
                stop: () => {
                    if (audioSource) {
                        audioSource.stop();
                    }
                },

                /**
                 * 获取音频时长（秒）
                 */
                getDuration: () => {
                    return decodedData ? decodedData.duration : 0;
                },

                /**
                 * 获取音频上下文
                 */
                getAudioContext: () => {
                    return audioContext;
                },

                /**
                 * 获取音频源
                 */
                getAudioSource: () => {
                    return audioSource;
                },
            };
        } catch (error) {
            console.error("Error loading and playing audio:", error);
            throw error;
        }
    }

    static mod(value, mod) {
        // 处理除以0的情况
        if (mod === 0) {
            return value;
        }

        // 处理无穷大的情况
        if (value / mod === Infinity || value / mod === -Infinity) {
            return value - (value / mod) * mod;
        }

        // 正常的取模运算
        return value - Math.round(value / mod) * mod;
    }
}

module.exports = Utils;
