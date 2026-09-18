const form = document.getElementById("contact-form");
const submitButton = document.querySelector(".contact-submit");

const nameInput = document.getElementById("name");
const reasonInput = document.getElementById("reason");
const subjectInput = document.getElementById("email-subject");
const pageUrlInput = document.getElementById("page-url");

let toastTimeout;

function initialiseReasonSelect() {
    const select = document.querySelector("[data-custom-select]");

    if (!select || !reasonInput) {
        return;
    }

    const button = select.querySelector(".custom-select-button");
    const menu = select.querySelector(".custom-select-menu");
    const selectedText = select.querySelector("[data-selected-text]");
    const options = Array.from(select.querySelectorAll("[role='option']"));
    const desktopQuery = window.matchMedia("(min-width: 981px)");
    const closeMs = parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue("--dropdown-close-dur")
    ) || 150;
    let highlightedIndex = -1;
    let closeTimer;

    if (!button || !menu || !selectedText || options.length === 0) {
        return;
    }

    select.classList.add("has-custom-select");

    function isOpen() {
        return select.classList.contains("is-open");
    }

    function setHighlightedOption(index) {
        highlightedIndex = (index + options.length) % options.length;

        options.forEach((option, optionIndex) => {
            option.classList.toggle("is-highlighted", optionIndex === highlightedIndex);
        });

        button.setAttribute("aria-activedescendant", options[highlightedIndex].id);
    }

    function openSelect(preferredIndex = 0) {
        clearTimeout(closeTimer);
        select.classList.remove("is-closing");
        select.classList.add("is-open");
        menu.classList.remove("is-closing");
        menu.classList.add("is-open");
        menu.setAttribute("aria-hidden", "false");
        button.setAttribute("aria-expanded", "true");

        const selectedIndex = options.findIndex((option) => option.classList.contains("is-selected"));
        setHighlightedOption(selectedIndex >= 0 ? selectedIndex : preferredIndex);
    }

    function closeSelect({ returnFocus = false } = {}) {
        if (!isOpen()) {
            return;
        }

        select.classList.remove("is-open");
        select.classList.add("is-closing");
        menu.classList.remove("is-open");
        menu.classList.add("is-closing");
        menu.setAttribute("aria-hidden", "true");
        button.setAttribute("aria-expanded", "false");
        button.removeAttribute("aria-activedescendant");
        options.forEach((option) => option.classList.remove("is-highlighted"));

        closeTimer = setTimeout(() => {
            select.classList.remove("is-closing");
            menu.classList.remove("is-closing");
        }, closeMs);

        if (returnFocus) {
            button.focus();
        }
    }

    function selectOption(option) {
        reasonInput.value = option.dataset.value || option.textContent.trim();
        selectedText.textContent = option.textContent.trim();

        options.forEach((item) => {
            const isSelected = item === option;
            item.classList.toggle("is-selected", isSelected);
            item.setAttribute("aria-selected", String(isSelected));
        });

        closeSelect({ returnFocus: true });
    }

    function resetCustomSelect() {
        selectedText.textContent = "Choose a topic";
        highlightedIndex = -1;
        options.forEach((option) => {
            option.classList.remove("is-selected", "is-highlighted");
            option.setAttribute("aria-selected", "false");
        });
        closeSelect();
    }

    function setInputMode() {
        const useCustomSelect = desktopQuery.matches;

        reasonInput.required = !useCustomSelect;
        button.tabIndex = useCustomSelect ? 0 : -1;

        if (!useCustomSelect) {
            closeSelect();
        }
    }

    button.addEventListener("click", () => {
        if (isOpen()) {
            closeSelect();
        } else {
            openSelect();
        }
    });

    button.addEventListener("keydown", (event) => {
        if (["ArrowDown", "ArrowUp", "Home", "End", "Enter", " ", "Escape"].includes(event.key)) {
            event.preventDefault();
        }

        if (event.key === "Escape") {
            closeSelect({ returnFocus: true });
            return;
        }

        if (!isOpen()) {
            if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
                openSelect(event.key === "ArrowUp" ? options.length - 1 : 0);
            }
            return;
        }

        if (event.key === "ArrowDown") {
            setHighlightedOption(highlightedIndex + 1);
        } else if (event.key === "ArrowUp") {
            setHighlightedOption(highlightedIndex - 1);
        } else if (event.key === "Home") {
            setHighlightedOption(0);
        } else if (event.key === "End") {
            setHighlightedOption(options.length - 1);
        } else if (event.key === "Enter" || event.key === " ") {
            selectOption(options[highlightedIndex]);
        }
    });

    options.forEach((option, index) => {
        option.addEventListener("pointermove", () => setHighlightedOption(index));
        option.addEventListener("click", () => selectOption(option));
    });

    document.addEventListener("pointerdown", (event) => {
        if (!select.contains(event.target)) {
            closeSelect();
        }
    });

    form?.addEventListener("reset", () => queueMicrotask(resetCustomSelect));
    desktopQuery.addEventListener("change", setInputMode);
    setInputMode();
}

initialiseReasonSelect();

document.addEventListener("keydown", (event) => {
    if (event.key === "Tab") {
        form?.classList.add("is-keyboard-nav");
    }
});

document.addEventListener("pointerdown", () => {
    form?.classList.remove("is-keyboard-nav");
});

function showToast(message, type = "info", duration = 4000) {
    const toast = document.getElementById("toast");

    if (!toast) {
        alert(message);
        return;
    }

    clearTimeout(toastTimeout);

    toast.textContent = message;
    toast.className = `toast is-visible is-${type}`;

    if (duration > 0) {
        toastTimeout = setTimeout(() => {
            toast.classList.remove("is-visible");
        }, duration);
    }
}

if (pageUrlInput) {
    pageUrlInput.value = window.location.href;
}

if (form) {
    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (!reasonInput || !reasonInput.value) {
            showToast("Please choose a topic before sending your message.", "error");
            return;
        }

        showToast("Sending your message...", "info", 0);

        if (submitButton) {
            submitButton.disabled = true;
        }

        const senderName = nameInput?.value.trim() || "Someone";
        const reason = reasonInput.value || "General enquiry";

        if (subjectInput) {
            subjectInput.value = `📬 djfox11.com: ${reason} from ${senderName}`;
        }

        if (pageUrlInput) {
            pageUrlInput.value = window.location.href;
        }

        const formData = new FormData(form);

        try {
            const response = await fetch("https://api.web3forms.com/submit", {
                method: "POST",
                body: formData,
            });

            const data = await response.json();

            if (data.success) {
                showToast("Thanks! Your message has been sent.", "success");
                form.reset();
            } else {
                showToast(data.message || "Your message didn't go through. Please try again.", "error");
            }
        } catch (error) {
            console.error(error);
            showToast("Your message didn't go through. Please try again later, or email me instead.", "error");
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
            }
        }
    });
}
