"""Comparison videos for the project page (user 10-28): per sequence and task, ONE video holding every method as a tile
(3 x 2 grid), so the page can draw any two tiles frame-locked from a single decoder, plus per-frame scores per tile.
Sources and metrics are the paper figures' (make_combo_fig3_20261027 / fig4_semantics_recipe_20261028):
  render     input + renders (post-refinement; DDS-SLAM live)          score: per-frame PSNR from each run's eval CSV
  depth      FoundationStereo + rendered depth, one magma scale per sequence (FS 2nd-98th pct over all frames)
                                                                       score: median |d - FS| on FS-valid pixels (mm)
  semantics  reference labels + input + semantic renders              score: frame mIoU (%) vs the reference
             (CRCD++: ground truth; SemSup: the DeepLabV3+ masks every method received)
Writes static/video/cmp/<seq>_<task>.mp4 and static/data/compare_video.json.
python tools/export_videos.py"""
import json, os, subprocess, sys
R = "C:/Users/benli/AppData/Local/Temp/claude/c--Users-benli-OneDrive-Documents-GitHub-DDS-SLAM/6320f912-238e-4800-bfcb-57c00413741a/scratchpad/results"
SITE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, R); sys.path.insert(0, "F:/Datasets/IPCAI 2027/Figures"); os.chdir(R)
import cv2, numpy as np, matplotlib.pyplot as plt
from matplotlib.colors import Normalize
import make_figs as F, make_paper_figs as P, make_ipcai_crcd as I, make_ipcai_depth as D
from make_combo_fig_20261026 import colour, sup_tri
import fig4_semantics_recipe_20261028 as S4

OUT_V = os.path.join(SITE, "static", "video", "cmp"); os.makedirs(OUT_V, exist_ok=True)
M = ["endos3", "dds_base", "sni", "sgs", "semgauss"]
SEQS = [("CRCD", "E3_005", range(0, 265), 24, "CRCD++ E3"), ("CRCD", "C2_001", range(0, 360), 24, "CRCD++ C2"),
        ("SemSup", "trial_3", range(0, 151), 12, "SemSup trial 3")]
TW = 640                                                     # tile width; height from the dataset's aspect


class Enc:
    """streams frames into ffmpeg (a whole C2 grid sequence would be ~1.5 GB in memory)."""
    def __init__(self, path, fps):
        self.path, self.fps, self.p = path, fps, None

    def append(self, f):
        if self.p is None:
            h, w = f.shape[:2]
            self.p = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{w}x{h}", "-r", str(self.fps),
                                       "-i", "-", "-c:v", "libx264", "-preset", "slow", "-crf", "26", "-pix_fmt", "yuv420p",
                                       "-movflags", "+faststart", "-an", self.path], stdin=subprocess.PIPE)
        self.p.stdin.write(np.ascontiguousarray(f).tobytes())

    def close(self):
        self.p.stdin.close(); assert self.p.wait() == 0, self.path


def atlas(tiles, th):
    """6 tiles -> 3 x 2 grid, row-major."""
    t = [cv2.resize(x, (TW, th), interpolation=cv2.INTER_AREA) if x.shape[:2] != (th, TW) else x for x in tiles]
    return np.vstack([np.hstack(t[0:3]), np.hstack(t[3:6])])


def u8(x):
    return x if x.dtype == np.uint8 else (np.clip(x, 0, 1) * 255).astype(np.uint8)


