import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
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

const EXPLANATION_CARD = (
  <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 sm:p-6 md:p-8 mb-8 mt-6">
    <p className="text-slate-300 leading-relaxed mb-6">
      Test-time scaling improves solution quality by spending more compute at inference time.
      The main knobs trade off{" "}
      <span className="text-slate-200 font-medium">latency</span>,{" "}
      <span className="text-slate-200 font-medium">throughput</span>,{" "}
      <span className="text-slate-200 font-medium">cost</span>, and{" "}
      <span className="text-slate-200 font-medium">accuracy</span>.
    </p>

    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-slate-100 mb-1">Parallel scaling</h2>
        <p className="text-slate-300 leading-relaxed">
          Run multiple independent samples/attempts in parallel (e.g., self-consistency / majority vote).
          Typically increases accuracy and robustness, but increases compute cost linearly with the number
          of samples and may require higher serving throughput to keep latency bounded.
        </p>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-100 mb-1">Sequential scaling</h2>
        <p className="text-slate-300 leading-relaxed">
          Spend more steps per query (e.g., iterative refinement, tool-augmented loops, reflection, or
          verifier-guided retries). Can improve hard problems with fewer parallel samples, but increases
          end-to-end latency and may be sensitive to stop criteria and time budgets.
        </p>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-100 mb-1">
          Hybrid parallel + sequential scaling
        </h2>
        <p className="text-slate-300 leading-relaxed">
          Combine both: run a small number of parallel candidates, then refine or verify the most promising
          ones over multiple rounds. Often gives a better accuracy–cost frontier, but requires careful
          scheduling (when to stop, how to allocate budget across rounds, and how to handle early exits).
        </p>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-100 mb-1">Quantization</h2>
        <p className="text-slate-300 leading-relaxed">
          Use lower-precision weights/activations (e.g., FP8/INT8) to reduce memory bandwidth and increase
          throughput. This can enable larger batch sizes or more parallel attempts under the same hardware
          budget, but may slightly reduce accuracy or change numerical behavior depending on the scheme and model.
        </p>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-100 mb-1">
          KV-cache eviction policy (Inference Engine)
        </h2>
        <p className="text-slate-300 leading-relaxed">
          Different inference engines have different kv-cache eviction policies. When context is long or memory is constrained, inference engines may evict parts of the KV cache
          (e.g., sliding window, chunk-based eviction, or attention sinks). Eviction improves capacity and
          throughput, but can reduce quality if important tokens are dropped—especially for long-context
          reasoning and retrieval-heavy tasks.
        </p>
      </div>
    </div>
  </div>
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





function AccuracyVsQphChartCard({ chartData }) {
  const hasData = chartData && chartData.length > 0;

  return (
    <Card className="mb-8">
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-lg font-semibold pl-2 border-l-4 border-blue-500">
          Test-time Scaling – Accuracy vs Questions per Hour for various scaling settings
          <br />
          <span className="font-normal text-slate-400 text-sm">
            Each datapoint represents a specific combination of sequential and parallel scaling, and number of samples per aggregation step.
          </span>
          <br />
          <span className="font-normal text-slate-400 text-sm">
            S=Sequential, P=Parallel, N=Number of samples
          </span>
          <br />
          <span className="font-normal text-slate-400 text-sm">
            1- When given a task, the model is initially asked to generate P responses in parallel.
          </span>
          <br />
          <span className="font-normal text-slate-400 text-sm">
            2.1- Next, randomly select a subset of N responses generated in step 1. Ask the model to reflect on their quality, and generate a new response.
          </span>
          <br />
          <span className="font-normal text-slate-400 text-sm">
            2.2- Repeat step 2.1 P times to generate P new responses.
          </span>
          <br />
          <span className="font-normal text-slate-400 text-sm">
            3- Repeat steps 2.1 and 2.2 for a total of S times. At each generation in a new stage, the N samples are drawn from the P responses from the previous stage.
          </span>
          <br />
          <span className="font-normal text-slate-400 text-sm">
            4- The final output is a single, final aggregated response at the end of the final stage.
          </span>
        </h2>
        
      </div>

      {hasData ? (
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

              {/* ✅ render ALL points */}
              <Scatter data={chartData} name="Runs" isAnimationActive={false}>
                <LabelList
                  content={(props) => {
                    const { x, y, index } = props;
                    const p = chartData[index];
                    if (!p) return null;

                    // TEMP: show labels for all points to verify it works
                    // Later you can change to: if (!p.showLabel) return null;
                    const s = p?.meta?.sequential;
                    const par = p?.meta?.parallel;
                    const n = p?.meta?.samples;

                    const text = `S=${s ?? "-"} P=${par ?? "-"} N=${n ?? "-"}`;

                    const dx = 10;
                    const dy = -12;

                    return (
                      <g>
                        <line
                          x1={x}
                          y1={y}
                          x2={x + dx}
                          y2={y + dy}
                          stroke="#94a3b8"
                          strokeWidth={1}
                          opacity={0.6}
                        />
                        <rect
                          x={x + dx - 2}
                          y={y + dy - 10}
                          width={Math.max(40, text.length * 6.2)}
                          height={16}
                          rx={3}
                          fill="#0f172a"
                          stroke="#334155"
                          opacity={0.95}
                        />
                        <text
                          x={x + dx + 4}
                          y={y + dy - 2}
                          fill="#e2e8f0"
                          fontSize={11}
                          fontWeight={600}
                        >
                          {text}
                        </text>
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
      )}
    </Card>
  );
}

/** ---------------------------------------
 *  2) Add a “chart registry / switcher”
 *  ---------------------------------------
 *  This is where you decide which chart to show for which selections.
 *  Add more charts later by adding another entry here.
 */

function ChartSection({ selection, selectionLabel, selectedRows }) {
  const chartData = useMemo(() => {
    if (!selectedRows?.length) return [];

    // Example heuristic: label top-accuracy and top-QPH points
    const maxAcc = Math.max(...selectedRows.map(r => r.accuracy));
    const maxQph = Math.max(...selectedRows.map(r => r.questionsPerHour));

    return selectedRows.map((row, idx) => {
      const s = row?.meta?.sequential;
      const p = row?.meta?.parallel;
      const n = row?.meta?.samples;

      // your existing label format
      const labelText = `S${s ?? "-"} P${p ?? "-"} N${n ?? "-"}`;

      // choose which ones to label
      const showLabel =
        row.accuracy === maxAcc ||
        row.questionsPerHour === maxQph;

      // simple offset rule (you can tune or hardcode per-point)
      const labelDx = row.questionsPerHour === maxQph ? 14 : 10;
      const labelDy = row.accuracy === maxAcc ? -18 : -10;

      return {
        questionsPerHour: row.questionsPerHour,
        accuracy: row.accuracy,
        meta: row.meta,
        color: row.color,

        // NEW:
        labelText,
        showLabel,
        labelDx,
        labelDy,
      };
    });
  }, [selectedRows, selectionLabel]);

  return <AccuracyVsQphChartCard chartData={chartData} />;
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
}) => (
  <div className="py-6 sm:py-8">
    <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-sky-400 to-cyan-400">
      Test Time Scaling
    </h1>

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





/** --- Component --- */

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

  // ✅ ADD THIS
  const selection = useMemo(
    () => ({ model: ttsModel, quant: ttsQuant, dataset, engine: ttsEngine }),
    [ttsModel, ttsQuant, dataset, ttsEngine]
  );

  // ✅ Use selection directly (cleaner)
  const selectedRows = useMemo(() => filterBenchmarkRows(selection), [selection]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {NAV_BAR}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-8">
        {EXPLANATION_CARD}
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