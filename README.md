# CVBuilder Web v2.5.0 — GitHub Pages build

A **static, client-side** version of CVBuilder. Copy the files from this `web\` folder
to the root of a GitHub repository and enable GitHub Pages — no server, no build step,
no Python and no runtime dependencies.

## Files

| File | Purpose |
|---|---|
| `index.html` | App shell: language bar, chooser, wizard, manual tabs, outputs, About modal |
| `styles.css` | Dark theme, RTL layout, responsive rules, print/PDF document themes |
| `i18n.js` | English / Polish / Arabic translation tables and the `tr()` helper |
| `app.js` | State, wizard, manual editors, ATS scoring, document builders, downloads |
| `.nojekyll` | Tells GitHub Pages not to run Jekyll (keeps every file exactly as-is) |
| `README.md` | These instructions |

## Features (parity with the desktop app)

- Live **EN / PL / AR** switching; the whole interface, generated CV, cover letter and
  ATS report retranslate immediately. Arabic switches the page to full **RTL**.
- **Questionnaire (Q&A)** with 10 steps, **Back / Next**, a *Jump to question* selector
  and a final review screen — plus a **manual tabs** editor for every section.
- Optional photo and a 1–2 sentence italic role brief above each job's achievements.
- ATS report: standard headings, dates, bullet quality, length, keyword coverage against
  a pasted job description, and a score out of 100 with severity-sorted findings.
- **Document styles**: black & white, green & black, rose & black (colour only — no
  tables, text boxes or images in the text flow, so ATS parsing is unaffected).
- Downloads: plain `.txt`, Word-compatible `.doc` (HTML with Word namespaces and CSS),
  and **Print / Save as PDF** via the browser print dialog.
- Settings and profile are stored in `localStorage`. **Nothing is uploaded anywhere.**

## Test locally (optional)

From this folder:

```bat
python -m http.server 3000
```

Then open <http://localhost:3000/index.html>. Opening `index.html` directly with a
`file://` URL also works in most browsers, but a local server is closer to GitHub Pages.

## Publish to GitHub Pages

1. Create a new public repository on GitHub (e.g. `cvbuilder-web`). Do **not** add a
   README/licence during creation if you want a pristine root.
2. Copy **all** files from this `web\` folder into the repository root (including the
   hidden `.nojekyll`). The final repo root should contain:
   `.nojekyll`, `README.md`, `app.js`, `i18n.js`, `index.html`, `styles.css`.
3. Commit and push with your own credentials:

   ```bat
   cd path\to\cvbuilder-web
   git init
   git add .
   git commit -m "CVBuilder web v2.5.0"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/cvbuilder-web.git
   git push -u origin main
   ```

4. In the repository, go to **Settings → Pages**. Under *Build and deployment* set
   **Source: Deploy from a branch**, **Branch: `main`**, **folder: `/ (root)`**, then
   click **Save**.
5. After a minute or two the site is live at
   `https://YOUR_USERNAME.github.io/cvbuilder-web/`.

If you prefer to keep the desktop source and the web build in the *same* repository,
create a branch named `gh-pages` containing only these web files and set **Source:
Deploy from a branch → gh-pages / (root)** instead.

## Updating later

Copy the changed web files over the repo copies, then:

```bat
git add .
git commit -m "CVBuilder web update"
git push
```

Pages rebuilds automatically.

## Privacy

All data entry, keyword analysis and document generation happen in your browser via
JavaScript. There are no network requests, no analytics and no uploads; the profile
lives only in your browser's `localStorage` unless you export it yourself.
