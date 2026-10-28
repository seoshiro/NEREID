# NEREID copy revision verification — 2026-10-28

Local preview: http://127.0.0.1:4173/

Candidate fingerprint: `0d2ea1daecd20544d60271af8081ada1bc5eb213ff9a62057b37b47369079116`.

Status: the coordinating task reported independent GO for this exact fingerprint, confirming natural, specific copy, removal of numbering and working desktop/mobile navigation. The Pages approval pin now requires this fingerprint. This revision builds on previously published commit `1931ec241aa2c123c98179335d36d625488d140d` (fingerprint `5aac6a75755f9f265574872e60c5fa3d4b913fc42ae027fa24904a80a8b55a8f`). Deployment success must be checked against the new commit separately.

The independent reviewer noted a nonblocking P3: widening from mobile while the open-menu button holds focus can drop focus to body. The existing breakpoint checks exercise other focused controls and did not cover that exact open-trigger state. No runtime changes were made after GO; this issue remains for a separate revision.

## Scope

Runtime changes are confined to `index.html`, `app.js` and `styles.css`. Changes replace decorative copy, remove numeric labels, add contextual CTA/source text and gallery accessible names, and remove the journal indentation left behind by deleted numbers. Navigation destinations, visual media, hero geometry, playback, focus management and transition rules are preserved. All 11 other runtime files retain the baseline hashes.

The complete rendered editorial copy is in `qa/copy/copy.json`; the baseline is in `editorial/baseline/`.

## Browser checks

All 21 groups passed in installed Chrome. These were performed by the implementing task, not an independent reviewer.

- `qa/results.json`: 13 groups. All three genuine clips report 1920×1080, 8 seconds, muted, looping and inline playback. Repeated selection keeps only one video playing. All three scenes pass geometry at 2560×1440, 1440×900, 1366×768, 1024×768, 768×1024, 390×844, 375×812 and 320×568. Keyboard menu, gallery Escape/focus restoration and gallery-to-profile navigation work. Pause persists across reload, off-screen clips pause, and all three native loop wraps were observed. Reduced motion requests no MP4s. Save-data requires explicit playback. Failed video, rejected autoplay and failed poster cases recover; delayed loads cannot replace a newer selection. Normal journeys produced no uncaught errors.
- `qa/review-fixes/results.json`: 4 groups. Immediate Enter/Space → Tab traverses every mobile navigation link; reverse Tab, Escape, trigger-close, exits, outside click and destination focus work. Width/height breakpoint changes retain visible focus. Medusa at 1024×768 and 768×1024 was checked at the poster and eight phases (0.05, 1, 2, 3.3, 4, 5, 6, 7.95 seconds), plus an observed loop. The measured gradient gives a conservative description contrast bound of about 8.52:1 against an all-white video frame. This is a targeted compositing bound, not a full WCAG audit.
- `qa/copy/results.json`: 4 groups. All three profiles and hero descriptions fit at 320, 390, 768, 1024 and 1440 px. Text ranges stay within the viewport; hero descriptions end above their CTA. Contextual CTAs reach the selected profile, and source URLs match the displayed animal. Gallery accessible names contain their visible labels and open the matching portrait using Enter; the profile action transfers focus correctly. Static Manta copy matches the JavaScript-rendered copy. Every original anchor destination is retained. Numbered editorial labels are absent.

Screenshots: `qa/desktop-*.png`, `qa/phone-*.png`, `qa/copy/profile-*.png`, `qa/copy/gallery-*.png`, `qa/copy/journal-*.png`, and `qa/review-fixes/medusa-*-cycle.png`. Section captures crop to the section's content width; their edges are not page gutters. Tall gallery/journal captures temporarily extend the viewport height to contain the section, avoiding a browser capture artifact involving the off-screen fixed skip link. Geometry checks use the normal dimensions listed above. All journal entries are deliberately open in editorial captures. The separate 390×844 `journal-phone-viewport.png` and `capture-state.json` confirm the skip link is off-screen and unfocused in the normal viewport.

The first browser invocation inside the restricted sandbox could not connect to loopback (`ERR_NETWORK_ACCESS_DENIED` / `EACCES`); it did not establish product test results. The same checks then completed through the supported approved local-network execution route. No security settings or blocked executables were changed.

## Build and asset verification

`npm run check`, `npm run verify:media`, and `npm run build` pass. The build contains 14 runtime files, 11,861,929 bytes. `release-fingerprint.json` records their SHA256 values. `scripts/verify-release.mjs` verifies all 14 source, dist and locally served files; a video range request returns HTTP 206 with the correct 1,024 bytes. Evidence: `qa/release-verification.json`.

Final video/poster SHA256 values match the production manifest. H264, video-only tracks, faststart and cutout transparency checks pass. The three clips are genuine native 720p Flow output upscaled to 1080p, as documented in the source provenance. No media bytes changed for this copy revision.

Humanizer and No AI Slop were applied as editorial guidance. Installation evidence remains in the local review package; the skills are not dependencies of this website.

## Limits and next gate

Responsive testing uses desktop Chrome with simulated CSS viewports. Physical iOS/Android devices, Safari, touch hardware and OS background suspension have not been tested. Google Fonts remains an external dependency. Loop checks demonstrate playback wrapping, not seamlessness on every display. This report is not an independent GO or a complete accessibility audit.

Independent review approved this exact fingerprint. Publication still requires a successful exact-commit CI/deployment and live verification. No purchase or additional installation is needed.
