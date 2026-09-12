# TMR data refresh

The refresh script opens a visible browser, reads the public statistics from
the `djfox11` profile, validates them, and replaces `data/tmr.json`. It does not
attempt to bypass browser verification or scrape model downloads.

## First-time setup

From the repository root in PowerShell:

```powershell
py -m pip install -r scripts\requirements-tmr.txt
```

Selenium Manager uses the installed Selenium package to locate Firefox and
obtain a compatible driver when one is not already available.

## Refresh the data

```powershell
py scripts\update_tmr_data.py
```

Firefox opens visibly. Complete any Cloudflare verification yourself if it
appears; the script waits for up to five minutes. Once the profile loads, the
browser closes and the validated snapshot is written atomically.

Other useful commands:

```powershell
# Preview the captured JSON without changing the file
py scripts\update_tmr_data.py --dry-run

# Use another installed browser
py scripts\update_tmr_data.py --browser edge

# Validate the committed snapshot without opening a browser
py scripts\update_tmr_data.py --validate-only
```

Review and commit `data/tmr.json` after a successful refresh. If the profile
markup changes, the totals disagree, or verification times out, the script
exits with an error and preserves the previous snapshot.
