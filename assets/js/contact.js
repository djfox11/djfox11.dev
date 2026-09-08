console.log("contact.js loaded");

const form = document.getElementById("contact-form");
const submitButton = document.querySelector(".contact-submit");

const nameInput = document.getElementById("name");
const reasonInput = document.getElementById("reason");
const subjectInput = document.getElementById("email-subject");
const pageUrlInput = document.getElementById("page-url");

let toastTimeout;

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

function closeAllCustomSelects() {
    document.querySelectorAll(".custom-select.is-open").forEach((select) => {
        select.classList.remove("is-open");

        const button = select.querySelector(".custom-select-button");

        if (button) {
            button.setAttribute("aria-expanded", "false");
        }
    });
}

function resetCustomSelect() {
    if (reasonInput) {
        reasonInput.value = "";
    }

    const selectedText = document.querySelector("[data-selected-text]");

    if (selectedText) {
        selectedText.textContent = "Choose a topic";
    }

    document.querySelectorAll(".custom-select-menu [role='option']").forEach((option) => {
        option.classList.remove("is-selected");
        option.setAttribute("aria-selected", "false");
    });

    closeAllCustomSelects();
}

document.querySelectorAll("[data-custom-select]").forEach((select) => {
    const button = select.querySelector(".custom-select-button");
    const selectedText = select.querySelector("[data-selected-text]");
    const hiddenInput = select.querySelector("input[type='hidden']");
    const options = Array.from(select.querySelectorAll("[role='option']"));

    if (!button || !selectedText || !hiddenInput || options.length === 0) {
        return;
    }

    function closeSelect() {
        select.classList.remove("is-open");
        button.setAttribute("aria-expanded", "false");
    }

    function openSelect() {
        select.classList.add("is-open");
        button.setAttribute("aria-expanded", "true");
    }

    function selectOption(option) {
        hiddenInput.value = option.dataset.value || option.textContent.trim();
        selectedText.textContent = option.textContent.trim();

        options.forEach((item) => {
            item.classList.remove("is-selected");
            item.setAttribute("aria-selected", "false");
        });

        option.classList.add("is-selected");
        option.setAttribute("aria-selected", "true");

        closeSelect();
    }

    button.addEventListener("click", (event) => {
        event.stopPropagation();

        const isOpen = select.classList.contains("is-open");

        closeAllCustomSelects();

        if (!isOpen) {
            openSelect();
        }
    });

    options.forEach((option) => {
        option.addEventListener("click", (event) => {
            event.stopPropagation();
            selectOption(option);
        });
    });

    document.addEventListener("click", (event) => {
        if (!select.contains(event.target)) {
            closeSelect();
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeSelect();
        }
    });
});

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
                resetCustomSelect();
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