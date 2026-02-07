const { ipcMain } = require("electron");
const fs = require("fs/promises");
const path = require("path");

function registerIPC(app, windowManager, songManager, configManager) {
    ipcMain.handle("change-page", (event, pageId, data) => {
        if (!windowManager) {
            throw new Error("WindowManager not initialized");
        }
        windowManager.loadPage(pageId, data);
    });

    ipcMain.handle("page-data", (event) => {
        if (!windowManager) {
            throw new Error("WindowManager not initialized");
        }
        return windowManager.pageData;
    });

    ipcMain.handle("quit", (event) => {
        app.quit();
    });

    ipcMain.handle("get-songs", async () => {
        if (!songManager) {
            throw new Error("SongManager not initialized");
        }
        return await songManager.getSongs();
    });

    ipcMain.handle("get-song-by-dir", async (event, dir) => {
        if (!songManager) {
            throw new Error("SongManager not initialized");
        }
        return await songManager.getSongByDir(dir);
    });

    ipcMain.handle("song-file", async (event, filePath) => {
        try {
            const normalizedPath = path.normalize(filePath);
            if (normalizedPath.startsWith("..") || normalizedPath.includes("../")) {
                throw new Error("Invalid file path");
            }
            const fullPath = path.join(__dirname, "..", "songs", normalizedPath);
            const content = await fs.readFile(fullPath, "utf-8");
            return content;
        } catch (error) {}
    });

    ipcMain.handle("song-file-bytes", async (event, filePath) => {
        try {
            const normalizedPath = path.normalize(filePath);
            if (normalizedPath.startsWith("..") || normalizedPath.includes("../")) {
                throw new Error("Invalid file path");
            }
            const fullPath = path.join(__dirname, "..", "songs", normalizedPath);
            const content = await fs.readFile(fullPath);
            return content;
        } catch (error) {}
    });

    ipcMain.handle("get-config", async (event, key, defaultValue) => {
        if (!configManager) {
            throw new Error("ConfigManager not initialized");
        }
        return configManager.get(key, defaultValue);
    });

    ipcMain.handle("set-config", async (event, key, value) => {
        if (!configManager) {
            throw new Error("ConfigManager not initialized");
        }
        return configManager.set(key, value);
    });
}

module.exports = {
    registerIPC,
};
