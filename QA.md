# NEREID verification — 2026-10-28

## Independently approved candidate

Preview: http://127.0.0.1:4173/

Release fingerprint: `5aac6a75755f9f265574872e60c5fa3d4b913fc42ae027fa24904a80a8b55a8f`.

The previous candidate (`9e1225fb33dfab4e94b5d9edb7b5b247226209102821e24899efaa7d723bab66`) received NO-GO from the independent review. Its menu test did not exercise keyboard-open followed by Tab, and its Medusa visual claim did not hold at tablet sizes around 3.3 seconds. Those shortcomings are acknowledged and superseded by the checks below. The coordinating task subsequently reported independent GO for the exact revised fingerprint above: both P2 fixes, scene playback and all 14 source/distribution/served file hashes were verified. Publication was then explicitly authorized.

## Corrections and targeted regression evidence

1. The hamburger now precedes its navigation links in DOM order. Closed compact navigation is inert. Opening does not delay keyboard access with a visibility transition. Escape and deliberate close restore focus; selecting a destination focuses its section, including Species. Tab can leave the disclosure without a focus trap, and breakpoint changes transfer focus to a visible control. The keyboard tests run immediate input sequences, including Enter and Space, forward through all five links, reverse Tab, Escape, closing with the trigger, leaving in both directions, outside click, destination focus, and width/height breakpoint changes.
2. Tablet Medusa uses a lower shared poster/video crop and a dark gradient beneath the entire description. The centered title, divider, CTA and side controls retain their positions. Both 1024×768 and 768×1024 were checked at scrollY = 0. Evidence covers the poster and frames at 0.05, 1, 2, 3.3, 4, 5, 6 and 7.95 seconds, plus an observed continuous native loop at each viewport. These are eight sampled video phases, not a claim that every decoded frame was visually inspected.
3. The tablet check also calculates a conservative description contrast bound against a hypothetical all-white video frame using the measured CSS gradient. At the bottom of the description, the minimum scrim opacity is about 0.764 and the resulting contrast bound is about 8.52:1. This protects readability throughout motion rather than depending only on the sampled frames. It is a targeted compositing calculation, not a complete WCAG audit or a measurement of every anti-aliased text pixel.
4. The geometry test now measures the heading text node with a Range, checks all four title/CTA bounds, and requires scrollX = scrollY = 0. This replaces the weaker heading-box/CTA-bottom assertions called out by the review.

`scripts/qa-review-fixes.mjs` and `qa/review-fixes/results.json` record four passing targeted groups. Screenshot paths below refer to the generated evidence bundle supplied for review; the repository retains the JSON reports and reproducible capture scripts. Visual evidence:

- `qa/review-fixes/menu-keyboard.png`: menu open with Species focused after Enter then Tab.
- `qa/review-fixes/medusa-1024-cycle.png` and `medusa-768-cycle.png`: poster plus eight video phases.
- `qa/review-fixes/medusa-1024-3.30s.png` and `medusa-768-3.30s.png`: full-size captures of the reported problematic phase.
- Matching `*-poster.png` captures verify the fallback uses the same crop.

## Full regression and build verification

`qa/results.json` records all 13 groups passing in isolated installed Chrome after the fixes:

- All three real clips report 1920×1080, eight seconds, muted, looped and playsinline. Repeated Manta → Orca → Medusa cycles keep exactly one scene and one playing video active, with matching title, side labels and accessible names.
- All three scenes pass geometry checks at 2560×1440, 1440×900, 1366×768, 1024×768, 768×1024, 390×844, 375×812 and 320×568: 24 cases, no horizontal document overflow, actual heading text and CTA within the viewport at the top of the page.
- Keyboard menu activation, gallery dialog Escape/focus restoration, gallery-to-species navigation and journal disclosure work. Selecting a portrait's species leaves focus in Discover and clears the dialog scroll lock.
- Pause persists after reload; explicit Play resumes; clips pause off-screen and resume when visible. Native currentTime wrapping was observed for each clip.
- Reduced-motion emulation makes zero MP4 requests and disables the entrance. Save-data simulation suppresses automatic video fetching and permits explicit playback.
- Failed video and rejected play promise preserve the poster and recover through Retry. Failed posters preserve the previous scene. Delayed poster completion cannot overwrite a more recent selection.
- Normal browser journeys produce no uncaught page errors. Screenshot captures cover the desktop and simulated phone viewports plus the gallery.

`npm run check`, `npm run verify:media` and `npm run build` pass. The build contains 14 allowlisted runtime files totalling 11,862,609 bytes. Per-file hashes are in `release-fingerprint.json`. `scripts/verify-release.mjs` confirms that all 14 source, distribution and locally served files match the fingerprint; a video byte-range request returns 206 and the correct 1,024 bytes (`qa/release-verification.json`). The build fingerprint is not an independent approval.

## Media provenance and integrity

All nine original image files were imported from GitHub commit `2bd240d5dec3d3c6b0d7676fc47f4e2c01c18bbc`; the three videos, matching posters and provenance were imported from `eecda179f29848892eadc55d1dc7535ab8f1a2ed`. Git blob hashes and lengths matched during transfer. All six final video/poster SHA256 values still match the supplied manifest.

PNG parsing confirms transparent corners and partially transparent edge pixels for all three cutouts. MP4 parsing confirms H264, moov before mdat for faststart, and video-only tracks. The delivered 1080p clips are disclosed local upscales of genuine native 720p Flow output. No media bytes were changed by these UI fixes. Original high-resolution masters and native sources remain with the parent production task.

Prior first/last decoded-frame comparisons remain in `qa/loop-*.png`; their framing and silhouettes are closely aligned. The loop checks do not certify perceptual seamlessness on every display. Final desktop and phone-sized scene screenshots remain in `qa/desktop-*.png`, `qa/phone-*.png` and `qa/gallery.png`.

## Limits and remaining gate

All responsive captures use desktop Chrome simulated CSS viewports, not physical phones or tablets. iOS Safari, physical Android, touch hardware, and mobile OS suspend/resume have not been tested. Off-screen pause/resume was tested; operating-system background suspension was not. Google Fonts remains an external dependency with local fallback fonts.

The original independent audit covers the former candidate; these regression runs were performed by the implementing task, followed by the independent GO reported above. The release workflow rechecks the approved fingerprint before deployment. No purchase or blocked-executable retry was required.
