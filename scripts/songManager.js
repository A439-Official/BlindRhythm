const fs = require("fs");
const path = require("path");

class SongManager {
    constructor() {
        this.songsPath = path.join(__dirname, "../songs");
        this.songs = {};
    }

    async getSongs() {
        try {
            if (!fs.existsSync(this.songsPath)) {
                fs.mkdirSync(this.songsPath);
                console.log(`Created songs directory at ${this.songsPath}`);
                return [];
            }

            const dirs = fs
                .readdirSync(this.songsPath, { withFileTypes: true })
                .filter((dirent) => dirent.isDirectory())
                .map((dirent) => dirent.name);

            this.songs = {};
            for (const dir of dirs) {
                const songPath = path.join(this.songsPath, dir);
                const infoPath = path.join(songPath, "info.json");

                if (fs.existsSync(infoPath)) {
                    try {
                        const data = fs.readFileSync(infoPath, "utf8");
                        const info = JSON.parse(data);
                        if (info.id && info.title && info.audioFile) {
                            this.songs[dir] = {
                                ...info,
                            };
                        }
                    } catch (e) {
                        console.error(`Error reading ${infoPath}:`, e.message);
                    }
                }
            }

            return this.songs;
        } catch (err) {
            console.error("Error scanning songs:", err);
            return [];
        }
    }

    async getSongByDir(dir) {
        try {
            const fullPath = path.join(this.songsPath, dir);

            if (!fs.existsSync(fullPath)) {
                throw new Error(`Folder not found: ${fullPath}`);
            }

            const infoPath = path.join(fullPath, "info.json");
            if (!fs.existsSync(infoPath)) {
                throw new Error(`info.json not found in ${fullPath}`);
            }

            const data = fs.readFileSync(infoPath, "utf8");
            const info = JSON.parse(data);

            if (!info.id || !info.title || !info.audioFile) {
                throw new Error(`Missing required fields in ${infoPath}`);
            }

            return info;
        } catch (err) {
            console.error(`Error reading song from ${dir}:`, err);
            throw err;
        }
    }
}

module.exports = new SongManager();