sets = []
for ds, seq, frames, fps, label in SEQS:
    crcd = ds == "CRCD"; th = 360 if crcd else 480
    inp = (lambda i: P.input_img("CRCD", seq, i)) if crcd else (lambda i: P.sup_rgb(seq, i))
    tag = seq.split("_")[0] if crcd else seq
    # ---------- render
    ps = {m: dict(zip(*P.psnr_series(ds, m, seq))) for m in M}
    keys = ["input"] + M
    vid, sc = Enc(os.path.join(OUT_V, f"{tag}_render.mp4"), fps), {m: [] for m in M}
    for i in frames:
        vid.append(atlas([u8(inp(i))] + [P.render_img(ds, m, seq, i) for m in M], th))
        for m in M:
            sc[m].append(round(float(ps[m][i]), 2))
    vid.close()
    sets.append(dict(id=f"{tag}_render", task="render", label=label, src=f"static/video/cmp/{tag}_render.mp4", keys=keys, ref="input",
                     tile=[TW, th], fps=fps, n=len(frames), unit="dB", better="max", scores=sc))
    print(seq, "render", {m: round(float(np.mean(v)), 2) for m, v in sc.items()}, flush=True)
    # ---------- depth
    ref = (lambda i: I.fs_depth(seq, i)) if crcd else (lambda i: (D.sup_depth_fs(seq, i), sup_tri(seq, i)))
    mdep = (lambda m, i: I.method_depth(m, seq, i)) if crcd else (lambda m, i: D.sup_method_depth(m, seq, i))
    vals = np.concatenate([ref(i)[0][(ref(i)[1]) & (ref(i)[0] > 0)] for i in frames[::10]])
    lo, hi = np.percentile(vals, (2, 98)); nrm = Normalize(lo, hi); cm = plt.get_cmap("magma")
    vid, sc = Enc(os.path.join(OUT_V, f"{tag}_depth.mp4"), fps), {m: [] for m in M}
    for i in frames:
        z, ok = ref(i); ok = ok & (z > 0)
        tiles = [colour(z, z > 0, cm, nrm)]
        for m in M:
            d = mdep(m, i); tiles.append(colour(d, d > 0, cm, nrm))
            v = ok & (d > 0); sc[m].append(round(float(np.median(np.abs(d[v] - z[v]))), 2) if v.any() else None)
        vid.append(atlas(tiles, th))
    vid.close()
    sets.append(dict(id=f"{tag}_depth", task="depth", label=label, src=f"static/video/cmp/{tag}_depth.mp4", keys=["ref"] + M, ref="ref",
                     tile=[TW, th], fps=fps, n=len(frames), unit="mm", better="min", scores=sc, scale=[round(float(lo), 1), round(float(hi), 1)]))
    print(seq, "depth", {m: round(float(np.nanmean([x for x in v if x is not None])), 2) for m, v in sc.items()}, flush=True)
    # ---------- semantics (no DDS-SLAM: it outputs no semantic map)
    SM = ["endos3", "sgs", "sni", "semgauss"]
    vid, sc = Enc(os.path.join(OUT_V, f"{tag}_semantics.mp4"), fps), {m: [] for m in SM}
    for i in frames:
        rgb = u8(inp(i))
        if crcd:
            g = I.crcd_sem_gt(seq, i); ov = P.overlay_ann
            preds = {m: F.sem_pred(m, seq, i, S4.SRC) for m in SM}; mi = F.miou
        else:
            g = np.load(f"{P.SUP}/{seq}/seg/DeepLabV3+/{i:06d}-left.npy").argmax(0).astype(int); ov = S4.overlay_sup
            preds = {m: S4.sup_pred(m, seq, i) for m in SM}; mi = F.miou
        vid.append(atlas([ov(rgb, g), rgb] + [ov(rgb, preds[m]) for m in SM], th))
        for m in SM:
            sc[m].append(round(float(mi(g, preds[m])), 1))
    vid.close()
    sets.append(dict(id=f"{tag}_semantics", task="semantics", label=label, src=f"static/video/cmp/{tag}_semantics.mp4", keys=["gt", "input"] + SM,
                     ref="gt", tile=[TW, th], fps=fps, n=len(frames), unit="%", better="max", scores=sc,
                     gt_note=None if crcd else "DeepLabV3+ input"))
    print(seq, "semantics", {m: round(float(np.mean(v)), 1) for m, v in sc.items()}, flush=True)

names = {"input": "Input", "gt": "Ground truth", "ref": "FoundationStereo", "endos3": "EndoS³ (ours)", "dds_base": "DDS-SLAM",
         "sni": "SNI-SLAM", "sgs": "SGS-SLAM", "semgauss": "SemGauss-SLAM"}
json.dump(dict(names=names, sets=sets), open(os.path.join(SITE, "static", "data", "compare_video.json"), "w", encoding="utf-8"),
          ensure_ascii=False, separators=(",", ":"))
print("done", [s["id"] for s in sets])
