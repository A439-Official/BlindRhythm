const { BrowserWindow, Menu, MenuItem } = require("electron");
const path = require("node:path");

class WindowManager {
    constructor() {
        this.mainWindow = null;
        this.pageData = null;
    }

    createWindow(appName, configManager) {
        this.mainWindow = new BrowserWindow({
            width: 1280,
            height: 720,
            minWidth: 640,
            minHeight: 360,
            title: appName,
            icon: path.join(__dirname, "../resources/textures/BR.png"),
            // frame: false,
            webPreferences: {
                preload: path.join(__dirname, "../preload.js"),
                nodeIntegration: true,
                contextIsolation: false,
            },
            autoHideMenuBar: true,
        });
        this.mainWindow.setFullScreen(configManager.get("fullScreen", false));
        this._initShortcuts(configManager);
        return this.mainWindow;
    }

    getMainWindow() {
        return this.mainWindow;
    }

    _initShortcuts(configManager) {
        const menu = new Menu();

        // 添加应用菜单(macOS)
        if (process.platform === "darwin") {
            menu.append(new MenuItem({ role: "appMenu" }));
        }

        // 菜单项配置
        const menuItems = [
            {
                label: "Reload window",
                click: () => this.mainWindow.reload(),
                accelerator: "CommandOrControl+R",
            },
            {
                label: "Full screen",
                click: () => {
                    this.mainWindow.setFullScreen(!this.mainWindow.isFullScreen());
                    configManager.set("fullScreen", this.mainWindow.isFullScreen());
                },
                accelerator: "F11",
            },
        ];

        // 开发模式下添加开发者工具菜单项
        if (process.env.NODE_ENV === "development" || !require("electron").app.isPackaged) {
            menuItems.push({
                label: "Open DevTools",
                click: () => this.mainWindow.webContents.openDevTools(),
                accelerator: "CommandOrControl+Shift+I",
            });
        }

        // 构建子菜单并添加到主菜单
        const submenu = Menu.buildFromTemplate(menuItems);
        menu.append(new MenuItem({ label: "Custom Menu", submenu }));

        // 设置应用菜单
        Menu.setApplicationMenu(menu);
    }

    /**
     * 加载指定页面
     * @param {string} pageId 页面ID，对应screen目录下的子目录名称
     * @param {any} [data] 需要传递给页面的数据
     */
    loadPage(pageId, data) {
        if (!this.mainWindow) {
            throw new Error("Window not created yet");
        }

        if (data) {
            this.pageData = data;
        }

        const path = require("node:path");
        const pagePath = path.join(__dirname, `../screen/${pageId}/index.html`);

        this.mainWindow.loadFile(pagePath).catch((err) => {
            console.error(`Failed to load page ${pageId}:`, err);
            throw err;
        });

        console.log(`Page ${pageId} loaded`);
    }
}

module.exports = WindowManager;
