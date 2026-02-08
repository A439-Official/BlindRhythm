const Utils = require("../../scripts/utils.js");

class DynamicSettingsManager {
    constructor() {
        this.settings = {};
        this.panels = {
            game: document.getElementById("game-panel"),
            audio: document.getElementById("audio-panel"),
            video: document.getElementById("video-panel"),
            controls: document.getElementById("controls-panel"),
        };

        this.groups = {};
        this.init();
    }

    async init() {
        // 初始化标签页切换
        this.setupTabSwitching();

        // 等待DOM完全加载后初始化设置
        if (document.readyState === "loading") {
            await new Promise((resolve) => document.addEventListener("DOMContentLoaded", resolve));
        }

        console.log("动态设置管理器已初始化");
    }

    /**
     * 添加一个设置项
     * @param {string} id - 设置项ID
     * @param {string} panel - 面板ID ('game', 'audio', 'video', 'controls')
     * @param {string} group - 分组名称
     * @param {string} name - 设置项名称
     * @param {string} description - 设置项描述
     * @param {string} type - 设置类型 ('number', 'range', 'checkbox', 'select', 'keybinding')
     * @param {*} defaultValue - 默认值
     * @param {Object} options - 其他选项
     */
    async addSetting(id, panel, group, name, description, type, defaultValue, options = {}) {
        // 存储设置定义
        this.settings[id] = {
            id,
            panel,
            group,
            name,
            description,
            type,
            defaultValue,
            options,
            value: defaultValue,
        };

        // 确保分组存在
        await this.ensureGroup(panel, group);

        // 创建设置项DOM
        const settingElement = this.createSettingElement(id, panel, group, name, description, type, defaultValue, options);

        // 添加到对应的分组
        const groupContainer = this.groups[`${panel}-${group}`];
        if (groupContainer) {
            groupContainer.appendChild(settingElement);
        }

        // 加载保存的值
        await this.loadSettingValue(id);

        // 设置事件监听器
        this.setupSettingEventListeners(id);

        console.log(`已添加设置项: ${id}`);
    }

    /**
     * 确保分组容器存在
     */
    async ensureGroup(panel, group) {
        const groupKey = `${panel}-${group}`;

        if (!this.groups[groupKey]) {
            const panelElement = this.panels[panel];
            if (!panelElement) {
                console.error(`面板不存在: ${panel}`);
                return;
            }

            // 检查是否已存在该分组
            let groupContainer = panelElement.querySelector(`.settings-group[data-group="${group}"]`);
            if (!groupContainer) {
                groupContainer = document.createElement("div");
                groupContainer.className = "settings-group";
                groupContainer.setAttribute("data-group", group);

                const groupTitle = document.createElement("h3");
                groupTitle.textContent = group;
                groupContainer.appendChild(groupTitle);

                panelElement.appendChild(groupContainer);
            }

            this.groups[groupKey] = groupContainer;
        }
    }

    /**
     * 创建设置项DOM元素
     */
    createSettingElement(id, panel, group, name, description, type, defaultValue, options) {
        const settingItem = document.createElement("div");
        settingItem.className = "setting-item";
        settingItem.setAttribute("data-setting-id", id);

        // 创建标签部分
        const labelDiv = document.createElement("div");
        labelDiv.className = "setting-label";

        const nameHeading = document.createElement("h4");
        nameHeading.textContent = name;

        const descParagraph = document.createElement("p");
        descParagraph.textContent = description;

        labelDiv.appendChild(nameHeading);
        labelDiv.appendChild(descParagraph);

        // 创建控制部分
        const controlDiv = document.createElement("div");
        controlDiv.className = "setting-control";

        let controlElement;
        switch (type) {
            case "number":
                controlElement = this.createNumberInput(id, defaultValue, options);
                break;
            case "range":
                controlElement = this.createRangeInput(id, defaultValue, options);
                break;
            case "checkbox":
                controlElement = this.createCheckboxInput(id, defaultValue, options);
                break;
            case "select":
                controlElement = this.createSelectInput(id, defaultValue, options);
                break;
            case "keybinding":
                controlElement = this.createKeybindingInput(id, defaultValue, options);
                break;
            default:
                console.error(`未知的设置类型: ${type}`);
                controlElement = document.createElement("div");
                controlElement.textContent = "未知类型";
        }

        controlDiv.appendChild(controlElement);

        settingItem.appendChild(labelDiv);
        settingItem.appendChild(controlDiv);

        return settingItem;
    }

