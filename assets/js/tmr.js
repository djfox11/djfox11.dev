const headerMount = document.getElementById("site-header");

function markTmrNavigationActive() {
    const tmrLink = document.querySelector('.nav a[href="/tmr/"]');

    if (!tmrLink) {
        return false;
    }

    document.querySelectorAll(".nav a").forEach((link) => {
        link.classList.remove("active");
        link.removeAttribute("aria-current");
    });

    tmrLink.classList.add("active");
    tmrLink.setAttribute("aria-current", "page");
    return true;
}

if (!markTmrNavigationActive() && headerMount) {
    const headerObserver = new MutationObserver(() => {
        if (markTmrNavigationActive()) {
            headerObserver.disconnect();
        }
    });

    headerObserver.observe(headerMount, { childList: true });
}

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const revealItems = document.querySelectorAll("[data-reveal]");

if (!reduceMotion.matches && "IntersectionObserver" in window) {
    document.documentElement.classList.add("js-ready");

    const revealObserver = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) {
                    return;
                }

                entry.target.classList.add("is-visible");
                revealObserver.unobserve(entry.target);
            });
        },
        {
            rootMargin: "0px 0px -8%",
            threshold: 0.12,
        }
    );

    revealItems.forEach((item) => revealObserver.observe(item));
} else {
    revealItems.forEach((item) => item.classList.add("is-visible"));
}
