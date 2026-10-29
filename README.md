# EndoS³ project page

Static project page for *EndoS³: Endoscopic Semantic Splatting SLAM* (paper under review; to be replaced with the arXiv version). Plain HTML/CSS/JS, no build step.

## Preview locally
The comparison viewer and trajectory plot load JSON, so open the page through a server, not as a file:

```bash
python -m http.server 8765
# http://localhost:8765/   (append ?theme=light or ?theme=dark to force a theme)
```

## Publish (GitHub Pages)
Not published yet: kept local until the paper is accepted (the page shows author names, results and the demo video). Target: `bwright000/EndoS3` → https://bwright000.github.io/EndoS3/
1. `gh auth login` (once), then from this folder:
   `gh repo create bwright000/EndoS3 --public --source . --remote origin --push`
2. Settings → Pages → Deploy from branch → `main`, folder `/ (root)`. `.nojekyll` is included so `static/` is served as is. The site is live a minute or two later.
A free account serves Pages only from a public repository.

## Before publishing
- Paper / Code buttons in `index.html` are disabled placeholders (CRCD++ links to the Google Drive release folder): replace each `<a class="btn disabled" aria-disabled="true">` with `<a class="btn" href="...">` and drop its `soon` badge.
- No venue is named anywhere (page, BibTeX, video): once the paper is on arXiv, point the Paper button at it and give the BibTeX its arXiv `eprint` and `archivePrefix`.

## Contents
| Path | What |
|---|---|
| `index.html` | the page |
| `static/css/style.css`, `static/js/app.js` | styles (light parchment palette), comparison video viewer, metric tables, trajectory viewer |
| `static/data/tables.js` | paper tables, values and best/second marks verbatim from the paper |
| `static/video/cmp/`, `static/data/compare_video.json` | comparison videos (E3, C2 frames 0–359, SemSup trial 3 × render / depth / semantics): every method tiled in one video so the slider halves stay frame-locked, plus per-frame scores |
| `static/data/trajectories.json` | Sim(3)-aligned trajectories (mm), scored exactly as the paper's ATE table (C2 = first 360 frames) |
| `static/video/` | 720p web copy of the demo video (`endos3_video_draft_full.mp4`; venue line erased from the title and end cards) + poster |
| `static/img/pipeline.png`, `crcdpp_annotation.jpg` | method figure (from `endos3_method_figure.pdf`), CRCD++ annotation figure |
| `tools/export_videos.py`, `tools/export_assets.py` | regenerate the comparison videos and the trajectories from the benchmark outputs (author's machine paths) |

The 3-D trajectory viewer uses Plotly (`plotly.js-gl3d-dist-min@2.35.2` from jsDelivr), loaded only when the section scrolls into view.
