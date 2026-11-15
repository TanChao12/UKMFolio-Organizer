# UKMFolio Organizer — Chrome extension (v1.0.1)

## What is this UKMFolio Organizer for?

https://github.com/user-attachments/assets/a68b2d71-110a-43e5-8ac9-f4d0fcaf988e

A lightweight local-first organizer for Chrome and other compatible Chromium browsers on **Windows, macOS, and Linux**. It is not a UKM product.

## Update from v1.0.0 (keep your hidden assignments)

**Important:** Extract this new ZIP into the **same existing extension folder** and replace its files. Then open `chrome://extensions` and press **Reload** on UKMFolio Organizer. Do not remove the extension or load a differently located folder, as that could change the extension ID and separate your locally stored assignment data.

If Chrome asks for additional permissions, review and accept the specified UKMFolio host access. Keep the UKMFolio tab open and reload it before Sync.

## Install (no terminal required)

1. Download and **extract** `UKMFolio-Organizer.zip` into a folder. Keep that folder; Chrome loads the extension from it.
2. In Chrome, open `chrome://extensions`.
3. Turn on **Developer mode** (top-right).
4. Click **Load unpacked** and select the extracted **UKMFolio-Organizer** folder (it contains `manifest.json`).
5. Pin **Folio Organizer** from your extension menu.
6. Open `https://ukmfoliov2.ukm.my/` and log in via UKM SSO normally.
7. Click the extension icon → **Open dashboard** → **Sync UKMFolio**. Keep your logged-in site tab open.

The extension supports `ukmfoliov2.ukm.my`, `ukmfolio.ukm.my`, and `ukmfolio.ukm.qa` hostnames.

## Features

- Read-only course/assignment scan through the authenticated UKMFolio tab (no password harvesting, no external server).
- Scan course pages and Moodle assignment/quiz indices; bounded to 40 courses and 75 activity detail pages per sync, with small pauses.
- Persistent IndexedDB storage; repeated sync upserts by Moodle activity/module ID rather than duplicating.
- **Soft hide**: `del=1` leaves the record in IndexedDB but hides it from the active view.
- **Hidden** table with **Restore** (`del=0`). Re-sync **never overwrites** a record's `del`, completion or notes values.
- Search, course filter, sort, mark completed, manually add tasks.
- Export Excel-compatible `.xlsx` with Active, Hidden and All Records sheets.
- JSON backup/restore preserves soft-delete values and allows cross-device migration.

## Important limitations

- **This is an initial implementation, not yet tested on a real authenticated UKMFolio student account.** UKMFolio may use a theme/layout that requires selector adjustments. Report any missed activities and, if comfortable, share screenshots with private information obscured.
- Moodle assignments posted only inside uploaded PDFs, announcements, forum posts or embedded resources are **not automatically parsed**. They can be added manually.
- Activity due dates are extracted heuristically from rendered Moodle pages. **Always verify dates at the original UKMFolio link.** Events with ambiguous dates are shown as 'Not specified'.
- Assignments at the same course with different Moodle activity IDs are treated as distinct; one module ID yields one record even if details change.
- The scan makes multiple ordinary requests with your authorized session; avoid repeated rapid syncs and follow UKM policies. No SSO bypass, hidden-course access or elevated permissions.
- Chrome's extension storage is local to the browser profile, not automatically shared across your computers. Use JSON backup/restore to migrate data.
- This extension is not distributed via the Chrome Web Store. Installing via Load unpacked is appropriate for local testing.

## Security and privacy

- No backend, telemetry, analytics, dependencies or CDN requests.
- Requests are limited to same-origin UKMFolio pages from your authenticated tab.
- No login fields or authentication tokens are extracted.
- No write requests or form submissions are sent to UKMFolio by the extension.
- Chrome permissions: `storage`, `scripting`, `activeTab`, and host access to three known UKMFolio hostnames only.
- Local exports may contain student/course information: store them safely.

## Development

All files are vanilla JS/CSS/HTML. No Node, build tools, npm packages or dependency installation required.

**Key files:** `extractor.js` (read-only Moodle scanner), `db.js` (IndexedDB + merge), `dashboard.js` (UI, actions), `xlsx.js` (dependency-free XLSX writer).

## Troubleshooting

- **0 courses / 0 tasks:** Ensure you're signed in and leave the UKMFolio course/dashboard page open. Navigate to a course and sync again.
- **Permission error:** Go to `chrome://extensions` → UKMFolio Organizer → **Details** → **Site access**. Allow access to your UKMFolio hostname. Reload the extension and your UKMFolio tab. If the address ends in an unrecognized hostname, share only the hostname so it can be added safely. Avoid syncing from the UKM SSO login page.
- **Wrong dates:** Check the original assignment, which is authoritative, and report the HTML structure (redact student data) to adjust parser.
- **Hidden tasks reappear?** Confirm you did not import an older JSON backup or use a different Chrome profile. A normal sync preserves `del`.
