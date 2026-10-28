(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage unavailable */ } }
  };

  /* ---------------- theme ---------------- */
  const saved = new URLSearchParams(location.search).get("theme") || store.get("endos3-theme");
  if (saved) document.documentElement.dataset.theme = saved;
  const isDark = () => document.documentElement.dataset.theme === "dark" ||
    (!document.documentElement.dataset.theme && matchMedia("(prefers-color-scheme: dark)").matches);
  const themeListeners = [];
  $("themeToggle").addEventListener("click", () => {
    const next = isDark() ? "light" : "dark";
    document.documentElement.dataset.theme = next; store.set("endos3-theme", next);
    themeListeners.forEach((f) => f());
  });

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
    const c2 = m.only === "sup" ? "" : " C2 is scored on its first 360 frames; the full sequence is the failure case discussed in the paper's supplementary material.";
    $("metricNote").textContent = `${m.note} Bold: best; underlined: second.${c2}`;
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

  /* ---------------- comparison slider ---------------- */
  const TASKS = [["render", "Rendering"], ["depth", "Depth"], ["semantics", "Semantics"]];
  const BETTER = { render: "max", depth: "min", semantics: "max" };
  const NOTE = {
    render: "Badges: PSNR of each method on this frame.",
    depth: "Depth maps on one shared colour scale (FoundationStereo reference). Badges: median |depth − FoundationStereo| on this frame.",
    semantics: "Badges: frame mIoU (%). CRCD++ colours: liver red, gallbladder green, tool blue."
  };
  fetch("static/data/compare.json").then((r) => r.json()).then((C) => {
    const st = { task: "render", set: null, left: null, right: "endos3" };
    const range = $("cmpRange"), slider = $("slider");
    const label = (set, k) => (k === "gt" && set.gt_note) ? `Ground truth (${set.gt_note})` : C.names[k] || k;
    const badge = (set, k) => set.badge[k] ? ` · <b>${set.badge[k]}</b>` : "";
    const keys = (set) => [set.ref, ...(set.ref === "gt" ? ["input"] : []), "endos3", ...Object.keys(set.tiles).filter((k) => !["input", "gt", "ref", "endos3"].includes(k))];
    function bestBaseline(set) {
      const b = Object.keys(set.badge).filter((k) => k !== "endos3");
      const v = (k) => parseFloat(set.badge[k]);
      return b.sort((a, c) => BETTER[set.task] === "max" ? v(c) - v(a) : v(a) - v(c))[0];
    }
    function draw() {
      const set = st.set;
      $("imgLeft").src = set.tiles[st.left]; $("imgLeft").alt = label(set, st.left);
      $("imgRight").src = set.tiles[st.right]; $("imgRight").alt = label(set, st.right);
      $("tagLeft").innerHTML = label(set, st.left) + badge(set, st.left);
      $("tagRight").innerHTML = label(set, st.right) + badge(set, st.right);
      $("cmpLeft").value = st.left; $("cmpRight").value = st.right;
      let note = NOTE[set.task];
      if (set.task === "depth" && set.scale) note += ` Colour scale ${set.scale[0]}–${set.scale[1]} mm.`;
      if (set.task === "semantics" && set.gt_note) note = "Badges: frame mIoU (%) against the DeepLabV3+ masks every method received (as in the paper). Semantic-SuPer colours: beef purple, chicken amber, tool blue.";
      $("cmpNote").textContent = note;
      [...$("cmpThumbs").children].forEach((t) => {
        t.classList.toggle("is-left", t.dataset.k === st.left); t.classList.toggle("is-right", t.dataset.k === st.right);
      });
    }
    function pickSet(id) {
      const set = C.sets.find((s) => s.id === id); st.set = set;
      const opts = keys(set).map((k) => [k, label(set, k)]);
      st.left = bestBaseline(set); st.right = "endos3";
      fillSelect($("cmpLeft"), opts, st.left); fillSelect($("cmpRight"), opts, st.right);
      const th = $("cmpThumbs"); th.innerHTML = "";
      keys(set).forEach((k) => {
        const b = document.createElement("button");
        b.type = "button"; b.className = "thumb" + (set.id.includes("trial") ? " sup" : ""); b.dataset.k = k;
        b.title = `Show ${label(set, k)} on the left`;
        b.innerHTML = `<img src="${set.tiles[k]}" alt="" loading="lazy"><span>${k === "endos3" ? "<b>Ours</b>" : (k === "gt" && set.gt_note ? "Input labels" : C.names[k])}<em>${set.badge[k] || ""}</em></span>`;
        b.addEventListener("click", () => { if (k === st.right) return; st.left = k; draw(); });
        th.appendChild(b);
      });
      draw();
    }
    function pickTask(task) {
      st.task = task;
      const sets = C.sets.filter((s) => s.task === task);
      pills($("cmpScene"), sets.map((s) => [s.id, s.label]), sets[0].id, pickSet);
      pickSet(sets[0].id);
    }
    $("cmpLeft").addEventListener("change", (e) => { st.left = e.target.value; draw(); });
    $("cmpRight").addEventListener("change", (e) => { st.right = e.target.value; draw(); });
    range.addEventListener("input", () => slider.style.setProperty("--pos", range.value + "%"));
    segmented($("cmpTask"), TASKS, "render", pickTask);
    pickTask("render");
  }).catch(() => { $("cmpNote").textContent = "Comparison data could not be loaded (open the page through a web server, not as a local file)."; });

  /* ---------------- trajectories (Plotly loaded on demand) ---------------- */
  const PLOTLY = "https://cdn.jsdelivr.net/npm/plotly.js-gl3d-dist-min@2.35.2/plotly-gl3d.min.js";
  const TNAME = { endos3: "EndoS³ (ours)", dds_base: "DDS-SLAM", sni: "SNI-SLAM", sgs: "SGS-SLAM", semgauss: "SemGauss-SLAM", perseus: "PERSEUS" };
  let T = null; const ts = { seq: "C1", base: "sni" };
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
    const ink = css("--ink-2"), grid = css("--line");
    const ax = (t) => ({ title: { text: t, font: { size: 12, color: ink } }, color: ink, gridcolor: grid, zerolinecolor: grid, showbackground: false, tickfont: { size: 10 } });
    Plotly.react($("trajPlot"), traces, {
      paper_bgcolor: "rgba(0,0,0,0)", margin: { l: 0, r: 0, t: 44, b: 0 },
      font: { family: "Inter, sans-serif", color: ink },
      legend: { orientation: "h", x: 0, y: 1, yanchor: "bottom", bgcolor: "rgba(0,0,0,0)", font: { size: 12 } },
      scene: { aspectmode: "data", xaxis: ax("x (mm)"), yaxis: ax("y (mm)"), zaxis: ax("z (mm)"), camera: { eye: { x: 1.9, y: 1.9, z: 1.2 } } }
    }, { displaylogo: false, responsive: true, modeBarButtonsToRemove: ["toImage"] });
  }
  function initTraj() {
    const seqs = Object.keys(T);
    pills($("trajSeq"), seqs.map((s) => [s, s + (s === "C2" ? " (frames 0–359)" : "")]), ts.seq, (s) => { ts.seq = s; plotTraj(); });
    fillSelect($("trajBase"), [...Object.keys(TNAME).filter((k) => k !== "endos3").map((k) => [k, TNAME[k]]), ["all", "All baselines"]], ts.base);
    $("trajBase").addEventListener("change", (e) => { ts.base = e.target.value; plotTraj(); });
    $("trajPlot").innerHTML = ""; plotTraj();
  }
  themeListeners.push(plotTraj);
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", plotTraj);
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
