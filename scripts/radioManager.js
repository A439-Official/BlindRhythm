class RadioSelectionManager {
    constructor(options) {
        this.items = options.items || [];
        this.activeClass = options.activeClass || "active";
        this.onSelect = options.onSelect || (() => {});
        this.onConfirm = options.onConfirm || (() => {});

        if (this.items.length > 0) {
            this.setActive(0);
        }

        this.addEventListeners();
    }

    setActive(index) {
        // Validate index
        if (index < 0 || index >= this.items.length) return;

        // Update active state
        this.items.forEach((item, i) => {
            item.element.classList.toggle(this.activeClass, i === index);
        });

        // Store current index and trigger callbacks
        this.currentIndex = index;
        const item = this.getItem(index);
        this.onSelect(item);
    }

    getItem(index) {
        return this.items[index];
    }

    handleKeyDown(event) {
        if (this.items.length === 0) return;

        switch (event.key) {
            case "ArrowUp":
                if (this.currentIndex > 0) {
                    this.setActive(this.currentIndex - 1);
                }
                break;
            case "ArrowDown":
                if (this.currentIndex < this.items.length - 1) {
                    this.setActive(this.currentIndex + 1);
                }
                break;
            case "Enter":
                event.preventDefault();
                this.onConfirm(this.getItem(this.currentIndex));
                break;
            default:
                return;
        }
    }

    addEventListeners() {
        // Keyboard navigation
        document.addEventListener("keydown", this.handleKeyDown.bind(this));

        // Click selection
        this.items.forEach((item, index) => {
            item.element.addEventListener("click", () => {
                if (this.currentIndex === index) {
                    this.onConfirm(this.getItem(index));
                } else {
                    this.setActive(index);
                }
            });
        });
    }

    removeEventListeners() {
        document.removeEventListener("keydown", this.handleKeyDown);
        this.items.forEach((item) => {
            item.element.removeEventListener("click", this.handleKeyDown);
        });
    }
}

module.exports = RadioSelectionManager;
