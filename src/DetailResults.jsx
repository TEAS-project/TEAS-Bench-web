import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, Cell, LabelList
} from 'recharts';
import { Github, Download, ArrowLeft } from 'lucide-react';

// Import TTS components and data
import { BENCHMARK_ROWS } from './data/tts-benchmarks/index.js';
// Import Agentic Trade-off Section
import { AgenticTradeoffSection } from './agentic-workload.jsx';

const Card = ({ children, className = "" }) => (
  <div className={`bg-slate-800 border border-slate-700 rounded-lg p-3 sm:p-4 ${className}`}>
    {children}
  </div>
);

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

const getCurrentDateStr = () => new Date().toISOString().split('T')[0];

// =====================
// CAP Radar Plot Section
// =====================

// CAP Radar configurations
const CAP_CONFIGS = {
  // LongBench v2 dataset configurations (Power-based)
  'qwen3-30b-bf16-4xa6000-sglang': {
    label: 'Qwen3-30B-A3B / BF16 / 4xRTX A6000 / SGLang',
    accuracy: 44.1,
    cost: 1120,
    tpot: 0.58,
    throughput: 16,
    color: '#22c55e',
    dataset: 'longbench-v2'
  },
  'qwen3-30b-bf16-1xh100-sglang': {
    label: 'Qwen3-30B-A3B / BF16 / 1xH100 / SGLang',
    accuracy: 44.1,
    cost: 700,
    tpot: 0.03,
    throughput: 274,
    color: '#3b82f6',
    dataset: 'longbench-v2'
  },
  'qwen3-4b-bf16-1xh100-sglang': {
    label: 'Qwen3-4B / BF16 / 1xH100 / SGLang',
    accuracy: 35.9,
    cost: 700,
    tpot: 0.006,
    throughput: 1200,
    color: '#f59e0b',
    dataset: 'longbench-v2'
  },
  'mixtral-8x22b-bf16-4xh100-sglang': {
    label: 'Mixtral-8x22B / BF16 / 4xH100 / SGLang',
    accuracy: 44.0,
    cost: 2800,
    tpot: 0.06,
    throughput: 88,
    color: '#ef4444',
    dataset: 'longbench-v2'
  },
  'deepseek-v3-api': {
    label: 'DeepSeek-V3 / API',
    accuracy: 52.0,
    cost: 0.14,
    tpot: 0.05,
    throughput: 25,
    color: '#8b5cf6',
    dataset: 'gsm8k'
  },
  'qwen3-235b-a22b-api': {
    label: 'Qwen3-235B-A22B / API',
    accuracy: 95.0,
    cost: 0.15,
    tpot: 0.07,
    throughput: 14,
    color: '#ec4899',
    dataset: 'gsm8k'
  },
  'gpt4o-api': {
    label: 'GPT-4o / API',
    accuracy: 93.0,
    cost: 2.50,
    tpot: 0.05,
    throughput: 18,
    color: '#06b6d4',
    dataset: 'gsm8k'
  },
};

const RADAR_COLORS = ['#22c55e', '#3b82f6', '#f59e0b'];

