const musicItems = Array.from(document.querySelectorAll(".music-item"));
const musicCover = document.getElementById("music-cover");
const musicTitle = document.getElementById("music-title");
const musicSource = document.getElementById("music-source");
const musicAudio = document.getElementById("music-audio");
const musicStatus = document.getElementById("music-status");
const musicStop = document.getElementById("music-stop");

if (musicAudio && musicStatus && musicStop && musicItems.length) {
    let selectedItem = musicItems.find((item) => item.classList.contains("is-active")) || musicItems[0];
    let playRequest = 0;

    function updateControls() {
        const playing = !musicAudio.paused && !musicAudio.ended;
        musicItems.forEach((item) => {
            const selected = item === selectedItem;
            const isPlaying = selected && playing;
            item.classList.toggle("is-active", selected);
            item.classList.toggle("is-playing", isPlaying);
            item.setAttribute("aria-pressed", String(isPlaying));
            item.setAttribute("aria-label", `${isPlaying ? "Pause" : "Play"} ${item.dataset.title} clip`);
        });
        musicStop.disabled = musicAudio.paused && musicAudio.currentTime === 0;
    }

    async function playClip() {
        const request = ++playRequest;
        musicStatus.textContent = `Loading ${selectedItem.dataset.title}…`;
        try {
            await musicAudio.play();
        } catch (error) {
            // A newer selection or a pause can cancel a pending play request.
            if (request !== playRequest || error.name === "AbortError") return;
            console.error("Could not play the selected music clip:", error);
            musicStatus.textContent = error.name === "NotAllowedError"
                ? "Playback was blocked. Try the player's play button."
                : "This clip couldn't be played. Try another song.";
            updateControls();
        }
    }

    musicItems.forEach((item) => {
        item.addEventListener("click", () => {
            if (item === selectedItem) {
                if (!musicAudio.paused && !musicAudio.ended) {
                    ++playRequest;
                    musicAudio.pause();
                } else {
                    if (musicAudio.ended) musicAudio.currentTime = 0;
                    playClip();
                }
                return;
            }

            ++playRequest;
            musicAudio.pause();
            selectedItem = item;
            musicAudio.src = item.dataset.audio;
            musicAudio.setAttribute("aria-label", `${item.dataset.title} audio clip`);
            musicCover.src = item.dataset.cover;
            musicCover.alt = `${item.dataset.source} cover art`;
            musicTitle.textContent = item.dataset.title;
            musicSource.textContent = item.dataset.source;
            updateControls();
            playClip();
        });
    });

    musicAudio.addEventListener("play", updateControls);
    musicAudio.addEventListener("playing", () => {
        musicStatus.textContent = `Playing ${selectedItem.dataset.title}`;
        updateControls();
    });
    musicAudio.addEventListener("pause", () => {
        if (!musicAudio.ended && !musicAudio.error) {
            musicStatus.textContent = musicAudio.currentTime === 0
                ? "Stopped. Choose a song or press play."
                : `Paused · ${selectedItem.dataset.title}`;
        }
        updateControls();
    });
    musicAudio.addEventListener("waiting", () => {
        if (!musicAudio.paused) musicStatus.textContent = `Loading ${selectedItem.dataset.title}…`;
    });
    musicAudio.addEventListener("ended", () => {
        musicStatus.textContent = "Clip finished. Play it again or choose another song.";
        updateControls();
    });
    musicAudio.addEventListener("error", () => {
        musicStatus.textContent = "This clip couldn't be loaded. Try another song.";
        updateControls();
    });
    musicAudio.addEventListener("timeupdate", () => {
        musicStop.disabled = musicAudio.paused && musicAudio.currentTime === 0;
    });
    musicStop.addEventListener("click", () => {
        ++playRequest;
        musicAudio.pause();
        musicAudio.currentTime = 0;
        musicStatus.textContent = "Stopped. Choose a song or press play.";
        updateControls();
    });
    window.addEventListener("pagehide", () => {
        ++playRequest;
        musicAudio.pause();
    });
    updateControls();
}
