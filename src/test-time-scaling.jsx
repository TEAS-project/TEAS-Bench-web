import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Download } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  LabelList,
} from "recharts";
import { BENCHMARK_ROWS } from "./data/tts-benchmarks/index.js";
import { HARDWARE_SPECS } from "./data/tts-benchmarks/hardware-specs.js";


/** --- Constants (outside the component) --- */

const Card = ({ children, className = "" }) => (
  <div className={`bg-slate-800/50 border border-slate-700 rounded-lg p-4 sm:p-6 md:p-8 ${className}`}>
    {children}
  </div>
);



// Helper to match selections to a row
const norm = (x) => String(x ?? "").trim().toLowerCase();
const isGptOssModel = (model) => norm(model).includes("gpt-oss");
const isQwenModel = (model) => norm(model).includes("qwen");
const SAMPLES_NONE_VALUE = "none"; // sentinel for meta.samples == null





// --- dropdown options (outside component) ---
const TTS_MODEL_OPTIONS = [
  { value: "gpt-oss-120b-high", label: "GPT-OSS-120B (HIGH)" },
  { value: "gpt-oss-120b-medium", label: "GPT-OSS-120B (MEDIUM)" },
  { value: "gpt-oss-120b-low", label: "GPT-OSS-120B (LOW)" },
  { value: "gpt-oss-20b-high", label: "GPT-OSS-20B (HIGH)" },
  { value: "gpt-oss-20b-medium", label: "GPT-OSS-20B (MEDIUM)" },
  { value: "gpt-oss-20b-low", label: "GPT-OSS-20B (LOW)" },
  { value: "Qwen3-30B-A3B-Instruct-2507", label: "Qwen3-30B-A3B-Instruct-2507" },
  { value: "qwen3-4b-instruct-2507", label: "Qwen3-4B-Instruct-2507" },
  // { value: "deepseek-r1", label: "DeepSeek-R1" },
  // { value: "mixtral-8x22b", label: "Mixtral-8x22B" },
];

const TTS_QUANT_OPTIONS = [
  { value: "mxfp4", label: "mxfp4" },
  { value: "bf16", label: "BF16" },
  // { value: "fp16", label: "FP16" },
  // { value: "fp8", label: "FP8" },
  // { value: "int8", label: "INT8" },
  // { value: "int4", label: "INT4" },
];

const buildQuantOptionsForModel = (model) => {
  const gpt = isGptOssModel(model);
  const qwen = isQwenModel(model);

  return TTS_QUANT_OPTIONS.map((opt) => {
    const v = norm(opt.value);
    const disabled =
      (gpt && v === "bf16") ||   // GPT-OSS => disable fp16
      (qwen && v === "mxfp4");   // Qwen => disable mxfp4
    return { ...opt, disabled };
  });
};

const TTS_DATASET_OPTIONS = [
  { value: "aime25", label: "aime25" },
  // { value: "aime26", label: "aime26" },
  // { value: "imo_answerbench", label: "IMO AnswerBench" },
  { value: "GPQA Diamond", label: "GPQA Diamond" },
  // { value: "LiveCodeBench", label: "LiveCodeBench" },
];

const TTS_ENGINE_OPTIONS = [
  { value: "vllm", label: "vLLM" },
  { value: "sglang", label: "SGLang" },
  // { value: "tgi", label: "Text Generation Inference (TGI)" },
  // { value: "tensorrt-llm", label: "TensorRT-LLM" },
];

const simplifyName = (s) =>
  norm(s)
    .replace(/nvidia|amd|instinct|radeon/g, "")
    .replace(/[^a-z0-9]+/g, "");

const findHardwareSpecForGpu = (gpuName) => {
  const g = simplifyName(gpuName);
  // direct / fuzzy matching
  let best = null;
  let bestScore = -1;

  for (const hw of HARDWARE_SPECS) {
    const h = simplifyName(hw.name);
    // simple overlap score
    let score = 0;
    if (g.includes(h) || h.includes(g)) score += 10;
    if (g.includes("h100") && h.includes("h100")) score += 6;
    if (g.includes("h200") && h.includes("h200")) score += 6;
    if (g.includes("a100") && h.includes("a100")) score += 6;
    if (g.includes("mi300x") && h.includes("mi300x")) score += 6;
    if (g.includes("sxm") && h.includes("sxm")) score += 2;
    if (g.includes("pcie") && h.includes("pcie")) score += 2;

    if (score > bestScore) {
      bestScore = score;
      best = hw;
    }
  }
  return bestScore >= 6 ? best : null; // require minimal confidence
};

