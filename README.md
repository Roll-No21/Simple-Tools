# Simple Tools

A small, quiet website for the little tasks of an ordinary day — the date, the time,
a sum, a colour. Plain HTML, CSS and JavaScript: no build step, no framework, no trackers.

Every page is its own HTML file, and the header menu links them together.

## Pages

| Page | File | What it does |
| --- | --- | --- |
| Home | `index.html` | Greeting, live clock and **favourite pages at the top**. Star any tool to pin it. |
| Date | `date.html` | Today's day and **month in numbers**, week number, day of the year, a month calendar, and a collapsible list of **all 12 months with their last day** (Feb shows 29 in leap years). |
| Special day | `special.html` | **Is today special?** Checks a built-in list of world days (offline) and asks Wikipedia for holidays and “on this day” notes (online). Also lists the next six world days. |
| 24 → 12 | `time-12h.html` | Converts **24-hour time to 12-hour AM/PM** and back, in words too, plus a reference table for the whole day. |
| Time zones | `time-zones.html` | Converts **your time to UTC and other cities**, with daylight saving handled by the browser. Add or remove places (up to 8). |
| Calculator | `calculator.html` | **Standard, scientific and percentage** modes. Percentage mode draws the answer as a **progress bar**. History keeps the last 20 sums. |
| Colours | `colors.html` | Pick a colour and **copy the code** as HEX, RGB, HSL, HSV or CMYK, with shades, a readability check and a saved palette. |

## Saved in the browser

Nothing is sent anywhere. These keys are kept in `localStorage`:

| What | Key | Limit |
| --- | --- | --- |
| Favourite pages | `st.favs` | 6 |
| Calculator history | `st.calcHistory` | 20 entries |
| Button colour (accent) | `st.accent` | 1 |
| Light / dark choice | `st.theme` | 1 |
| Saved colour palette | `st.colors` | 12 |
| Added time zones | `st.zones` | 8 |

The ⚙ button in the header changes the button colour and light/dark mode, and can reset
all saved data. The star on the home page manages favourites, and the calculator's
history is cleared from its own “Clear” button.

## Design

* A slow, crossfading **background image** (three images, each gently zooming) with a
  soft veil for readability.
* Warm, paper-like cards that become dark glass in dark mode. The theme follows the
  device setting until you choose one.
* One accent colour drives every button, chip and highlight.
* Everything respects `prefers-reduced-motion` and works down to small phone screens.

## Running it

Any static file server works:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Opening `index.html` directly from disk mostly works too, except the “Special day”
internet lists, which need a normal `http://` origin.

## How some things work

* **The calculator** parses expressions with a small hand-written parser (no `eval`):
  `+ − × ÷ ^`, brackets, `%` (as “divide by 100”), factorial, `sin cos tan log ln √ abs`,
  and the constants `π` and `e`. Trigonometry follows the DEG / RAD button.
* **Time zones** use `Intl.DateTimeFormat`, so offsets (including UTC +05:30 style zones)
  and daylight saving come from the browser's own database.
* **Special days** combine a fixed list of world days with a few calendar rules
  (Mother's Day, Father's Day, Thanksgiving, Easter and others). Wikipedia's
  [On this day API](https://api.wikimedia.org/wiki/Feed_API) fills in extra holidays and
  history when there is a connection.

## Files

```
index.html  date.html  special.html  time-12h.html
time-zones.html  calculator.html  colors.html
assets/css/style.css
assets/js/common.js        shared: storage, theme, favourites, background
assets/js/home.js  date.js  special.js
assets/js/time12.js  timezones.js  calculator.js  colors.js
assets/img/bg-*.jpg        background photographs
```
