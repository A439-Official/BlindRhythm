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

    static run(code, context = {}) {
        const keys = Object.keys(context);
        const values = keys.map((key) => context[key]);
        const fn = new Function(...keys, code);
        return fn(...values);
    }

    static to(pageId, data) {
        // 如果已经有淡出动画正在进行，则直接返回
        if (Utils._fadeOutInProgress) {
            return;
        }

        Utils._fadeOutInProgress = true;

        // 创建淡出覆盖层
        let fadeOverlay = document.getElementById("fade-overlay");
        if (!fadeOverlay) {
            fadeOverlay = document.createElement("div");
            fadeOverlay.id = "fade-overlay";
            fadeOverlay.style.position = "fixed";
            fadeOverlay.style.top = "0";
            fadeOverlay.style.left = "0";
            fadeOverlay.style.width = "100%";
            fadeOverlay.style.height = "100%";
            fadeOverlay.style.zIndex = "9999";
            fadeOverlay.style.backgroundColor = "rgba(0, 0, 0, 0)";
            fadeOverlay.style.pointerEvents = "none";
            document.body.appendChild(fadeOverlay);
        }

        const startTime = Date.now();
        const duration = 1000; // 1秒

        function animateFadeOut() {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // 透明度从0增加到1
            const alpha = progress;
            fadeOverlay.style.backgroundColor = `rgba(0, 0, 0, ${alpha})`;

            if (progress < 1) {
                requestAnimationFrame(animateFadeOut);
            } else {
                // 动画完成，切换页面
                ipcRenderer.invoke("change-page", pageId, data);
                // 重置状态，新页面加载后会重新初始化
                Utils._fadeOutInProgress = false;
            }
        }

        requestAnimationFrame(animateFadeOut);
    }

    static quit() {
        ipcRenderer.invoke("quit");
    }

    static async data() {
        return await ipcRenderer.invoke("page-data");
    }

    /**
     * 获取配置值
     * @param {string} key - 配置键，支持点号分隔（如 "gameplay.offset"）
     * @param {any} defaultValue - 默认值，当配置不存在时返回
     * @returns {Promise<any>} 配置值
     */
    static async getConfig(key, defaultValue = null) {
        return await ipcRenderer.invoke("get-config", key, defaultValue);
    }

    /**
     * 设置配置值
     * @param {string} key - 配置键，支持点号分隔（如 "gameplay.offset"）
     * @param {any} value - 要设置的值
     * @returns {Promise<boolean>} 是否成功保存
     */
    static async setConfig(key, value) {
        return await ipcRenderer.invoke("set-config", key, value);
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
    static async loadAudio(audioPath) {
        try {
            // 获取音频文件数据
            const audioData = await ipcRenderer.invoke("song-file-bytes", audioPath);
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const audioSource = audioContext.createBufferSource();
            const decodedData = await audioContext.decodeAudioData(audioData.buffer);
            audioSource.buffer = decodedData;

            // 创建增益节点用于控制播放/暂停
            const gainNode = audioContext.createGain();
            audioSource.connect(gainNode);
            gainNode.connect(audioContext.destination);

            // 初始化播放状态
            let isPlaying = false;
            let startTime = 0;
            let pauseTime = 0;
            let playbackRate = 1.0;

            return {
                /**
                 * 播放音频
                 * @param {number} [when=0] - 何时开始播放（秒）
                 * @param {number} [offset=0] - 从音频的哪个位置开始播放（秒）
                 */
                play: (when = 0, offset = 0) => {
                    if (isPlaying) {
                        console.warn("Audio is already playing");
                        return;
                    }

                    const currentTime = audioContext.currentTime;
                    startTime = currentTime - pauseTime + (when || 0);
                    audioSource.start(Math.max(0, when), offset || pauseTime);
                    gainNode.gain.setValueAtTime(1.0, audioContext.currentTime);
                    isPlaying = true;
                    pauseTime = 0;
                },

                /**
                 * 暂停音频
                 */
                pause: () => {
                    if (!isPlaying || !audioSource) return;

                    const currentTime = audioContext.currentTime;
                    pauseTime = currentTime - startTime;
                    gainNode.gain.setValueAtTime(0.0, audioContext.currentTime);
                    isPlaying = false;

                    // 停止当前的音频源
                    try {
                        audioSource.stop();
                    } catch (e) {
                        // 忽略已经停止的源
                    }
                },

                /**
                 * 恢复播放
                 */
                resume: () => {
                    if (isPlaying) {
                        console.warn("Audio is already playing");
                        return;
                    }

                    // 创建新的音频源继续播放
                    const newSource = audioContext.createBufferSource();
                    newSource.buffer = decodedData;
                    newSource.connect(gainNode);

                    const currentOffset = pauseTime;
                    const when = audioContext.currentTime;

                    newSource.start(when, currentOffset);
                    gainNode.gain.setValueAtTime(1.0, when);

                    // 更新引用
                    audioSource = newSource;
                    startTime = when - currentOffset;
                    isPlaying = true;
                    pauseTime = 0;
                },

                /**
                 * 停止播放
                 */
                stop: () => {
                    if (audioSource) {
                        try {
                            audioSource.stop();
                        } catch (e) {
                            // 忽略已经停止的源
                        }
                    }
                    gainNode.gain.setValueAtTime(0.0, audioContext.currentTime);
                    isPlaying = false;
                    startTime = 0;
                    pauseTime = 0;
                },

                /**
                 * 获取音频时长（秒）
                 */
                getDuration: () => {
                    return decodedData ? decodedData.duration : 0;
                },

                /**
                 * 获取当前播放时间（秒）
                 */
                getCurrentTime: () => {
                    if (!isPlaying) {
                        return pauseTime;
                    }
                    return audioContext.currentTime - startTime;
                },

                /**
                 * 跳转到指定时间
                 * @param {number} time - 目标时间（秒）
                 */
                seek: (time) => {
                    const wasPlaying = isPlaying;

                    if (wasPlaying) {
                        this.pause();
                    }

                    pauseTime = Math.max(0, Math.min(time, this.getDuration()));

                    if (wasPlaying) {
                        this.resume();
                    }
                },

                /**
                 * 设置播放速度
                 * @param {number} rate - 播放速度（1.0为正常速度）
                 */
                setPlaybackRate: (rate) => {
                    if (audioSource) {
                        audioSource.playbackRate.value = rate;
                        playbackRate = rate;
                    }
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

                /**
                 * 获取是否正在播放
                 */
                isPlaying: () => {
                    return isPlaying;
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

    static hexToRGBA(octal, a) {
        const decimal = typeof octal === "string" ? parseInt(octal, 8) : octal;
        const hex = decimal.toString(16).padStart(6, "0");
        if (a !== undefined) {
            const alpha = Math.round(Math.max(0, Math.min(1, a)) * 255)
                .toString(16)
                .padStart(2, "0");
            return `#${hex}${alpha}`;
        }
        return `#${hex}`;
    }
}

module.exports = Utils;
