import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ComposedChart, Line, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine, LabelList,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Cell,
  ScatterChart, ZAxis
} from 'recharts';
import {
  Activity, Server, Settings, Cpu, Info, Zap, Percent, Github
} from 'lucide-react';

const Card = ({ children, className = "" }) => (
  <div className={`bg-slate-800 border border-slate-700 rounded-lg p-3 sm:p-4 ${className}`}>
    {children}
  </div>
);

const StatCard = ({ title, value, unit, subtext, icon: Icon }) => (
  <Card>
    <div className="flex justify-between items-start mb-2">
      <span className="text-slate-400 text-xs sm:text-sm font-medium">{title}</span>
      {Icon && <Icon className="text-blue-400 w-4 h-4 sm:w-5 sm:h-5" />}
    </div>
    <div className="flex items-baseline gap-1">
      <span className="text-xl sm:text-2xl font-bold text-slate-100">{value}</span>
      <span className="text-xs sm:text-sm text-slate-400 font-medium">{unit}</span>
    </div>
    {subtext && <div className="text-xs text-slate-500 mt-1">{subtext}</div>}
  </Card>
);

const ScenarioButton = ({ active, onClick, label, desc }) => (
  <button
    onClick={onClick}
    className={`w-full text-left p-2 sm:p-3 rounded-md border transition-all ${
      active
        ? 'bg-blue-900/30 border-blue-500 text-blue-100'
        : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
    }`}
  >
    <div className="font-semibold text-xs sm:text-sm">{label}</div>
    <div className="text-xs opacity-70 mt-1 hidden sm:block">{desc}</div>
  </button>
);

// LongBench v2 benchmark data (SGLang) - defined outside component for stability
const LONGBENCH_CONFIGS = {
  // Qwen3-235B-A22B - Accuracy: 50.1%
  'qwen3-235b-ep-tp-16h20': {
    label: 'Qwen3-235B-A22B / BF16 / 16xH20 (EP+TP)',
    model: 'Qwen3-235B-A22B',
    precision: 'BF16',
    gpu: '16xH20',
    system: 'SGLang (EP+TP)',
    accuracy: 50.1,
    cost: 8000,  // 16 GPUs × 500W
    tpot: 0.06,
    throughput: 1490,
    batchSize: 87,
    color: '#3b82f6'  // Blue
  },
  'qwen3-235b-ep-tp-8h20': {
    label: 'Qwen3-235B-A22B / BF16 / 8xH20 (EP+TP)',
    model: 'Qwen3-235B-A22B',
    precision: 'BF16',
    gpu: '8xH20',
    system: 'SGLang (EP+TP)',
    accuracy: 50.1,
    cost: 4000,  // 8 GPUs × 500W
    tpot: 0.04,
    throughput: 1241,
    batchSize: 45,
    color: '#22c55e'  // Green
  },
  'qwen3-235b-tp-16h20': {
    label: 'Qwen3-235B-A22B / BF16 / 16xH20 (TP)',
    model: 'Qwen3-235B-A22B',
    precision: 'BF16',
    gpu: '16xH20',
    system: 'SGLang (TP)',
    accuracy: 50.1,
    cost: 8000,  // 16 GPUs × 500W
    tpot: 0.06,
    throughput: 1503,
    batchSize: 88,
    color: '#f97316'  // Orange
  },
  'qwen3-235b-tp-8h20': {
    label: 'Qwen3-235B-A22B / BF16 / 8xH20 (TP)',
    model: 'Qwen3-235B-A22B',
    precision: 'BF16',
    gpu: '8xH20',
    system: 'SGLang (TP)',
    accuracy: 50.1,
    cost: 4000,  // 8 GPUs × 500W
    tpot: 0.04,
    throughput: 1159,
    batchSize: 44,
    color: '#a855f7'  // Purple
  },
  // Qwen3-30B-A3B - Accuracy: 42.5%
  'qwen3-30b-ep-tp-8h20': {
    label: 'Qwen3-30B-A3B / BF16 / 8xH20 (EP+TP)',
    model: 'Qwen3-30B-A3B',
    precision: 'BF16',
    gpu: '8xH20',
    system: 'SGLang (EP+TP)',
    accuracy: 42.5,
    cost: 4000,  // 8 GPUs × 500W
    tpot: 0.05,
    throughput: 5283,
    batchSize: 241,
    color: '#ef4444'  // Red
  },
  'qwen3-30b-ep-tp-4h20': {
    label: 'Qwen3-30B-A3B / BF16 / 4xH20 (EP+TP)',
    model: 'Qwen3-30B-A3B',
    precision: 'BF16',
    gpu: '4xH20',
    system: 'SGLang (EP+TP)',
    accuracy: 42.5,
    cost: 2000,  // 4 GPUs × 500W
    tpot: 0.04,
    throughput: 5069,
    batchSize: 218,
    color: '#06b6d4'  // Cyan
  },
  'qwen3-30b-ep-tp-2h20': {
    label: 'Qwen3-30B-A3B / BF16 / 2xH20 (EP+TP)',
    model: 'Qwen3-30B-A3B',
    precision: 'BF16',
    gpu: '2xH20',
    system: 'SGLang (EP+TP)',
    accuracy: 42.5,
    cost: 1000,  // 2 GPUs × 500W
    tpot: 0.04,
    throughput: 2186,
    batchSize: 85,
    color: '#eab308'  // Yellow
  },
  'qwen3-30b-tp-8h20': {
    label: 'Qwen3-30B-A3B / BF16 / 8xH20 (TP)',
    model: 'Qwen3-30B-A3B',
    precision: 'BF16',
    gpu: '8xH20',
    system: 'SGLang (TP)',
    accuracy: 42.5,
    cost: 4000,  // 8 GPUs × 500W
    tpot: 0.05,
    throughput: 5277,
    batchSize: 241,
    color: '#ec4899'  // Pink
  },
  'qwen3-30b-tp-4h20': {
    label: 'Qwen3-30B-A3B / BF16 / 4xH20 (TP)',
    model: 'Qwen3-30B-A3B',
    precision: 'BF16',
    gpu: '4xH20',
    system: 'SGLang (TP)',
    accuracy: 42.5,
    cost: 2000,  // 4 GPUs × 500W
    tpot: 0.04,
    throughput: 5072,
    batchSize: 218,
    color: '#14b8a6'  // Teal
  },
  'qwen3-30b-tp-2h20': {
    label: 'Qwen3-30B-A3B / BF16 / 2xH20 (TP)',
    model: 'Qwen3-30B-A3B',
    precision: 'BF16',
    gpu: '2xH20',
    system: 'SGLang (TP)',
    accuracy: 42.5,
    cost: 1000,  // 2 GPUs × 500W
    tpot: 0.04,
    throughput: 2197,
    batchSize: 85,
    color: '#8b5cf6'  // Violet
  },
  // DeepSeek-V2.5 - Accuracy: 53.7%
  'deepseek-v2.5-ep-tp-16h20': {
    label: 'DeepSeek-V2.5 / BF16 / 16xH20 (EP+TP)',
    model: 'DeepSeek-V2.5',
    precision: 'BF16',
    gpu: '16xH20',
    system: 'SGLang (EP+TP)',
    accuracy: 53.7,
    cost: 8000,  // 16 GPUs × 500W
    tpot: 0.10,
    throughput: 549,
    batchSize: 57,
    color: '#f43f5e'  // Rose
  },
  'deepseek-v2.5-ep-tp-8h20': {
    label: 'DeepSeek-V2.5 / BF16 / 8xH20 (EP+TP)',
    model: 'DeepSeek-V2.5',
    precision: 'BF16',
    gpu: '8xH20',
    system: 'SGLang (EP+TP)',
    accuracy: 53.7,
    cost: 4000,  // 8 GPUs × 500W
    tpot: 0.07,
    throughput: 383,
    batchSize: 25,
    color: '#84cc16'  // Lime
  },
  'deepseek-v2.5-tp-16h20': {
    label: 'DeepSeek-V2.5 / BF16 / 16xH20 (TP)',
    model: 'DeepSeek-V2.5',
    precision: 'BF16',
    gpu: '16xH20',
    system: 'SGLang (TP)',
    accuracy: 53.7,
    cost: 8000,  // 16 GPUs × 500W
    tpot: 0.10,
    throughput: 595,
    batchSize: 57,
    color: '#0ea5e9'  // Sky
  },
  'deepseek-v2.5-tp-8h20': {
    label: 'DeepSeek-V2.5 / BF16 / 8xH20 (TP)',
    model: 'DeepSeek-V2.5',
    precision: 'BF16',
    gpu: '8xH20',
    system: 'SGLang (TP)',
    accuracy: 53.7,
    cost: 4000,  // 8 GPUs × 500W
    tpot: 0.05,
    throughput: 500,
    batchSize: 25,
    color: '#d946ef'  // Fuchsia
  },
  'deepseek-v2.5-dp-ep-16h20': {
    label: 'DeepSeek-V2.5 / BF16 / 16xH20 (DP+EP)',
    model: 'DeepSeek-V2.5',
    precision: 'BF16',
    gpu: '16xH20',
    system: 'SGLang (DP+EP)',
    accuracy: 53.7,
    cost: 8000,  // 16 GPUs × 500W
    tpot: 0.11,
    throughput: 1028,
    batchSize: 112,
    color: '#64748b'  // Slate
  },
  'deepseek-v2.5-dp-ep-8h20': {
    label: 'DeepSeek-V2.5 / BF16 / 8xH20 (DP+EP)',
    model: 'DeepSeek-V2.5',
    precision: 'BF16',
    gpu: '8xH20',
    system: 'SGLang (DP+EP)',
    accuracy: 53.7,
    cost: 4000,  // 8 GPUs × 500W
    tpot: 0.08,
    throughput: 602,
    batchSize: 46,
    color: '#fb7185'  // Rose light
  },
  // DeepSeek-R1 - Accuracy: 58.3%
  'deepseek-r1-dp-ep-16h20': {
    label: 'DeepSeek-R1 / BF16 / 16xH20 (DP+EP)',
    model: 'DeepSeek-R1',
    precision: 'BF16',
    gpu: '16xH20',
    system: 'SGLang (DP+EP)',
    accuracy: 58.3,
    cost: 8000,  // 16 GPUs × 500W
    tpot: 0.11,
    throughput: 1401,
    batchSize: 160,
    color: '#10b981'  // Emerald
  },
  'deepseek-r1-tp-ep-16h20': {
    label: 'DeepSeek-R1 / BF16 / 16xH20 (TP+EP)',
    model: 'DeepSeek-R1',
    precision: 'BF16',
    gpu: '16xH20',
    system: 'SGLang (TP+EP)',
    accuracy: 58.3,
    cost: 8000,
    tpot: 0.10,
    throughput: 427,
    batchSize: 41,
    color: '#dc2626'
  },
};

