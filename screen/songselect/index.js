const { ipcRenderer } = require("electron");
const RadioSelectionManager = require("../../scripts/radioManager");
const Utils = require("../../scripts/utils");

let songItems = [];
let radioManager;

function handleSongSelect(selectedItem) {
    // 更新背景曲绘
    const backgroundImg = document.querySelector(".song-background img");
    if (selectedItem && selectedItem.backgroundFile) {
        backgroundImg.src = `song:///${selectedItem.dir}/${selectedItem.backgroundFile}`;
    } else {
        backgroundImg.src = "res:///textures/Illustration.png";
    }

    // 更新歌曲信息
    if (selectedItem) {
        document.querySelector(".song-title").textContent = selectedItem.title || "";
        document.querySelector(".song-artist").textContent = `- ${selectedItem.artist}` || "";
        document.querySelector(".map-name").textContent = `[${selectedItem.map?.name}] by ${selectedItem.creator}` || "";
    }
}

ipcRenderer.invoke("get-songs").then((songs) => {
    const songList = document.querySelector(".song-list");
    songItems = [];
    songList.innerHTML = "";
    Object.entries(songs).forEach(([dir, song]) => {
        const difficulties = song.maps;
        difficulties.forEach((map) => {
            const difficultyItem = document.createElement("div");
            difficultyItem.className = "map-item";
            difficultyItem.innerHTML = `<h2>${song.title} <small>[${map.name}]</small></h2>`;

            songItems.push({
                ...song,
                map: map,
                dir: dir,
                element: difficultyItem,
            });

            songList.appendChild(difficultyItem);
        });
    });

    radioManager = new RadioSelectionManager({
        items: songItems,
        onSelect: handleSongSelect,
        onConfirm: (selectedItem) => {
            Utils.to("gameplay", {
                dir: selectedItem.dir,
                songID: selectedItem.id,
                mapID: selectedItem.map.id,
            });
        },
    });
});

const bg = document.getElementById("renderer");
bg.style.backgroundColor = "rgba(0, 0, 0, 1)";

window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        Utils.to("mainmenu");
    }
});
