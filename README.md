# UKMFolio Organizer

A Chrome extension for UKM students to see what’s due, decide what to work on first, and track their coursework in one place.

## What you can do

- **Start with Focus.** See up to three unfinished activities. Deadlines due today or tomorrow come first. If there’s room, Focus also surfaces the most recently overdue activity.
- **Browse all assignments.** Search by assignment or course, filter by course or status, and browse eight items per page.
- **Track your progress.** Mark activities done, add your own assignments, or hide items you don’t want in your active list. Restore hidden items from **Hidden**. Use **Undo** immediately after a change.
- **Take your data with you.** Open **Export, backup and help** to download an Excel workbook or a backup you can restore in another Chrome profile.

## Install on Chrome

1. On GitHub, choose **Code → Download ZIP**. If a packaged ZIP is available under **Releases**, you can use that too.
2. Extract it and locate the folder containing `manifest.json`.
3. In Chrome, open `chrome://extensions` and enable **Developer mode**.
4. Select **Load unpacked** and choose that folder.
5. Open the [UKMFolio dashboard](https://ukmfoliov2.ukm.my/my/) and sign in normally. Open **Folio Organizer** from Chrome’s Extensions menu and choose **Open assignments**. You can pin it for easy access.

### Updating an existing installation

Download a backup from **Export, backup and help** first. Extract the new files into the same folder Chrome already loads, replace the existing files, and select **Reload** for UKMFolio Organizer on `chrome://extensions`. Then reload UKMFolio. Loading the extension from a different folder or removing it first can separate you from your existing progress.

## How sync works

The first time you open a supported, signed-in UKMFolio page each day, the extension attempts to sync automatically. It can make **one automatic attempt per Malaysia calendar day**. The allowance resets at **12:00 a.m. Malaysia time**. If you need the latest assignments sooner, open the Organizer and choose **Refresh assignments** while your signed-in UKMFolio tab is open.

Sync updates imported activity information and keeps your completion status, hidden items, and saved notes. Marking an activity done in the Organizer is a personal checklist action. Submit coursework and verify official deadlines on UKMFolio.

### If something is missing

- **Nothing imported.** Make sure you’re signed in, open **My courses** or a course page, then choose **Refresh assignments**. Allow time for the scan to finish.
- **Chrome blocks access.** Open `chrome://extensions`, pick **Details** for UKMFolio Organizer, and check that **Site access** allows your UKMFolio hostname. Reload the extension and the UKMFolio tab.
- **A task or date is missing or incorrect.** Verify the original activity on UKMFolio. The Organizer reads supported activity pages and may miss instructions or deadlines that appear only in announcements, forum posts, files, or embedded resources. You can add these tasks manually.

## Privacy and permissions

The extension reads UKMFolio pages available to your signed-in account. It stores assignment data and progress in your local Chrome profile using IndexedDB and Chrome extension storage. It sends no analytics or telemetry and has no backend. It does not collect your credentials, submit coursework, or change your UKMFolio records.

| Chrome permission | Purpose |
| --- | --- |
| `storage` | Save sync timestamps and coordinate sync across tabs. |
| `tabs` | Find an open UKMFolio tab for manual refresh. |
| `scripting` | Start the assignment reader in the selected UKMFolio tab. |
| Site access | Read supported pages on `ukmfoliov2.ukm.my`, `ukmfolio.ukm.my`, and `ukmfolio.ukm.qa` over HTTPS. |

Excel files and backups may include course names, assignment titles, and links. Keep them private unless you intend to share them.

## Development

The extension uses Chrome Manifest V3, vanilla JavaScript, HTML, and CSS. There is no build step or package installation. Load the repository folder as an unpacked extension, edit the source, and reload the extension and UKMFolio page to test.

| Files | Purpose |
| --- | --- |
| `manifest.json` | Chrome configuration and site access |
| `auto-start.js`, `auto-sync.js`, `sync-worker.js` | Start, coordinate, and limit background sync |
| `extractor.js` | Read supported UKMFolio activities |
| `dashboard.js`, `focus.js`, `friendly.css` | Dashboard, priority ordering, pagination, and styling |
| `db.js`, `xlsx.js` | Local records and Excel export |

Verified in Chrome against the live `ukmfoliov2.ukm.my` dashboard. To report a problem, open a GitHub issue with your Chrome version, what you expected, and steps to reproduce. Remove student IDs, names, and private course information from screenshots and logs.

*Independent student project. It is not affiliated with Universiti Kebangsaan Malaysia.*