    /**
     * 创建数字输入控件
     */
    createNumberInput(id, defaultValue, options) {
        const input = document.createElement("input");
        input.type = "number";
        input.id = id;
        input.value = defaultValue;
        input.className = "number";

        if (options.min !== undefined) input.min = options.min;
        if (options.max !== undefined) input.max = options.max;
        if (options.step !== undefined) input.step = options.step;
        if (options.placeholder) input.placeholder = options.placeholder;

        return input;
    }

    /**
     * 创建滑块输入控件
     */
    createRangeInput(id, defaultValue, options) {
        const input = document.createElement("input");
        input.type = "range";
        input.id = id;
        input.value = defaultValue;
        input.className = "slider";

        if (options.min !== undefined) input.min = options.min;
        if (options.max !== undefined) input.max = options.max;
        if (options.step !== undefined) input.step = options.step;

        return input;
    }

    /**
     * 创建复选框控件
     */
    createCheckboxInput(id, defaultValue, options) {
        const input = document.createElement("input");
        input.type = "checkbox";
        input.id = id;
        input.checked = defaultValue;
        input.className = "checkbox";

        return input;
    }

    /**
     * 创建下拉选择控件
     */
    createSelectInput(id, defaultValue, options) {
        const select = document.createElement("select");
        select.id = id;

        if (options.options && Array.isArray(options.options)) {
            options.options.forEach((option) => {
                const optionElement = document.createElement("option");
                optionElement.value = option.value;
                optionElement.textContent = option.label;
                if (option.value === defaultValue) {
                    optionElement.selected = true;
                }
                select.appendChild(optionElement);
            });
        }

        return select;
    }

    /**
     * 创建按键控件
     */
    createKeybindingInput(id, defaultValue, options) {
        const keyDiv = document.createElement("div");
        keyDiv.className = "binding";
        keyDiv.id = id;
        keyDiv.textContent = defaultValue || "点击设置";

        return keyDiv;
    }

    /**
     * 格式化值显示
     */
    formatValue(value, options) {
        if (options.format) {
            if (typeof options.format === "function") {
                return options.format(value);
            } else if (options.format === "percent") {
                return `${value}%`;
            } else if (options.format === "ms") {
                return `${value}ms`;
            }
        }
        return value;
    }

    /**
     * 加载设置值
     */
    async loadSettingValue(id) {
        const setting = this.settings[id];
        if (!setting) return;

        try {
            const savedValue = await Utils.getConfig(`${id}`, setting.defaultValue);
            setting.value = savedValue;

            // 更新UI
            this.updateSettingUI(id, savedValue);

            console.log(`已加载设置 ${id}: ${savedValue}`);
        } catch (error) {
            console.error(`加载设置 ${id} 失败:`, error);
        }
    }

    /**
     * 更新设置UI
     */
    updateSettingUI(id, value) {
        const setting = this.settings[id];
        if (!setting) return;

        const element = document.getElementById(id);
        if (!element) return;

        switch (setting.type) {
            case "number":
            case "range":
                element.value = value;
                break;
            case "checkbox":
                element.checked = value;
                break;
            case "select":
                element.value = value;
                break;
            case "keybinding":
                element.textContent = value || "点击设置";
                break;
        }
    }

    /**
     * 保存设置值
     */
    async saveSettingValue(id, value) {
        const setting = this.settings[id];
        if (!setting) return;

        try {
            setting.value = value;
            const success = await Utils.setConfig(`${id}`, value);

            if (success) {
                console.log(`已保存设置 ${id}: ${value}`);
            } else {
                console.error(`保存设置 ${id} 失败`);
            }
        } catch (error) {
            console.error(`保存设置 ${id} 失败:`, error);
        }
    }

