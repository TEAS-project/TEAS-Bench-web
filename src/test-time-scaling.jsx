import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Download } from "lucide-react";
import {
  ResponsiveContainer,
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

// --- CSV Download Utilities ---
const escapeCSVField = (field) => {
  if (field === null || field === undefined) return '';
  const str = String(field);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const downloadCSV = (data, filename) => {
  if (!data || data.length === 0) return;
  
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.map(escapeCSVField).join(','),
    ...data.map(row => headers.map(h => escapeCSVField(row[h])).join(','))
  ];
  
  const csvContent = csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const getCurrentDateStr = () => {
  const now = new Date();
  return now.toISOString().split('T')[0];
};

// Export Test Time Scaling benchmark data
const exportTTSBenchmarkData = (rows, selection) => {
  const dateStr = getCurrentDateStr();
  const data = rows.map((row) => ({
    date: dateStr,
    benchmark: 'Test-Time-Scaling',
    dataset: selection.dataset,
    model: selection.model,
    quantization: selection.quant,
    inference_engine: selection.engine,
    hardware: row.meta?.gpu || 'N/A',
    gpu_count: row.meta?.gpuCount || 'N/A',
    questions_per_hour: row.questionsPerHour,
    accuracy_percent: row.accuracy,
    sequential_steps: row.meta?.sequential || 'N/A',
    parallel_branches: row.meta?.parallel || 'N/A',
    samples_per_step: row.meta?.samples || 'N/A',
    max_tokens: row.meta?.maxTokens || 'N/A',
    tools: row.meta?.tools || 'N/A',
  }));
  
  downloadCSV(data, `tts-${selection.model}-${selection.dataset}-benchmark-${dateStr}.csv`);
};

/** --- Constants (outside the component) --- */

const Card = ({ children, className = "" }) => (
  <div className={`bg-slate-800/50 border border-slate-700 rounded-lg p-4 sm:p-6 md:p-8 ${className}`}>
    {children}
  </div>
);



// Helper to match selections to a row
const filterBenchmarkRows = ({ model, quant, dataset, engine }) =>
  BENCHMARK_ROWS.filter(
    (r) =>
      r.model === model &&
      r.quant === quant &&
      r.dataset === dataset &&
      r.engine === engine
  );

const NAV_BAR = (
  <nav className="bg-slate-900/80 border-b border-slate-800 sticky top-0 z-50 backdrop-blur-sm">
    <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
      <div className="flex items-center gap-3">
        <Link
          to="/"
          className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-400"
        >
          TEAS
        </Link>
        <span className="text-xs text-slate-400 hidden sm:inline">
          Tracking Evolving AI and Systems
        </span>
      </div>

      <div className="flex items-center gap-6 text-sm">
        <Link
          to="/"
          className="text-slate-300 hover:text-blue-400 transition-colors flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
      </div>
    </div>
  </nav>
);

// --- dropdown options (outside component) ---
const TTS_MODEL_OPTIONS = [
  { value: "gpt-oss-120b-high", label: "GPT-OSS-120B (HIGH)" },
  { value: "gpt-oss-120b-medium", label: "GPT-OSS-120B (MEDIUM)" },
  { value: "gpt-oss-120b-low", label: "GPT-OSS-120B (LOW)" },
  { value: "gpt-oss-20b-high", label: "GPT-OSS-20B (HIGH)" },
  { value: "gpt-oss-20b-medium", label: "GPT-OSS-20B (MEDIUM)" },
  { value: "gpt-oss-20b-low", label: "GPT-OSS-20B (LOW)" },
  { value: "qwen3-30b-a3b-instruct", label: "Qwen3-30B-A3B-Instruct" },
  { value: "qwen3-4b-instruct-2507", label: "Qwen3-4B-Instruct-2507" },
  // { value: "deepseek-r1", label: "DeepSeek-R1" },
  // { value: "mixtral-8x22b", label: "Mixtral-8x22B" },
];

const TTS_QUANT_OPTIONS = [
  { value: "mxfp4", label: "mxfp4" },
  // { value: "bf16", label: "BF16" },
  // { value: "fp16", label: "FP16" },
  // { value: "fp8", label: "FP8" },
  // { value: "int8", label: "INT8" },
  // { value: "int4", label: "INT4" },
];

const DATASET_OPTIONS = [
  { value: "aime25", label: "aime25" },
  // { value: "aime26", label: "aime26" },
  // { value: "imo_answerbench", label: "IMO AnswerBench" },
  // { value: "GPQA Diamond", label: "GPQA Diamond" },
  // { value: "LiveCodeBench", label: "LiveCodeBench" },
];

const TTS_ENGINE_OPTIONS = [
  { value: "vllm", label: "vLLM" },
  // { value: "sglang", label: "SGLang" },
  // { value: "tgi", label: "Text Generation Inference (TGI)" },
  // { value: "tensorrt-llm", label: "TensorRT-LLM" },
];



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
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  </div>
);

/** -------------------------
 *  1) Extract the chart card
 *  ------------------------- */

function BenchmarkTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;

  const p = payload[0].payload;
  const meta = p?.meta && typeof p.meta === "object" ? p.meta : {};

  return (
    <div
      style={{
        backgroundColor: "#1e293b",
        border: "1px solid #334155",
        padding: "10px",
        borderRadius: "6px",
        minWidth: 240,
      }}
    >
      <div style={{ color: "#f8fafc", fontWeight: 600, marginBottom: 6 }}>
        {p.label}
      </div>

      <div style={{ color: "#94a3b8", fontSize: 12 }}>
        Questions/hour: <span style={{ color: "#f8fafc" }}>{p.questionsPerHour}</span>
      </div>
      <div style={{ color: "#94a3b8", fontSize: 12 }}>
        Accuracy: <span style={{ color: "#f8fafc" }}>{p.accuracy}%</span>
      </div>

      {/* ✅ dump ALL meta */}
      {Object.keys(meta).length > 0 && (
        <>
          <div style={{ height: 8 }} />
          <div style={{ color: "#e2e8f0", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
            Metadata:
          </div>

          {Object.entries(meta).map(([k, v]) => (
            <div key={k} style={{ color: "#94a3b8", fontSize: 12 }}>
              {k}: <span style={{ color: "#f8fafc" }}>{v === null ? "null" : String(v)}</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}





const CHART_DESCRIPTION = (
  <>
    Each datapoint represents a specific combination of sequential scaling (S), parallel scaling (P), and number of samples (N) per aggregation step.
  </>
);

function AccuracyVsQphChartCard({ chartData, embed }) {
  const hasData = chartData && chartData.length > 0;

  const chartOnly = (
    hasData ? (
      <div className="h-[400px] sm:h-[500px] md:h-[600px]">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 20, left: 30, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />

            <XAxis
              dataKey="questionsPerHour"
              type="number"
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              label={{
                value: "Questions per hour",
                position: "insideBottom",
                offset: -15,
                fill: "#94a3b8",
                fontSize: 12,
              }}
              domain={[0, (dataMax) => Math.max(1, Math.ceil(dataMax * 1.1))]}
            />

            <YAxis
              dataKey="accuracy"
              type="number"
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              label={{
                value: "Accuracy (%)",
                angle: -90,
                position: "insideLeft",
                offset: -5,
                fill: "#94a3b8",
                fontSize: 12,
              }}
              domain={[0, 100]}
            />

            <Tooltip
              cursor={{ strokeDasharray: "3 3", stroke: "#64748b" }}
              content={<BenchmarkTooltip />}
            />

            <Scatter data={chartData} name="Runs" isAnimationActive={false}>
              <LabelList
                content={(props) => {
                  const { x, y, index } = props;
                  const p = chartData[index];
                  if (!p) return null;
                  if (!p.showLabel) return null;
                  const text = p.labelText ?? "";
                  const dx = p.labelDx ?? 10;
                  const dy = p.labelDy ?? -12;
                  return (
                    <g>
                      <line x1={x} y1={y} x2={x + dx} y2={y + dy} stroke="#94a3b8" strokeWidth={1} opacity={0.6} />
                      <rect x={x + dx - 2} y={y + dy - 15} width={Math.max(40, text.length * 7)} height={16} rx={3} fill="#0f172a" stroke="#334155" opacity={0.95} />
                      <text x={x + dx + 4} y={y + dy - 2} fill="#e2e8f0" fontSize={11} fontWeight={600}>{text}</text>
                    </g>
                  );
                }}
              />
              {chartData.map((p, i) => (
                <Cell key={i} fill={p.color || "#3b82f6"} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    ) : (
      <div className="text-sm text-slate-400">
        No benchmark data found for this selection. Add a row to{" "}
        <code className="text-slate-200">BENCHMARK_ROWS</code>.
      </div>
    )
  );

  if (embed) return chartOnly;

  return (
    <Card className="mb-8">
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-lg font-semibold pl-2 border-l-4 border-blue-500">
          Accuracy–Performance Trade-off
          <br />
          <span className="font-normal text-slate-400 text-sm">{CHART_DESCRIPTION}</span>
        </h2>
        <Link to="/documentation" className="text-xs text-blue-400 hover:text-blue-300 transition-colors underline shrink-0">View Documentation</Link>
      </div>
      {chartOnly}
    </Card>
  );
}

/** ---------------------------------------
 *  2) Add a “chart registry / switcher”
 *  ---------------------------------------
 *  This is where you decide which chart to show for which selections.
 *  Add more charts later by adding another entry here.
 */

function ChartSection({ selection, selectionLabel, selectedRows, embed }) {
  const chartData = useMemo(() => {
    if (!selectedRows?.length) return [];

    // --- Pareto frontier (maximize both QPH and Accuracy) ---
    // A point is dominated if another point is >= in both dims and > in at least one.
    const paretoIdx = new Set(
      selectedRows
        .map((r, i) => ({ r, i }))
        .filter(({ r }, i) => {
          return !selectedRows.some((other, j) => {
            if (j === i) return false;
            const noWorse =
              other.questionsPerHour >= r.questionsPerHour &&
              other.accuracy >= r.accuracy;
            const strictlyBetter =
              other.questionsPerHour > r.questionsPerHour ||
              other.accuracy > r.accuracy;
            return noWorse && strictlyBetter;
          });
        })
        .map((x) => x.i)
    );

    // Helpful extrema for slight offset tweaks
    const maxQph = Math.max(...selectedRows.map((r) => r.questionsPerHour));
    const maxAcc = Math.max(...selectedRows.map((r) => r.accuracy));

    return selectedRows.map((row, idx) => {
      const s = row?.meta?.sequential;
      const p = row?.meta?.parallel;
      const n = row?.meta?.samples;

      const labelText = `S${s ?? "-"} P${p ?? "-"} N${n ?? "-"}`;

      const showLabel = paretoIdx.has(idx);

      // Offsets: default top-right; tweak for extreme points to reduce clipping
      let labelDx = 12;
      let labelDy = -14;

      // If it's the fastest point, nudge left so it doesn't clip on the right edge
      if (row.questionsPerHour === maxQph) labelDx = -90;

      // If it's the highest-accuracy point, nudge down a bit to avoid top clipping
      if (row.accuracy === maxAcc) labelDy = 18;

      return {
        questionsPerHour: row.questionsPerHour,
        accuracy: row.accuracy,
        meta: row.meta,
        color: row.color,

        // label fields used by your LabelList renderer
        labelText,
        showLabel,
        labelDx,
        labelDy,
      };
    });
  }, [selectedRows]);

  return <AccuracyVsQphChartCard chartData={chartData} embed={embed} />;
}

/** -------------------------
 *  3) PageContent no longer owns charts
 *  ------------------------- */

const PageContent = ({
  ttsModel,
  setTtsModel,
  ttsEngine,
  setTtsEngine,
  ttsQuant,
  setTtsQuant,
  dataset,
  setDataset,
  selectionLabel,
  selection,
  selectedRows,
}) => (
  <div className="py-6 sm:py-8">
    <div className="flex flex-wrap justify-between items-start mb-2">
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-sky-400 to-cyan-400">
        Test Time Scaling
      </h1>
      <button
        onClick={() => exportTTSBenchmarkData(selectedRows, selection)}
        className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 bg-emerald-700 hover:bg-emerald-600 border border-emerald-600 rounded-full text-xs sm:text-sm text-white transition-colors"
        title="Download benchmark data as CSV"
        disabled={selectedRows.length === 0}
      >
        <Download className="w-3 h-3 sm:w-4 sm:h-4" />
        <span className="hidden sm:inline">Download CSV</span>
      </button>
    </div>

    <div className="inline-flex items-center px-2 py-1 mb-6 bg-slate-800 border border-slate-700 rounded text-xs text-slate-300">
      {selectionLabel}
    </div>

    {/* Controls */}
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 sm:p-6 md:p-8 mb-6">
      <h2 className="text-lg font-semibold pl-2 border-l-4 border-cyan-500 mb-4">
        Configuration
      </h2>

      {/* 4 dropdowns -> 1 col on mobile, 2 cols on sm, 4 cols on lg */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <SelectControl
          label="Model"
          value={ttsModel}
          onChange={setTtsModel}
          options={TTS_MODEL_OPTIONS}
        />

        <SelectControl
          label="Quantization"
          value={ttsQuant}
          onChange={setTtsQuant}
          options={TTS_QUANT_OPTIONS}
        />

        <SelectControl
          label="Dataset"
          value={dataset}
          onChange={setDataset}
          options={DATASET_OPTIONS}
        />

        <SelectControl
          label="Inference engine"
          value={ttsEngine}
          onChange={setTtsEngine}
          options={TTS_ENGINE_OPTIONS}
        />
      </div>
    </div>
  </div>
);





/** --- Section for embedding on main page (controls + chart only) --- */

export function TestTimeScalingSection() {
  const [ttsModel, setTtsModel] = useState("gpt-oss-120b-high");
  const [ttsQuant, setTtsQuant] = useState("mxfp4");
  const [dataset, setDataset] = useState("aime25");
  const [ttsEngine, setTtsEngine] = useState("vllm");

  const selectionLabel = useMemo(() => {
    const m = TTS_MODEL_OPTIONS.find((o) => o.value === ttsModel)?.label ?? ttsModel;
    const e = TTS_ENGINE_OPTIONS.find((o) => o.value === ttsEngine)?.label ?? ttsEngine;
    const q = TTS_QUANT_OPTIONS.find((o) => o.value === ttsQuant)?.label ?? ttsQuant;
    const d = DATASET_OPTIONS.find((o) => o.value === dataset)?.label ?? dataset;
    return `${m} / ${q} / ${d} / ${e}`;
  }, [ttsModel, ttsEngine, ttsQuant, dataset]);

  const selection = useMemo(
    () => ({ model: ttsModel, quant: ttsQuant, dataset, engine: ttsEngine }),
    [ttsModel, ttsQuant, dataset, ttsEngine]
  );

  const selectedRows = useMemo(() => filterBenchmarkRows(selection), [selection]);

  return (
    <Card className="mb-8">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-lg font-semibold pl-2 border-l-4 border-cyan-500 mb-2">
            Accuracy–Performance Trade-off
          </h2>
          <p className="text-xs text-slate-400 pl-2 max-w-4xl">
            {CHART_DESCRIPTION}
          </p>
        </div>
        <Link to="/documentation" className="text-xs text-blue-400 hover:text-blue-300 transition-colors underline shrink-0">View Documentation</Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
        <SelectControl
          label="Model"
          value={ttsModel}
          onChange={setTtsModel}
          options={TTS_MODEL_OPTIONS}
        />
        <SelectControl
          label="Quantization"
          value={ttsQuant}
          onChange={setTtsQuant}
          options={TTS_QUANT_OPTIONS}
        />
        <SelectControl
          label="Dataset"
          value={dataset}
          onChange={setDataset}
          options={DATASET_OPTIONS}
        />
        <SelectControl
          label="Inference engine"
          value={ttsEngine}
          onChange={setTtsEngine}
          options={TTS_ENGINE_OPTIONS}
        />
      </div>
      <div className="inline-flex items-center px-2 py-1 mb-4 bg-slate-800 border border-slate-700 rounded text-xs text-slate-300">
        {selectionLabel}
      </div>
      <ChartSection
        selection={selection}
        selectionLabel={selectionLabel}
        selectedRows={selectedRows}
        embed
      />
    </Card>
  );
}

/** --- Full page component --- */

export default function Test_Time_Scaling() {
  const [ttsModel, setTtsModel] = useState("gpt-oss-120b-high");
  const [ttsQuant, setTtsQuant] = useState("mxfp4");
  const [dataset, setDataset] = useState("aime25");
  const [ttsEngine, setTtsEngine] = useState("vllm");

  const selectionLabel = useMemo(() => {
    const m = TTS_MODEL_OPTIONS.find((o) => o.value === ttsModel)?.label ?? ttsModel;
    const e = TTS_ENGINE_OPTIONS.find((o) => o.value === ttsEngine)?.label ?? ttsEngine;
    const q = TTS_QUANT_OPTIONS.find((o) => o.value === ttsQuant)?.label ?? ttsQuant;
    const d = DATASET_OPTIONS.find((o) => o.value === dataset)?.label ?? dataset;
    return `${m} / ${q} / ${d} / ${e}`;
  }, [ttsModel, ttsEngine, ttsQuant, dataset]);

  const selection = useMemo(
    () => ({ model: ttsModel, quant: ttsQuant, dataset, engine: ttsEngine }),
    [ttsModel, ttsQuant, dataset, ttsEngine]
  );

  const selectedRows = useMemo(() => filterBenchmarkRows(selection), [selection]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {NAV_BAR}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-8">
        <PageContent
          ttsModel={ttsModel}
          setTtsModel={setTtsModel}
          ttsEngine={ttsEngine}
          setTtsEngine={setTtsEngine}
          ttsQuant={ttsQuant}
          setTtsQuant={setTtsQuant}
          dataset={dataset}
          setDataset={setDataset}
          selectionLabel={selectionLabel}
          selection={selection}
          selectedRows={selectedRows}
        />

        <ChartSection
          selection={selection}
          selectionLabel={selectionLabel}
          selectedRows={selectedRows}
        />
      </div>
    </div>
  );
}