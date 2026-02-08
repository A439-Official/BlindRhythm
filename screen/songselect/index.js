const { ipcRenderer } = require("electron");
const RadioSelectionManager = require("../../scripts/radioManager");
const Utils = require("../../scripts/utils");

let songItems = [];
let radioManager;

function handleSongSelect(selectedItem) {
    const illustImg = document.querySelector(".song-illustration img");
    if (selectedItem && selectedItem.backgroundFile) {
        illustImg.src = `song:///${selectedItem.dir}/${selectedItem.backgroundFile}`;
    } else {
        illustImg.src = "res:///textures/Illustration.png";
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
            difficultyItem.innerHTML = `
                <h2>${song.title} <small>[${map.name}]</small></h2>
                <p class="map-moreinfo"> - ${song.artist}</p>`;

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
