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

if (
    musicAudio &&
    musicStatus &&
    musicToggle &&
    musicProgress &&
    musicProgressFill &&
    musicCurrentTime &&
    musicDuration &&
    musicPlayer &&
    musicDisplay &&
    musicItems.length
) {
    let selectedItem =
        musicItems.find((item) => item.classList.contains("is-active")) ||
        musicItems[0];

    let playRequest = 0;
    let coverChangeTimeout;
    let coverChangeRequest = 0;

    // ---------------------------------------------------------
    // AUDIO SETTINGS
    // ---------------------------------------------------------

    const TRACK_SWITCH_DELAY_MS = 250;

    /*
        Loudness correction based on measured integrated LUFS.

        Target: -10.83 LUFS (the quietest clip)

        Nothing is boosted above its original level.
        Louder tracks are simply attenuated during playback.
    */
    const trackGainDb = {
        "apocalypsis-noctis.mp3": -4.51,
        "find-the-flame.mp3": -2.53,
        "hollow.mp3": -4.00,
        "jenova-emergence.mp3": -2.36,
        "one-winged-angel-rebirth.mp3": -2.79,
        "press-start.mp3": -0.15,
        "rainbow-road.mp3": -0.69,
        "staff-roll.mp3": 0
    };

    function dbToVolume(db) {
        return Math.pow(10, db / 20);
    }

    function getTrackFilename(item) {
        const audioPath = item.dataset.audio || "";

        // Remove query strings if present, then grab filename.
        return audioPath
            .split("?")[0]
            .split("/")
            .pop();
    }

    function getTrackVolume(item) {
        const filename = getTrackFilename(item);
        const gainDb = trackGainDb[filename] ?? 0;

        return dbToVolume(gainDb);
    }

    function updatePlaybackVolume() {
        musicAudio.volume = getTrackVolume(selectedItem);
    }

    // ---------------------------------------------------------
    // TIME / TIMELINE
    // ---------------------------------------------------------

    function formatTime(seconds) {
        if (!Number.isFinite(seconds)) return "0:00";

        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60)
            .toString()
            .padStart(2, "0");

        return `${minutes}:${remainingSeconds}`;
    }

    function updateTimeline() {
        const duration = Number.isFinite(musicAudio.duration)
            ? musicAudio.duration
            : 0;

        const currentTime = Number.isFinite(musicAudio.currentTime)
            ? musicAudio.currentTime
            : 0;

        const progress = duration
            ? (currentTime / duration) * 100
            : 0;

        musicProgressFill.style.width = `${progress}%`;

        musicProgress.setAttribute(
            "aria-valuenow",
            String(Math.round(progress))
        );

        musicProgress.setAttribute(
            "aria-valuetext",
            `${formatTime(currentTime)} of ${formatTime(duration)}`
        );

        musicCurrentTime.textContent = formatTime(currentTime);
        musicDuration.textContent = formatTime(duration);
    }

    // ---------------------------------------------------------
    // COVER TRANSITION
    // ---------------------------------------------------------

    function changeCover(item) {
        const request = ++coverChangeRequest;

        window.clearTimeout(coverChangeTimeout);
        musicDisplay.classList.add("is-changing");

        coverChangeTimeout = window.setTimeout(() => {
            const revealCover = () => {
                if (request !== coverChangeRequest) return;

                requestAnimationFrame(() => {
                    musicDisplay.classList.remove("is-changing");
                });
            };

            musicCover.addEventListener(
                "load",
                revealCover,
                { once: true }
            );

            musicCover.src = item.dataset.cover;
            musicCover.alt = `${item.dataset.source} cover art`;

            if (musicCover.complete) {
                revealCover();
            }
        }, 180);
    }

    // ---------------------------------------------------------
    // PLAYER CONTROLS
    // ---------------------------------------------------------

    function updateControls() {
        const playing =
            !musicAudio.paused &&
            !musicAudio.ended;

        musicPlayer.classList.toggle(
            "is-playing",
            playing
        );

        musicToggle.setAttribute(
            "aria-label",
            `${playing ? "Pause" : "Play"} ${selectedItem.dataset.title} clip`
        );

        musicToggle.setAttribute(
            "aria-pressed",
            String(playing)
        );

        musicItems.forEach((item) => {
            const selected = item === selectedItem;
            const isPlaying = selected && playing;

            item.classList.toggle(
                "is-active",
                selected
            );

            item.classList.toggle(
                "is-playing",
                isPlaying
            );

            item.setAttribute(
                "aria-pressed",
                String(isPlaying)
            );

            item.setAttribute(
                "aria-label",
                `${isPlaying ? "Pause" : "Play"} ${item.dataset.title} clip`
            );
        });
    }

    // ---------------------------------------------------------
    // PLAYBACK
    // ---------------------------------------------------------

    async function playClip(delayMs = 0) {
        const request = ++playRequest;

        if (delayMs) {
            musicStatus.textContent =
                `Selected ${selectedItem.dataset.title}`;

            await new Promise((resolve) => {
                window.setTimeout(resolve, delayMs);
            });

            if (request !== playRequest) return;
        }

        musicStatus.textContent =
            `Loading ${selectedItem.dataset.title}…`;

        updatePlaybackVolume();

        try {
            await musicAudio.play();

            if (request !== playRequest) return;
        } catch (error) {
            /*
                A newer selection or a pause can cancel a pending
                playback request.
            */
            if (
                request !== playRequest ||
                error.name === "AbortError"
            ) {
                return;
            }

            console.error(
                "Could not play the selected music clip:",
                error
            );

            musicStatus.textContent =
                error.name === "NotAllowedError"
                    ? "Playback was blocked. Try the player's play button."
                    : "This clip couldn't be played. Try another song.";

            updateControls();
        }
    }

    // ---------------------------------------------------------
    // SONG SELECTION
    // ---------------------------------------------------------

    musicItems.forEach((item) => {
        item.addEventListener("click", () => {
            // Clicking the currently selected item toggles play/pause.
            if (item === selectedItem) {
                if (
                    !musicAudio.paused &&
                    !musicAudio.ended
                ) {
                    ++playRequest;
                    musicAudio.pause();
                } else {
                    if (musicAudio.ended) {
                        musicAudio.currentTime = 0;
                    }

                    playClip();
                }

                return;
            }

            // Stop previous song.
            ++playRequest;

            musicAudio.pause();

            // Select new song.
            selectedItem = item;

            musicAudio.src = item.dataset.audio;

            musicAudio.setAttribute(
                "aria-label",
                `${item.dataset.title} audio clip`
            );

            updatePlaybackVolume();

            changeCover(item);

            musicTitle.textContent =
                item.dataset.title;

            musicSource.textContent =
                item.dataset.source;

            updateTimeline();
            updateControls();

            playClip(TRACK_SWITCH_DELAY_MS);
        });
    });

    // ---------------------------------------------------------
    // MAIN PLAY / PAUSE BUTTON
    // ---------------------------------------------------------

    musicToggle.addEventListener("click", () => {
        if (
            !musicAudio.paused &&
            !musicAudio.ended
        ) {
            ++playRequest;
            musicAudio.pause();
        } else {
            if (musicAudio.ended) {
                musicAudio.currentTime = 0;
            }

            playClip();
        }
    });

    // ---------------------------------------------------------
    // AUDIO EVENTS
    // ---------------------------------------------------------

    musicAudio.addEventListener("play", () => {
        updateControls();
    });

    musicAudio.addEventListener(
        "loadedmetadata",
        () => {
            updateTimeline();
            updatePlaybackVolume();
        }
    );

    musicAudio.addEventListener(
        "durationchange",
        () => {
            updateTimeline();
            updatePlaybackVolume();
        }
    );

    musicAudio.addEventListener("playing", () => {
        musicStatus.textContent =
            `Playing ${selectedItem.dataset.title}`;

        updateControls();
    });

    musicAudio.addEventListener("pause", () => {
        if (
            !musicAudio.ended &&
            !musicAudio.error
        ) {
            musicStatus.textContent =
                musicAudio.currentTime === 0
                    ? "Stopped. Choose a song or press play."
                    : `Paused · ${selectedItem.dataset.title}`;
        }

        updateControls();
    });

    musicAudio.addEventListener("ended", () => {
        updateControls();

        const currentIndex = musicItems.indexOf(selectedItem);
        const nextItem = musicItems[currentIndex + 1];

        if (nextItem) {
            nextItem.click();
        } else {
            musicStatus.textContent =
                "Playlist finished. Choose a song to listen again.";
        }
    });

    musicAudio.addEventListener("waiting", () => {
        if (!musicAudio.paused) {
            musicStatus.textContent =
                `Loading ${selectedItem.dataset.title}…`;
        }
    });

    musicAudio.addEventListener("error", () => {
        musicStatus.textContent =
            "This clip couldn't be loaded. Try another song.";

        updateControls();
    });

    musicAudio.addEventListener(
        "timeupdate",
        updateTimeline
    );

    // ---------------------------------------------------------
    // PAGE CLEANUP
    // ---------------------------------------------------------

    window.addEventListener("pagehide", () => {
        ++playRequest;

        musicAudio.pause();
    });

    // ---------------------------------------------------------
    // INITIAL STATE
    // ---------------------------------------------------------

    updatePlaybackVolume();
    updateTimeline();
    updateControls();
}
