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
    Legend,
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
      accuracy_percent: row.accuracy || 'N/A',
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
  const norm = (x) => String(x ?? "").trim().toLowerCase();
  const isGptOssModel = (model) => norm(model).includes("gpt-oss");
  const isQwenModel = (model) => norm(model).includes("qwen");
  const SAMPLES_NONE_VALUE = "none"; // sentinel for meta.samples == null


  const filterBenchmarkRows = ({ model, quant, dataset, engine }) =>
    BENCHMARK_ROWS.filter((r) =>
      norm(r.model) === norm(model) &&
      norm(r.quant) === norm(quant) &&
      norm(r.dataset) === norm(dataset) &&
      norm(r.engine) === norm(engine)
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


  const ACCURACY_VS_QPH_CHART_DESCRIPTION = (
    <>
      Each datapoint represents a specific combination of sequential scaling (S), parallel scaling (P), and number of samples (N) per aggregation step.
    </>
  );


  function AccuracyVsQphChartCard({ chartData, embed }) {
    const hasData = chartData && chartData.length > 0;

    const chartOnly = hasData ? (
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
                        y={y + dy - 15}
                        width={Math.max(40, text.length * 7)}
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
    );

    // ✅ embed mode: return ONLY the plot (no Card wrapper)
    if (embed) return chartOnly;

    // default mode: return a full card with header + optional docs link
    return (
      <Card className="mb-8">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-lg font-semibold pl-2 border-l-4 border-blue-500">
            Accuracy–Performance Trade-off
            <br />
            <span className="font-normal text-slate-400 text-sm">
              {ACCURACY_VS_QPH_CHART_DESCRIPTION}
            </span>
          </h2>

          <Link
            to="/documentation"
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors underline shrink-0"
          >
            View Documentation
          </Link>
        </div>

        {chartOnly}
      </Card>
    );
  }

  // Filter rows with extra RSA controls (parallel + samples/k)
  const filterBenchmarkRowsRSA = ({ model, quant, dataset, engine, parallel, samplesValue, maxTokens }) =>
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
      (maxTokens == null || Number(r?.meta?.maxTokens) === Number(maxTokens))
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

  const GPU_COLOR_MAP = {
    "H100-SXM": "#22c55e", //
    "H200-SXM": "#00501d", //
    "A100-SXM4" : "#d0e700", //
    "AMD MI300X" : "#ff0000", // 
    // add more GPUs later:
    // "NVIDIA A100 80GB": "#a855f7",
    // "NVIDIA L40S": "#f97316",
  };

  function RuntimeLegend() {
    // You can extend this later (more GPUs, etc.)
    const h100Color = "#22c55e"; // green
    const h200Color = "#00501d"; // dark green
    const amdmi300xColor = "#ff0000" // red
    const a100Color = "#d0e700" // yellow

    return (
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-300">
        {/* Measured H100: green line + triangle */}
        <div className="flex items-center gap-2">
          <svg width="46" height="14" viewBox="0 0 46 14" aria-hidden="true">
            <line x1="2" y1="7" x2="44" y2="7" stroke={h100Color} strokeWidth="2" />
            <path
              d="M 23 1 L 17 13 L 29 13 Z"
              fill={h100Color}
              stroke={h100Color}
              strokeWidth="1"
            />
          </svg>
          <span>Measured (H100-SXM)</span>
        </div>
        {/* Projected H200: dark green + circle */}
        <div className="flex items-center gap-2">
          <svg width="46" height="14" viewBox="0 0 46 14" aria-hidden="true">
            <line x1="2" y1="7" x2="44" y2="7" stroke={h200Color} strokeWidth="2" />
            <circle cx="23" cy="7" r="5.5" fill={h200Color} stroke={h200Color} />
          </svg>
          <span>Projected (H200-SXM)</span>
        </div>
        {/* Projected AMDMI300X: dark green + circle */}
        <div className="flex items-center gap-2">
          <svg width="46" height="14" viewBox="0 0 46 14" aria-hidden="true">
            <line x1="2" y1="7" x2="44" y2="7" stroke={amdmi300xColor} strokeWidth="2" />
            <circle cx="23" cy="7" r="5.5" fill={amdmi300xColor} stroke={amdmi300xColor} />
          </svg>
          <span>Projected (AMD MI300X)</span>
        </div>
        {/* Projected AMDMI300X: dark green + circle */}
        <div className="flex items-center gap-2">
          <svg width="46" height="14" viewBox="0 0 46 14" aria-hidden="true">
            <line x1="2" y1="7" x2="44" y2="7" stroke={a100Color} strokeWidth="2" />
            <circle cx="23" cy="7" r="5.5" fill={a100Color} stroke={a100Color} />
          </svg>
          <span>Projected (A100-SXM4)</span>
        </div>

        {/* Encoding key */}
        <div className="text-slate-400">
          Color = GPU type • Shape = data source
        </div>
      </div>
    );
  }

  function RuntimeVsRoundsChartCard({ groups }) {
    return (
      <Card className="mb-8">
        <div className="flex justify-between items-start mb-3">
          <h2 className="text-lg font-semibold pl-2 border-l-4 border-cyan-500">
            Test-time Scaling -- Hardware Map
            <br />
            <span className="font-normal text-slate-400 text-sm">
              X-axis: sequential refinement round. Y-axis: cumulative time.
            </span>
          </h2>
        </div>

        <div className="mb-4">
          <RuntimeLegend />
        </div>

        <div className="h-[320px] sm:h-[420px] md:h-[480px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart margin={{ top: 10, right: 20, left: 50, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />

              <XAxis
                dataKey="round"
                type="number"
                domain={[1, 16]}
                ticks={[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]}
                tick={{ fill: "#94a3b8", fontSize: 11 }}
                label={{
                  value: "Sequential round",
                  position: "insideBottom",
                  offset: -15,
                  fill: "#94a3b8",
                  fontSize: 12,
                }}
              />

              <YAxis
                dataKey="cumulativeTimeSec"
                type="number"
                domain={[0, "auto"]}
                tick={{ fill: "#94a3b8", fontSize: 11 }}
                tickFormatter={(v) => `${v}s`}
                label={{
                  value: "Cumulative time (s)",
                  angle: -90,
                  position: "insideLeft",
                  offset: -10,
                  fill: "#94a3b8",
                  fontSize: 12,
                }}
              />

              <Tooltip
                cursor={{ strokeDasharray: "3 3", stroke: "#64748b" }}
                contentStyle={{
                  backgroundColor: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: 6,
                  color: "#f8fafc",
                }}
                labelStyle={{ color: "#e2e8f0" }}
                formatter={(value, name) => {
                  if (name === "cumulativeTimeSec") return [`${value}s`, "Cumulative time"];
                  return [value, name];
                }}
                labelFormatter={(label) => `Round ${label}`}
              />

              {/* ✅ one Line per (gpu, source) */}
              {(groups ?? []).map((g) => {
                const stroke = GPU_COLOR_MAP[g.gpu] ?? "#94a3b8";
                const Dot = g.source === "projected" ? CircleDot : TriangleDot;

                return (
                  <Line
                    key={g.key}
                    data={g.data}                 // ✅ separate dataset => no cross-connecting
                    type="monotone"
                    dataKey="cumulativeTimeSec"
                    stroke={stroke}
                    strokeWidth={2}
                    dot={<Dot />}
                    activeDot={<Dot />}
                    isAnimationActive={false}
                    name={`${g.gpu} (${g.source})`}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
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
            options={TTS_DATASET_OPTIONS}
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


    const RVR_MODEL_OPTIONS = [
    // { value: "gpt-oss-120b-high", label: "GPT-OSS-120B (HIGH)" },
    // { value: "gpt-oss-120b-medium", label: "GPT-OSS-120B (MEDIUM)" },
    // { value: "gpt-oss-120b-low", label: "GPT-OSS-120B (LOW)" },
    // { value: "gpt-oss-20b-high", label: "GPT-OSS-20B (HIGH)" },
    // { value: "gpt-oss-20b-medium", label: "GPT-OSS-20B (MEDIUM)" },
    // { value: "gpt-oss-20b-low", label: "GPT-OSS-20B (LOW)" },
    { value: "Qwen3-30B-A3B-Instruct-2507", label: "Qwen3-30B-A3B-Instruct-2507" },
    { value: "qwen3-4b-instruct-2507", label: "Qwen3-4B-Instruct-2507" },
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
    { value: "vllm", label: "vLLM" },
    { value: "sglang", label: "SGLang" },
    // remove engines that don't have RSA rows, etc.
  ];


  export function RuntimeVsRoundsSection() {
    const [model, setModel] = useState(RVR_MODEL_OPTIONS[0].value);
    const [quant, setQuant] = useState(RVR_QUANT_OPTIONS[1].value);
    const [dataset, setDataset] = useState(RVR_DATASET_OPTIONS[0].value);
    const [engine, setEngine] = useState(RVR_ENGINE_OPTIONS[1].value);

    // RSA controls
    const [parallel, setParallel] = useState("1");

    // ✅ allow “no samples” as a real setting
    // set to SAMPLES_NONE_VALUE if you want default = None, or "1" if you want default = 1
    const [samples, setSamples] = useState("1");

    const [maxTokens, setMaxTokens] = useState("16384");

    // First filter by base selectors (so we can populate valid P/K options)
    const baseSelection = useMemo(
      () => ({ model, quant, dataset, engine }),
      [model, quant, dataset, engine]
    );

    const baseRows = useMemo(() => filterBenchmarkRows(baseSelection), [baseSelection]);

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

    // ✅ IMPORTANT: this MUST come AFTER SAMPLES_OPTIONS_DYNAMIC is defined
    // Keeps the selected “samples” value valid when baseSelection changes.
    useEffect(() => {
      const allowed = new Set(SAMPLES_OPTIONS_DYNAMIC.map((o) => o.value));
      if (!allowed.has(samples)) {
        setSamples(SAMPLES_OPTIONS_DYNAMIC[0]?.value ?? SAMPLES_NONE_VALUE);
      }
    }, [SAMPLES_OPTIONS_DYNAMIC, samples]);

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
      }),
      [model, quant, dataset, engine, parallel, samples, maxTokens]
    );

    const rsaRows = useMemo(() => filterBenchmarkRowsRSA(rsaSelection), [rsaSelection]);
    console.log("rsaRows DEBUG", rsaRows.length, {
      model,
      quant,
      dataset,
      engine,
      parallel,
      samples,
      maxTokens,
    });

    const lineColor = useMemo(() => {
      const gpuName = rsaRows?.[0]?.meta?.gpu || rsaRows?.[0]?.meta?.gpuName || null;
      return GPU_COLOR_MAP[gpuName] ?? "#94a3b8";
    }, [rsaRows]);

    const groupedSeries = useMemo(() => {
      const pts = (rsaRows ?? [])
        .filter((r) => Number.isFinite(r.questionsPerHour))
        .map((r) => {
          const round = Number(r?.meta?.sequential);
          const cumulativeTimeSec = 3600 / Number(r.questionsPerHour);
          const gpu = r?.meta?.gpu ?? "unknown";
          const source = r?.meta?.source ?? "measured";

          return { round, cumulativeTimeSec, gpu, source, meta: r.meta };
        })
        .filter(
          (p) =>
            Number.isFinite(p.round) &&
            p.round > 0 &&
            Number.isFinite(p.cumulativeTimeSec)
        );

      const groups = new Map();
      for (const p of pts) {
        const key = `${p.gpu}__${p.source}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(p);
      }

      const out = [];
      for (const [key, arr] of groups.entries()) {
        arr.sort((a, b) => a.round - b.round);
        const [gpu, source] = key.split("__");
        out.push({ key, gpu, source, data: arr });
      }

      out.sort((a, b) =>
        a.source === b.source ? a.gpu.localeCompare(b.gpu) : a.source.localeCompare(b.source)
      );

      return out;
    }, [rsaRows]);

    const selectionLabel = useMemo(() => {
      const m = RVR_MODEL_OPTIONS.find((o) => o.value === model)?.label ?? model;
      const e = RVR_ENGINE_OPTIONS.find((o) => o.value === engine)?.label ?? engine;
      const q = RVR_QUANT_OPTIONS.find((o) => o.value === quant)?.label ?? quant;
      const d = RVR_DATASET_OPTIONS.find((o) => o.value === dataset)?.label ?? dataset;
      const kLabel = samples === SAMPLES_NONE_VALUE ? "None" : samples;
      return `${m} / ${q} / ${d} / ${e} / P=${parallel} / K=${kLabel}`;
    }, [model, quant, dataset, engine, parallel, samples]);

    const quantOptions = useMemo(() => buildRvrQuantOptionsForModel(model), [model]);

    return (
      <>
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 sm:p-6 md:p-8 mb-6">
          <h2 className="text-lg font-semibold pl-2 border-l-4 border-cyan-500 mb-4">
            Runtime vs Rounds – Configuration
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3 sm:gap-4">
            <SelectControl label="Model" value={model} onChange={setModel} options={RVR_MODEL_OPTIONS} />
            <SelectControl label="Quantization" value={quant} onChange={setQuant} options={quantOptions} />
            <SelectControl label="Dataset" value={dataset} onChange={setDataset} options={RVR_DATASET_OPTIONS} />
            <SelectControl label="Inference engine" value={engine} onChange={setEngine} options={RVR_ENGINE_OPTIONS} />

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
              No matching RSA run found for these settings yet (chart will show axes only).
            </div>
          )}
        </div>

        <RuntimeVsRoundsChartCard groups={groupedSeries} />
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

    const selectionLabel = useMemo(() => {
      const m = TTS_MODEL_OPTIONS.find((o) => o.value === ttsModel)?.label ?? ttsModel;
      const e = TTS_ENGINE_OPTIONS.find((o) => o.value === ttsEngine)?.label ?? ttsEngine;
      const q = TTS_QUANT_OPTIONS.find((o) => o.value === ttsQuant)?.label ?? ttsQuant;
      const d = TTS_DATASET_OPTIONS.find((o) => o.value === dataset)?.label ?? dataset;
      return `${m} / ${q} / ${d} / ${e}`;
    }, [ttsModel, ttsEngine, ttsQuant, dataset]);

    const selection = useMemo(
      () => ({ model: ttsModel, quant: ttsQuant, dataset, engine: ttsEngine }),
      [ttsModel, ttsQuant, dataset, ttsEngine]
    );

    const selectedRows = useMemo(() => filterBenchmarkRows(selection), [selection]);

    return (
      <>
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 sm:p-6 md:p-8 mb-6">
          <h2 className="text-lg font-semibold pl-2 border-l-4 border-cyan-500 mb-4">
            Configuration
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <SelectControl label="Model" value={ttsModel} onChange={setTtsModel} options={TTS_MODEL_OPTIONS} />
            <SelectControl label="Quantization" value={ttsQuant} onChange={setTtsQuant} options={quantOptions} />
            <SelectControl label="Dataset" value={dataset} onChange={setDataset} options={TTS_DATASET_OPTIONS} />
            <SelectControl label="Inference engine" value={ttsEngine} onChange={setTtsEngine} options={TTS_ENGINE_OPTIONS} />

          </div>
          <div className="inline-flex items-center px-2 py-1 mt-3 bg-slate-800 border border-slate-700 rounded text-xs text-slate-300">
            {selectionLabel}
          </div>
        </div>
        <ChartSection
          selection={selection}
          selectionLabel={selectionLabel}
          selectedRows={selectedRows}
        />
        <RuntimeVsRoundsSection />
      </>
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
      const d = TTS_DATASET_OPTIONS.find((o) => o.value === dataset)?.label ?? dataset;
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