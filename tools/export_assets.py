"""Builds the project page's data assets from the IPCAI benchmark (run once, locally; paths are the author's machine).
  static/img/cmp/<set>/<key>.jpg   per-method tiles for the comparison sliders (same frames + sources as the paper figures)
  static/data/compare.json         slider sets: tiles, per-panel metric badges
  static/data/trajectories.json    Sim(3)-aligned, lag-shifted trajectories in mm, scored exactly as the paper's ATE table
                                   (C2 = its first 360 frames, as in the paper)
python tools/export_assets.py"""
import json, os, sys
R = "C:/Users/benli/AppData/Local/Temp/claude/c--Users-benli-OneDrive-Documents-GitHub-DDS-SLAM/6320f912-238e-4800-bfcb-57c00413741a/scratchpad/results"
SITE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, R); sys.path.insert(0, "F:/Datasets/IPCAI 2027/Figures"); os.chdir(R)
import cv2, numpy as np
import make_figs as F, make_paper_figs as P, bench_layout as L
import make_combo_fig3_20261027 as C
import fig4_semantics_recipe_20261028 as S4

IMG = os.path.join(SITE, "static", "img", "cmp")
NAME = {"input": "Input", "gt": "Ground truth", "ref": "FoundationStereo", "endos3": "EndoS³ (ours)", "dds_base": "DDS-SLAM",
        "sni": "SNI-SLAM", "sgs": "SGS-SLAM", "semgauss": "SemGauss-SLAM", "perseus": "PERSEUS"}


def put(set_id, key, rgb, w=1280):
    d = os.path.join(IMG, set_id); os.makedirs(d, exist_ok=True)
    if rgb.dtype != np.uint8:
        rgb = (np.clip(rgb, 0, 1) * 255).astype(np.uint8)
    if rgb.shape[1] > w:
        rgb = cv2.resize(rgb, (w, round(rgb.shape[0] * w / rgb.shape[1])), interpolation=cv2.INTER_AREA)
    cv2.imwrite(os.path.join(d, f"{key}.jpg"), cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 86])
    return f"static/img/cmp/{set_id}/{key}.jpg"


sets = []
# ---- render + depth: the paper's combined figure frames (make_combo_fig3_20261027, v5e)
for (cs, cf), (st, sf) in ((("E3_005", 192), ("trial_3", 128)), (("C2_001", 97), ("trial_8", 121))):
    B = C.build_set((cs, cf), (st, sf))
    for ds, seq, fr, k, inp in (("CRCD", cs, cf, "C", P.input_img("CRCD", cs, cf)), ("SemSup", st, sf, "S", P.sup_rgb(st, sf))):
        sid = f"render_{seq}_{fr}"
        tiles = {"input": put(sid, "input", inp)} | {m: put(sid, m, P.render_img(ds, m, seq, fr)) for m in C.M}
        lab = f"CRCD++ {seq.split('_')[0]}, frame {fr}" if ds == "CRCD" else f"Semantic-SuPer {seq.replace('_', ' ')}, frame {fr}"
        sets.append(dict(id=sid, task="render", label=lab, ref="input", tiles=tiles,
                         badge={m: f"{B['psnr'][k][m]:.1f} dB" for m in C.M}, metric="PSNR"))
    sid = f"depth_{cs}_{cf}"
    DC = B["rows"][2][2]
    tiles = {"ref": put(sid, "ref", DC["ref"])} | {m: put(sid, m, DC[m]) for m in C.M}
    lo, hi, cm = B["scales"]["crcd_depth_mm"]
    sets.append(dict(id=sid, task="depth", label=f"CRCD++ {cs.split('_')[0]}, frame {cf}", ref="ref", tiles=tiles,
                     badge={m: f"{B['med']['C'][m]:.1f} mm" for m in C.M}, metric="median |d - FS|", scale=[lo, hi, cm]))
# ---- semantics: Fig 4 frames (fig4_semantics_recipe_20261028)
labs = [f"CRCD++ {s.split('_')[0]}, frame {i}" for s, i in S4.CRCD_ROWS] + [f"Semantic-SuPer {t.replace('_', ' ')}, frame {i}" for t, i in S4.SUP_ROWS]
ids = [f"sem_{s}_{i}" for s, i in S4.CRCD_ROWS + S4.SUP_ROWS]
for (rgb, gt, preds, _), lab, sid in zip(S4.rows(), labs, ids):
    tiles = {"input": put(sid, "input", rgb), "gt": put(sid, "gt", gt)} | {m: put(sid, m, im) for m, (im, _) in zip(S4.METHODS, preds)}
    sets.append(dict(id=sid, task="semantics", label=lab, ref="gt", tiles=tiles,
                     badge={m: f"{v:.1f}" for m, (_, v) in zip(S4.METHODS, preds)}, metric="frame mIoU (%)",
                     gt_note="DeepLabV3+ input" if "trial" in sid else None))
json.dump(dict(names=NAME, sets=sets), open(os.path.join(SITE, "static", "data", "compare.json"), "w", encoding="utf-8"), indent=1, ensure_ascii=False)
print("compare sets:", [s["id"] for s in sets])

# ---- trajectories (paper ATE table: Sim(3) Umeyama, post-refinement trajectories, C2 first 360 frames, GT lag shift)
TM = ["endos3", "dds_base", "sni", "sgs", "semgauss", "perseus"]
traj = {}
for seq in ("C1_001", "C2_001", "C3_001", "G3_001", "E3_005"):
    gt_all = F.load_gt_tum(F.gt_path("CRCD", seq)); sh = F.LAG_SHIFT.get(seq, 0); out = {}; glong = None
    for m in TM:
        est = F.load_est(F.est_path(L.run("CRCD", m, seq), m))
        if seq == "C2_001":
            est = est[:360]
        g = gt_all[:len(est)]
        if sh < 0:
            est, g = est[-sh:], gt_all[:len(est) + sh]
        al, _ = F.umeyama(est, g, True); e = np.linalg.norm(al - g, axis=1) * 1e3
        out[m] = dict(xyz=np.round((al - gt_all[0]) * 1e3, 3).tolist(), ate=round(float(np.sqrt((e ** 2).mean())), 2))   # origin = GT start (g[0] == gt_all[0])
        glong = g if glong is None or len(g) > len(glong) else glong
    out["gt"] = dict(xyz=np.round((glong - gt_all[0]) * 1e3, 3).tolist())
    traj[seq.split("_")[0]] = out
    print(seq, {m: out[m]["ate"] for m in TM})
json.dump(traj, open(os.path.join(SITE, "static", "data", "trajectories.json"), "w"), separators=(",", ":"))
