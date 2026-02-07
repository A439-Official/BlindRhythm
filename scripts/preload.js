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
