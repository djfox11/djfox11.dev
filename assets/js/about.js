console.log("about.js loaded");

const musicItems = document.querySelectorAll(".music-item");
const musicDisplay = document.querySelector(".music-display");
const musicCover = document.getElementById("music-cover");
const musicTitle = document.getElementById("music-title");
const musicSource = document.getElementById("music-source");
const musicNote = document.getElementById("music-note");

console.log({
    musicItemsFound: musicItems.length,
    musicDisplay,
    musicCover,
    musicTitle,
    musicSource,
    musicNote,
});

function setActiveMusicItem(selectedItem) {
    if (!selectedItem) {
        return;
    }

    if (!musicCover || !musicTitle || !musicSource) {
        console.warn("Music picker is missing required display elements.");
        return;
    }

    musicItems.forEach((item) => {
        item.classList.remove("is-active");
        item.setAttribute("aria-pressed", "false");
    });

    selectedItem.classList.add("is-active");
    selectedItem.setAttribute("aria-pressed", "true");

    const cover = selectedItem.dataset.cover;
    const coverAlt = selectedItem.dataset.coverAlt;
    const title = selectedItem.dataset.title;
    const source = selectedItem.dataset.source;
    const note = selectedItem.dataset.note;

    if (musicDisplay) {
        musicDisplay.classList.add("is-changing");
    }

    setTimeout(() => {
        if (cover) {
            musicCover.src = cover;
        }

        if (coverAlt) {
            musicCover.alt = coverAlt;
        } else if (title && source) {
            musicCover.alt = `${title} - ${source} cover art`;
        }

        if (title) {
            musicTitle.textContent = title;
        }

        if (source) {
            musicSource.textContent = source;
        }

        if (musicNote && note) {
            musicNote.textContent = note;
        }

        if (musicDisplay) {
            musicDisplay.classList.remove("is-changing");
        }
    }, 120);
}

musicItems.forEach((item) => {
    item.setAttribute(
        "aria-pressed",
        item.classList.contains("is-active") ? "true" : "false"
    );

    item.addEventListener("click", () => {
        setActiveMusicItem(item);
    });
});