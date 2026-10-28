# EndoS³ project page

Static project page for *EndoS³: Endoscopic Semantic Splatting SLAM* (IPCAI 2027 submission). Plain HTML/CSS/JS, no build step.

## Preview locally
The comparison viewer and trajectory plot load JSON, so open the page through a server, not as a file:

```bash
python -m http.server 8765
# http://localhost:8765/   (append ?theme=light or ?theme=dark to force a theme)
```

## Publish (GitHub Pages)
Not published yet. The page shows author names, results and the demo video, so publish only when the review policy allows it.
1. Create the GitHub repository and push this folder.
2. Settings → Pages → Deploy from branch → `main`, folder `/ (root)`. `.nojekyll` is included so `static/` is served as is.

## Before publishing
- Paper / Code / CRCD++ buttons in `index.html` are disabled placeholders: replace each `<a class="btn disabled" aria-disabled="true">` with `<a class="btn" href="...">` and drop its `soon` badge.
- The venue line says "IPCAI 2027 (submitted)" and the BibTeX is a `@misc` placeholder: update both on acceptance.

## Contents
| Path | What |
|---|---|
| `index.html` | the page |
| `static/css/style.css`, `static/js/app.js` | styles (light + dark), comparison slider, metric tables, trajectory viewer |
| `static/data/tables.js` | paper tables, values and best/second marks verbatim from the submission |
| `static/data/compare.json`, `static/img/cmp/` | slider tiles: the paper figures' frames, one image per method |
| `static/data/trajectories.json` | Sim(3)-aligned trajectories (mm), scored exactly as the paper's ATE table (C2 = first 360 frames) |
| `static/video/` | 720p web copy of the demo video (`endos3_video_draft_full.mp4`) + poster |
| `static/img/pipeline.png`, `crcdpp_annotation.jpg` | method figure (from `endos3_method_figure.pdf`), CRCD++ annotation figure |
| `tools/export_assets.py` | regenerates the slider tiles and trajectories from the benchmark outputs (author's machine paths) |

The 3-D trajectory viewer uses Plotly (`plotly.js-gl3d-dist-min@2.35.2` from jsDelivr), loaded only when the section scrolls into view.
