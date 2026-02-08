document.addEventListener(
    "mouseup",
    (event) => {
        if (event.button === 3 || event.button === 4) {
            event.preventDefault();
            event.stopPropagation();
            console.log("Mouse button " + event.button + " blocked");
        }
    },
    true,
);

// 淡入动画
let st = null;
function updateOverlay() {
    if (document.body) {
        if (st == null || Date.now() - st < 1000) {
            if (!document.getElementById("overlay")) {
                const overlay = document.createElement("div");
                overlay.id = "overlay";
                overlay.style.position = "fixed";
                overlay.style.top = "0";
                overlay.style.left = "0";
                overlay.style.width = "100%";
                overlay.style.height = "100%";
                overlay.style.zIndex = "9999";
                overlay.style.backgroundColor = "rgb(0, 0, 0)";
                document.body.appendChild(overlay);
                st = Date.now();
            } else {
                const overlay = document.getElementById("overlay");
                if (overlay) {
                    const alpha = 1 - (Date.now() - st) / 1000;
                    overlay.style.backgroundColor = `rgb(0, 0, 0, ${alpha})`;
                }
            }
        } else {
            const overlay = document.getElementById("overlay");
            if (overlay) {
                document.body.removeChild(overlay);
            }
            return;
        }
    }
    requestAnimationFrame(updateOverlay);
}

updateOverlay();
