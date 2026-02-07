const Utils = require("../../scripts/utils.js");

class SettingsManager {
    constructor() {
        this.offsetInput = document.getElementById("offset-input");
        this.configKey = "gameplay.offset";
        this.defaultOffset = 0;
        
        this.init();
    }
    
    async init() {
        // 加载当前的偏移设置
        await this.loadOffsetSetting();
        
        // 监听输入框变化
        this.setupEventListeners();
    }
    
    async loadOffsetSetting() {
        try {
            // 通过Utils获取当前的偏移设置
            const offset = await Utils.getConfig(this.configKey, this.defaultOffset);
            
            // 确保值在有效范围内
            const validatedOffset = this.validateOffset(offset);
            
            // 更新输入框的值
            this.offsetInput.value = validatedOffset;
            
            console.log(`已加载偏移设置: ${validatedOffset}ms`);
        } catch (error) {
            console.error("加载偏移设置失败:", error);
            this.offsetInput.value = this.defaultOffset;
        }
    }
    
    async saveOffsetSetting() {
        try {
            const value = parseInt(this.offsetInput.value, 10);
            const validatedValue = this.validateOffset(value);
            
            // 通过Utils保存设置
            const success = await Utils.setConfig(this.configKey, validatedValue);
            
            if (success) {
                console.log(`已保存偏移设置: ${validatedValue}ms`);
            } else {
                console.error("保存偏移设置失败");
            }
        } catch (error) {
            console.error("保存偏移设置失败:", error);
        }
    }
    
    validateOffset(value) {
        // 确保值是数字
        const numValue = parseInt(value, 10);
        if (isNaN(numValue)) {
            return this.defaultOffset;
        }
        
        // 确保值在有效范围内
        const min = parseInt(this.offsetInput.min, 10) || -200;
        const max = parseInt(this.offsetInput.max, 10) || 200;
        
        if (numValue < min) return min;
        if (numValue > max) return max;
        
        return numValue;
    }
    
    setupEventListeners() {
        // 当输入框失去焦点时保存设置
        this.offsetInput.addEventListener("change", () => {
            this.saveOffsetSetting();
        });
        
        // 当用户按下Enter键时保存设置
        this.offsetInput.addEventListener("keypress", (event) => {
            if (event.key === "Enter") {
                this.saveOffsetSetting();
                this.offsetInput.blur(); // 移除焦点
            }
        });
        
        // 实时验证输入
        this.offsetInput.addEventListener("input", () => {
            const value = parseInt(this.offsetInput.value, 10);
            if (!isNaN(value)) {
                const validatedValue = this.validateOffset(value);
                if (value !== validatedValue) {
                    this.offsetInput.value = validatedValue;
                }
            }
        });
    }
}

// 页面加载完成后初始化设置管理器
document.addEventListener("DOMContentLoaded", () => {
    new SettingsManager();
});
