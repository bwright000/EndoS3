"""Builds the project page's trajectory data (comparison videos: tools/export_videos.py) from the IPCAI benchmark (run once, locally; paths are the author's machine).
  static/data/trajectories.json    Sim(3)-aligned, lag-shifted trajectories in mm, scored exactly as the paper's ATE table
                                   (C2 = its first 360 frames, as in the paper)
python tools/export_assets.py"""
import json, os, sys
R = "C:/Users/benli/AppData/Local/Temp/claude/c--Users-benli-OneDrive-Documents-GitHub-DDS-SLAM/6320f912-238e-4800-bfcb-57c00413741a/scratchpad/results"
SITE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, R); sys.path.insert(0, "F:/Datasets/IPCAI 2027/Figures"); os.chdir(R)
import cv2, numpy as np
import make_figs as F, make_paper_figs as P, bench_layout as L

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
