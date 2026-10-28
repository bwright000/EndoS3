"""3-D frame for the project page (user 10-28): the paper's Fig 3 CRCD frame (E3_005 frame 192), every method's rendered RGB + depth
back-projected through the snippet intrinsics into a coloured point cloud in the camera frame (mm), plus the FoundationStereo
reference (input RGB on FS depth, FS-valid pixels only). Same sources as Fig 3: post-refinement renders/depth (DDS-SLAM live).
Every 2nd pixel in u and v, raw depth as rendered (no edge / flying-pixel filter: a 3x3-range filter removed 40-63% of the
baselines' points because their depth is noisy, which would misrepresent them).
Scores: median |d - FS| on FS-valid pixels (mm), and the frame's PSNR from each run's eval CSV, as in Fig 3.
Writes static/data/cloud/<key>.bin (uint16 depth in 0.01 mm, 0 = no point; then uint8 RGB) and static/data/cloud.json.
python tools/export_cloud.py"""
import json, os, sys
R = "C:/Users/benli/AppData/Local/Temp/claude/c--Users-benli-OneDrive-Documents-GitHub-DDS-SLAM/6320f912-238e-4800-bfcb-57c00413741a/scratchpad/results"
SITE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, R); sys.path.insert(0, "F:/Datasets/IPCAI 2027/Figures"); os.chdir(R)
import cv2, numpy as np
import make_paper_figs as P, make_ipcai_crcd as I

SEQ, FR, S = "E3_005", 192, 2
M = ["endos3", "dds_base", "sni", "sgs", "semgauss"]
OUT = os.path.join(SITE, "static", "data", "cloud"); os.makedirs(OUT, exist_ok=True)


def write(key, z, rgb, ok):
    z, rgb, ok = z[::S, ::S], rgb[::S, ::S], ok[::S, ::S]
    q = np.where(ok, np.clip(np.round(z * 100), 1, 65535), 0).astype("<u2")
    with open(os.path.join(OUT, f"{key}.bin"), "wb") as f:
        f.write(q.tobytes()); f.write(np.ascontiguousarray(rgb, dtype=np.uint8).tobytes())
    return int(ok.sum())


fs, tri = I.fs_depth(SEQ, FR); okF = tri & (fs > 0)
K = I.crcd_K(SEQ); H, W = fs.shape
info = {"fs": dict(n=write("fs", fs, P.input_img("CRCD", SEQ, FR), okF))}
for m in M:
    d = I.method_depth(m, SEQ, FR); v = okF & (d > 0)
    info[m] = dict(n=write(m, d, P.render_img("CRCD", m, SEQ, FR), d > 0), err=round(float(np.median(np.abs(d[v] - fs[v]))), 2),
                   psnr=round(I.psnr_at(SEQ, m, FR), 2))
names = {"fs": "FoundationStereo", "endos3": "EndoS³ (ours)", "dds_base": "DDS-SLAM", "sni": "SNI-SLAM", "sgs": "SGS-SLAM",
         "semgauss": "SemGauss-SLAM"}
meta = dict(seq=SEQ, frame=FR, w=W // S, h=H // S, stride=S, fx=K["fx"] / S, fy=K["fy"] / S, cx=K["cx"] / S, cy=K["cy"] / S,
            zmed=round(float(np.median(fs[okF])), 1), keys=["fs"] + M, names=names, info=info)
json.dump(meta, open(os.path.join(SITE, "static", "data", "cloud.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(json.dumps(info))
