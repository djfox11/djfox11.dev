const form = document.getElementById("contact-form");
const submitButton = document.querySelector(".contact-submit");

const nameInput = document.getElementById("name");
const reasonInput = document.getElementById("reason");
const subjectInput = document.getElementById("email-subject");
const pageUrlInput = document.getElementById("page-url");

let toastTimeout;

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
