const musicItems = Array.from(document.querySelectorAll(".music-item"));
const musicCover = document.getElementById("music-cover");
const musicTitle = document.getElementById("music-title");
const musicSource = document.getElementById("music-source");
const musicAudio = document.getElementById("music-audio");
const musicStatus = document.getElementById("music-status");
const musicToggle = document.getElementById("music-toggle");
const musicProgress = document.getElementById("music-progress");
const musicProgressFill = document.getElementById("music-progress-fill");
const musicCurrentTime = document.getElementById("music-current-time");
const musicDuration = document.getElementById("music-duration");
const musicPlayer = document.querySelector(".music-player");
const musicDisplay = document.querySelector(".music-display");

if (musicAudio && musicStatus && musicToggle && musicProgress && musicProgressFill && musicCurrentTime && musicDuration && musicPlayer && musicDisplay && musicItems.length) {
    let selectedItem = musicItems.find((item) => item.classList.contains("is-active")) || musicItems[0];
    let playRequest = 0;
    let coverChangeTimeout;
    let coverChangeRequest = 0;

    function formatTime(seconds) {
        if (!Number.isFinite(seconds)) return "0:00";
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60).toString().padStart(2, "0");
        return `${minutes}:${remainingSeconds}`;
    }

    function updateTimeline() {
        const duration = Number.isFinite(musicAudio.duration) ? musicAudio.duration : 0;
        const currentTime = Number.isFinite(musicAudio.currentTime) ? musicAudio.currentTime : 0;
        const progress = duration ? (currentTime / duration) * 100 : 0;

        musicProgressFill.style.width = `${progress}%`;
        musicProgress.setAttribute("aria-valuenow", String(Math.round(progress)));
        musicProgress.setAttribute("aria-valuetext", `${formatTime(currentTime)} of ${formatTime(duration)}`);
        musicCurrentTime.textContent = formatTime(currentTime);
        musicDuration.textContent = formatTime(duration);
    }

    function changeCover(item) {
        const request = ++coverChangeRequest;
        window.clearTimeout(coverChangeTimeout);
        musicDisplay.classList.add("is-changing");

        coverChangeTimeout = window.setTimeout(() => {
            const revealCover = () => {
                if (request !== coverChangeRequest) return;
                requestAnimationFrame(() => musicDisplay.classList.remove("is-changing"));
            };

            musicCover.addEventListener("load", revealCover, { once: true });
            musicCover.src = item.dataset.cover;
            musicCover.alt = `${item.dataset.source} cover art`;
            if (musicCover.complete) revealCover();
        }, 180);
    }

    function updateControls() {
        const playing = !musicAudio.paused && !musicAudio.ended;
        musicPlayer.classList.toggle("is-playing", playing);
        musicToggle.setAttribute("aria-label", `${playing ? "Pause" : "Play"} ${selectedItem.dataset.title} clip`);
        musicToggle.setAttribute("aria-pressed", String(playing));
        musicItems.forEach((item) => {
            const selected = item === selectedItem;
            const isPlaying = selected && playing;
            item.classList.toggle("is-active", selected);
            item.classList.toggle("is-playing", isPlaying);
            item.setAttribute("aria-pressed", String(isPlaying));
            item.setAttribute("aria-label", `${isPlaying ? "Pause" : "Play"} ${item.dataset.title} clip`);
        });
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
            changeCover(item);
            musicTitle.textContent = item.dataset.title;
            musicSource.textContent = item.dataset.source;
            updateTimeline();
            updateControls();
            playClip();
        });
    });

    musicToggle.addEventListener("click", () => {
        if (!musicAudio.paused && !musicAudio.ended) {
            ++playRequest;
            musicAudio.pause();
        } else {
            if (musicAudio.ended) musicAudio.currentTime = 0;
            playClip();
        }
    });

    musicAudio.addEventListener("play", updateControls);
    musicAudio.addEventListener("loadedmetadata", updateTimeline);
    musicAudio.addEventListener("durationchange", updateTimeline);
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
    musicAudio.addEventListener("error", () => {
        musicStatus.textContent = "This clip couldn't be loaded. Try another song.";
        updateControls();
    });
    musicAudio.addEventListener("timeupdate", updateTimeline);
    window.addEventListener("pagehide", () => {
        ++playRequest;
        musicAudio.pause();
    });
    updateTimeline();
    updateControls();
}
