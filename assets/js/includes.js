async function includeHTML(id, file) {
    const element = document.getElementById(id);

    if (!element) {
        return;
    }

    try {
        const response = await fetch(file, { cache: "no-cache" });

        if (!response.ok) {
            throw new Error(`${file} returned ${response.status}`);
        }

        element.innerHTML = await response.text();

        if (id === "site-header") {
            setActiveNav();
            initMobileNav();
        }
    } catch (error) {
        console.error(`Could not load ${file}:`, error);
        element.innerHTML = id === "site-header"
            ? '<a class="component-fallback" href="/">djfox11.dev</a>'
            : '<p class="component-error">Site footer unavailable.</p>';
    }
}

function setActiveNav() {
    const path = window.location.pathname.replace(/index\.html$/, "");

    document.querySelectorAll(".nav a").forEach((link) => {
        const href = link.getAttribute("href");

        if (
            href === "/" && path === "/" ||
            href !== "/" && path.startsWith(href)
        ) {
            link.classList.add("active");
            link.setAttribute("aria-current", "page");
        }
    });
}

function initMobileNav() {
    const header = document.querySelector(".site-header");
    const toggle = document.querySelector(".nav-toggle");
    const nav = document.querySelector(".nav");
    const navList = nav?.querySelector("ul");
    const navLinks = document.querySelectorAll(".nav a");
    const mobileQuery = window.matchMedia("(max-width: 980px)");
    let hideLinksTimer;

    if (!header || !toggle || !nav || !navList) {
        return;
    }

    navList.classList.add("t-stagger");
    navLinks.forEach((link, index) => {
        link.classList.add("t-stagger-line");
        link.style.setProperty("--motion-order", index);
    });

    function showLinks() {
        window.clearTimeout(hideLinksTimer);
        navList.classList.remove("is-hiding", "is-shown");
        void navList.offsetHeight;
        navList.classList.add("is-shown");
    }

    function hideLinks() {
        navList.classList.add("is-hiding");
        navList.classList.remove("is-shown");
        hideLinksTimer = window.setTimeout(() => {
            navList.classList.remove("is-hiding");
        }, 200);
    }

    function closeNav() {
        header.classList.remove("is-nav-open");
        document.body.classList.remove("is-nav-open");
        nav.dataset.open = mobileQuery.matches ? "false" : "true";
        nav.toggleAttribute("inert", mobileQuery.matches);
        nav.setAttribute("aria-hidden", String(mobileQuery.matches));
        hideLinks();

        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", "Open navigation menu");
    }

    function openNav() {
        header.classList.add("is-nav-open");
        document.body.classList.add("is-nav-open");
        nav.dataset.open = "true";
        nav.removeAttribute("inert");
        nav.setAttribute("aria-hidden", "false");
        showLinks();

        toggle.setAttribute("aria-expanded", "true");
        toggle.setAttribute("aria-label", "Close navigation menu");
    }

    toggle.addEventListener("click", () => {
        const isOpen = header.classList.contains("is-nav-open");

        if (isOpen) {
            closeNav();
        } else {
            openNav();
        }
    });

    navLinks.forEach((link) => {
        link.addEventListener("click", closeNav);
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && header.classList.contains("is-nav-open")) {
            closeNav();
            toggle.focus();
        }
        if (event.key === "Tab" && header.classList.contains("is-nav-open")) {
            const lastLink = navLinks[navLinks.length - 1];
            if (event.shiftKey && document.activeElement === toggle) {
                event.preventDefault();
                lastLink.focus();
            } else if (!event.shiftKey && document.activeElement === lastLink) {
                event.preventDefault();
                toggle.focus();
            }
        }
    });

    mobileQuery.addEventListener("change", () => {
        if (mobileQuery.matches) {
            closeNav();
        } else {
            header.classList.remove("is-nav-open");
            document.body.classList.remove("is-nav-open");
            nav.dataset.open = "true";
            nav.removeAttribute("inert");
            nav.removeAttribute("aria-hidden");
            navList.classList.remove("is-hiding");
            navList.classList.add("is-shown");
        }
    });

    if (mobileQuery.matches) {
        closeNav();
    } else {
        nav.dataset.open = "true";
        navList.classList.add("is-shown");
    }
}

const siteReduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function prepareStaggerGroup(group) {
    group.classList.add("t-stagger");

    Array.from(group.children).forEach((item, index) => {
        item.classList.add("t-stagger-line");
        item.style.setProperty("--motion-order", index);
    });
}

function initialiseMotionReveals() {
    document.querySelectorAll("[data-motion-stagger]").forEach(prepareStaggerGroup);

    document.querySelectorAll("[data-motion-cards]").forEach((container) => {
        Array.from(container.querySelectorAll(":scope > .badge-card")).forEach((card, index) => {
            const cardContent = card.querySelector(":scope > .badge-card-link");

            card.classList.add("t-stagger");
            card.dataset.motionReveal = "";

            if (cardContent) {
                cardContent.classList.add("t-stagger-line");
                cardContent.style.setProperty("--motion-order", index % 2);
            }
        });
    });

    const revealItems = Array.from(document.querySelectorAll("[data-motion-reveal]"));

    if (siteReduceMotion.matches || !("IntersectionObserver" in window)) {
        revealItems.forEach((item) => item.classList.add("is-shown"));
        return;
    }

    const revealObserver = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) {
                    return;
                }

                entry.target.classList.remove("is-shown");
                void entry.target.offsetHeight;
                entry.target.classList.add("is-shown");
                revealObserver.unobserve(entry.target);
            });
        },
        {
            rootMargin: "0px 0px -8%",
            threshold: 0.12,
        }
    );

    revealItems.forEach((item) => revealObserver.observe(item));
}

function initialiseTiltCards() {
    document.querySelectorAll(".t-tilt").forEach((tilt) => {
        const card = tilt.querySelector(".t-tilt-card");

        if (!card) {
            return;
        }

        const maxTilt = 6;

        function reset() {
            tilt.classList.remove("is-hover");
            card.classList.remove("is-tilting");
            card.style.setProperty("--tilt-rx", "0deg");
            card.style.setProperty("--tilt-ry", "0deg");
        }

        function track(event) {
            if (siteReduceMotion.matches) {
                return;
            }

            const bounds = tilt.getBoundingClientRect();
            const pointerX = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
            const pointerY = Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height));

            tilt.classList.add("is-hover");
            card.classList.add("is-tilting");
            card.style.setProperty("--tilt-ry", `${((pointerX - 0.5) * maxTilt).toFixed(2)}deg`);
            card.style.setProperty("--tilt-rx", `${((0.5 - pointerY) * maxTilt).toFixed(2)}deg`);
            card.style.setProperty("--tilt-gx", `${(pointerX * 100).toFixed(1)}%`);
            card.style.setProperty("--tilt-gy", `${(pointerY * 100).toFixed(1)}%`);
        }

        tilt.addEventListener("pointerdown", (event) => {
            if (event.pointerType !== "mouse") {
                try {
                    tilt.setPointerCapture(event.pointerId);
                } catch (_) {
                    // Pointer capture is an enhancement; tracking still works without it.
                }
            }
        });
        tilt.addEventListener("pointermove", track);
        tilt.addEventListener("pointerup", reset);
        tilt.addEventListener("pointercancel", reset);
        tilt.addEventListener("pointerleave", (event) => {
            if (event.pointerType === "mouse") {
                reset();
            }
        });
    });
}

function initialiseSiteMotion() {
    initialiseMotionReveals();
    initialiseTiltCards();
}

includeHTML("site-header", "/assets/components/header.html");
includeHTML("site-footer", "/assets/components/footer.html");
initialiseSiteMotion();

console.warn("Legacy archive still mounted at /archive/")
