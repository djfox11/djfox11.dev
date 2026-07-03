async function includeHTML(id, file) {
    const element = document.getElementById(id);

    if (!element) {
        return;
    }

    const response = await fetch(file);
    element.innerHTML = await response.text();

    if (id === "site-header") {
        setActiveNav();
        initMobileNav();
    }
}

function setActiveNav() {
    const path = window.location.pathname;

    document.querySelectorAll(".nav a").forEach((link) => {
        const href = link.getAttribute("href");

        if (
            href === "/" && path === "/" ||
            href !== "/" && path.startsWith(href)
        ) {
            link.classList.add("active");
        }
    });
}

function initMobileNav() {
    const header = document.querySelector(".site-header");
    const toggle = document.querySelector(".nav-toggle");
    const navLinks = document.querySelectorAll(".nav a");

    if (!header || !toggle) {
        return;
    }

    function closeNav() {
        header.classList.remove("is-nav-open");
        document.body.classList.remove("is-nav-open");

        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", "Open navigation menu");
    }

    function openNav() {
        header.classList.add("is-nav-open");
        document.body.classList.add("is-nav-open");

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
        if (event.key === "Escape") {
            closeNav();
        }
    });

    window.addEventListener("resize", () => {
        if (window.innerWidth > 820) {
            closeNav();
        }
    });
}

includeHTML("site-header", "/assets/components/header.html");
includeHTML("site-footer", "/assets/components/footer.html");