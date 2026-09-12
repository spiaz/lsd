# LSD — MVP Specification

> **LSD — Lausanne Shift Discovery**  
> *A smoother trip through every shift.*

## 1. Purpose

LSD is a public, installable PWA that turns an individual driver's work-schedule PDF into a fast mobile calendar.

It is designed for drivers such as Antonio and his colleagues who need to check shifts daily: whether the day is off, a single shift, or a split shift, and see exact times, lines, routes, vehicle and breaks.

The product is private-by-design: each person imports and keeps their own schedule on their own device.

## 2. Product principles

- **Immediate daily access:** opening the app should show the calendar, not setup or a dashboard.
- **Mobile first:** the primary use case is a phone, including small screens.
- **Offline first:** after initial load and import, the app must work without a network connection.
- **Local privacy:** no account, no server-side PDF upload, no cloud schedule store.
- **Reliable over clever:** parsing must be deterministic, inspected before saving, and never silently invent data.
- **Dense but calm:** calendar status is scannable at a glance; details are available on demand.

## 3. Product language

- **French is the required product language for the MVP.**
- All user-facing interface copy must be in French, including onboarding, buttons, navigation, menus, labels, validation messages, errors, empty states, accessibility labels and installation guidance.
- Dates, weekdays and human-readable statuses must use French locale conventions (`fr-CH` where locale-specific formatting is needed).
- Do not introduce Italian or English user-facing copy in new features.
- The product name **LSD — Lausanne Shift Discovery** and the brand tagline **A smoother trip through every shift.** are intentional English-language brand exceptions.
- Source data imported from a planning PDF may retain employer-specific codes where changing them would alter their meaning, but explanatory UI around those codes must be in French.

## 4. Distribution and installation

- Host the static PWA on GitHub Pages.
- Support installation on iPhone, Android and desktop.
- Show brief, platform-appropriate instructions for **Ajouter à l’écran d’accueil** / **Installer l’application** on first visit.
- Cache the application shell through a service worker for offline use.

## 5. First use and local state

1. On first launch, show an onboarding screen with **Importer le PDF de votre planning**.
2. The browser reads and parses the PDF locally.
3. Show an import preview before saving.
4. Save parsed schedule data to IndexedDB.
5. On later launches, open directly on the saved calendar.

Do not require the user to re-upload their PDF every time the app opens.

The source PDF does not need to be retained after a successful import. Store source filename, import date and schedule coverage as metadata.

## 6. Planning import and updates

### Import

- Use a browser file picker; support file selection on iOS, Android and desktop.
- Do not use or attempt to monitor a persistent local file path.
- Parse locally with a deterministic parser (PDF.js/text coordinates; local OCR only if the PDF is a scan).
- Do not use an LLM in the standard import path.

### Preview and validation

Before confirmation, display:

- detected coverage period;
- count of work days, rest/absence days, single shifts and split shifts;
- any duplicate/missing dates;
- impossible or ambiguous time ranges;
- records the parser could not read confidently.

The user must be able to cancel an import. Ambiguities must be visible and correctable; they must not be silently accepted.

### Updating

Expose **Mettre à jour le planning** from the app menu.

When importing a new PDF, offer:

- **Ajouter une nouvelle période**; or
- **Remplacer la période qui se chevauche**.

Keep previously imported history unless the user explicitly replaces it.

## 7. Calendar and daily navigation

### Calendar home

- The home screen is a minimal monthly calendar.
- Today is selected and visually unmistakable on launch.
- Provide previous/next month controls and an **Aujourd’hui** action.
- Days outside the available schedule are visually muted.
- Each scheduled day shows a compact semantic status:

| Status | Calendar indicator |
| --- | --- |
| Single shift | `1` |
| Split shift | `2` |
| Rest / absence | `R` |

Keep these textual markers even when using icons: they remain readable in compact calendar cells.

### Focused day view

- Tapping a date opens a focused shift-detail view.
- The user can scroll/swipe to the previous or next day from this view.
- A clear calendar/back action collapses the detail and returns to the monthly grid.
- Keyboard Escape and pinch-in may also close the focused day view on supported devices.

## 8. Shift detail

A work-day detail must distinguish **SERVICE SIMPLE** (single) and **SERVICE COUPÉ** (split) in user-facing copy. Employer/source codes such as `UNICO` or `SPEZZATO` may be preserved as secondary source references if useful.

Show, when present:

- date and weekday;
- presence start and end;
- total work duration;
- breaks / RR;
- overall route start and end;
- line(s);
- vehicle;
- blocks for split shifts;
- each trip/leg: line, start, end, route and vehicle;
- pauses between split blocks.