function CAPRadarSection() {
  const [capDataset, setCapDataset] = useState('longbench-v2');
  const [selectedConfigKeys, setSelectedConfigKeys] = useState([
    'qwen3-30b-bf16-4xa6000-sglang',
    'qwen3-30b-bf16-1xh100-sglang',
    'qwen3-4b-bf16-1xh100-sglang'
  ]);

  const availableConfigs = useMemo(() => {
    return Object.entries(CAP_CONFIGS)
      .filter(([_, config]) => config.dataset === capDataset)
      .map(([key, config]) => ({ key, ...config }));
  }, [capDataset]);

  useEffect(() => {
    const validKeys = availableConfigs.map(c => c.key);
    const newSelected = selectedConfigKeys.filter(k => validKeys.includes(k));
    if (newSelected.length === 0 && validKeys.length > 0) {
      setSelectedConfigKeys(validKeys.slice(0, 3));
    } else if (newSelected.length !== selectedConfigKeys.length) {
      setSelectedConfigKeys(newSelected);
    }
  }, [capDataset, availableConfigs]);

  const handleConfigChange = (index, newKey) => {
    const updated = [...selectedConfigKeys];
    updated[index] = newKey;
    setSelectedConfigKeys(updated);
  };

  const radarData = useMemo(() => {
    const configs = selectedConfigKeys
      .map(key => ({ key, ...CAP_CONFIGS[key] }))
      .filter(c => c.label);

    if (configs.length === 0) return { radarData: [], selectedConfigs: [] };

    const maxAccuracy = Math.max(...configs.map(c => c.accuracy));
    const maxCost = Math.max(...configs.map(c => c.cost));
    const maxTpot = Math.max(...configs.map(c => c.tpot));
    const maxThroughput = Math.max(...configs.map(c => c.throughput));

    const normalize = (val, max) => max > 0 ? (val / max) * 100 : 0;
    const normalizeCost = (val, max) => max > 0 ? ((max - val) / max) * 100 + 10 : 0;
    const normalizeTpot = (val, max) => max > 0 ? ((max - val) / max) * 100 + 10 : 0;

    const data = [
      { metric: 'Accuracy' },
      { metric: capDataset === 'longbench-v2' ? 'Power Efficiency' : 'Cost Efficiency' },
      { metric: 'Latency (TPOT)' },
      { metric: 'Throughput' },
    ];

    configs.forEach((config, idx) => {
      const configKey = `config${idx + 1}`;
      data[0][configKey] = normalize(config.accuracy, maxAccuracy);
      data[0][`${configKey}_raw`] = config.accuracy;
      data[1][configKey] = normalizeCost(config.cost, maxCost);
      data[1][`${configKey}_raw`] = config.cost;
      data[2][configKey] = normalizeTpot(config.tpot, maxTpot);
      data[2][`${configKey}_raw`] = config.tpot;
      data[3][configKey] = normalize(config.throughput, maxThroughput);
      data[3][`${configKey}_raw`] = config.throughput;
    });

    return { radarData: data, selectedConfigs: configs };
  }, [selectedConfigKeys, capDataset]);

  const exportCAPData = () => {
    const dateStr = getCurrentDateStr();
    const data = radarData.selectedConfigs.map(config => ({
      date: dateStr,
      section: 'CAP-Radar',
      dataset: capDataset,
      config_label: config.label,
      accuracy_percent: config.accuracy,
      cost: config.cost,
      tpot_seconds: config.tpot,
      throughput_tokens_per_sec: config.throughput,
    }));
    downloadCSV(data, `cap_radar_benchmark_${dateStr}.csv`);
  };

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900 border border-slate-600 rounded-lg p-3 text-sm">
        <div className="font-bold text-white mb-2">{data.metric}</div>
        {radarData.selectedConfigs.map((config, idx) => (
          <div key={config.key} className="text-slate-300" style={{ color: RADAR_COLORS[idx] }}>
            {config.label}: {data[`config${idx + 1}_raw`]}
            {data.metric === 'Accuracy' ? '%' : data.metric.includes('Power') || data.metric.includes('Cost') ? (capDataset === 'longbench-v2' ? 'W' : '$') : data.metric.includes('Latency') ? 's' : ' T/s'}
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card className="mb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
        <div>
          <h3 className="text-lg font-semibold mb-2 pl-2 border-l-4 border-purple-500">
            CAP Radar Plot - Cost, Accuracy, Performance
          </h3>
          <p className="text-xs text-slate-400 pl-2">
            Empirical evaluation across diverse model and system configurations.
          </p>
        </div>
        <button
          onClick={exportCAPData}
          className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-700 hover:bg-emerald-600 border border-emerald-600 rounded-full text-xs text-white transition-colors shrink-0"
        >
          <Download className="w-3 h-3" />
          <span>Download CSV</span>
        </button>
      </div>

      <div className="mb-4 p-3 bg-slate-800/50 rounded border border-slate-700">
        <p className="text-xs text-slate-400">
          <span className="text-slate-300 font-medium">Config Format:</span>{' '}
          <span className="text-blue-400">Model</span> / <span className="text-green-400">Data Type</span> / <span className="text-orange-400">Hardware</span> / <span className="text-purple-400">System</span>
        </p>
      </div>

      <div className="mb-4">
        <label className="block text-xs font-medium text-slate-400 mb-1">Dataset</label>
        <select
          value={capDataset}
          onChange={(e) => setCapDataset(e.target.value)}
          className="w-48 bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs focus:border-blue-500 outline-none"
        >
          <option value="longbench-v2">LongBench v2</option>
          <option value="gsm8k">GSM8K</option>
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {[0, 1, 2].map(idx => (
          <div key={idx}>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Config {idx + 1}
              <span className="ml-2 w-3 h-3 inline-block rounded-full" style={{ backgroundColor: RADAR_COLORS[idx] }}></span>
            </label>
            <select
              value={selectedConfigKeys[idx] || ''}
              onChange={(e) => handleConfigChange(idx, e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs focus:border-blue-500 outline-none"
            >
              {availableConfigs.map(config => (
                <option key={config.key} value={config.key}>{config.label}</option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div className="h-[400px] sm:h-[500px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData.radarData} cx="50%" cy="50%" outerRadius="70%">
            <PolarGrid stroke="#334155" />
            <PolarAngleAxis dataKey="metric" tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
            {radarData.selectedConfigs.map((config, idx) => (
              <Radar
                key={config.key}
                name={config.label}
                dataKey={`config${idx + 1}`}
                stroke={RADAR_COLORS[idx]}
                fill={RADAR_COLORS[idx]}
                fillOpacity={0.2}
                strokeWidth={2}
              />
            ))}
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            <Tooltip content={<CustomTooltip />} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-2 text-slate-400">Config</th>
              <th className="text-right py-2 px-2 text-slate-400">Accuracy</th>
              <th className="text-right py-2 px-2 text-slate-400">{capDataset === 'longbench-v2' ? 'Power (W)' : 'Cost ($)'}</th>
              <th className="text-right py-2 px-2 text-slate-400">TPOT (s)</th>
              <th className="text-right py-2 px-2 text-slate-400">Throughput</th>
            </tr>
          </thead>
          <tbody>
            {radarData.selectedConfigs.map((config, idx) => (
              <tr key={config.key} className="border-b border-slate-800">
                <td className="py-2 px-2" style={{ color: RADAR_COLORS[idx] }}>{config.label}</td>
                <td className="text-right py-2 px-2 text-slate-300">{config.accuracy}%</td>
                <td className="text-right py-2 px-2 text-slate-300">
                  {capDataset === 'longbench-v2' ? `${config.cost.toLocaleString()}W` : `$${config.cost.toLocaleString()}`}
                </td>
                <td className="text-right py-2 px-2 text-slate-300">{config.tpot}s</td>
                <td className="text-right py-2 px-2 text-slate-300">{config.throughput} T/s</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// =====================
// TTS Trade-off Section
// =====================

const TTS_MODEL_OPTIONS = [
  { value: "gpt-oss-120b-high", label: "GPT-OSS-120B (HIGH)" },
  { value: "gpt-oss-120b-medium", label: "GPT-OSS-120B (MEDIUM)" },
  { value: "gpt-oss-120b-low", label: "GPT-OSS-120B (LOW)" },
  { value: "gpt-oss-20b-high", label: "GPT-OSS-20B (HIGH)" },
  { value: "gpt-oss-20b-medium", label: "GPT-OSS-20B (MEDIUM)" },
  { value: "gpt-oss-20b-low", label: "GPT-OSS-20B (LOW)" },
  { value: "Qwen3-30B-A3B-Instruct-2507", label: "Qwen3-30B-A3B-Instruct-2507" },
  { value: "qwen3-4b-instruct-2507", label: "Qwen3-4B-Instruct-2507" },
];

const TTS_QUANT_OPTIONS = [
  { value: "bf16", label: "BF16" },
  { value: "fp8", label: "FP8" },
  { value: "mxfp4", label: "MXFP4" },
];

const TTS_DATASET_OPTIONS = [
  { value: "aime25", label: "AIME 2025" },
  { value: "amc25", label: "AMC 2025" },
];

const TTS_ENGINE_OPTIONS = [
  { value: "vllm", label: "vLLM" },
  { value: "sglang", label: "SGLang" },
];

const norm = (x) => String(x ?? "").trim().toLowerCase();

const filterBenchmarkRows = ({ model, quant, dataset, engine }) =>
  BENCHMARK_ROWS.filter((r) =>
    norm(r.model) === norm(model) &&
    norm(r.quant) === norm(quant) &&
    norm(r.dataset) === norm(dataset) &&
    norm(r.engine) === norm(engine)
  );

const isGptOssModel = (model) => norm(model).includes("gpt-oss");
const isQwenModel = (model) => norm(model).includes("qwen");

const buildQuantOptionsForModel = (model) => {
  if (isGptOssModel(model)) {
    return TTS_QUANT_OPTIONS.map((o) =>
      o.value === "bf16" ? { ...o, disabled: true, label: `${o.label} (N/A)` } : o
    );
  }
  if (isQwenModel(model)) {
    return TTS_QUANT_OPTIONS.map((o) =>
      o.value !== "bf16" ? { ...o, disabled: true, label: `${o.label} (N/A)` } : o
    );
  }
  return TTS_QUANT_OPTIONS;
};

function SelectControl({ label, value, onChange, options }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs focus:border-blue-500 outline-none"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={!!opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function BenchmarkTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  const meta = p?.meta && typeof p.meta === "object" ? p.meta : {};

  return (
    <div className="bg-slate-900 border border-slate-600 rounded-lg p-3 text-sm min-w-[240px]">
      <div className="text-white font-semibold mb-2">{p.label}</div>
      <div className="text-slate-300 text-xs">Questions/hour: {p.questionsPerHour}</div>
      <div className="text-slate-300 text-xs">Accuracy: {p.accuracy}%</div>
      {Object.keys(meta).length > 0 && (
        <>
          <div className="h-2" />
          <div className="text-slate-200 text-xs font-semibold mb-1">Metadata:</div>
          {Object.entries(meta).map(([k, v]) => (
            <div key={k} className="text-slate-400 text-xs">
              {k}: <span className="text-slate-200">{v === null ? "null" : String(v)}</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function TTSTradeoffSection() {
  const [ttsModel, setTtsModel] = useState("gpt-oss-120b-high");
  const [ttsQuant, setTtsQuant] = useState("mxfp4");
  const [dataset, setDataset] = useState("aime25");
  const [ttsEngine, setTtsEngine] = useState("vllm");

  const quantOptions = useMemo(() => buildQuantOptionsForModel(ttsModel), [ttsModel]);

  useEffect(() => {
    const cur = quantOptions.find((o) => o.value === ttsQuant);
    if (cur?.disabled) {
      const firstEnabled = quantOptions.find((o) => !o.disabled);
      if (firstEnabled) setTtsQuant(firstEnabled.value);
    }
  }, [quantOptions, ttsQuant]);

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

  const chartData = useMemo(() => {
    if (!selectedRows?.length) return [];

    const paretoIdx = new Set(
      selectedRows
        .map((r, i) => ({ r, i }))
        .filter(({ r }, i) => {
          return !selectedRows.some((other, j) => {
            if (j === i) return false;
            const noWorse = other.questionsPerHour >= r.questionsPerHour && other.accuracy >= r.accuracy;
            const strictlyBetter = other.questionsPerHour > r.questionsPerHour || other.accuracy > r.accuracy;
            return noWorse && strictlyBetter;
          });
        })
        .map((x) => x.i)
    );

    const maxQph = Math.max(...selectedRows.map((r) => r.questionsPerHour));
    const maxAcc = Math.max(...selectedRows.map((r) => r.accuracy));

    return selectedRows.map((row, idx) => {
      const s = row?.meta?.sequential;
      const p = row?.meta?.parallel;
      const n = row?.meta?.samples;
      const labelText = `S${s ?? "-"} P${p ?? "-"} N${n ?? "-"}`;
      const showLabel = paretoIdx.has(idx);

      let labelDx = 12;
      let labelDy = -14;
      if (row.questionsPerHour === maxQph) labelDx = -90;
      if (row.accuracy === maxAcc) labelDy = 18;

      return {
        questionsPerHour: row.questionsPerHour,
        accuracy: row.accuracy,
        meta: row.meta,
        color: row.color,
        labelText,
        showLabel,
        labelDx,
        labelDy,
      };
    });
  }, [selectedRows]);

  const exportData = () => {
    const dateStr = getCurrentDateStr();
    const data = selectedRows.map((row) => ({
      date: dateStr,
      benchmark: "Test-Time-Scaling",
      data_source: row.meta?.source ?? "measured",
      dataset: selection.dataset,
      model: selection.model,
      quantization: selection.quant,
      inference_engine: selection.engine,
      hardware: row.meta?.gpu || "N/A",
      gpu_count: row.meta?.gpuCount || "N/A",
      questions_per_hour: row.questionsPerHour,
      accuracy_percent: row.accuracy ?? "N/A",
      sequential_steps: row.meta?.sequential || "N/A",
      parallel_branches: row.meta?.parallel || "N/A",
      samples_per_step: row.meta?.samples || "N/A",
      max_tokens: row.meta?.maxTokens || "N/A",
    }));
    downloadCSV(data, `tts_tradeoff_${selection.model}_${dateStr}.csv`);
  };

  return (
    <Card className="mb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
        <div>
          <h3 className="text-lg font-semibold mb-2 pl-2 border-l-4 border-cyan-500">
            Accuracy - Performance Trade-off
          </h3>
          <p className="text-xs text-slate-400 pl-2">
            Each datapoint represents a specific combination of sequential scaling (S), parallel scaling (P), and samples (N).
          </p>
        </div>
        <button
          onClick={exportData}
          disabled={selectedRows.length === 0}
          className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-700 hover:bg-emerald-600 border border-emerald-600 rounded-full text-xs text-white transition-colors shrink-0 disabled:opacity-50"
        >
          <Download className="w-3 h-3" />
          <span>Download CSV</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <SelectControl label="Model" value={ttsModel} onChange={setTtsModel} options={TTS_MODEL_OPTIONS} />
        <SelectControl label="Quantization" value={ttsQuant} onChange={setTtsQuant} options={quantOptions} />
        <SelectControl label="Dataset" value={dataset} onChange={setDataset} options={TTS_DATASET_OPTIONS} />
        <SelectControl label="Inference Engine" value={ttsEngine} onChange={setTtsEngine} options={TTS_ENGINE_OPTIONS} />
      </div>

      <div className="inline-flex items-center px-2 py-1 mb-4 bg-slate-700/50 border border-slate-600 rounded text-xs text-slate-300">
        {selectionLabel}
      </div>

      {chartData.length > 0 ? (
        <div className="h-[400px] sm:h-[500px]">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 20, left: 30, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                type="number"
                dataKey="questionsPerHour"
                name="Questions/Hour"
                stroke="#94a3b8"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                label={{ value: 'Questions / Hour', position: 'bottom', offset: 20, fill: '#94a3b8' }}
              />
              <YAxis
                type="number"
                dataKey="accuracy"
                name="Accuracy"
                stroke="#94a3b8"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                domain={['auto', 'auto']}
                tickFormatter={(v) => `${v}%`}
                label={{ value: 'Accuracy (%)', angle: -90, position: 'insideLeft', offset: -15, fill: '#94a3b8' }}
              />
              <Tooltip content={<BenchmarkTooltip />} />
              <Scatter data={chartData} name="Runs" isAnimationActive={false}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color || '#3b82f6'} />
                ))}
                <LabelList
                  dataKey="labelText"
                  content={({ x, y, value, index }) => {
                    const pt = chartData[index];
                    if (!pt?.showLabel) return null;
                    return (
                      <text
                        x={x + (pt.labelDx || 0)}
                        y={y + (pt.labelDy || 0)}
                        fill="#e2e8f0"
                        fontSize={10}
                        fontWeight={600}
                      >
                        {value}
                      </text>
                    );
                  }}
                />
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
          No benchmark data found for this selection.
        </div>
      )}
    </Card>
  );
}

// =====================
// Main Detail Results Page
// =====================

export default function DetailResults() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans">
      {/* Navigation */}
      <nav className="bg-slate-800 border-b border-slate-700 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-0">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-xl sm:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-400">
              TEAS
            </Link>
            <a
              href="https://github.com/TEAS-project/TEASBench"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-300 hover:text-blue-400 transition-colors"
            >
              <Github className="w-5 h-5 sm:w-6 sm:h-6" />
            </a>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 lg:gap-6 text-xs sm:text-sm">
            <Link to="/" className="text-slate-300 hover:text-blue-400 transition-colors flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
            <Link to="/documentation" className="text-slate-300 hover:text-blue-400 transition-colors">Documentation</Link>
            <Link to="/team" className="text-slate-300 hover:text-blue-400 transition-colors">Team</Link>
          </div>
        </div>
      </nav>

      {/* Header */}
      <div className="bg-gradient-to-b from-slate-800 to-slate-900 py-8 sm:py-12 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-rose-400">
            Trade-off Plots
          </h1>
          <p className="text-base sm:text-lg text-slate-300 max-w-3xl">
            Detailed trade-off analysis including CAP Radar plots for MoE models, Accuracy - Performance trade-off for Test Time Scaling, and Accuracy - Latency trade-off for Agentic Workflow.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* MoE CAP Radar */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">
              LLM Inference with MoE
            </h2>
            <a
              href="https://github.com/Auto-CAP/MoE-CAP"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-full text-xs text-white transition-colors"
            >
              <Github className="w-3 h-3" />
              <span>GitHub</span>
            </a>
          </div>
          <CAPRadarSection />
        </section>

        {/* TTS Trade-off */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-sky-400">
              Test Time Scaling
            </h2>
          </div>
          <TTSTradeoffSection />
        </section>

        {/* Agentic Workflow Trade-off */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-orange-400">
              Agentic Workflow
            </h2>
          </div>
          <AgenticTradeoffSection />
        </section>
      </div>
    </div>
  );
}