// GSM8K benchmark data - defined outside component for stability
const GSM8K_CONFIGS = {
  'qwen3-30b-a3b-5xa5000': {
    label: 'Qwen3-30B-A3B / BF16 / 5xRTX A5000',
    model: 'Qwen3-30B-A3B',
    precision: 'BF16',
    gpu: '5xRTX A5000',
    accuracy: 81.12,
    cost: 15342.20,
    tpot: 0.05,
    throughput: 1402.01,
    color: '#3b82f6'
  },
  'qwen1.5-moe-1xa6000': {
    label: 'Qwen1.5-MoE-A2.7B-Chat / BF16 / 1xRTX A6000',
    model: 'Qwen1.5-MoE-A2.7B-Chat',
    precision: 'BF16',
    gpu: '1xRTX A6000',
    accuracy: 45.72,
    cost: 7158.92,
    tpot: 0.03,
    throughput: 599.35,
    color: '#22c55e'
  },
  'qwen3-235b-fp8-2xh200': {
    label: 'Qwen3-235B-A22B-Thinking / FP8 / 2xH200',
    model: 'Qwen3-235B-A22B-Thinking-2507-FP8',
    precision: 'FP8',
    gpu: '2xH200',
    accuracy: 68.84,
    cost: 104052.07,
    tpot: 0.02,
    throughput: 1136.77,
    color: '#f97316'
  },
  'qwen3-235b-bf16-4xh200': {
    label: 'Qwen3-235B-A22B-Thinking / BF16 / 4xH200',
    model: 'Qwen3-235B-A22B-Thinking-2507',
    precision: 'BF16',
    gpu: '4xH200',
    accuracy: 70.28,
    cost: 195252.11,
    tpot: 0.02,
    throughput: 1206.32,
    color: '#a855f7'
  },
  'qwen3-235b-bf16-8xh100': {
    label: 'Qwen3-235B-A22B / BF16 / 8xH100',
    model: 'Qwen3-235B-A22B',
    precision: 'BF16',
    gpu: '8xH100',
    accuracy: 71.19,
    cost: 344657.14,
    tpot: 0.03,
    throughput: 1694.30,
    color: '#ef4444'
  },
  'qwen3-30b-instruct-4xa6000': {
    label: 'Qwen3-30B-A3B-Instruct / BF16 / 4xRTX A6000',
    model: 'Qwen3-30B-A3B-Instruct-2507',
    precision: 'BF16',
    gpu: '4xRTX A6000',
    accuracy: 53.30,
    cost: 21600.27,
    tpot: 0.02,
    throughput: 638.03,
    color: '#60a5fa'
  },
  'qwen3-30b-thinking-4xa6000': {
    label: 'Qwen3-30B-A3B-Thinking / BF16 / 4xRTX A6000',
    model: 'Qwen3-30B-A3B-Thinking-2507',
    precision: 'BF16',
    gpu: '4xRTX A6000',
    accuracy: 69.29,
    cost: 21600.54,
    tpot: 0.04,
    throughput: 1701.41,
    color: '#4ade80'
  },
  'qwen3-30b-4xa6000': {
    label: 'Qwen3-30B-A3B / BF16 / 4xRTX A6000',
    model: 'Qwen3-30B-A3B',
    precision: 'BF16',
    gpu: '4xRTX A6000',
    accuracy: 80.67,
    cost: 21600.69,
    tpot: 0.03,
    throughput: 1417.49,
    color: '#9333ea'
  },
  'qwen3-30b-2xa100': {
    label: 'Qwen3-30B-A3B / BF16 / 2xA100',
    model: 'Qwen3-30B-A3B',
    precision: 'BF16',
    gpu: '2xA100',
    accuracy: 80.97,
    cost: 54380.91,
    tpot: 0.01,
    throughput: 1806.09,
    color: '#f87171'
  },
};

