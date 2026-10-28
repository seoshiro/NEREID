# NEREID — The Living Ocean

A static, original ocean experience with the measured SpaceEdu hero composition and useful editorial content below it. No framework, build step, backend, account, analytics, or paid dependency.

Site: https://seoshiro.github.io/NEREID/

## Run locally

Use Node.js 20 or newer:

```sh
npm start
```

Open http://127.0.0.1:4173. The server binds only to loopback and supports video range requests. `npm run check` checks JavaScript syntax. Opening `index.html` directly is insufficient because the browser needs to load the asset manifest through HTTP.

## Current delivery state

Independent review approved the copy revision with runtime fingerprint `0d2ea1daecd20544d60271af8081ada1bc5eb213ff9a62057b37b47369079116`. It removes decorative numbering, replaces vague headings with specific subjects, and gives buttons clear destinations. The original posters, transparent cutouts and three genuine Flow videos are unchanged. See `QA.md` for verification and limitations. The Pages workflow requires this exact reviewed fingerprint before deployment.

One nonblocking P3 remains: widening from mobile while the open-menu button holds focus can move focus to the page body. It is recorded for a separate change; this release preserves the reviewed runtime bytes.

## Media integration

Web-ready original images are in `assets/images/`; genuine optimized silent MP4s and first-frame matching posters are in `assets/video/`. Original full-resolution masters and native Flow source files remain with the parent production task; provenance records their hashes. Edit `assets/manifest.json`, using URLs relative to the site root:

```json
{
  "manta": {
    "poster": "assets/images/manta-poster.webp",
    "cutout": "assets/images/manta-cutout.webp",
    "video": "assets/video/manta.mp4",
    "position": "50% 50%"
  }
}
```

Repeat for `orca` and `medusa`. Set unavailable files to `null`; do not invent media paths. All side-slot images are installed once, then selected by class without changing their `src`. Scene posters are decoded before committing a selection. A request counter ensures the most recent selection wins when loads complete out of order.

Video policy: muted, looping, inline; inactive videos pause. Reduced motion uses posters. Data-saving or slow connections avoid automatic video requests. Users can start or pause motion explicitly; their pause choice is stored locally. Tab visibility and the hero's viewport visibility control playback. Video failure preserves the matching poster and offers retry.

The hero keeps the source 1353 × 1163 geometry, `--u` scaling, six responsive tiers, fonts, entry sequence, and 220 ms crossfade. Deliberate adjustments: ocean silhouettes use slightly wider slots; phone headings are bounded to prevent MEDUSA overflow; the hero clips rather than internally scrolls when a partially cropped button receives focus. Below the hero, editorial content uses an independent readable responsive grid.

## Source and artwork provenance

- Main brief: Library `libfile_7f0a8e5a4a788191a8e380877b243320`, 795 lines, fully read.
- Technical reference: Library `libfile_2ca31ff23560819188ae769b79d55b55`, 487 lines, fully read as text despite octet-stream MIME.
- Reference inspected in Chrome: https://spaceedu-5241.ai.studio/
- Original asset archive waiting for transfer: Library `libfile_cf9b29080a808191be84fefcaf5649be`, `NEREID-original-images-and-web-assets.zip`, expected 11,803,263 bytes; SHA-256 `8e06629f403bd4e50c4ab3bcd26b08dfd4dad4e5a9e53a771a3f71a61b7907fc`.
- Library preparation returned signed transfers without a `workspace_path`. No local reference originals or ZIP were installed. Python was already blocked by Windows security; it was not retried. The user subsequently approved GitHub transfer of original assets.
- Nine original optimized images imported from commit `2bd240d5dec3d3c6b0d7676fc47f4e2c01c18bbc`; each byte count and Git blob SHA1 verified. See `assets/image-provenance.json` for SHA256 hashes.
- Three real videos and matched first-frame posters imported from commit `eecda179f29848892eadc55d1dc7535ab8f1a2ed`; Git blob SHA1 and manifest SHA256 verified. Browser metadata independently confirms 1920 × 1080 and 8 seconds. File parsing confirms H264, faststart and no audio track. Source provenance: 1280 × 720 Flow output was locally upscaled to 1080p; this does not create native 1080p detail.
- Educational copy references NOAA Fisheries' giant manta ray and killer whale species profiles and NOAA Ocean Exploration's bioluminescence explainer; links appear beside content.
- Medusa is explicitly described as an artistic study, not a scientifically identified species.

No SpaceEdu image or video has been reused. Fonts currently load from Google Fonts (Prata, Hanken Grotesk, Poppins). Cutout PNGs have true alpha and transparent corners. Final media are unchanged from the approved source commit.

## Files

- `index.html`: semantic page, reference hero, discover, gallery, journal, modal.
- `styles.css`: exact hero geometry, six tiers, entry animations, editorial layout.
- `app.js`: scene state, media lifecycle, menu, navigation and gallery.
- `assets/manifest.json`: integration point for original media.
- `server.mjs`: dependency-free local server.
- `QA.md`: observed tests and remaining release checks.
- `qa/`: browser test results, media verification, final screenshots and loop frame comparisons.
- `dist/`: allowlisted static release files created by `npm run build`.
- `release-fingerprint.json`: per-file hashes and aggregate build fingerprint.

The user authorized the public repository and site publication. The site sources build on approved image/video commit `eecda179f29848892eadc55d1dc7535ab8f1a2ed`, preserving the original `public/media/` files. GitHub Pages publishes only the verified `dist/` artifact; documentation, test evidence and production source media remain in the repository.
