(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage unavailable */ } }
  };

  /* ---------------- helpers ---------------- */
  function segmented(el, items, current, onPick) {
    el.innerHTML = "";
    items.forEach(([id, label]) => {
      const b = document.createElement("button");
      b.type = "button"; b.role = "tab"; b.textContent = label;
      b.setAttribute("aria-selected", String(id === current));
      b.addEventListener("click", () => {
        [...el.children].forEach((c) => c.setAttribute("aria-selected", "false"));
        b.setAttribute("aria-selected", "true"); onPick(id);
      });
      el.appendChild(b);
    });
  }
  function pills(el, items, current, onPick) {
    el.innerHTML = "";
    items.forEach(([id, label]) => {
      const b = document.createElement("button");
      b.type = "button"; b.textContent = label; b.setAttribute("aria-pressed", String(id === current));
      b.addEventListener("click", () => {
        [...el.children].forEach((c) => c.setAttribute("aria-pressed", "false"));
        b.setAttribute("aria-pressed", "true"); onPick(id);
      });
      el.appendChild(b);
    });
  }
  function fillSelect(sel, opts, value) {
    sel.innerHTML = "";
    opts.forEach(([v, label]) => { const o = document.createElement("option"); o.value = v; o.textContent = label; sel.appendChild(o); });
    sel.value = value;
  }

  /* ---------------- quantitative tables ---------------- */
  const P = window.PAPER;
  const cell = (s) => s.startsWith("**") ? `<b>${s.slice(2)}</b>` : s.startsWith("_") ? `<u>${s.slice(1)}</u>` : s;
  function renderTable(mid) {
    const m = P.metrics.find((x) => x.id === mid);
    const unit = m.unit ? ` (${m.unit})` : "";
    let h = "<thead>";
    if (m.only === "sup") {
      h += `<tr><th>Method</th><th>Semantic-SuPer pins${unit} ${m.dir}</th></tr></thead><tbody>`;
    } else {
      h += `<tr><th rowspan="2">Method</th><th colspan="6">CRCD++${unit} ${m.dir}</th>${m.sup ? `<th class="grp">Sem.-SuPer</th>` : ""}</tr>`;
      h += `<tr>${P.seqs.map((s) => `<th>${s}</th>`).join("")}${m.sup ? `<th class="grp">Avg.</th>` : ""}</tr></thead><tbody>`;
    }
    Object.keys(P.methods).forEach((k) => {
      const r = m.rows[k]; if (!r) return;
      h += `<tr class="${k === "ours" ? "ours" : ""}"><th>${P.methods[k]}</th>` +
        r.map((v, i) => `<td class="${v === "–" ? "na" : ""} ${m.sup && i === 6 ? "grp" : ""}">${cell(v)}</td>`).join("") + "</tr>";
    });
    $("rtable").innerHTML = h + "</tbody>";
    $("metricNote").textContent = "Bold: best · underlined: second.";
  }
  segmented($("metricTabs"), P.metrics.map((m) => [m.id, m.label]), "ate", renderTable);
  renderTable("ate");

  /* ---------------- copy bibtex ---------------- */
  $("copyBib").addEventListener("click", async () => {
    const t = $("bibText").textContent;
    try { await navigator.clipboard.writeText(t); $("copyBib").textContent = "Copied"; }
    catch (e) { const r = document.createRange(); r.selectNodeContents($("bibText")); getSelection().removeAllRanges(); getSelection().addRange(r); $("copyBib").textContent = "Press Ctrl+C"; }
    setTimeout(() => ($("copyBib").textContent = "Copy"), 1600);
  });

  /* ---------------- comparison videos ----------------
     One video per sequence and task holds every method as a tile (3 x 2 grid); both sides of the slider and every
     thumbnail are drawn from that one decoder, so they stay frame-locked. Badges show that frame's score. */
  const TASKS = [["render", "Rendering"], ["depth", "Depth"], ["semantics", "Semantics"]];
  fetch("static/data/compare_video.json").then((r) => r.json()).then((C) => {
    const st = { set: null, left: null, right: "endos3", frame: -1 };
    const video = $("cmpVideo"), slider = $("slider"), range = $("cmpRange"), scrub = $("cmpScrub");
    const cvL = $("cvLeft"), cvR = $("cvRight"), cxL = cvL.getContext("2d"), cxR = cvR.getContext("2d");
    let thumbs = [], visible = false, wantPlay = true;
    const label = (set, k) => (k === "gt" && set.gt_note) ? `Reference (${set.gt_note})` : C.names[k] || k;
    const short = (set, k) => k === "endos3" ? "<b>Ours</b>" : (k === "gt" && set.gt_note ? "Input labels" : C.names[k]);
    const mean = (a) => { const v = a.filter((x) => x != null); return v.reduce((p, q) => p + q, 0) / v.length; };
    const fmt = (set, k, i) => { const v = set.scores[k] && set.scores[k][i]; return v == null ? "" : `${v.toFixed(set.unit === "%" ? 1 : set.unit === "mm" ? 2 : 1)} ${set.unit}`; };
    function bestBaseline(set) {
      const b = Object.keys(set.scores).filter((k) => k !== "endos3");
      return b.sort((a, c) => set.better === "max" ? mean(set.scores[c]) - mean(set.scores[a]) : mean(set.scores[a]) - mean(set.scores[c]))[0];
    }
    function tile(ctx, k, w, h) {
      const set = st.set, j = set.keys.indexOf(k), [tw, th] = set.tile;
      ctx.drawImage(video, (j % 3) * tw, Math.floor(j / 3) * th, tw, th, 0, 0, w, h);
    }
    function paint(force) {
      const set = st.set; if (!set || video.readyState < 2) return;
      const i = Math.min(set.n - 1, Math.floor(video.currentTime * set.fps + 1e-3));
      const [tw, th] = set.tile;
      tile(cxR, st.right, tw, th); tile(cxL, st.left, tw, th);
      thumbs.forEach(([c, k]) => tile(c.getContext("2d"), k, c.width, c.height));
      if (i !== st.frame || force) {
        st.frame = i;
        const tag = (k) => { const v = fmt(set, k, i); return label(set, k) + (v ? ` · <b>${v}</b>` : ""); };
        $("tagLeft").innerHTML = tag(st.left); $("tagRight").innerHTML = tag(st.right);
        thumbs.forEach(([c, k, em]) => (em.textContent = fmt(set, k, i)));
        scrub.value = i; $("cmpFrame").textContent = `${i + 1} / ${set.n}`;
      }
    }
    const loop = () => { paint(false); video.requestVideoFrameCallback ? video.requestVideoFrameCallback(loop) : requestAnimationFrame(loop); };
    function markThumbs() {
      [...$("cmpThumbs").children].forEach((t) => { t.classList.toggle("is-left", t.dataset.k === st.left); t.classList.toggle("is-right", t.dataset.k === st.right); });
      $("cmpLeft").value = st.left; $("cmpRight").value = st.right; paint(true);
    }
    function setPlaying(p) {
      wantPlay = p; $("cmpPlay").classList.toggle("paused", !p); $("cmpPlay").setAttribute("aria-label", p ? "Pause" : "Play");
      if (p && visible) video.play().catch(() => {}); else video.pause();
    }
    function pickSet(id) {
      const set = C.sets.find((s) => s.id === id); st.set = set; st.frame = -1;
      const [tw, th] = set.tile; [cvL, cvR].forEach((c) => { c.width = tw; c.height = th; });
      slider.style.aspectRatio = `${tw} / ${th}`;
      st.left = bestBaseline(set); st.right = "endos3";
      const opts = set.keys.map((k) => [k, label(set, k)]);
      fillSelect($("cmpLeft"), opts, st.left); fillSelect($("cmpRight"), opts, st.right);
      const box = $("cmpThumbs"); box.innerHTML = ""; thumbs = [];
      set.keys.forEach((k) => {
        const b = document.createElement("button");
        b.type = "button"; b.className = "thumb"; b.dataset.k = k; b.title = `Show ${label(set, k)} on the left`;
        const c = document.createElement("canvas"); c.width = Math.round(tw / 3); c.height = Math.round(th / 3);
        const sp = document.createElement("span"); sp.innerHTML = short(set, k); const em = document.createElement("em"); sp.appendChild(em);
        b.append(c, sp); b.addEventListener("click", () => { if (k === st.right) return; st.left = k; markThumbs(); });
        box.appendChild(b); thumbs.push([c, k, em]);
      });
      scrub.max = set.n - 1;
      video.src = set.src; video.load();
      video.addEventListener("loadeddata", () => { markThumbs(); setPlaying(wantPlay); }, { once: true });
      markThumbs();
    }
    function pickTask(task) {
      const sets = C.sets.filter((s) => s.task === task);
      const cur = st.set && sets.find((s) => s.label === st.set.label);
      const first = (cur || sets[0]).id;
      pills($("cmpScene"), sets.map((s) => [s.id, s.label]), first, pickSet);
      pickSet(first);
    }
    $("cmpLeft").addEventListener("change", (e) => { st.left = e.target.value; markThumbs(); });
    $("cmpRight").addEventListener("change", (e) => { st.right = e.target.value; markThumbs(); });
    range.addEventListener("input", () => slider.style.setProperty("--pos", range.value + "%"));
    $("cmpPlay").addEventListener("click", () => setPlaying(!wantPlay));
    scrub.addEventListener("input", () => { setPlaying(false); video.currentTime = (Number(scrub.value) + 0.5) / st.set.fps; });
    video.addEventListener("seeked", () => paint(true));
    new IntersectionObserver((e) => { visible = e[0].isIntersecting; setPlaying(wantPlay); }, { threshold: 0.15 }).observe(slider);
    segmented($("cmpTask"), TASKS, "render", pickTask);
    pickTask("render");
    loop();
  }).catch(() => { $("cmpThumbs").textContent = "Comparison videos could not be loaded."; });

  /* ---------------- trajectories (Plotly loaded on demand) ---------------- */
  const PLOTLY = "https://cdn.jsdelivr.net/npm/plotly.js-gl3d-dist-min@2.35.2/plotly-gl3d.min.js";
  const TNAME = { endos3: "EndoS³ (ours)", dds_base: "DDS-SLAM", sni: "SNI-SLAM", sgs: "SGS-SLAM", semgauss: "SemGauss-SLAM", perseus: "PERSEUS" };
  let T = null; const ts = { seq: new URLSearchParams(location.search).get("traj") || "C1", base: "sni" };
  function plotTraj() {
    if (!T || !window.Plotly) return;
    const d = T[ts.seq], xyz = (p) => ({ x: p.map((q) => q[0]), y: p.map((q) => q[1]), z: p.map((q) => q[2]) });
    const line = (key, color, width, dash, name, extra = {}) => Object.assign({ type: "scatter3d", mode: "lines", ...xyz(d[key].xyz),
      name, line: { color, width, dash }, hovertemplate: `${name}<br>x %{x:.1f} · y %{y:.1f} · z %{z:.1f} mm<extra></extra>` }, extra);
    const traces = [line("gt", css("--gt"), 4, "dash", "Ground truth")];
    if (ts.base === "all") {
      Object.keys(TNAME).filter((k) => k !== "endos3").forEach((k, i) =>
        traces.push(line(k, css("--others"), 2.5, "solid", `${TNAME[k]} — ${d[k].ate.toFixed(2)} mm`, { legendgroup: "b", showlegend: true })));
    } else {
      traces.push(line(ts.base, css("--base"), 3.5, "solid", `${TNAME[ts.base]} — ATE ${d[ts.base].ate.toFixed(2)} mm`));
    }
    traces.push(line("endos3", css("--ours"), 6, "solid", `EndoS³ (ours) — ATE ${d.endos3.ate.toFixed(2)} mm`));
    // Fit the view to this sequence: true proportions, longest axis across the wide panel (up = middle axis),
    // looking mostly down the thinnest axis with a slight tilt so the path still reads as 3-D.
    const pts = traces.flatMap((t) => t.x.map((_, i) => [t.x[i], t.y[i], t.z[i]]));
    const lo = [0, 1, 2].map((a) => Math.min(...pts.map((p) => p[a]))), hi = [0, 1, 2].map((a) => Math.max(...pts.map((p) => p[a])));
    const span = [0, 1, 2].map((a) => hi[a] - lo[a]), big = Math.max(...span);
    const ar = span.map((s) => Math.max(s / big, 0.12));
    const [S, M, L] = [0, 1, 2].sort((a, b) => span[a] - span[b]);
    const unit = (a, k) => [0, 1, 2].map((i) => (i === a ? k : 0));
    const dir = [0, 1, 2].map((i) => unit(S, 1)[i] + unit(M, 0.38)[i] + unit(L, 0.22)[i]);
    const n = Math.hypot(...dir), dist = 0.6 + 0.65 * (ar[M] + ar[S]), e = dir.map((v) => (v / n) * dist);   // boxier paths: camera further back
    const ink = css("--ink-2"), grid = css("--line"), font = getComputedStyle(document.body).fontFamily;
    const ax = (t) => ({ title: { text: t, font: { size: 12, color: ink } }, color: ink, gridcolor: grid, zerolinecolor: grid, linecolor: grid,
      showbackground: false, tickfont: { size: 11, color: ink }, nticks: 5 });
    Plotly.react($("trajPlot"), traces, {
      paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: "rgba(0,0,0,0)", margin: { l: 0, r: 0, t: 36, b: 0 },
      font: { family: font, color: ink, size: 13 },
      legend: { orientation: "h", x: 0, y: 1, yanchor: "bottom", bgcolor: "rgba(0,0,0,0)", font: { size: 13 } },
      scene: { aspectmode: "manual", aspectratio: { x: ar[0], y: ar[1], z: ar[2] },
        xaxis: ax("x (mm)"), yaxis: ax("y (mm)"), zaxis: ax("z (mm)"),
        camera: { eye: { x: e[0], y: e[1], z: e[2] }, up: { x: unit(M, 1)[0], y: unit(M, 1)[1], z: unit(M, 1)[2] }, center: { x: 0, y: 0, z: 0 } } }
    }, { displaylogo: false, responsive: true, modeBarButtonsToRemove: ["toImage"] });
  }
  function initTraj() {
    const seqs = Object.keys(T);
    pills($("trajSeq"), seqs.map((s) => [s, s]), ts.seq, (s) => { ts.seq = s; plotTraj(); });
    fillSelect($("trajBase"), [...Object.keys(TNAME).filter((k) => k !== "endos3").map((k) => [k, TNAME[k]]), ["all", "All baselines"]], ts.base);
    $("trajBase").addEventListener("change", (e) => { ts.base = e.target.value; plotTraj(); });
    $("trajPlot").innerHTML = ""; plotTraj();
  }
  const io = new IntersectionObserver((ents) => {
    if (!ents.some((e) => e.isIntersecting)) return;
    io.disconnect();
    const s = document.createElement("script"); s.src = PLOTLY; s.async = true;
    Promise.all([fetch("static/data/trajectories.json").then((r) => r.json()), new Promise((ok, no) => { s.onload = ok; s.onerror = no; document.head.appendChild(s); })])
      .then(([data]) => { T = data; initTraj(); })
      .catch(() => { $("trajPlot").innerHTML = '<p class="muted loading">The 3-D viewer could not be loaded.</p>'; });
  }, { rootMargin: "400px" });
  io.observe($("trajPlot"));
})();
