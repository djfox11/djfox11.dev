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

const numberFormatter = new Intl.NumberFormat("en-AU");
const dateFormatter = new Intl.DateTimeFormat("en-AU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Australia/Sydney",
});

function assertTmrData(data) {
    if (!data || !Number.isInteger(data.totalAssets) || data.totalAssets <= 0) {
        throw new TypeError("Invalid total asset count");
    }

    if (!Array.isArray(data.platforms) || data.platforms.length === 0) {
        throw new TypeError("Missing platform totals");
    }

    const platformTotal = data.platforms.reduce((total, platform) => {
        if (!platform.name || !Number.isInteger(platform.count) || platform.count < 0) {
            throw new TypeError("Invalid platform entry");
        }
        return total + platform.count;
    }, 0);

    if (platformTotal !== data.totalAssets) {
        throw new TypeError("Platform totals do not match the overall total");
    }

    if (!Array.isArray(data.largestContributions) || data.largestContributions.length < 3) {
        throw new TypeError("Missing largest contributions");
    }

    if (!Array.isArray(data.popularAssets) || data.popularAssets.length < 5) {
        throw new TypeError("Missing popular assets");
    }

    if (Number.isNaN(Date.parse(data.fetchedAt)) || Number.isNaN(Date.parse(data.registered))) {
        throw new TypeError("Invalid TMR dates");
    }
}

function replaceText(selector, value) {
    const element = document.querySelector(selector);
    if (element) {
        element.textContent = value;
    }
}

function renderPlatforms(platforms, totalAssets) {
    const container = document.querySelector("[data-tmr-platforms]");
    if (!container) {
        return;
    }

    const fragment = document.createDocumentFragment();
    platforms.forEach((platform) => {
        const row = document.createElement("div");
        row.className = "tmr-ledger-row";
        row.style.setProperty("--share", `${(platform.count / totalAssets) * 100}%`);

        const label = document.createElement("span");
        label.textContent = platform.name;

        const bar = document.createElement("i");
        bar.setAttribute("aria-hidden", "true");

        const count = document.createElement("strong");
        count.textContent = numberFormatter.format(platform.count);

        row.append(label, bar, count);
        fragment.append(row);
    });

    container.replaceChildren(fragment);
}

function renderContributions(contributions) {
    const container = document.querySelector("[data-tmr-contributions]");
    if (!container) {
        return;
    }

    const fragment = document.createDocumentFragment();
    contributions.slice(0, 3).forEach((contribution, index) => {
        const item = document.createElement("li");
        const rank = document.createElement("span");
        const game = document.createElement("h3");
        const count = document.createElement("strong");

        rank.textContent = String(index + 1).padStart(2, "0");
        game.textContent = contribution.game;
        count.textContent = `${numberFormatter.format(contribution.count)} assets`;

        item.append(rank, game, count);
        fragment.append(item);
    });

    container.replaceChildren(fragment);
}

function renderPopularAssets(assets) {
    const tableBody = document.querySelector("[data-tmr-popular]");
    if (!tableBody) {
        return;
    }

    const fragment = document.createDocumentFragment();
    assets.slice(0, 5).forEach((asset, index) => {
        const row = document.createElement("tr");
        const rank = document.createElement("td");
        const name = document.createElement("th");
        const game = document.createElement("td");
        const hits = document.createElement("td");

        rank.textContent = String(index + 1).padStart(2, "0");
        name.scope = "row";
        name.textContent = asset.name;
        game.textContent = asset.game;
        hits.textContent = numberFormatter.format(asset.hits);

        row.append(rank, name, game, hits);
        fragment.append(row);
    });

    tableBody.replaceChildren(fragment);
}

function renderTmrData(data) {
    replaceText("[data-tmr-total]", numberFormatter.format(data.totalAssets));
    replaceText("[data-tmr-role]", data.role === "Staff" ? "Staff member" : data.role);
    replaceText("[data-tmr-registered]", dateFormatter.format(new Date(`${data.registered}T12:00:00Z`)));
    replaceText("[data-tmr-updated]", dateFormatter.format(new Date(data.fetchedAt)));
    renderPlatforms(data.platforms, data.totalAssets);
    renderContributions(data.largestContributions);
    renderPopularAssets(data.popularAssets);
}

async function loadTmrData() {
    try {
        const response = await fetch("/data/tmr.json", { cache: "no-cache" });
        if (!response.ok) {
            throw new Error(`TMR data request failed with ${response.status}`);
        }

        const data = await response.json();
        assertTmrData(data);
        renderTmrData(data);
    } catch (error) {
        console.warn("Using the embedded TMR data because the snapshot could not be loaded.", error);
    }
}

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

loadTmrData();