const isH100Name = (name) => simplifyName(name).includes("h100");

// Helper for dropdowns
const SelectControl = ({ label, value, onChange, options }) => (
  <div>
    <label className="block text-xs font-medium text-slate-400 mb-1">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs focus:border-blue-500 outline-none"
    >
      {options.map((opt) => (
        <option
          key={opt.value}
          value={opt.value}
          disabled={!!opt.disabled}   // ✅ allow greying-out
        >
          {opt.label}
        </option>
      ))}
    </select>
  </div>
);



// Filter rows with extra RSA controls (parallel + samples/k + maxTokens + sequential)
const filterBenchmarkRowsRSA = ({
  model,
  quant,
  dataset,
  engine,
  parallel,
  samplesValue,
  maxTokens,
  sequential,
}) =>
  BENCHMARK_ROWS.filter((r) =>
    norm(r.model) === norm(model) &&
    norm(r.quant) === norm(quant) &&
    norm(r.dataset) === norm(dataset) &&
    norm(r.engine) === norm(engine) &&
    (parallel == null || Number(r?.meta?.parallel) === Number(parallel)) &&
    (
      samplesValue == null
        ? true
        : samplesValue === SAMPLES_NONE_VALUE
          ? r?.meta?.samples == null
          : Number(r?.meta?.samples) === Number(samplesValue)
    ) &&
    (maxTokens == null || Number(r?.meta?.maxTokens) === Number(maxTokens)) &&
    (sequential == null || Number(r?.meta?.sequential) === Number(sequential))
  );


// Small SVG triangle marker (upright)
function TriangleDot(props) {
  const { cx, cy, fill, stroke } = props;
  if (cx == null || cy == null) return null;

  const size = 7; // tweak
  // Triangle path around (cx, cy)
  const d = `
    M ${cx} ${cy - size}
    L ${cx - size} ${cy + size}
    L ${cx + size} ${cy + size}
    Z
  `;

  return (
    <path
      d={d}
      fill={stroke || fill || "#22d3ee"}
      stroke={stroke || fill || "#22d3ee"}
      strokeWidth={1}
      opacity={0.95}
    />
  );
}

function CircleDot(props) {
  const { cx, cy, fill, stroke } = props;
  if (cx == null || cy == null) return null;

  const r = 6;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={r}
      fill={stroke || fill || "#94a3b8"}
      stroke={stroke || fill || "#94a3b8"}
      strokeWidth={1}
      opacity={0.95}
    />
  );
}

function HardwareTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;

  const p = payload[0].payload; // your hovered point
  if (!p) return null;

  const tag = p.source === "measured" ? "Measured" : "Projected";

  const fmt = (k, v) => {
    if (v == null) return "—";
    if (typeof v === "number") {
      // nice formatting for big numbers / floats
      if (k.toLowerCase().includes("gflops")) return v.toLocaleString();
      if (k.toLowerCase().includes("bandwidth")) return `${v.toLocaleString()} GB/s`;
      if (k.toLowerCase().includes("power")) return `${v.toLocaleString()} W`;
      if (k.toLowerCase().includes("memory")) return `${v.toLocaleString()} GB`;
      if (k === "timeSec") return `${v.toFixed(1)} s`;
      return Number.isInteger(v) ? v.toLocaleString() : v.toFixed(2);
    }
    return String(v);
  };

  // choose which keys to show (all fields, but avoid noisy ones)
  const hiddenKeys = new Set([
    "meta",               // huge nested object
    "color",              // if you have it
    "payload",            // sometimes appears
  ]);

  const entries = Object.entries(p).filter(([k]) => !hiddenKeys.has(k));

  return (
    <div
      style={{
        backgroundColor: "#1e293b",
        border: "1px solid #334155",
        borderRadius: 6,
        color: "#f8fafc",
        padding: "10px 12px",
        fontSize: 12,
        maxWidth: 360,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 6 }}>
        {p.name ?? p.gpu} • {tag}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: "4px 10px" }}>
        {entries.map(([k, v]) => (
          <div key={k} style={{ display: "contents" }}>
            <div style={{ color: "#cbd5e1" }}>{k}</div>
            <div>{fmt(k, v)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Manufacturer-based palette:
// NVIDIA = green, AMD = red, AWS = orange, Cerebras = purple, Apple = blue
// Darker shade ~= higher peakBandwidth within that family (roughly).

export const GPU_COLOR_MAP = {
  // ======================
  // NVIDIA — Data Center
  // ======================
  "H100-SXM":        "#0a7a2a", // darkest green (very high BW)
  "H100-PCIe":       "#22c55e", // mid green
  "A100-80G-SXM4":   "#4ade80", // lighter green
  "A100-80G-PCIe":   "#86efac", // lightest green in A100s

  // NVIDIA — Workstation / Prosumer
  "A6000":           "#34d399", // green-teal
  "A5000":           "#6ee7b7", // lighter green-teal

  // NVIDIA — Personal (GeForce)
  "5090":            "#15803d", // strong/dark green (high BW)
  "4090":            "#16a34a", // dark green
  "3090Ti":          "#22c55e", // mid green
  "5080":            "#4ade80", // lighter green
  "3080Ti":          "#86efac", // very light green
  "4080":            "#a7f3d0", // extra light (lowest in this subset)

  // NVIDIA — Autonomous (Jetson / Drive)
  "Orin AGX":        "#0f766e", // teal (separate “autonomous” subfamily)
  "Xavier AGX":      "#14b8a6",
  "Orin NX":         "#2dd4bf",
  "Jetson Nano":     "#99f6e4",

  // ======================
  // AMD
  // ======================
  "AMD MI300X":      "#dc2626", // strong red

  // ======================
  // AWS / Trainium
  // ======================
  "AWS Trainium 2":  "#f97316", // orange

  // ======================
  // Cerebras
  // ======================
  "CS-2":            "#8b5cf6", // purple
  "CS-3":            "#6d28d9", // darker purple (slightly “higher”)

  // ======================
  // Apple Silicon (SoC)
  // ======================
  "Apple M4 Max":    "#1d4ed8", // darkest blue (highest BW)
  "Apple M3 Max":    "#3b82f6",
  "Apple M2 Max":    "#60a5fa",
  "Apple M1 Max":    "#93c5fd",

  // ======================
  // Data Center Systems
  // ======================
  "DGX-H100":        "#064e3b", // very dark green (system-level)
  "DGX-A100":        "#14532d", // dark green (system-level)
};



function HardwareLegend({ points }) {
  const items = useMemo(() => {
    const seen = new Set();

    // keep ordering stable (use points order)
    const out = [];
    for (const p of points ?? []) {
      const gpu = p?.gpu;
      const source = p?.source; // "measured" | "projected"
      if (!gpu || !source) continue;

      const key = `${gpu}__${source}`;
      if (seen.has(key)) continue;
      seen.add(key);

      out.push({
        gpu,
        source,
        color: GPU_COLOR_MAP[gpu] ?? "#94a3b8",
      });
    }

    // Optional: sort measured first, then projected; then alphabetically
    out.sort((a, b) => {
      const sa = a.source === "measured" ? 0 : 1;
      const sb = b.source === "measured" ? 0 : 1;
      if (sa !== sb) return sa - sb;
      return a.gpu.localeCompare(b.gpu);
    });

    return out;
  }, [points]);

  if (!items.length) {
    return (
      <div className="text-xs text-slate-400">
        Color = GPU type • Shape = data source
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-300">
      {items.map((it) => {
        const isMeasured = it.source === "measured";
        return (
          <div key={`${it.gpu}-${it.source}`} className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              {isMeasured ? (
                // triangle
                <path
                  d="M 8 2 L 2.5 13.5 L 13.5 13.5 Z"
                  fill={it.color}
                  stroke={it.color}
                  strokeWidth="1"
                />
              ) : (
                // circle
                <circle
                  cx="8"
                  cy="8"
                  r="5.5"
                  fill={it.color}
                  stroke={it.color}
                  strokeWidth="1"
                />
              )}
            </svg>

            <span>
              {it.gpu}{" "}
              <span className="text-slate-400">
                ({isMeasured ? "Measured" : "Projected"})
              </span>
            </span>
          </div>
        );
      })}

      <div className="text-slate-400">
        Color = GPU type • Shape = data source
      </div>
    </div>
  );
}

function RuntimeVsPowerChartCard({ points }) {

// helper: add multiplicative padding for log scales
const padLogDomain = (pad = 1.12) => ([dataMin, dataMax]) => {
  const min = Number(dataMin);
  const max = Number(dataMax);

  // safety for weird / empty data
  if (!Number.isFinite(min) || !Number.isFinite(max)) return ["auto", "auto"];

  // log scale requires > 0
  const safeMin = Math.max(min, 1e-9);
  const safeMax = Math.max(max, safeMin * 1.0000001);

  return [safeMin / pad, safeMax * pad];
};


  return (
    <Card className="mb-8">
      <div className="flex justify-between items-start mb-3">
        <h2 className="text-lg font-semibold pl-2 border-l-4 border-cyan-500">
          Test-time Scaling - Hardware Map Chart
          <br />
          <span className="font-normal text-slate-400 text-sm">
            X-axis: peak power (W). Y-axis: Time to Answer (s).
          </span>
        </h2>
      </div>

      <div className="mb-4">
        <HardwareLegend points={points} />
      </div>

      <div className="h-[320px] sm:h-[420px] md:h-[480px]">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 20, left: 50, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />

            <XAxis
              dataKey="power"
              type="number"
              scale="log"
              domain={padLogDomain(1.5)}
              allowDataOverflow
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              tickFormatter={(v) => `${v}W`}
              label={{
                value: "Peak power (W) [log]",
                position: "insideBottom",
                offset: -15,
                fill: "#94a3b8",
                fontSize: 12,
              }}
            />

            <YAxis
              dataKey="timeSec"
              type="number"
              scale="log"
              domain={padLogDomain(1.5)}
              allowDataOverflow
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              tickFormatter={(v) => `${Math.round(v)}s`}
              label={{
                value: "Time to Answer (s) [log]",
                angle: -90,
                position: "insideLeft",
                offset: -10,
                fill: "#94a3b8",
                fontSize: 12,
              }}
            />

            <Tooltip
              cursor={{ strokeDasharray: "3 3", stroke: "#64748b" }}
              content={<HardwareTooltip />}
            />

            {/* One scatter, custom shape per-point */}
            <Scatter
              data={points ?? []}
              dataKey="timeSec"
              name="Hardware points"
              shape={(props) => {
                const p = props?.payload;
                const stroke = GPU_COLOR_MAP[p?.gpu] ?? "#94a3b8";
                const Dot = p?.source === "measured" ? TriangleDot : CircleDot;
                return <Dot {...props} stroke={stroke} fill={stroke} />;
              }}
              isAnimationActive={false}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}



  const RVR_MODEL_OPTIONS = [
  // { value: "gpt-oss-120b-high", label: "GPT-OSS-120B (HIGH)" },
  // { value: "gpt-oss-120b-medium", label: "GPT-OSS-120B (MEDIUM)" },
  // { value: "gpt-oss-120b-low", label: "GPT-OSS-120B (LOW)" },
  // { value: "gpt-oss-20b-high", label: "GPT-OSS-20B (HIGH)" },
  // { value: "gpt-oss-20b-medium", label: "GPT-OSS-20B (MEDIUM)" },
  // { value: "gpt-oss-20b-low", label: "GPT-OSS-20B (LOW)" },
  { value: "Qwen3-30B-A3B-Instruct-2507", label: "Qwen3-30B-A3B-Instruct-2507" },
  // { value: "qwen3-4b-instruct-2507", label: "Qwen3-4B-Instruct-2507" },
  // you can delete/disable items here without affecting the other chart
];

const RVR_QUANT_OPTIONS = [
  { value: "mxfp4", label: "mxfp4" },
  { value: "bf16", label: "BF16" },
];

const buildRvrQuantOptionsForModel = (model) => {
  const gpt = isGptOssModel(model);
  const qwen = isQwenModel(model);

  return RVR_QUANT_OPTIONS.map((opt) => {
    const v = norm(opt.value);
    const disabled =
      (gpt && v === "bf16") ||   // GPT-OSS => disable bf16 (adjust comment if needed)
      (qwen && v === "mxfp4");   // Qwen => disable mxfp4
    return { ...opt, disabled };
  });
};

const RVR_DATASET_OPTIONS = [
  // { value: "aime25", label: "aime25" },
  { value: "GPQA Diamond", label: "GPQA Diamond" },
  // remove datasets that don't make sense for runtime-vs-rounds here
];

const RVR_ENGINE_OPTIONS = [
  // { value: "vllm", label: "vLLM" },
  { value: "sglang", label: "SGLang" },
  // remove engines that don't have RSA rows, etc.
];


export function RuntimeVsRoundsSection() {
  const [model, setModel] = useState(RVR_MODEL_OPTIONS[0].value);
  const [quant, setQuant] = useState(RVR_QUANT_OPTIONS[1].value);
  const [dataset, setDataset] = useState(RVR_DATASET_OPTIONS[0].value);
  const [engine, setEngine] = useState(RVR_ENGINE_OPTIONS[0].value);

  // RSA controls
  const [parallel, setParallel] = useState("1");
  const [sequential, setSequential] = useState("1");
  // ✅ allow “no samples” as a real setting
  // set to SAMPLES_NONE_VALUE if you want default = None, or "1" if you want default = 1
  const [samples, setSamples] = useState("1");

  const [maxTokens, setMaxTokens] = useState("16384");

  // First filter by base selectors (so we can populate valid P/K options)
  const baseSelection = useMemo(
    () => ({ model, quant, dataset, engine }),
    [model, quant, dataset, engine]
  );

  const baseRows = useMemo(
    () =>
      filterBenchmarkRowsRSA({
        ...baseSelection,
        parallel: null,
        samplesValue: null,
        maxTokens: null,
        sequential: null,
      }),
    [baseSelection]
  );

  // Build options dynamically from available rows for this base selection
  const PARALLEL_OPTIONS_DYNAMIC = useMemo(() => {
    const vals = Array.from(
      new Set(baseRows.map((r) => Number(r?.meta?.parallel)).filter(Number.isFinite))
    ).sort((a, b) => a - b);

    return (vals.length ? vals : [1, 2, 4, 8]).map((v) => ({
      value: String(v),
      label: String(v),
    }));
  }, [baseRows]);

  const SAMPLES_OPTIONS_DYNAMIC = useMemo(() => {
    const hasNull = baseRows.some((r) => r?.meta?.samples == null);

    const numericVals = Array.from(
      new Set(
        baseRows
          .map((r) => r?.meta?.samples)
          .filter((v) => v != null)
          .map((v) => Number(v))
          .filter(Number.isFinite)
      )
    ).sort((a, b) => a - b);

    const opts = [];

    // “None” only appears if your data contains null samples for this baseSelection
    if (hasNull) {
      opts.push({ value: SAMPLES_NONE_VALUE, label: "None" });
    }

    for (const v of numericVals) {
      opts.push({ value: String(v), label: String(v) });
    }

    // fallback if somehow empty
    if (!opts.length) {
      return [
        { value: SAMPLES_NONE_VALUE, label: "None" },
        { value: "1", label: "1" },
        { value: "2", label: "2" },
        { value: "4", label: "4" },
        { value: "8", label: "8" },
      ];
    }

    return opts;
  }, [baseRows]);

  const MAXTOKENS_OPTIONS_DYNAMIC = useMemo(() => {
    const vals = Array.from(
      new Set(baseRows.map((r) => Number(r?.meta?.maxTokens)).filter(Number.isFinite))
    ).sort((a, b) => a - b);

    return (vals.length ? vals : [256, 512, 1024, 2048, 4096, 8192, 16384]).map((v) => ({
      value: String(v),
      label: String(v),
    }));
  }, [baseRows]);

  const SEQUENTIAL_OPTIONS_DYNAMIC = useMemo(() => {
    const vals = Array.from(
      new Set(baseRows.map((r) => Number(r?.meta?.sequential)).filter(Number.isFinite))
    ).sort((a, b) => a - b);

    return (vals.length ? vals : [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]).map((v) => ({
      value: String(v),
      label: String(v),
    }));
  }, [baseRows]);

  // ✅ IMPORTANT: this MUST come AFTER SAMPLES_OPTIONS_DYNAMIC is defined
  // Keeps the selected “samples” value valid when baseSelection changes.
  useEffect(() => {
    const allowed = new Set(SAMPLES_OPTIONS_DYNAMIC.map((o) => o.value));
    if (!allowed.has(samples)) {
      setSamples(SAMPLES_OPTIONS_DYNAMIC[0]?.value ?? SAMPLES_NONE_VALUE);
    }
  }, [SAMPLES_OPTIONS_DYNAMIC, samples]);

  useEffect(() => {
    const allowed = new Set(SEQUENTIAL_OPTIONS_DYNAMIC.map((o) => o.value));
    if (!allowed.has(sequential)) {
      setSequential(SEQUENTIAL_OPTIONS_DYNAMIC[0]?.value ?? "1");
    }
  }, [SEQUENTIAL_OPTIONS_DYNAMIC, sequential]);



  // Now filter by RSA settings
  const rsaSelection = useMemo(
    () => ({
      model,
      quant,
      dataset,
      engine,
      parallel: Number(parallel),
      samplesValue: samples, // string, may be "none"
      maxTokens: Number(maxTokens),
      sequential: Number(sequential),
    }),
    [model, quant, dataset, engine, parallel, samples, maxTokens, sequential]
  );

  const rsaRows = useMemo(() => filterBenchmarkRowsRSA(rsaSelection), [rsaSelection]);


  const hardwarePoints = useMemo(() => {
    // We only “measure” H100; everything else projected from it.
    // Pick the measured row from rsaRows (prefer H100, and prefer meta.source !== "projected").
    const measuredRow =
      (rsaRows ?? []).find((r) => isH100Name(r?.meta?.gpu ?? "") && norm(r?.meta?.source) !== "projected") ??
      (rsaRows ?? []).find((r) => isH100Name(r?.meta?.gpu ?? "")) ??
      null;

    if (!measuredRow || !Number.isFinite(Number(measuredRow.questionsPerHour))) return [];

    const measuredGpuName = measuredRow?.meta?.gpu ?? "H100";
    const measuredTimeSec = 3600 / Number(measuredRow.questionsPerHour);

    const h100Spec = findHardwareSpecForGpu(measuredGpuName) ??
      HARDWARE_SPECS.find((hw) => simplifyName(hw.name).includes("h100") && simplifyName(hw.name).includes("sxm")) ??
      HARDWARE_SPECS.find((hw) => simplifyName(hw.name).includes("h100"));

    if (!h100Spec || !Number.isFinite(Number(h100Spec.peakBandwidth)) || !Number.isFinite(Number(h100Spec.peakPower))) {
      return [];
    }

    const bwH100 = Number(h100Spec.peakBandwidth);

    // Build one point per hardware
    const pts = HARDWARE_SPECS
      .filter((hw) => Number.isFinite(Number(hw.peakBandwidth)) && Number.isFinite(Number(hw.peakPower)))
      .map((hw) => {
        const bw = Number(hw.peakBandwidth);
        const power = Number(hw.peakPower);

        // inverse linear scaling: time ∝ 1 / bandwidth
        const projectedTimeSec = measuredTimeSec * (bwH100 / bw);

        const isMeasured = simplifyName(hw.name) === simplifyName(h100Spec.name);
        // or: simplifyName(hw.name).includes(simplifyName(h100Spec.name)) if you want fuzzier

        const source = isMeasured ? "measured" : "projected";

        const timeSec = source === "measured" ? measuredTimeSec : projectedTimeSec;

        return {
          gpu: hw.name,
          power,
          timeSec,
          source,
          peakBandwidth: bw,
          // baseMeasuredGpu: h100Spec.name,
          baseMeasuredTimeSec: measuredTimeSec,
          meta: measuredRow.meta,
        };
      });

    // Sort by power for nicer reading
    pts.sort((a, b) => a.power - b.power);
    return pts;
  }, [rsaRows]);

  const selectionLabel = useMemo(() => {
    const m = RVR_MODEL_OPTIONS.find((o) => o.value === model)?.label ?? model;
    const e = RVR_ENGINE_OPTIONS.find((o) => o.value === engine)?.label ?? engine;
    const q = RVR_QUANT_OPTIONS.find((o) => o.value === quant)?.label ?? quant;
    const d = RVR_DATASET_OPTIONS.find((o) => o.value === dataset)?.label ?? dataset;
    const kLabel = samples === SAMPLES_NONE_VALUE ? "None" : samples;
    return `${m} / ${q} / ${d} / ${e} / Seq=${sequential} / P=${parallel} / K=${kLabel}`;
  }, [model, quant, dataset, engine, parallel, samples, sequential]);

  const quantOptions = useMemo(() => buildRvrQuantOptionsForModel(model), [model]);

  return (
    <>
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 sm:p-6 md:p-8 mb-6">
        <h2 className="text-lg font-semibold pl-2 border-l-4 border-cyan-500 mb-4">
          Test Time Scaling - Hardware Map Configuration
        </h2>


        {/* Justification / Explanation */}
        <div className="bg-slate-800/50 rounded-lg p-3 mb-4 text-xs text-slate-300 leading-relaxed">
          <p className="mb-2">
            <span className="text-blue-400 font-semibold">Motivation:</span> Test-Time Scaling (TTS) improves accuracy by spending more compute at inference time.
            The most common techniques are sequential refinement and parallel sampling of solutions. They can also be combined.
            The next chart visualizes the trade off between cost (power consumption) and latency (Time per Question).
          </p>

          <p className="mb-2">
            <span className="text-blue-400 font-semibold">Scaling Settings:</span> We vary inference-time budget by changing 3 different knobs:  
            <span className="text-cyan-400"> Sequential rounds</span> (Number of sequential refinement rounds), <span className="text-green-400">Parallel</span> (number of generations at each round), and <span className="text-blue-400">K samples</span> (Number of samples to aggregate at each round)

          </p>

          <p className="mb-2">
            <span className="text-blue-400 font-semibold">X-axis (Power):</span> Power consumed by each GPU
          </p>

          <p>
            <span className="text-blue-400 font-semibold">Y-axis (Time to Answer):</span> End-to-end latency per question.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-8 gap-3 sm:gap-4">
          <SelectControl label="Model" value={model} onChange={setModel} options={RVR_MODEL_OPTIONS} />
          <SelectControl label="Quantization" value={quant} onChange={setQuant} options={quantOptions} />
          <SelectControl label="Dataset" value={dataset} onChange={setDataset} options={RVR_DATASET_OPTIONS} />
          <SelectControl label="Inference engine" value={engine} onChange={setEngine} options={RVR_ENGINE_OPTIONS} />

          <SelectControl
          label="Sequential rounds"
          value={sequential}
          onChange={setSequential}
          options={SEQUENTIAL_OPTIONS_DYNAMIC}
        />

          <SelectControl
            label="Parallel (P)"
            value={parallel}
            onChange={setParallel}
            options={PARALLEL_OPTIONS_DYNAMIC}
          />

          <SelectControl
            label="K samples (N)"
            value={samples}
            onChange={setSamples}
            options={SAMPLES_OPTIONS_DYNAMIC}
          />

          <SelectControl
            label="Max tokens"
            value={maxTokens}
            onChange={setMaxTokens}
            options={MAXTOKENS_OPTIONS_DYNAMIC}
          />
        </div>

        <div className="inline-flex items-center px-2 py-1 mt-3 bg-slate-800 border border-slate-700 rounded text-xs text-slate-300">
          {selectionLabel}
        </div>

        {rsaRows.length === 0 && (
          <div className="mt-3 text-xs text-slate-400">
            No matching run found for these settings yet (chart will show axes only).
          </div>
        )}
      </div>

      <RuntimeVsPowerChartCard points={hardwarePoints} />
    </>
  );
}



/** --- Section for embedding on main page (controls + chart only) --- */

export function TestTimeScalingSection() {
  const [ttsModel, setTtsModel] = useState("gpt-oss-120b-high");
  const [ttsQuant, setTtsQuant] = useState("mxfp4");
  const [dataset, setDataset] = useState("aime25");
  const [ttsEngine, setTtsEngine] = useState("vllm");

  const quantOptions = useMemo(
    () => buildQuantOptionsForModel(ttsModel),
    [ttsModel]
  );

  useEffect(() => {
    const cur = quantOptions.find((o) => o.value === ttsQuant);
    if (cur?.disabled) {
      const firstEnabled = quantOptions.find((o) => !o.disabled);
      if (firstEnabled) setTtsQuant(firstEnabled.value);
    }
  }, [quantOptions, ttsQuant, setTtsQuant]);

  return (
    <>
      <RuntimeVsRoundsSection />
    </>
  );
}