Normalize overnight time for human display. For example, source time `25:31` must display as `01:31 (+1)`, while the underlying data and calendar export use the following date correctly.

Rest, holiday, leave and compensatory rest must be shown as day-level statuses, not empty work shifts.

## 9. Export to calendar

Provide **Exporter le calendrier (.ics)** in the schedule menu.

- Generate a standards-compatible ICS file.
- Use timezone `Europe/Zurich`.
- Create one timed event per work shift.
- Event summary includes the user/display name, time range and principal route.
- Event description includes date, line(s), trips, vehicle, worked time and break/RR.
- Represent split shifts correctly.
- Overnight shifts must end on the following calendar date.
- Export holidays and compensatory rest as all-day events.
- Add a display reminder two hours before timed shifts.

ICS export is a snapshot. After importing a revised PDF, the user exports a new ICS file and updates/replaces their calendar import. Automatic calendar sync is not part of the MVP.

## 10. UI and visual design

### Brand

- **Product name:** LSD
- **Expansion:** Lausanne Shift Discovery
- **Tagline:** *A smoother trip through every shift.*

The name and tagline are intentionally playful; the product should nevertheless remain professional and useful.

### Theme

Use a dark, Dracula-inspired cockpit aesthetic:

| Token | Value | Intended use |
| --- | --- | --- |
| Background | `#282A36` | app background |
| Surface | `#44475A` | cards and elevated controls |
| Foreground | `#F8F8F2` | primary text |
| Muted | `#6272A4` | secondary text and disabled state |
| Primary violet | `#BD93F9` | focus, selected state, key actions |
| Info cyan | `#8BE9FD` | information and today's badge |
| Success green | `#50FA7B` | valid import / confirmed status |
| Attention orange | `#FFB86C` | warnings |
| Error red | `#FF5555` | import errors / anomalies |
| Accent pink | `#FF79C6` | limited secondary emphasis |

Use bright colours for meaning, focus and action—not as decoration across every surface.

Today should have a violet border and cyan date badge, with sufficient contrast.

### Icons

Use a coherent line icon set (for example Lucide), with labels or accessible tooltips for important actions.

| Meaning | Icon direction |
| --- | --- |
| Calendar / back to grid | calendar |
| Today | crosshair / target |
| Single shift | bus |
| Split shift | git-branch / split |
| Rest / absence | context-specific palm, coffee or moon |
| Duration | clock |
| Route | route |
| Line | signpost |
| Vehicle | bus-front |
| Import PDF | file-up |
| Export ICS | calendar-down |
| Parsing anomaly | triangle-alert |

Icons should be prominent in navigation, actions and shift details, but calendar cells must remain compact and scannable.

## 11. Data model

At minimum, a schedule contains:

- schedule metadata: display name, imported filename, import timestamp, coverage start/end;
- day: date, status, shift type, source reference;
- work shift: presence start/end, route endpoints, total work time, RR, pay if available;
- block: ordinal, start/end, pause;
- trip: line, vehicle, start/end, origin and destination;
- all-day absence: type and date.

Persist data by local user/device only.

## 12. Accessibility and responsive requirements

- Touch targets must be comfortable on phones.
- Calendar must remain usable at widths down to 370px.
- Do not rely on colour alone for shift status.
- Provide visible focus states, sufficient text contrast and labelled controls.
- Preserve a compact calendar; do not fill every cell with verbose text.
- The document language must be declared as French (`lang="fr"`).

## 13. Explicit non-goals for the MVP

- User accounts or authentication.
- Server-side PDF storage.
- Automatic syncing across phones.
- Automatic retrieval of PDFs from email, employer portals or filesystems.
- Sharing a schedule with colleagues.
- Supporting arbitrary schedule formats from unrelated companies.
- LLM-based parsing.
- Live calendar subscription/sync.
- Complex push notifications.
- Multi-language UI/localization beyond French for the MVP.

## 14. MVP acceptance criteria

1. A user can install LSD and import a supported personal planning PDF from a phone.
2. The planning remains available after closing/reopening the app and while offline.
3. The monthly calendar clearly identifies today, single shifts, split shifts and rest/absence days.
4. Tapping a day exposes complete shift details and allows sequential day navigation.
5. Import failures or ambiguities are shown before data is saved.
6. A new planning can be merged or replace an overlapping interval without losing unrelated history.
7. The user can export an ICS calendar with correct Zurich timezone, reminders and overnight shifts.
8. No schedule data or PDF is sent to a server during normal use.
9. All user-facing application text is in French, except the explicitly defined English brand name/tagline, with French date/weekday formatting.
