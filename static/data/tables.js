// Paper tables, values and marks verbatim from the paper (bold = best "**", underline = second "_").
// Column order as in the paper: C1 C2 C3 G3 E3 Avg (+ Semantic-SuPer where the paper reports it).
window.PAPER = {
  seqs: ["C1", "C2", "C3", "G3", "E3", "Avg."],
  methods: {
    dds: "DDS-SLAM", sni: "SNI-SLAM", sgs: "SGS-SLAM", semgauss: "SemGauss-SLAM",
    perseus: "PERSEUS", semsuper: "Semantic-SuPer", ours: "EndoS³ (ours)"
  },
  metrics: [
    { id: "ate", label: "Tracking ATE", unit: "mm", dir: "↓", note: "ATE-RMSE after Sim(3) alignment.",
      rows: {
        dds:      ["1.78", "3.36", "6.59", "4.83", "**5.13", "4.34"],
        sni:      ["_1.56", "**1.48", "6.96", "2.60", "5.75", "_3.67"],
        sgs:      ["2.13", "5.34", "8.54", "4.24", "_5.21", "5.09"],
        semgauss: ["2.27", "5.00", "_5.86", "_1.87", "5.41", "4.08"],
        perseus:  ["2.90", "5.29", "9.90", "2.92", "5.82", "5.37"],
        ours:     ["**1.31", "_2.24", "**4.48", "**1.80", "5.29", "**3.03"] } },
    { id: "depth", label: "Depth", unit: "mm", dir: "↓", note: "Depth error against FoundationStereo pseudo-ground truth.",
      rows: {
        dds:      ["11.1", "19.9", "13.4", "8.0", "_14.8", "13.45"],
        sni:      ["5.1", "17.9", "14.3", "8.8", "17.6", "12.72"],
        sgs:      ["_3.1", "_16.8", "_6.2", "_2.3", "21.7", "_10.04"],
        semgauss: ["3.2", "18.5", "8.4", "3.2", "26.0", "11.86"],
        perseus:  ["20.7", "114.9", "75.0", "6.5", "302.4", "103.90"],
        semsuper: ["10.2", "–", "16.1", "3.1", "35.3", "–"],
        ours:     ["**2.2", "**4.6", "**3.1", "**1.8", "**3.1", "**2.96"] } },
    { id: "miou", label: "Semantics mIoU", unit: "%", dir: "↑", note: "Mean IoU of the rendered semantic map.",
      rows: {
        sni:      ["63.6", "52.1", "60.2", "32.6", "41.5", "50.0"],
        sgs:      ["_86.3", "_53.8", "_62.2", "**52.8", "42.2", "_59.5"],
        semgauss: ["84.8", "41.2", "48.2", "48.9", "_48.4", "54.3"],
        ours:     ["**91.5", "**78.8", "**84.3", "_51.9", "**81.9", "**77.7"] } },
    { id: "psnr", label: "PSNR", unit: "dB", dir: "↑", sup: true, note: "Rendering quality. PERSEUS has no renderer.",
      rows: {
        dds:      ["_22.19", "_19.52", "_21.68", "**22.90", "_21.47", "_21.55", "_30.81"],
        sni:      ["19.32", "16.09", "16.60", "16.39", "18.61", "17.40", "22.47"],
        sgs:      ["20.79", "13.81", "18.30", "18.44", "12.13", "16.69", "22.72"],
        semgauss: ["20.21", "15.03", "17.05", "17.67", "11.95", "16.38", "23.01"],
        semsuper: ["11.02", "7.87", "7.74", "8.11", "9.90", "8.93", "17.12"],
        ours:     ["**29.26", "**20.28", "**22.95", "_19.12", "**26.14", "**23.55", "**31.62"] } },
    { id: "ssim", label: "SSIM", unit: "", dir: "↑", sup: true, note: "Rendering quality. PERSEUS has no renderer.",
      rows: {
        dds:      ["0.667", "_0.583", "0.596", "0.580", "_0.639", "0.613", "_0.792"],
        sni:      ["0.694", "0.552", "0.631", "0.703", "0.577", "0.631", "0.660"],
        sgs:      ["_0.782", "0.524", "_0.780", "_0.810", "0.486", "_0.676", "0.721"],
        semgauss: ["0.770", "0.563", "0.734", "0.779", "0.491", "0.667", "0.718"],
        semsuper: ["0.257", "0.058", "0.154", "0.135", "0.230", "0.167", "0.542"],
        ours:     ["**0.893", "**0.783", "**0.813", "**0.867", "**0.868", "**0.845", "**0.867"] } },
    { id: "lpips", label: "LPIPS", unit: "", dir: "↓", sup: true, note: "Rendering quality. PERSEUS has no renderer.",
      rows: {
        dds:      ["0.669", "0.720", "0.717", "0.734", "_0.644", "0.697", "_0.248"],
        sni:      ["0.584", "0.701", "0.640", "0.615", "0.660", "0.640", "0.448"],
        sgs:      ["_0.342", "_0.594", "_0.460", "_0.494", "0.646", "_0.507", "0.333"],
        semgauss: ["0.347", "0.605", "0.515", "0.556", "0.701", "0.545", "0.304"],
        semsuper: ["0.819", "0.888", "0.992", "0.941", "0.858", "0.900", "0.611"],
        ours:     ["**0.250", "**0.419", "**0.383", "**0.375", "**0.321", "**0.350", "**0.217"] } },
    { id: "pins", label: "Tissue tracking", unit: "px", dir: "↓", only: "sup", note: "Semantic-SuPer: reprojection error of the tracked tissue pins.",
      rows: {
        dds: ["9.21"], sni: ["9.70"], sgs: ["_9.04"], semgauss: ["9.59"], perseus: ["10.16"], semsuper: ["23.17"], ours: ["**8.20"] } }
  ]
};
