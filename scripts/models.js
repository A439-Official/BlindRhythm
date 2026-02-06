const { GLTFLoader } = require("three/examples/jsm/loaders/GLTFLoader.js");
const THREE = require("three");
const { Text } = require("troika-three-text");

class Model {
    static _textureLoader = new THREE.TextureLoader();

    static _oTexture = null;
    static _iTexture = null;
    static _bTexture = null;
    static _eTexture = null;

    static _texturesLoaded = false;

    static {
        this._textureLoader.load(
            `../../resources/textures/arrows/o.png`,
            (oTexture) => {
                this._oTexture = oTexture;
                this._textureLoader.load(
                    `../../resources/textures/arrows/i.png`,
                    (iTexture) => {
                        this._iTexture = iTexture;
                        this._textureLoader.load(
                            `../../resources/textures/arrows/b.png`,
                            (bTexture) => {
                                this._bTexture = bTexture;
                                this._textureLoader.load(
                                    `../../resources/textures/arrows/e.png`,
                                    (eTexture) => {
                                        this._eTexture = eTexture;
                                        this._texturesLoaded = true;
                                    },
                                    undefined,
                                    (error) => {
                                        console.error("arrows/e纹理预加载失败:", error);
                                    },
                                );
                            },
                            undefined,
                            (error) => {
                                console.error("arrows/b纹理预加载失败:", error);
                            },
                        );
                    },
                    undefined,
                    (error) => {
                        console.error("arrows/i纹理预加载失败:", error);
                    },
                );
            },
            undefined,
            (error) => {
                console.error("arrows/o纹理预加载失败:", error);
            },
        );
    }

    static createText(text, color, fontSize, fontFile, callback) {
        const textObj = new Text();
        textObj.text = text;
        textObj.color = color;
        textObj.fontSize = fontSize;
        textObj.font = fontFile;
        textObj.anchorX = "50%";
        textObj.anchorY = "50%";
        textObj.sync(() => {
            callback(textObj);
        });
    }

    static getModel(filePath, callback) {
        const loader = new GLTFLoader();
        loader.load(
            filePath,
            (gltf) => {
                callback(gltf.scene);
            },
            undefined,
            (error) => {
                console.error("模型加载失败:", error);
                callback(null, error);
            },
        );
    }

    static getArrow(color) {
        // 检查纹理是否已加载
        if (!this._texturesLoaded) {
            return;
        }

        try {
            // 纹理已加载，同步创建箭头
            const geometry = new THREE.PlaneGeometry(1, 1);

            // 创建o材质
            const oMaterial = new THREE.MeshBasicMaterial({
                map: this._oTexture,
                transparent: true,
                side: THREE.DoubleSide,
                color: 0xffffff,
            });

            // 创建i材质
            const iMaterial = new THREE.MeshBasicMaterial({
                map: this._iTexture,
                transparent: true,
                side: THREE.DoubleSide,
                color: color,
            });

            const oArrow = new THREE.Mesh(geometry, oMaterial);
            const iArrow = new THREE.Mesh(geometry, iMaterial);
            const arrowGroup = new THREE.Group();
            arrowGroup.add(oArrow);
            arrowGroup.add(iArrow);
            arrowGroup.scale.set(1.5, 1.5, 1.5);
            arrowGroup.position.set(0, 0, 0);

            return arrowGroup;
        } catch (error) {
            console.error("创建箭头失败:", error);
            return null;
        }
    }

    /**
     * 创建扭曲长条
     * @param {Object} pos - 固定点坐标
     * @param {Object} ext - 延伸方向，如 {x: 0, y:-1, z:0}
     * @param {number} l1 - 长条头距离固定点的位置
     * @param {number} l2 - 长条尾距离固定点的位置（l2 > l1）
     * @param {Function} twistFunc - 扭曲函数，输入实际距离，返回 {x, y, z} 偏移量
     * @returns {THREE.Mesh} 返回网格对象
     */
    static getHold(pos, ext, l1, l2, twistFunc) {
        const width = 1.5;
        const segments = 100;
        if (ext.x === 0 && ext.y === 0 && ext.z === 0) {
            return null;
        }
        if (l1 >= l2) {
            [l1, l2] = [l2, l1];
        }
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        const uvs = [];
        const normals = [];
        const direction = new THREE.Vector3(ext.x, ext.y, ext.z);
        direction.normalize();
        const up = new THREE.Vector3(0, 0, 1);
        let side;
        if (Math.abs(direction.dot(up)) > 0.99) {
            side = new THREE.Vector3(1, 0, 0);
        } else {
            side = new THREE.Vector3().crossVectors(up, direction).normalize();
        }
        const normal = side.clone().cross(direction).normalize();
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const currentDistance = l1 + t * (l2 - l1);
            const basePosition = new THREE.Vector3(pos.x || 0, pos.y || 0, pos.z || 0).addScaledVector(direction, currentDistance);
            let twist;
            try {
                twist = twistFunc(currentDistance);
            } catch (error) {
                twist = { x: 0, y: 0, z: 0 };
            }
            const twistedPosition = basePosition.add(new THREE.Vector3(twist.x || 0, twist.y || 0, twist.z || 0));
            const leftPos = twistedPosition.clone().addScaledVector(side, -width / 2);
            const rightPos = twistedPosition.clone().addScaledVector(side, width / 2);
            vertices.push(leftPos.x, leftPos.y, leftPos.z, rightPos.x, rightPos.y, rightPos.z);
            uvs.push(0, t, 1, t);
            normals.push(normal.x, normal.y, normal.z, normal.x, normal.y, normal.z);
        }
        geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
        geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
        const indices = [];
        for (let i = 0; i < segments; i++) {
            const baseIndex = i * 2;
            indices.push(baseIndex, baseIndex + 1, baseIndex + 2, baseIndex + 1, baseIndex + 3, baseIndex + 2);
        }
        geometry.setIndex(indices);
        const material = new THREE.MeshBasicMaterial({
            map: this._bTexture,
            transparent: true,
            side: THREE.DoubleSide,
        });
        const mesh = new THREE.Mesh(geometry, material);
        return mesh;
    }

    static getHoldEnd() {
        if (!this._texturesLoaded) {
            return;
        }
        try {
            const geometry = new THREE.PlaneGeometry(1, 1);
            const material = new THREE.MeshBasicMaterial({
                map: this._eTexture,
                transparent: true,
                side: THREE.DoubleSide,
                color: 0xffffff,
            });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.scale.set(1.5, 1.5, 1.5);
            return mesh;
        } catch (error) {
            console.error("创建结束符失败:", error);
            return null;
        }
    }
}

module.exports = Model;