export default function App() {
  // --- Model Configurations ---
  // Based on reference table with correct activation sizes
  // Required BW = (activationGB + kvCacheGB) / TPOT
  // Reference values at BS=1, TPOT=0.1s from benchmark table
  const MODEL_CONFIGS = {
    'mixtral-8x7b': {
      name: 'Mixtral-8x7B',
      // Architecture from reference table
      L: 32,              // n_layer
      d_model: 4096,      // hidden_size
      n_heads: 32,        // n_attn_head
      d_head: 128,        // d_head
      n_kv: 8,            // n_kv_head
      E: 8,               // num experts
      k: 2,               // top-k
      P: 2,               // bytes per param (BF16)
      // Params from table (BS=1, TPOT=0.1s, SeqLen=5000)
      activationB: 12.9,  // Activation params in billions
      totalB: 46.7,       // Total params in billions (for dense/fully-activated)
      kvPerToken: 0.000065536, // KV size per token in GB
      refSeqLen: 5000,    // Reference sequence length
      refBwBS1: 264.5536, // Reference BW at BS=1, TPOT=0.1s (5K)
      refBwBS32: 926.3536, // Reference BW at BS=32, TPOT=0.1s
      refBwBS64: 1152.99, // Fully activated + KV cache for BS=64
      refBwBS128: 1362.71, // Fully activated + KV cache for BS=128
      denseRefBw: 946.5536, // Fixed All Experts reference BW (5K)
      // 14K context values (same ratio as 5K w.r.t BS32)
      refBwBS1_14k: 276.35008, // Reference BW at BS=1, TPOT=0.1s (14K)
      refBwBS32_14k: 938.15008, // Reference BW at BS=32, TPOT=0.1s (14K)
      refBwBS64_14k: 938.15008 * (1152.99 / 926.3536), // ~1167.62 (14K)
      refBwBS128_14k: 938.15008 * (1362.71 / 926.3536), // ~1380.07 (14K)
      denseRefBw_14k: 958.35008, // All Experts reference BW (14K)
    },
    'mixtral-8x22b': {
      name: 'Mixtral-8x22B',
      L: 56,
      d_model: 6144,
      n_heads: 48,
      d_head: 128,
      n_kv: 8,
      E: 8,
      k: 2,
      P: 2,
      activationB: 39,
      totalB: 141,
      kvPerToken: 0.000114688,
      refSeqLen: 5000,
      refBwBS1: 791.4688,
      refBwBS32: 2804.2688, // Reference BW at BS=32, TPOT=0.1s
      refBwBS64: 3192.74, // Fully activated + KV cache for BS=64
      refBwBS128: 3559.74, // Fully activated + KV cache for BS=128
      denseRefBw: 2831.4688, // Fixed All Experts reference BW (5K)
      // 14K context values (same ratio as 5K w.r.t BS32)
      refBwBS1_14k: 812.11264, // Reference BW at BS=1, TPOT=0.1s (14K)
      refBwBS32_14k: 2824.91264, // Reference BW at BS=32, TPOT=0.1s (14K)
      refBwBS64_14k: 2824.91264 * (3192.74 / 2804.2688), // ~3216.20 (14K)
      refBwBS128_14k: 2824.91264 * (3559.74 / 2804.2688), // ~3585.79 (14K)
      denseRefBw_14k: 2852.11264, // All Experts reference BW (14K)
    },
    'qwen1.5-moe': {
      name: 'Qwen1.5-MoE',
      L: 24,
      d_model: 2048,
      n_heads: 16,
      d_head: 128,
      n_kv: 16,
      E: 60,
      k: 4,
      P: 2,
      activationB: 2.7,
      totalB: 14.3,
      kvPerToken: 0.000098304,
      refSeqLen: 5000,
      refBwBS1: 63.8304,
      refBwBS32: 241.4304, // Reference BW at BS=32, TPOT=0.1s
      refBwBS64: 241.4304 * 1.10133, // ~265.88 GB/s
      refBwBS128: 241.4304 * 1.2473, // ~301.16 GB/s
      denseRefBw: 289.8304, // Fixed All Experts reference BW (5K)
      // 14K context values (same ratio as 5K w.r.t BS32)
      refBwBS1_14k: 81.52512, // Reference BW at BS=1, TPOT=0.1s (14K)
      refBwBS32_14k: 259.12512, // Reference BW at BS=32, TPOT=0.1s (14K)
      refBwBS64_14k: 259.12512 * 1.10133, // ~285.38 (14K)
      refBwBS128_14k: 259.12512 * 1.2473, // ~323.24 (14K)
      denseRefBw_14k: 307.52512, // All Experts reference BW (14K)
    },
    'deepseek-r1': {
      name: 'DeepSeek-R1',
      L: 61,
      d_model: 7168,
      n_heads: 128,
      d_head: 192,
      n_kv: 128,
      E: 256,
      k: 8,
      P: 2,
      activationB: 37,
      totalB: 671,
      kvPerToken: 0.002998272,
      refSeqLen: 5000,
      refBwBS1: 1537.22816, // Reference BW at BS=1, TPOT=0.1s (5K) - estimated
      refBwBS32: 6249.4272, // Reference BW at BS=32, TPOT=0.1s
      refBwBS64: 6249.4272 / 0.875583, // ~7137.26 GB/s
      refBwBS128: 6249.4272 * 1.880657, // ~11752.35 GB/s
      denseRefBw: 13719.8272, // Fixed All Experts reference BW (5K) - estimated
      // 14K context values (same ratio as 5K w.r.t BS32)
      refBwBS1_14k: 1579.51616, // Reference BW at BS=1, TPOT=0.1s (14K)
      refBwBS32_14k: 6789.11616, // Reference BW at BS=32, TPOT=0.1s (14K)
      refBwBS64_14k: 6789.11616 * 1.1421, // ~7754.0 (14K)
      refBwBS128_14k: 6789.11616 * 1.8807, // ~12766.5 (14K)
      denseRefBw_14k: 14259.51616, // All Experts reference BW (14K)
    },
    // Estimated models (not in reference table)
    'deepseek-v2-lite': {
      name: 'Deepseek-V2-Lite',
      L: 27,
      d_model: 2048,
      n_heads: 16,
      d_head: 128,
      n_kv: 16,
      E: 64,
      k: 6,
      P: 2,
      activationB: 2.4,
      totalB: 16, // ~16B dense equivalent
      kvPerToken: 0.000110592,
      refSeqLen: 5000,
      refBwBS1: 77.72, // 19.43 * 4 at TPOT=0.1s
      refBwBS32: 486.96, // 121.74 * 4
      refBwBS64: 565.48, // 141.37 * 4
      refBwBS128: 628.68, // 157.17 * 4
      denseRefBw: 651.06, // 16B dense + KV cache (5000 tokens) at TPOT=0.1s
    },
    'qwen3': {
      name: 'Qwen3-30B-A3B',
      L: 48,
      d_model: 2048,
      n_heads: 32,
      d_head: 128,
      n_kv: 4,
      E: 128,
      k: 8,
      P: 2,
      activationB: 3,
      totalB: 30,
      kvPerToken: 0.000098304,
      refSeqLen: 5000,
      refBwBS1: null,
      denseBwBS1: null,
    },
  };

  // --- State ---
  const [selectedModel, setSelectedModel] = useState('deepseek-r1');
  const [scenario, setScenario] = useState('5k-ref');
  
  // Inputs - default to 5k reference (4750 + 250 = 5000)
  const [batchSize, setBatchSize] = useState(1);
  const [inputLen, setInputLen] = useState(4750);
  const [outputLen, setOutputLen] = useState(250);
  const [sloMs, setSloMs] = useState(100); // Target Time Per Output Token (ms) - default 100ms = 0.1s
  const [hardwareBw, setHardwareBw] = useState(768); // Default A6000
  const [smbu, setSmbu] = useState(16.33); // Fixed S-MBU
  const [numGpus, setNumGpus] = useState(1); // Supply side GPU count

  // CAP Radar Chart selections (3 configs)
  const [capConfig1, setCapConfig1] = useState('qwen3-30b-a3b-5xa5000');
  const [capConfig2, setCapConfig2] = useState('qwen1.5-moe-1xa6000');
  const [capConfig3, setCapConfig3] = useState('qwen3-235b-fp8-2xh200');
  const [capDataset, setCapDataset] = useState('gsm8k');

  // Select configs based on dataset
  const CAP_CONFIGS = capDataset === 'longbench-v2' ? LONGBENCH_CONFIGS : GSM8K_CONFIGS;

  // Reset config selections when dataset changes
  useEffect(() => {
    const configs = capDataset === 'longbench-v2' ? LONGBENCH_CONFIGS : GSM8K_CONFIGS;
    const keys = Object.keys(configs);
    setCapConfig1(keys[0] || '');
    setCapConfig2(keys[1] || '');
    setCapConfig3(keys[2] || '');
  }, [capDataset]);

  const MODEL_CONFIG = MODEL_CONFIGS[selectedModel];

  // Get S-MBU based on model and batch size
  const getSmbu = (model, batchSize) => {
    const config = MODEL_CONFIGS[model];
    if (config.smbuMap && config.smbuMap[batchSize]) {
      return config.smbuMap[batchSize] * 100; // Convert to percentage
    }
    return 16.33; // Default fallback
  };

  const currentSmbu = getSmbu(selectedModel, batchSize);

  // Hardware options
  const HARDWARE_PRESETS = [
    { name: 'NVIDIA A6000', bw: 768 },
    { name: 'NVIDIA H100 (SXM)', bw: 3350 },
    { name: 'NVIDIA A100 (SXM4)', bw: 2039 },
    { name: 'NVIDIA H20', bw: 4000 },
    { name: 'NVIDIA L20', bw: 230 },
    { name: 'Consumer RTX 4090', bw: 1008 }
  ];

  // --- Handlers ---
  const handleScenarioChange = (id) => {
    setScenario(id);
    if (id === '5k-ref') {
      // 5K Total: 4K input + 1K output
      setInputLen(4000);
      setOutputLen(1000);
    } else if (id === '14k-ref') {
      // 14K Total: 13K input + 1K output
      setInputLen(13000);
      setOutputLen(1000);
    }
  };

  // --- Calculations Helper (Using reference table values) ---
  // Reference BW values are at specific BS values with TPOT=0.1s
  // Use lookup for known batch sizes, interpolate for others
  const calculateDemand = (customBatchSize = null) => {
    const B = customBatchSize !== null ? customBatchSize : batchSize;
    const { activationB, totalB, kvPerToken, refSeqLen, refBwBS1, refBwBS32, refBwBS64, refBwBS128, E, k, refBwBS1_14k, refBwBS32_14k, refBwBS64_14k, refBwBS128_14k } = MODEL_CONFIG;

    // Use sequence length from context settings
    const effectiveSeqLen = inputLen + outputLen;
    const tpot_seconds = sloMs / 1000;
    const refTpot = 0.1; // Reference TPOT from table
    
    // Select reference value based on scenario (5K vs 14K)
    const is14k = scenario === '14k-ref';
    const baseRefBwBS1 = is14k && refBwBS1_14k ? refBwBS1_14k : refBwBS1;
    const baseRefBwBS32 = is14k && refBwBS32_14k ? refBwBS32_14k : refBwBS32;
    const baseRefBwBS64 = is14k && refBwBS64_14k ? refBwBS64_14k : refBwBS64;
    const baseRefBwBS128 = is14k && refBwBS128_14k ? refBwBS128_14k : refBwBS128;
    
    let req_bw_gbs;
    
    // Build reference points map for known batch sizes
    const refPoints = { 1: baseRefBwBS1 };
    if (baseRefBwBS32) refPoints[32] = baseRefBwBS32;
    if (baseRefBwBS64) refPoints[64] = baseRefBwBS64;
    if (baseRefBwBS128) refPoints[128] = baseRefBwBS128;
    
    // Check if we have exact reference value for this batch size
    if (refPoints[B]) {
      // Use exact reference value, scale for TPOT
      const tpotScaleFactor = refTpot / tpot_seconds;
      req_bw_gbs = refPoints[B] * tpotScaleFactor;
    } else if (baseRefBwBS1) {
      // Interpolate between known reference points
      const knownBSValues = Object.keys(refPoints).map(Number).sort((a, b) => a - b);
      
      // Find surrounding reference points
      let lowerBS = 1, upperBS = 1;
      let lowerBW = baseRefBwBS1, upperBW = baseRefBwBS1;
      
      for (let i = 0; i < knownBSValues.length; i++) {
        if (knownBSValues[i] <= B) {
          lowerBS = knownBSValues[i];
          lowerBW = refPoints[lowerBS];
        }
        if (knownBSValues[i] >= B && upperBS === 1) {
          upperBS = knownBSValues[i];
          upperBW = refPoints[upperBS];
        }
      }
      
      // If no upper bound found, use highest known
      if (upperBS < B) {
        upperBS = knownBSValues[knownBSValues.length - 1];
        upperBW = refPoints[upperBS];
      }
      
      // Linear interpolation between known points
      let interpolatedBW;
      if (lowerBS === upperBS) {
        interpolatedBW = lowerBW;
      } else {
        const ratio = (B - lowerBS) / (upperBS - lowerBS);
        interpolatedBW = lowerBW + ratio * (upperBW - lowerBW);
      }
      
      const tpotScaleFactor = refTpot / tpot_seconds;
      req_bw_gbs = interpolatedBW * tpotScaleFactor;
    } else {
      // Fallback calculation for models without reference
      const activationGB = activationB * 2;
      const kvCacheGB = kvPerToken * effectiveSeqLen * B;
      const totalLoadGB = activationGB + kvCacheGB;
      req_bw_gbs = totalLoadGB / tpot_seconds;
    }
    
    // Calculate activation size for display
    const activationGB = activationB * 2;
    const kvCacheGB = kvPerToken * effectiveSeqLen * B;
    
    // Calculate unique experts for display
    const totalExpertSelections = B * k;
    const E_unique_expected = E * (1 - Math.pow(1 - 1/E, totalExpertSelections));
    
    return {
      reqBwGBs: req_bw_gbs,
      activeParamsGB: activationGB,
      kvCacheGB: kvCacheGB,
      uniqueExperts: E_unique_expected,
      totalB: totalB
    };
  };

  // Calculate fully activated (dense) bandwidth - all experts active
  // Reference value at TPOT=0.1s, scales inversely with TPOT (half TPOT = 2x bandwidth)
  const calculateDenseBandwidth = () => {
    const { totalB, kvPerToken, refSeqLen, denseRefBw, denseRefBw_14k } = MODEL_CONFIG;
    const tpot_seconds = sloMs / 1000;
    const refTpot = 0.1; // Reference TPOT
    const tpotScaleFactor = refTpot / tpot_seconds;
    
    // Select reference value based on scenario (5K vs 14K)
    const is14k = scenario === '14k-ref';
    const baseDenseRefBw = is14k && denseRefBw_14k ? denseRefBw_14k : denseRefBw;
    
    if (baseDenseRefBw) {
      // Scale reference value by TPOT factor
      return baseDenseRefBw * tpotScaleFactor;
    }
    
    // Fallback calculation for models without reference data
    const denseGB = totalB * 2;
    const kvCacheGB = kvPerToken * refSeqLen * 1; // BS=1
    const totalLoadGB = denseGB + kvCacheGB;
    
    return totalLoadGB / tpot_seconds;
  };

  const currentStats = useMemo(() => {
    return calculateDemand();
  }, [batchSize, inputLen, outputLen, sloMs, selectedModel]);

  // Custom label component for device names with connectors
  const CustomLabel = (props) => {
    const { x, y, value, payload } = props;
    if (!payload) return null;
    
    const color = payload.category === 'edge' ? '#f97316' : '#3b82f6';
    const pos = payload.labelPos || 'bottomRight';
    
    let dx = 0, dy = 0, textAnchor = 'start';
    let lineX1 = x, lineY1 = y, lineX2 = x, lineY2 = y;
    
    switch(pos) {
      case 'top':
        dx = 0; dy = -35; textAnchor = 'middle';
        lineX2 = x; lineY2 = y - 10;
        break;
      case 'topRight':
        dx = 28; dy = -25; textAnchor = 'start';
        lineX2 = x + 8; lineY2 = y - 8;
        break;
      case 'bottom':
        dx = 0; dy = 38; textAnchor = 'middle';
        lineX2 = x; lineY2 = y + 10;
        break;
      case 'bottomRight':
        dx = 28; dy = 28; textAnchor = 'start';
        lineX2 = x + 8; lineY2 = y + 10;
        break;
      case 'left':
        dx = -28; dy = 5; textAnchor = 'end';
        lineX2 = x - 10; lineY2 = y;
        break;
      case 'right':
      default:
        dx = 28; dy = 5; textAnchor = 'start';
        lineX2 = x + 10; lineY2 = y;
        break;
    }
    
    return (
      <g>
        {/* Connecting line */}
        <line 
          x1={lineX1} 
          y1={lineY1} 
          x2={lineX2} 
          y2={lineY2} 
          stroke={color}
          strokeWidth={1}
          strokeDasharray="2,2"
          opacity={0.6}
        />
        {/* Label text */}
        <text 
          x={x + dx} 
          y={y + dy} 
          fill={color}
          fontSize={11}
          fontWeight={600}
          textAnchor={textAnchor}
        >
          {value}
        </text>
      </g>
    );
  };

  // --- Chart Data: Power vs Bandwidth (MoE-CAP style) ---
  const chartData = useMemo(() => {
    // Calculate theoretical bandwidth at BS=1 (baseline)
    const statsBS1 = calculateDemand(1);
    const bwBS1 = statsBS1.reqBwGBs;
    
    // Calculate theoretical bandwidth at current batch size
    const stats = calculateDemand();
    const currentBw = stats.reqBwGBs;
    
    // Calculate Fully Activated (Dense) bandwidth - all experts active
    const fullyActivatedBw = calculateDenseBandwidth();
    
    // Actual Bandwidth (Supply) - Horizontal Line
    const actualBw = hardwareBw * numGpus * (currentSmbu / 100);
    
    // Device points from benchmark data
    // Peak Bandwidth = HBM/GDDR memory bandwidth (blue circles)
    const peakDevices = [
      // Data Center Systems (Multi-GPU)
      { name: 'NVIDIA DGX-H100', bandwidth: 26800, power: 10200, category: 'datacenter-system', type: 'peak', showLabel: true },
      { name: 'NVIDIA DGX-A100', bandwidth: 16296, power: 6500, category: 'datacenter-system', type: 'peak', showLabel: false },
      // Data Center Cards
      { name: 'AMD MI300X', bandwidth: 5300, power: 750, category: 'datacenter-card', type: 'peak', showLabel: true },
      { name: 'NVIDIA H100-SXM', bandwidth: 3350, power: 700, category: 'datacenter-card', type: 'peak', showLabel: true },
      { name: 'AWS Trainium 2', bandwidth: 2900, power: 480, category: 'datacenter-card', type: 'peak', showLabel: false },
      { name: 'NVIDIA A100-80G-SXM4', bandwidth: 2037, power: 400, category: 'datacenter-card', type: 'peak', showLabel: false },
      { name: 'NVIDIA H100-PCIe', bandwidth: 2000, power: 350, category: 'datacenter-card', type: 'peak', showLabel: false },
      { name: 'NVIDIA A100-80G-PCIe', bandwidth: 1935, power: 300, category: 'datacenter-card', type: 'peak', showLabel: false },
      { name: 'NVIDIA A6000', bandwidth: 768, power: 300, category: 'datacenter-card', type: 'peak', showLabel: false },
      { name: 'NVIDIA A5000', bandwidth: 768, power: 230, category: 'datacenter-card', type: 'peak', showLabel: false },
      // Personal (Consumer GPUs) - 调整power避免重叠
      { name: 'NVIDIA RTX 5090', bandwidth: 1790, power: 575, category: 'personal', type: 'peak', showLabel: true },
      { name: 'NVIDIA RTX 4090', bandwidth: 1010, power: 450, category: 'personal', type: 'peak', showLabel: true },
      { name: 'NVIDIA RTX 3090Ti', bandwidth: 1010, power: 400, category: 'personal', type: 'peak', showLabel: false },
      { name: 'NVIDIA RTX 5080', bandwidth: 960, power: 360, category: 'personal', type: 'peak', showLabel: false },
      { name: 'NVIDIA RTX 3080Ti', bandwidth: 912.4, power: 350, category: 'personal', type: 'peak', showLabel: false },
      { name: 'NVIDIA RTX 4080', bandwidth: 716.8, power: 320, category: 'personal', type: 'peak', showLabel: false },
      // SoC (Apple Silicon) - Unified Memory - 调整power避免重叠
      { name: 'Apple M4 max', bandwidth: 546, power: 90, category: 'soc', type: 'peak', showLabel: true },
      { name: 'Apple M3 max', bandwidth: 400, power: 70, category: 'soc', type: 'peak', showLabel: false },
      { name: 'Apple M2 max', bandwidth: 400, power: 50, category: 'soc', type: 'peak', showLabel: false },
      { name: 'Apple M1 max', bandwidth: 400, power: 35, category: 'soc', type: 'peak', showLabel: false },
      // Autonomous (NVIDIA Jetson)
      { name: 'NVIDIA Orin AGX', bandwidth: 204.8, power: 60, category: 'autonomous', type: 'peak', showLabel: true },
      { name: 'NVIDIA Xavier AGX', bandwidth: 136.5, power: 30, category: 'autonomous', type: 'peak', showLabel: false },
      { name: 'NVIDIA Orin NX', bandwidth: 102.4, power: 25, category: 'autonomous', type: 'peak', showLabel: false },
      { name: 'NVIDIA Jetson Nano', bandwidth: 25.6, power: 10, category: 'autonomous', type: 'peak', showLabel: true },
    ];
    
    // Offloading Bandwidth = PCIe/ethernet bandwidth (orange squares)
    const offloadDevices = [
      // Data Center Systems (Multi-GPU with NVLink)
      { name: 'NVIDIA DGX-H100', bandwidth: 1280, power: 10200, category: 'datacenter-system', type: 'pcie', showLabel: true },
      { name: 'NVIDIA DGX-A100', bandwidth: 512, power: 6500, category: 'datacenter-system', type: 'pcie', showLabel: false },
      // Data Center Cards (PCIe) - 调整power避免与peak重叠
      { name: 'AMD MI300X', bandwidth: 128, power: 850, category: 'datacenter-card', type: 'pcie', showLabel: false },
      { name: 'NVIDIA H100-SXM', bandwidth: 128, power: 780, category: 'datacenter-card', type: 'pcie', showLabel: true },
      { name: 'AWS Trainium 2', bandwidth: 128, power: 520, category: 'datacenter-card', type: 'pcie', showLabel: false },
      { name: 'NVIDIA H100-PCIe', bandwidth: 128, power: 380, category: 'datacenter-card', type: 'pcie', showLabel: false },
      { name: 'NVIDIA A100-80G-SXM4', bandwidth: 64, power: 440, category: 'datacenter-card', type: 'pcie', showLabel: false },
      { name: 'NVIDIA A100-80G-PCIe', bandwidth: 64, power: 340, category: 'datacenter-card', type: 'pcie', showLabel: false },
      { name: 'NVIDIA A6000', bandwidth: 64, power: 300, category: 'datacenter-card', type: 'pcie', showLabel: false },
      { name: 'NVIDIA A5000', bandwidth: 64, power: 230, category: 'datacenter-card', type: 'pcie', showLabel: false },
      // Personal (Consumer GPUs - PCIe) - 调整power避免重叠
      { name: 'NVIDIA RTX 5090', bandwidth: 128, power: 620, category: 'personal', type: 'pcie', showLabel: true },
      { name: 'NVIDIA RTX 5080', bandwidth: 128, power: 400, category: 'personal', type: 'pcie', showLabel: false },
      { name: 'NVIDIA RTX 4090', bandwidth: 64, power: 500, category: 'personal', type: 'pcie', showLabel: false },
      { name: 'NVIDIA RTX 4080', bandwidth: 64, power: 350, category: 'personal', type: 'pcie', showLabel: false },
      { name: 'NVIDIA RTX 3090Ti', bandwidth: 64, power: 420, category: 'personal', type: 'pcie', showLabel: false },
      { name: 'NVIDIA RTX 3080Ti', bandwidth: 64, power: 380, category: 'personal', type: 'pcie', showLabel: false },
      // Autonomous (NVIDIA Jetson)
      { name: 'NVIDIA Orin AGX', bandwidth: 16, power: 65, category: 'autonomous', type: 'pcie', showLabel: true },
      { name: 'NVIDIA Xavier AGX', bandwidth: 16, power: 35, category: 'autonomous', type: 'pcie', showLabel: false },
      { name: 'NVIDIA Orin NX', bandwidth: 16, power: 28, category: 'autonomous', type: 'pcie', showLabel: false },
      { name: 'NVIDIA Jetson Nano', bandwidth: 4, power: 12, category: 'autonomous', type: 'pcie', showLabel: true },
    ];

    return { peakDevices, offloadDevices, bwBS1, currentBw, fullyActivatedBw, actualBw };
  }, [hardwareBw, numGpus, currentSmbu, sloMs, batchSize, selectedModel, inputLen, outputLen]);

  // --- Chart Data: Batch Size vs Bandwidth (shows MoE curve) ---
  const batchChartData = useMemo(() => {
    const data = [];
    
    // Generate curve data for batch sizes 1 to 256
    const maxBatch = 256;
    for (let b = 1; b <= maxBatch; b += (b < 32 ? 1 : (b < 64 ? 2 : 4))) {
      const stats = calculateDemand(b);
      const batchSmbu = getSmbu(selectedModel, b);
      const actualBw = hardwareBw * numGpus * (batchSmbu / 100);
      data.push({
        batchSize: b,
        theoretical: stats.reqBwGBs,
        actual: actualBw,
        uniqueExperts: stats.uniqueExperts.toFixed(1),
      });
    }
    return data;
  }, [hardwareBw, numGpus, smbu, sloMs, selectedModel]);

  // --- CAP Radar Chart Data ---
  const capRadarData = useMemo(() => {
    // Filter to only include configs that exist in current dataset
    const selectedConfigs = [capConfig1, capConfig2, capConfig3].filter(c => c !== '' && CAP_CONFIGS[c]);
    
    // Find max values for normalization
    const allConfigs = Object.values(CAP_CONFIGS);
    const maxAccuracy = Math.max(...allConfigs.map(c => c.accuracy));
    const maxCost = Math.max(...allConfigs.map(c => c.cost));
    const maxTpot = Math.max(...allConfigs.map(c => c.tpot));
    const maxThroughput = Math.max(...allConfigs.map(c => c.throughput));
    
    // Normalize function (0-100 scale)
    const normalize = (val, max) => (val / max) * 100;
    const normalizeCost = (val, max) => ((max - val) / max) * 100; // Lower is better
    const normalizeTpot = (val, max) => ((max - val) / max) * 100; // Lower is better
    
    // Create radar data for each metric with raw values
    // Use Power (W) for LongBench, Cost ($) for GSM8K
    const costLabel = capDataset === 'longbench-v2' ? 'Power (W)' : 'Cost ($)';
    const radarData = [
      { metric: 'Accuracy (%)', fullMark: 100, metricType: 'accuracy' },
      { metric: costLabel, fullMark: 100, metricType: 'cost' },
      { metric: 'TPOT (s)', fullMark: 100, metricType: 'tpot' },
      { metric: 'Throughput (T/s)', fullMark: 100, metricType: 'throughput' },
    ];
    
    selectedConfigs.forEach(configKey => {
      const config = CAP_CONFIGS[configKey];
      if (config) {
        radarData[0][configKey] = normalize(config.accuracy, maxAccuracy);
        radarData[0][`${configKey}_raw`] = config.accuracy;
        radarData[1][configKey] = normalizeCost(config.cost, maxCost);
        radarData[1][`${configKey}_raw`] = config.cost;
        radarData[2][configKey] = normalizeTpot(config.tpot, maxTpot);
        radarData[2][`${configKey}_raw`] = config.tpot;
        radarData[3][configKey] = normalize(config.throughput, maxThroughput);
        radarData[3][`${configKey}_raw`] = config.throughput;
      }
    });
    
    return { radarData, selectedConfigs };
  }, [capConfig1, capConfig2, capConfig3, capDataset]);

  // Get available options for each dropdown (excluding already selected)
  const getAvailableOptions = (currentValue, otherValues) => {
    return Object.keys(CAP_CONFIGS).filter(key => 
      key === currentValue || !otherValues.includes(key)
    );
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans">
      {/* Top Navigation Bar */}
      <nav className="bg-slate-800 border-b border-slate-700 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-0">
          <div className="flex items-center gap-3">
            <span className="text-xl sm:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-400">
              TEAS
            </span>
            <span className="text-xs text-slate-400 hidden md:inline">Tracking Evolving AI and Systems</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 lg:gap-6 text-xs sm:text-sm">
            <a href="#moe" className="text-slate-300 hover:text-blue-400 transition-colors">Mixture-of-Experts</a>
            <span className="text-slate-500 cursor-not-allowed hidden md:inline">Agentic AI Workflow <span className="text-xs text-slate-600">(Coming Soon)</span></span>
            <Link to="/test-time-scaling" className="text-slate-300 hover:text-blue-400 transition-colors">Test Time Scaling</Link>
            <Link to="/team" className="text-slate-300 hover:text-blue-400 transition-colors">Team</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="bg-gradient-to-b from-slate-800 to-slate-900 py-8 sm:py-12 md:py-16 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 md:mb-8 pb-1 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-sky-400 to-cyan-400" style={{ lineHeight: '1.2' }}>
            Tracking Evolving AI and Systems
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-slate-300 max-w-3xl mx-auto px-2">
            Uniting Models, Algorithms, and System Innovators with Top-Down Evolutionary Benchmarks.
          </p>
        </div>
      </div>

      {/* Our Goal Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 sm:p-6 md:p-8 mb-8 sm:mb-12">
          <h2 className="text-2xl font-bold text-slate-100 mb-4">Our Goal</h2>
          <p className="text-slate-300 leading-relaxed">
            We aim to create a suite of next-generation benchmarks that track the fast-evolving landscape of AI, 
            and measure the complex trade-offs across costs, accuracy, and performance on a range of state-of-the-art hardware. 
            Our approach is informed by two selection maps (one for models and the other for systems), with a broad team 
            with extensive expertise in AI based at the{' '}
            <a href="https://www.ed.ac.uk/" className="text-blue-400 hover:underline">University of Edinburgh</a>,{' '}
            <a href="https://www.epcc.ed.ac.uk/" className="text-blue-400 hover:underline">EPCC</a>, and{' '}
            <a href="https://www.imperial.ac.uk/" className="text-blue-400 hover:underline">Imperial College London</a>. 
            Our project is funded by{' '}
            <a href="https://www.aria.org.uk" className="text-blue-400 hover:underline">ARIA</a> as part of the "
            <a href="https://www.aria.org.uk/opportunity-spaces/nature-computes-better/scaling-compute/" className="text-blue-400 hover:underline">Scaling compute</a>" programme.
          </p>
        </div>
      </div>

      {/* Dashboard Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-6" id="moe">
        <header className="mb-6 sm:mb-8">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
            <Activity className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500" />
            <h1 className="text-xl sm:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">
              Mixture-of-Experts
            </h1>
            <a 
              href="https://github.com/Auto-CAP/MoE-CAP" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-full text-xs sm:text-sm text-white transition-colors"
            >
              <Github className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>GitHub</span>
            </a>
            <span className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-slate-400 hidden sm:inline">
              {MODEL_CONFIG.name}
            </span>
          </div>
        </header>

      <main className="space-y-6">

        {/* Chart 1: Power vs Bandwidth (MoE-CAP Style) with controls inside */}
        <Card className="relative">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-semibold pl-2 border-l-4 border-blue-500">
              MoE Deployment Benchmarking
            </h3>
            <span className="text-xs text-slate-500 italic">(Tested with SGLang)</span>
          </div>
          
          {/* Controls Row - Context Size and Parameters inline */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4 mb-4">
            {/* Context Size */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Context Size</label>
              <select 
                value={scenario}
                onChange={(e) => handleScenarioChange(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs focus:border-blue-500 outline-none"
              >
                <option value="5k-ref">5K (4K+1K)</option>
                <option value="14k-ref">14K (13K+1K)</option>
              </select>
            </div>
            
            {/* Model */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Model</label>
              <select 
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs focus:border-blue-500 outline-none"
              >
                <option value="mixtral-8x7b">Mixtral-8x7B</option>
                <option value="mixtral-8x22b">Mixtral-8x22B</option>
                <option value="qwen1.5-moe">Qwen1.5-MoE</option>
                <option value="deepseek-r1">DeepSeek-R1</option>
                <option value="deepseek-v2-lite">Deepseek-V2-Lite</option>
              </select>
            </div>
            
            {/* Batch Size */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Batch Size</label>
              <select 
                value={batchSize}
                onChange={(e) => setBatchSize(parseInt(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs focus:border-blue-500 outline-none"
              >
                <option value={1}>1</option>
                <option value={32}>32</option>
                <option value={64}>64</option>
                <option value={128}>128</option>
              </select>
            </div>
            
            {/* Target SLO (decode) */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Target SLO (decode)</label>
              <select 
                value={sloMs}
                onChange={(e) => setSloMs(parseInt(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs focus:border-blue-500 outline-none"
              >
                <option value={10}>10 ms</option>
                <option value={20}>20 ms</option>
                <option value={50}>50 ms</option>
                <option value={100}>100 ms</option>
                <option value={200}>200 ms</option>
                <option value={250}>250 ms</option>
              </select>
            </div>
            
            {/* Spacer for alignment */}
            <div></div>
          </div>
          
          {/* Line Legend - below controls */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-2 pl-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-8 border-t-2 border-dashed border-blue-500"></div>
              <span className="text-xs text-slate-300">Batch Size=1: <span className="text-blue-400 font-semibold">{chartData.bwBS1?.toFixed(0)} GB/s</span></span>
            </div>
            {batchSize > 1 && (
              <div className="flex items-center gap-2">
                <div className="w-8 border-t-2 border-dashed border-green-500"></div>
                <span className="text-xs text-slate-300">Batch Size={batchSize}: <span className="text-green-400 font-semibold">{chartData.currentBw?.toFixed(0)} GB/s</span></span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <div className="w-8 border-t-2 border-dashed border-red-500"></div>
              <span className="text-xs text-slate-300">All expert activated: <span className="text-red-400 font-semibold">{chartData.fullyActivatedBw?.toFixed(0)} GB/s</span></span>
            </div>
          </div>
          
          {/* Point Legend Box - top right */}
          <div className="hidden sm:block absolute top-16 right-4 sm:right-6 bg-slate-800/90 border border-slate-600 rounded px-2 sm:px-3 py-2 z-10">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-xs text-slate-300">Peak Bandwidth (Memory)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500"></div>
              <span className="text-xs text-slate-300">PCIe Bandwidth (Offloading)</span>
            </div>
          </div>
          
          <div className="h-[350px] sm:h-[450px] md:h-[500px] lg:h-[550px]">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 10, left: 50, bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis 
                dataKey="power" 
                type="number"
                domain={[5, 15000]} 
                scale="log"
                tick={{ fill: '#94a3b8', fontSize: 9 }}
                ticks={[10, 50, 100, 300, 500, 1000, 3000, 10000]}
                tickFormatter={(value) => value >= 1000 ? `${value/1000}k` : value}
                label={{ value: 'Power (W)', position: 'insideBottom', offset: -10, fill: '#94a3b8', fontSize: 11 }}
                allowDataOverflow={false}
                name="power"
              />
              <YAxis 
                dataKey="bandwidth"
                type="number"
                stroke="#94a3b8"
                scale="log"
                domain={[10, Math.max(30000, chartData.fullyActivatedBw * 1.5)]}
                tick={{ fill: '#94a3b8', fontSize: 9 }}
                ticks={[10, 50, 100, 500, 1000, 5000, 10000, 30000]}
                tickFormatter={(value) => value >= 1000 ? `${(value/1000).toFixed(0)}k` : value}
                label={{ value: 'Bandwidth (GB/s)', angle: -90, position: 'insideLeft', offset: -5, fill: '#94a3b8', fontSize: 11 }}
                allowDataOverflow={false}
                name="bandwidth"
              />
              <ZAxis range={[60, 60]} />
              <Tooltip 
                cursor={{ strokeDasharray: '3 3', stroke: '#64748b' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length > 0) {
                    const data = payload[0]?.payload;
                    if (data && data.name) {
                      const isPeak = data.type === 'peak';
                      const color = isPeak ? '#3b82f6' : '#f97316';
                      const typeLabel = isPeak ? 'Peak BW (Memory)' : 'PCIe BW';
                      return (
                        <div style={{ backgroundColor: '#1e293b', border: `2px solid ${color}`, padding: '10px 14px', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                          <div style={{ color: color, fontWeight: 600, marginBottom: '6px', fontSize: '14px' }}>
                            {data.name}
                          </div>
                          <div style={{ color: color, fontSize: '13px', fontWeight: 500 }}>
                            {typeLabel}: {data.bandwidth?.toLocaleString()} GB/s
                          </div>
                          <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '4px' }}>
                            Power: {data.power}W
                          </div>
                          <div style={{ color: '#64748b', fontSize: '11px', marginTop: '2px', textTransform: 'capitalize' }}>
                            {data.category?.replace(/-/g, ' ')}
                          </div>
                        </div>
                      );
                    }
                  }
                  return null;
                }}
              />
              
              {/* Horizontal reference lines for model bandwidth requirements */}
              {/* Batch Size=1 line - always shown */}
              <ReferenceLine 
                y={chartData.bwBS1} 
                stroke="#3b82f6" 
                strokeWidth={2}
                strokeDasharray="8 4"
                ifOverflow="extendDomain"
              />
              {/* Current batch size line - only shown when Batch Size > 1 */}
              {batchSize > 1 && (
                <ReferenceLine 
                  y={chartData.currentBw} 
                  stroke="#22c55e" 
                  strokeWidth={2}
                  strokeDasharray="8 4"
                  ifOverflow="extendDomain"
                />
              )}
              {/* All experts (fully activated) line */}
              <ReferenceLine 
                y={chartData.fullyActivatedBw} 
                stroke="#ef4444" 
                strokeWidth={2}
                strokeDasharray="8 4"
                ifOverflow="extendDomain"
              />

              {/* Device scatter points - blue circles for Peak Bandwidth (HBM/Memory) */}
              <Scatter 
                data={chartData.peakDevices}
                name="Peak Bandwidth"
                fill="#3b82f6"
                isAnimationActive={false}
              >
                <LabelList
                  content={(props) => {
                    const { x, y, index } = props;
                    const device = chartData.peakDevices[index];
                    if (!device || !device.showLabel) return null;
                    
                    // Smart positioning based on device
                    let dy = -15;
                    let dx = 0;
                    const name = device.name;
                    if (name.includes('DGX-H100')) dy = -20;
                    if (name.includes('MI300X')) { dy = -5; dx = 45; }
                    if (name.includes('H100-SXM')) { dy = -5; dx = 20; }
                    if (name.includes('5090')) { dy = -7; dx = 30; }
                    if (name.includes('4090')) { dy = 25; dx = 30; }
                    if (name.includes('M4')) { dy = -10; dx = -5; }
                    
                    // Calculate line start position from circle edge (radius ~4)
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const radius = 4;
                    const startOffsetX = distance > 0 ? (dx / distance) * radius : 0;
                    const startOffsetY = distance > 0 ? (dy / distance) * radius : 0;
                    
                    return (
                      <>
                        {/* Connecting line from point edge to label */}
                        <line
                          x1={x + startOffsetX}
                          y1={y + startOffsetY}
                          x2={x + dx}
                          y2={y + dy}
                          stroke="#3b82f6"
                          strokeWidth={1}
                          strokeOpacity={0.5}
                        />
                        <text
                          x={x + dx}
                          y={y + dy}
                          fill="#3b82f6"
                          fontSize={10}
                          fontWeight={600}
                          textAnchor="middle"
                        >
                          {name}
                        </text>
                      </>
                    );
                  }}
                />
              </Scatter>
              
              {/* Device scatter points - orange circles for Offloading Bandwidth (PCIe) */}
              <Scatter 
                data={chartData.offloadDevices}
                name="Offloading Bandwidth"
                fill="#f97316"
                isAnimationActive={false}
              >
                <LabelList
                  content={(props) => {
                    const { x, y, index } = props;
                    const device = chartData.offloadDevices[index];
                    if (!device || !device.showLabel) return null;
                    
                    // Smart positioning based on device
                    let dy = -15;
                    let dx = 0;
                    const name = device.name;
                    if (name.includes('DGX-H100')) dy = 25;
                    if (name.includes('H100-SXM')) { dy = 25; dx = 10; }
                    if (name.includes('5090')) { dy = -10; dx = 5; }
                    
                    // Calculate line start position from circle edge (radius ~4)
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const radius = 4;
                    const startOffsetX = distance > 0 ? (dx / distance) * radius : 0;
                    const startOffsetY = distance > 0 ? (dy / distance) * radius : 0;
                    
                    return (
                      <>
                        {/* Connecting line from point edge to label */}
                        <line
                          x1={x + startOffsetX}
                          y1={y + startOffsetY}
                          x2={x + dx}
                          y2={y + dy}
                          stroke="#f97316"
                          strokeWidth={1}
                          strokeOpacity={0.5}
                        />
                        <text
                          x={x + dx}
                          y={y + dy}
                          fill="#f97316"
                          fontSize={10}
                          fontWeight={600}
                          textAnchor="middle"
                        >
                          {name}
                        </text>
                      </>
                    );
                  }}
                />
              </Scatter>
              
            </ScatterChart>
          </ResponsiveContainer>
          </div>
        </Card>

        {/* Chart 2: CAP Radar Plot */}
        <Card className="mb-8">
          <h3 className="text-lg font-semibold mb-4 pl-2 border-l-4 border-purple-500">
            CAP Radar Plot - Cost, Accuracy, Performance
          </h3>
          
          {/* Config Format Explanation */}
          <div className="mb-4 p-3 bg-slate-800/50 rounded border border-slate-700">
            <p className="text-xs text-slate-400">
              <span className="text-slate-300 font-medium">Config Format:</span>{' '}
              <span className="text-blue-400">Model</span> / <span className="text-green-400">Data Type</span> / <span className="text-orange-400">Hardware</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Example: Qwen3-30B-A3B / BF16 / 5xRTX A5000
            </p>
          </div>
            
            {/* Dataset Selector */}
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
            
            {/* Config Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Config 1</label>
                <select 
                  value={capConfig1}
                  onChange={(e) => setCapConfig1(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs focus:border-blue-500 outline-none"
                >
                  <option value="">-- Select --</option>
                  {getAvailableOptions(capConfig1, [capConfig2, capConfig3]).map(key => (
                    <option key={key} value={key}>{CAP_CONFIGS[key].label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Config 2</label>
                <select 
                  value={capConfig2}
                  onChange={(e) => setCapConfig2(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs focus:border-blue-500 outline-none"
                >
                  <option value="">-- Select --</option>
                  {getAvailableOptions(capConfig2, [capConfig1, capConfig3]).map(key => (
                    <option key={key} value={key}>{CAP_CONFIGS[key].label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Config 3</label>
                <select 
                  value={capConfig3}
                  onChange={(e) => setCapConfig3(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs focus:border-blue-500 outline-none"
                >
                  <option value="">-- Select --</option>
                  {getAvailableOptions(capConfig3, [capConfig1, capConfig2]).map(key => (
                    <option key={key} value={key}>{CAP_CONFIGS[key].label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Legend for selected configs */}
            <div className="flex flex-wrap gap-2 sm:gap-4 mb-4 px-2">
              {capRadarData.selectedConfigs.map(configKey => {
                const config = CAP_CONFIGS[configKey];
                return (
                  <div key={configKey} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: config.color }}></div>
                    <span className="text-xs text-slate-300">{config.label}</span>
                  </div>
                );
              })}
            </div>

            <div className="h-[280px] sm:h-[350px] md:h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={capRadarData.radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                <PolarGrid stroke="#475569" />
                <PolarAngleAxis 
                  dataKey="metric" 
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                />
                <PolarRadiusAxis 
                  angle={30} 
                  domain={[0, 100]} 
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  tickCount={5}
                />
                {capRadarData.selectedConfigs.map(configKey => {
                  const config = CAP_CONFIGS[configKey];
                  return (
                    <Radar 
                      key={configKey}
                      name={config.label}
                      dataKey={configKey}
                      stroke={config.color}
                      fill={config.color}
                      fillOpacity={0.2}
                      strokeWidth={2}
                    />
                  );
                })}
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length > 0) {
                      const metricData = payload[0]?.payload;
                      const metricType = metricData?.metricType;
                      return (
                        <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', padding: '10px', borderRadius: '4px' }}>
                          <div style={{ color: '#f8fafc', fontWeight: 600, marginBottom: '6px' }}>{metricData?.metric}</div>
                          {payload.map((entry, index) => {
                            const rawValue = metricData[`${entry.dataKey}_raw`];
                            let displayValue = rawValue;
                            if (metricType === 'cost') {
                              displayValue = `$${rawValue?.toLocaleString()}`;
                            } else if (metricType === 'accuracy') {
                              displayValue = `${rawValue}%`;
                            } else if (metricType === 'tpot') {
                              displayValue = `${rawValue}s`;
                            } else if (metricType === 'throughput') {
                              displayValue = `${rawValue} T/s`;
                            }
                            return (
                              <div key={index} style={{ color: entry.color, fontSize: '12px', marginTop: '4px' }}>
                                {CAP_CONFIGS[entry.dataKey]?.label || entry.dataKey}: {displayValue}
                              </div>
                            );
                          })}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
            </div>

            {/* Raw Values Table */}
            <div className="mt-8 sm:mt-20 md:mt-12 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <table className="w-full text-xs min-w-[500px] sm:min-w-0">
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
                  {capRadarData.selectedConfigs.map(configKey => {
                    const config = CAP_CONFIGS[configKey];
                    return (
                      <tr key={configKey} className="border-b border-slate-800">
                        <td className="py-2 px-2" style={{ color: config.color }}>{config.label}</td>
                        <td className="text-right py-2 px-2 text-slate-300">{config.accuracy}%</td>
                        <td className="text-right py-2 px-2 text-slate-300">{capDataset === 'longbench-v2' ? `${config.cost.toLocaleString()}W` : `$${config.cost.toLocaleString()}`}</td>
                        <td className="text-right py-2 px-2 text-slate-300">{config.tpot}s</td>
                        <td className="text-right py-2 px-2 text-slate-300">{config.throughput} T/s</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

      </main>
      </div>
    </div>
  );
}
