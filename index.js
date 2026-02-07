const { app, BrowserWindow, session } = require("electron");
const path = require("node:path");
const { autoUpdater, setupAutoUpdater, checkForUpdates } = require("./scripts/autoUpdater.js");
const { registerProtocolHandler } = require("./scripts/protocolHandler.js");
const ConfigManager = require("./scripts/configManager.js");
const WindowManager = require("./scripts/window.js");
const { registerIPC } = require("./scripts/ipcHandler.js");
const songManager = require("./scripts/songManager.js");

const appName = "BlindRhythm";
const windowManager = new WindowManager();
let configManager;

const createWindow = () => {
    // 初始化配置管理器
    configManager = new ConfigManager(appName);

    // 设置自动更新
    setupAutoUpdater(windowManager, configManager);

    const mainWindow = windowManager.createWindow(appName, configManager);

    return mainWindow;
};

// 启动
app.whenReady().then(() => {
    // 检查更新
    if (!app.isPackaged) {
        autoUpdater.updateConfigPath = path.join(__dirname, "dev-app-update.yml");
    }
    checkForUpdates();

    // 注册协议
    registerProtocolHandler(app);

    // 创建窗口
    const mainWindow = createWindow();

    // 设置IPC处理器
    registerIPC(app, windowManager, songManager, configManager);

    windowManager.loadPage("welcome");

    session.defaultSession.clearCache();

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            const mainWindow = createWindow();
        }
    });
});

// 退出
app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});
