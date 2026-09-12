"""Refresh the site's TMR statistics through a visible browser session."""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import sys
from typing import Any
from urllib.parse import urlparse


PROFILE_URL = "https://models.spriters-resource.com/profile/djfox11/"
TMR_HOST = "models.spriters-resource.com"
DEFAULT_OUTPUT = Path(__file__).resolve().parents[1] / "data" / "tmr.json"

EXTRACT_PROFILE_SCRIPT = r"""
return (() => {
    const parseNumber = (text) => {
        const value = Number.parseInt(String(text).replace(/[^0-9]/g, ""), 10);
        return Number.isFinite(value) ? value : null;
    };

    const tableByTitle = (title) => [...document.querySelectorAll("table")].find(
        (table) => table.querySelector("td.title")?.textContent.trim() === title
    );

    const informationTable = tableByTitle("User Information");
    const informationValue = (label) => {
        if (!informationTable) {
            return null;
        }

        for (const row of informationTable.querySelectorAll("tr")) {
            const cells = [...row.querySelectorAll(":scope > td")];
            const labelCell = cells.find((cell) => cell.textContent.trim() === label);
            if (labelCell?.nextElementSibling) {
                return labelCell.nextElementSibling.textContent.trim();
            }
        }

        return null;
    };

    const profileHeading = [...document.querySelectorAll("h1")].find(
        (heading) => heading.textContent.trim() === "djfox11"
    );
    const totalHeading = [...document.querySelectorAll("h1")].find(
        (heading) => heading.textContent.includes("All Assets")
    );

    const platforms = [...document.querySelectorAll(".asset-count")].map((countElement) => {
        const section = countElement.closest(".section");
        const name = section
            ? [...section.childNodes]
                .filter((node) => node.nodeType === Node.TEXT_NODE)
                .map((node) => node.textContent.trim())
                .filter(Boolean)
                .join(" ")
            : "";

        return {
            name,
            count: parseNumber(countElement.textContent),
        };
    });

    const contributionsTable = tableByTitle("Largest Contributions");
    const largestContributions = contributionsTable
        ? [...contributionsTable.querySelectorAll(".largest-contribution")].map((entry) => {
            const link = entry.querySelector("a.iconlink");
            return {
                game: entry.querySelector(".iconheader")?.textContent.trim() ?? "",
                count: parseNumber(entry.querySelector(":scope > div")?.textContent),
                url: link ? new URL(link.getAttribute("href"), location.origin).href : "",
            };
        })
        : [];

    const popularTable = tableByTitle("Most Popular Assets");
    const popularAssets = popularTable
        ? [...popularTable.querySelectorAll("tr:not(.rowheader)")].map((row) => {
            const cells = [...row.querySelectorAll(":scope > td")];
            const notes = cells[1]?.querySelector(".notes")?.textContent.trim() ?? "";
            const separator = notes.indexOf(" - ");
            const link = cells[1]?.querySelector("a");

            return {
                rank: parseNumber(cells[0]?.textContent),
                name: link?.textContent.trim() ?? "",
                platform: separator >= 0 ? notes.slice(0, separator).trim() : "",
                game: separator >= 0 ? notes.slice(separator + 3).trim() : notes,
                hits: parseNumber(cells[2]?.textContent),
                url: link ? new URL(link.getAttribute("href"), location.origin).href : "",
            };
        })
        : [];

    return {
        profileName: profileHeading?.textContent.trim() ?? "",
        totalAssets: parseNumber(totalHeading?.textContent),
        role: informationValue("Group"),
        registered: informationValue("Registered"),
        platforms,
        largestContributions,
        popularAssets,
    };
})();
"""


class TmrDataError(ValueError):
    """Raised when extracted TMR data is incomplete or inconsistent."""


def positive_integer(value: Any, field_name: str) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or value <= 0:
        raise TmrDataError(f"{field_name} must be a positive integer")
    return value


def non_negative_integer(value: Any, field_name: str) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or value < 0:
        raise TmrDataError(f"{field_name} must be a non-negative integer")
    return value


def tmr_url(value: Any, field_name: str) -> str:
    if not isinstance(value, str):
        raise TmrDataError(f"{field_name} must be a URL")

    parsed = urlparse(value)
    if parsed.scheme != "https" or parsed.hostname != TMR_HOST:
        raise TmrDataError(f"{field_name} must use https://{TMR_HOST}")
    return value