    /**
     * 设置事件监听器
     */
    setupSettingEventListeners(id) {
        const setting = this.settings[id];
        if (!setting) return;

        const element = document.getElementById(id);
        if (!element) return;

        switch (setting.type) {
            case "number":
                element.addEventListener("change", () => {
                    const value = parseFloat(element.value);
                    this.saveSettingValue(id, value);
                });
                break;

            case "range":
                element.addEventListener("input", () => {
                    const value = parseFloat(element.value);
                    this.saveSettingValue(id, value);
                });
                break;

            case "checkbox":
                element.addEventListener("change", () => {
                    this.saveSettingValue(id, element.checked);
                });
                break;

            case "select":
                element.addEventListener("change", () => {
                    this.saveSettingValue(id, element.value);
                });
                break;

            case "keybinding":
                element.addEventListener("click", () => {
                    this.startKeyRecording(id, element);
                });
                break;
        }
    }

    /**
     * 开始录制按键
     */
    startKeyRecording(id, element) {
        element.classList.add("recording");
        element.textContent = "按下按键...";

        const keyHandler = (event) => {
            event.preventDefault();
            event.stopPropagation();

            // 忽略功能键
            if (["Shift", "Control", "Alt", "Meta", "Tab", "Escape", "Enter"].includes(event.key)) {
                return;
            }

            const key = event.key.toUpperCase();
            element.textContent = key;
            element.classList.remove("recording");

            this.saveSettingValue(id, key);

            document.removeEventListener("keydown", keyHandler);
        };

        document.addEventListener("keydown", keyHandler);

        // 添加取消录制的选项
        const cancelHandler = (event) => {
            if (event.key === "Escape") {
                element.textContent = this.settings[id].value || "点击设置";
                element.classList.remove("recording");
                document.removeEventListener("keydown", keyHandler);
                document.removeEventListener("keydown", cancelHandler);
            }
        };

        document.addEventListener("keydown", cancelHandler);
    }

    /**
     * 设置标签页切换
     */
    setupTabSwitching() {
        const tabButtons = document.querySelectorAll(".tab-button");
        const panels = document.querySelectorAll(".settings-panel");

        tabButtons.forEach((button) => {
            button.addEventListener("click", () => {
                const tab = button.getAttribute("data-tab");

                // 更新按钮状态
                tabButtons.forEach((btn) => btn.classList.remove("active"));
                button.classList.add("active");

                // 更新面板状态
                panels.forEach((panel) => panel.classList.remove("active"));
                const targetPanel = document.getElementById(`${tab}-panel`);
                if (targetPanel) {
                    targetPanel.classList.add("active");
                }
            });
        });
    }
}

// 页面加载完成后初始化设置管理器并添加所有设置
document.addEventListener("DOMContentLoaded", async () => {
    const settingsManager = new DynamicSettingsManager();
    window.settingsManager = settingsManager;

    // 等待管理器初始化
    await settingsManager.init();

    // 添加所有设置项
    await addAllSettings(settingsManager);

    // ESC键返回主菜单
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            Utils.to("mainmenu");
        }
    });
});

// 添加所有设置项
async function addAllSettings(manager) {
    await manager.addSetting("ui.offset", "game", "界面", "偏移显示器", "真的是太有用了", "checkbox", true);
    await manager.addSetting("ui.combo", "game", "界面", "Combo", "显示连击", "checkbox", true);
    await manager.addSetting("autoplay", "game", "游玩", "AutoPlay", "我去，是奥托先生", "checkbox", false);

    await manager.addSetting("volume.master", "audio", "音量", "主音量", "", "range", 100, {
        min: 0,
        max: 100,
        step: 1,
        format: "percent",
    });

    await manager.addSetting("offset", "audio", "音频控制", "偏移", "如果音频比画面晚请调大", "number", 0, {
        min: -1000,
        max: 1000,
        step: 10,
        format: "ms",
    });

    await manager.addSetting("fullscreen", "video", "显示", "全屏", "（我感觉这个设置可能用不上）", "checkbox", false);
    await manager.addSetting("bg-brightness", "video", "显示", "背景亮度", "（这个估计也是）", "range", 50, {
        min: 0,
        max: 100,
        step: 10,
        format: "percent",
    });

    await manager.addSetting("keybinding.left", "controls", "按键", "⬅", "", "keybinding", "D");
    await manager.addSetting("keybinding.down", "controls", "按键", "⬇", "", "keybinding", "F");
    await manager.addSetting("keybinding.up", "controls", "按键", "⬆", "", "keybinding", "J");
    await manager.addSetting("keybinding.right", "controls", "按键", "➡", "", "keybinding", "K");

    console.log("All settings have been added.");
}