def normalize_capture(capture: dict[str, Any]) -> dict[str, Any]:
    if capture.get("profileName") != "djfox11":
        raise TmrDataError("The loaded page is not the djfox11 profile")

    total_assets = positive_integer(capture.get("totalAssets"), "totalAssets")
    role = capture.get("role")
    if not isinstance(role, str) or not role.strip():
        raise TmrDataError("role is missing")

    registered_text = capture.get("registered")
    if not isinstance(registered_text, str):
        raise TmrDataError("registered is missing")
    try:
        registered = datetime.strptime(registered_text, "%B %d, %Y").date().isoformat()
    except ValueError as error:
        raise TmrDataError(f"Unexpected registration date: {registered_text!r}") from error

    raw_platforms = capture.get("platforms")
    if not isinstance(raw_platforms, list) or not raw_platforms:
        raise TmrDataError("No platform totals were found")

    platforms = []
    for index, platform in enumerate(raw_platforms):
        if not isinstance(platform, dict):
            raise TmrDataError(f"platforms[{index}] must be an object")
        name = platform.get("name")
        if not isinstance(name, str) or not name.strip():
            raise TmrDataError(f"platforms[{index}].name is missing")
        platforms.append(
            {
                "name": name.strip(),
                "count": non_negative_integer(
                    platform.get("count"), f"platforms[{index}].count"
                ),
            }
        )

    platform_total = sum(platform["count"] for platform in platforms)
    if platform_total != total_assets:
        raise TmrDataError(
            f"Platform totals sum to {platform_total}, but totalAssets is {total_assets}"
        )

    raw_contributions = capture.get("largestContributions")
    if not isinstance(raw_contributions, list) or len(raw_contributions) < 3:
        raise TmrDataError("Fewer than three largest contributions were found")

    largest_contributions = []
    for index, contribution in enumerate(raw_contributions[:3]):
        if not isinstance(contribution, dict):
            raise TmrDataError(f"largestContributions[{index}] must be an object")
        game = contribution.get("game")
        if not isinstance(game, str) or not game.strip():
            raise TmrDataError(f"largestContributions[{index}].game is missing")
        largest_contributions.append(
            {
                "game": game.strip(),
                "count": positive_integer(
                    contribution.get("count"),
                    f"largestContributions[{index}].count",
                ),
                "url": tmr_url(
                    contribution.get("url"), f"largestContributions[{index}].url"
                ),
            }
        )

    raw_popular_assets = capture.get("popularAssets")
    if not isinstance(raw_popular_assets, list) or len(raw_popular_assets) < 5:
        raise TmrDataError("Fewer than five popular assets were found")

    popular_assets = []
    for index, asset in enumerate(raw_popular_assets[:5]):
        if not isinstance(asset, dict):
            raise TmrDataError(f"popularAssets[{index}] must be an object")

        text_fields: dict[str, str] = {}
        for field_name in ("name", "platform", "game"):
            value = asset.get(field_name)
            if not isinstance(value, str) or not value.strip():
                raise TmrDataError(f"popularAssets[{index}].{field_name} is missing")
            text_fields[field_name] = value.strip()

        popular_assets.append(
            {
                "rank": positive_integer(
                    asset.get("rank"), f"popularAssets[{index}].rank"
                ),
                **text_fields,
                "hits": non_negative_integer(
                    asset.get("hits"), f"popularAssets[{index}].hits"
                ),
                "url": tmr_url(asset.get("url"), f"popularAssets[{index}].url"),
            }
        )

    return {
        "source": PROFILE_URL,
        "fetchedAt": datetime.now(timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z"),
        "totalAssets": total_assets,
        "role": role.strip(),
        "registered": registered,
        "platforms": platforms,
        "largestContributions": largest_contributions,
        "popularAssets": popular_assets,
    }


def validate_snapshot(snapshot: dict[str, Any]) -> None:
    capture = {
        "profileName": "djfox11",
        "totalAssets": snapshot.get("totalAssets"),
        "role": snapshot.get("role"),
        "registered": datetime.fromisoformat(str(snapshot.get("registered"))).strftime(
            "%B %d, %Y"
        ),
        "platforms": snapshot.get("platforms"),
        "largestContributions": snapshot.get("largestContributions"),
        "popularAssets": snapshot.get("popularAssets"),
    }
    normalized = normalize_capture(capture)
    tmr_url(snapshot.get("source"), "source")

    fetched_at = snapshot.get("fetchedAt")
    if not isinstance(fetched_at, str):
        raise TmrDataError("fetchedAt is missing")
    datetime.fromisoformat(fetched_at.replace("Z", "+00:00"))

    for field_name in (
        "totalAssets",
        "role",
        "registered",
        "platforms",
        "largestContributions",
        "popularAssets",
    ):
        if normalized[field_name] != snapshot.get(field_name):
            raise TmrDataError(f"Snapshot field {field_name!r} is not normalized")


def create_driver(browser_name: str):
    try:
        from selenium import webdriver
    except ImportError as error:
        raise RuntimeError(
            "Selenium is not installed. Run: "
            r"py -m pip install -r scripts\requirements-tmr.txt"
        ) from error

    if browser_name == "firefox":
        return webdriver.Firefox(options=webdriver.FirefoxOptions())
    if browser_name == "edge":
        return webdriver.Edge(options=webdriver.EdgeOptions())
    if browser_name == "chrome":
        return webdriver.Chrome(options=webdriver.ChromeOptions())
    raise ValueError(f"Unsupported browser: {browser_name}")


def capture_profile(browser_name: str, timeout: int) -> dict[str, Any]:
    try:
        from selenium.common.exceptions import TimeoutException
        from selenium.webdriver.common.by import By
        from selenium.webdriver.support.ui import WebDriverWait
    except ImportError as error:
        raise RuntimeError(
            "Selenium is not installed. Run: "
            r"py -m pip install -r scripts\requirements-tmr.txt"
        ) from error

    driver = create_driver(browser_name)
    try:
        driver.set_page_load_timeout(timeout)
        print(f"Opening {PROFILE_URL}")
        print("Complete any browser verification if prompted; the script will wait.")
        driver.get(PROFILE_URL)

        def profile_is_ready(current_driver) -> bool:
            headings = current_driver.find_elements(By.TAG_NAME, "h1")
            heading_text = {heading.text.strip() for heading in headings}
            return "djfox11" in heading_text and any(
                text.startswith("All Assets (") for text in heading_text
            )

        try:
            WebDriverWait(driver, timeout, poll_frequency=1).until(profile_is_ready)
        except TimeoutException as error:
            raise RuntimeError(
                f"The profile did not become ready within {timeout} seconds "
                f"(page title: {driver.title!r}). No data was changed."
            ) from error

        capture = driver.execute_script(EXTRACT_PROFILE_SCRIPT)
        if not isinstance(capture, dict):
            raise RuntimeError("The browser did not return a profile data object")
        return capture
    finally:
        driver.quit()


def write_snapshot(output_path: Path, snapshot: dict[str, Any]) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    temporary_path = output_path.with_suffix(output_path.suffix + ".tmp")
    serialized = json.dumps(snapshot, indent=2, ensure_ascii=False) + "\n"

    try:
        temporary_path.write_text(serialized, encoding="utf-8")
        temporary_path.replace(output_path)
    finally:
        temporary_path.unlink(missing_ok=True)


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Refresh data/tmr.json from djfox11's public TMR profile."
    )
    parser.add_argument(
        "--browser",
        choices=("firefox", "edge", "chrome"),
        default="firefox",
        help="Visible browser to open (default: firefox).",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=300,
        help="Seconds to wait for the profile and any manual verification (default: 300).",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT,
        help="Snapshot path (default: data/tmr.json).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print the captured JSON without writing it.",
    )
    parser.add_argument(
        "--validate-only",
        action="store_true",
        help="Validate the existing output file without opening a browser.",
    )
    return parser.parse_args()


def main() -> int:
    arguments = parse_arguments()

    if arguments.timeout <= 0:
        print("error: --timeout must be greater than zero", file=sys.stderr)
        return 2

    try:
        if arguments.validate_only:
            snapshot = json.loads(arguments.output.read_text(encoding="utf-8"))
            validate_snapshot(snapshot)
            print(f"Valid snapshot: {arguments.output.resolve()}")
            return 0

        capture = capture_profile(arguments.browser, arguments.timeout)
        snapshot = normalize_capture(capture)
        validate_snapshot(snapshot)

        if arguments.dry_run:
            print(json.dumps(snapshot, indent=2, ensure_ascii=False))
        else:
            write_snapshot(arguments.output, snapshot)
            print(
                f"Updated {arguments.output.resolve()} with "
                f"{snapshot['totalAssets']} assets."
            )
        return 0
    except (OSError, RuntimeError, TmrDataError, ValueError, json.JSONDecodeError) as error:
        print(f"error: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
