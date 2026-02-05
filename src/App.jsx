import { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ComposedChart, Line, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine, LabelList,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Cell,
  ScatterChart, ZAxis
} from 'recharts';
import {
  Activity, Server, Settings, Cpu, Info, Zap, Percent, Github, Download
} from 'lucide-react';
import { BENCHMARK_ROWS } from './data/tts-benchmarks/index.js';
import { TestTimeScalingSection } from './test-time-scaling.jsx';
import { AgenticWorkflowSection } from './agentic-workload.jsx';

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

// Export all MoE benchmark data (Hardware Map + CAP Radar) in one CSV
const exportAllMoEData = (chartData, modelName, scenario, batchSize, capConfigs, capDataset, realBenchmarkData) => {
  const dateStr = getCurrentDateStr();
  
  // Hardware Map data
  const allDevices = [
    ...chartData.peakDevices.map(d => ({ ...d, bandwidth_type: 'Peak (HBM)' })),
    ...chartData.offloadDevices.map(d => ({ ...d, bandwidth_type: 'Offload (PCIe)' })),
    ...chartData.dgxPeakDevices.map(d => ({ ...d, bandwidth_type: 'Peak (HBM)' })),
    ...chartData.dgxOffloadDevices.map(d => ({ ...d, bandwidth_type: 'Offload (PCIe)' })),
  ];
  
  // Hardware Map - Bandwidth Mode (all devices have bandwidth data - these are estimated/analytical)
  const bandwidthModeData = allDevices.map(device => ({
    date: dateStr,
    section: 'Hardware-Map',
    mode: 'Bandwidth',
    data_type: 'Estimated',
    hardware: device.name,
    category: device.category,
    bandwidth_type: device.bandwidth_type,
    model: modelName,
    context_size: scenario === '14k-ref' ? '14K' : '5K',
    batch_size: batchSize,
    bandwidth_gbs: device.bandwidth,
    power_watts: device.power,
    gflops: device.gflops || 'N/A',
    tpot_ms: 'N/A',
    ttft_ms: 'N/A',
    accuracy_percent: 'N/A',
    throughput_tokens_per_sec: 'N/A',
    precision: 'BF16',
    inference_system: 'Analytical Model',
  }));
  
  // Hardware Map - TPOT Mode Measured (real benchmark data)
  const tpotMeasuredData = (realBenchmarkData?.tpot || []).map(point => {
    const tpotMs = point.tpot;
    const throughput = tpotMs > 0 ? (point.batchSize / (tpotMs / 1000)).toFixed(2) : 'N/A';
    return {
      date: dateStr,
      section: 'Hardware-Map',
      mode: 'TPOT',
      data_type: 'Measured',
      hardware: point.gpu,
      category: 'benchmark',
      bandwidth_type: 'N/A',
      model: point.name,
      context_size: point.context,
      batch_size: point.batchSize,
      bandwidth_gbs: 'N/A',
      power_watts: point.power,
      gflops: 'N/A',
      tpot_ms: tpotMs,
      ttft_ms: 'N/A',
      accuracy_percent: 'N/A',
      throughput_tokens_per_sec: throughput,
      precision: 'BF16',
      inference_system: point.engine,
    };
  });
  
  // Hardware Map - TTFT Mode Measured (real benchmark data)
  const ttftMeasuredData = (realBenchmarkData?.ttft || []).map(point => ({
    date: dateStr,
    section: 'Hardware-Map',
    mode: 'TTFT',
    data_type: 'Measured',
    hardware: point.gpu,
    category: 'benchmark',
    bandwidth_type: 'N/A',
    model: point.name,
    context_size: point.context,
    batch_size: point.batchSize,
    bandwidth_gbs: 'N/A',
    power_watts: point.power,
    gflops: 'N/A',
    tpot_ms: 'N/A',
    ttft_ms: point.ttft,
    accuracy_percent: 'N/A',
    throughput_tokens_per_sec: 'N/A',
    precision: 'BF16',
    inference_system: point.engine,
  }));
  
  // CAP Radar data - actual benchmark measurements
  const capData = Object.entries(capConfigs).map(([key, config]) => ({
    date: dateStr,
    section: 'CAP-Radar',
    mode: 'Benchmark',
    data_type: 'Measured',
    hardware: config.gpu,
    category: 'benchmark',
    bandwidth_type: 'N/A',
    model: config.model,
    context_size: capDataset === 'longbench-v2' ? '14K' : '5K',
    batch_size: config.batchSize || 'N/A',
    bandwidth_gbs: 'N/A',
    power_watts: capDataset === 'longbench-v2' ? config.cost : 'N/A',
    gflops: 'N/A',
    tpot_ms: config.tpot ? (config.tpot * 1000).toFixed(2) : 'N/A',
    ttft_ms: 'N/A',
    accuracy_percent: config.accuracy,
    throughput_tokens_per_sec: config.throughput,
    precision: config.precision,
    inference_system: config.system,
  }));
  
  const allData = [
    ...bandwidthModeData,
    ...tpotMeasuredData,
    ...ttftMeasuredData,
    ...capData
  ];
  downloadCSV(allData, `moe-benchmark-all-${dateStr}.csv`);
};

// Export all Test Time Scaling benchmark rows in one CSV
const exportAllTTSData = () => {
  const dateStr = getCurrentDateStr();

  const rows = BENCHMARK_ROWS.map((row) => {
    const meta = row.meta || {};
    return {
      date: dateStr,
      section: "Test-Time-Scaling",

      // ✅ add this column
      data_source: meta.source ?? "measured", // "projected" or "measured"

      dataset: row.dataset,
      model: row.model,
      quantization: row.quant,
      inference_engine: row.engine,
      questions_per_hour: row.questionsPerHour,

      // ✅ optional: avoid blank cells for projected rows
      accuracy_percent: row.accuracy ?? "N/A",

      gpu: meta.gpu || "N/A",
      gpu_count: meta.gpuCount ?? "N/A",
      sequential: meta.sequential ?? "N/A",
      parallel: meta.parallel ?? "N/A",
      samples: meta.samples ?? "N/A",
      max_tokens: meta.maxTokens ?? "N/A",
      tools: meta.tools ?? "N/A",
    };
  });

  downloadCSV(rows, `test-time-scaling-all-${dateStr}.csv`);
};

// LongBench v2 benchmark data (SGLang) - defined outside component for stability
const LONGBENCH_CONFIGS = {
  // Qwen3-235B-A22B - Accuracy: 50.1%
  'qwen3-235b-ep-tp-16h20': {
    label: 'Qwen3-235B-A22B / BF16 / 16xH20 / SGLang (EP+TP)',
    model: 'Qwen3-235B-A22B',
    precision: 'BF16',
    gpu: '16xH20',
    system: 'SGLang v0.5.4 (EP+TP)',
    accuracy: 50.1,
    cost: 8000,  // 16 GPUs × 500W
    tpot: 0.06,
    throughput: 1490,
    batchSize: 87,
    color: '#3b82f6'  // Blue
  },
  'qwen3-235b-ep-tp-8h20': {
    label: 'Qwen3-235B-A22B / BF16 / 8xH20 / SGLang (EP+TP)',
    model: 'Qwen3-235B-A22B',
    precision: 'BF16',
    gpu: '8xH20',
    system: 'SGLang v0.5.4 (EP+TP)',
    accuracy: 50.1,
    cost: 4000,  // 8 GPUs × 500W
    tpot: 0.04,
    throughput: 1241,
    batchSize: 45,
    color: '#22c55e'  // Green
  },
  'qwen3-235b-tp-16h20': {
    label: 'Qwen3-235B-A22B / BF16 / 16xH20 / SGLang (TP)',
    model: 'Qwen3-235B-A22B',
    precision: 'BF16',
    gpu: '16xH20',
    system: 'SGLang v0.5.4 (TP)',
    accuracy: 50.1,
    cost: 8000,  // 16 GPUs × 500W
    tpot: 0.06,
    throughput: 1503,
    batchSize: 88,
    color: '#f97316'  // Orange
  },
  'qwen3-235b-tp-8h20': {
    label: 'Qwen3-235B-A22B / BF16 / 8xH20 / SGLang (TP)',
    model: 'Qwen3-235B-A22B',
    precision: 'BF16',
    gpu: '8xH20',
    system: 'SGLang v0.5.4 (TP)',
    accuracy: 50.1,
    cost: 4000,  // 8 GPUs × 500W
    tpot: 0.04,
    throughput: 1159,
    batchSize: 44,
    color: '#a855f7'  // Purple
  },
  // Qwen3-30B-A3B - Accuracy: 42.5%
  'qwen3-30b-ep-tp-8h20': {
    label: 'Qwen3-30B-A3B / BF16 / 8xH20 / SGLang (EP+TP)',
    model: 'Qwen3-30B-A3B',
    precision: 'BF16',
    gpu: '8xH20',
    system: 'SGLang v0.5.4 (EP+TP)',
    accuracy: 42.5,
    cost: 4000,  // 8 GPUs × 500W
    tpot: 0.05,
    throughput: 5283,
    batchSize: 241,
    color: '#ef4444'  // Red
  },
  'qwen3-30b-ep-tp-4h20': {
    label: 'Qwen3-30B-A3B / BF16 / 4xH20 / SGLang (EP+TP)',
    model: 'Qwen3-30B-A3B',
    precision: 'BF16',
    gpu: '4xH20',
    system: 'SGLang v0.5.4 (EP+TP)',
    accuracy: 42.5,
    cost: 2000,  // 4 GPUs × 500W
    tpot: 0.04,
    throughput: 5069,
    batchSize: 218,
    color: '#06b6d4'  // Cyan
  },
  'qwen3-30b-ep-tp-2h20': {
    label: 'Qwen3-30B-A3B / BF16 / 2xH20 / SGLang (EP+TP)',
    model: 'Qwen3-30B-A3B',
    precision: 'BF16',
    gpu: '2xH20',
    system: 'SGLang v0.5.4 (EP+TP)',
    accuracy: 42.5,
    cost: 1000,  // 2 GPUs × 500W
    tpot: 0.04,
    throughput: 2186,
    batchSize: 85,
    color: '#eab308'  // Yellow
  },
  'qwen3-30b-tp-8h20': {
    label: 'Qwen3-30B-A3B / BF16 / 8xH20 / SGLang (TP)',
    model: 'Qwen3-30B-A3B',
    precision: 'BF16',
    gpu: '8xH20',
    system: 'SGLang v0.5.4 (TP)',
    accuracy: 42.5,
    cost: 4000,  // 8 GPUs × 500W
    tpot: 0.05,
    throughput: 5277,
    batchSize: 241,
    color: '#ec4899'  // Pink
  },
  'qwen3-30b-tp-4h20': {
    label: 'Qwen3-30B-A3B / BF16 / 4xH20 / SGLang (TP)',
    model: 'Qwen3-30B-A3B',
    precision: 'BF16',
    gpu: '4xH20',
    system: 'SGLang v0.5.4 (TP)',
    accuracy: 42.5,
    cost: 2000,  // 4 GPUs × 500W
    tpot: 0.04,
    throughput: 5072,
    batchSize: 218,
    color: '#14b8a6'  // Teal
  },
  'qwen3-30b-tp-2h20': {
    label: 'Qwen3-30B-A3B / BF16 / 2xH20 / SGLang (TP)',
    model: 'Qwen3-30B-A3B',
    precision: 'BF16',
    gpu: '2xH20',
    system: 'SGLang v0.5.4 (TP)',
    accuracy: 42.5,
    cost: 1000,  // 2 GPUs × 500W
    tpot: 0.04,
    throughput: 2197,
    batchSize: 85,
    color: '#8b5cf6'  // Violet
  },
  // DeepSeek-V2.5 - Accuracy: 53.7%
  'deepseek-v2.5-ep-tp-16h20': {
    label: 'DeepSeek-V2.5 / BF16 / 16xH20 / SGLang (EP+TP)',
    model: 'DeepSeek-V2.5',
    precision: 'BF16',
    gpu: '16xH20',
    system: 'SGLang v0.5.4 (EP+TP)',
    accuracy: 53.7,
    cost: 8000,  // 16 GPUs × 500W
    tpot: 0.10,
    throughput: 549,
    batchSize: 57,
    color: '#f43f5e'  // Rose
  },
  'deepseek-v2.5-ep-tp-8h20': {
    label: 'DeepSeek-V2.5 / BF16 / 8xH20 / SGLang (EP+TP)',
    model: 'DeepSeek-V2.5',
    precision: 'BF16',
    gpu: '8xH20',
    system: 'SGLang v0.5.4 (EP+TP)',
    accuracy: 53.7,
    cost: 4000,  // 8 GPUs × 500W
    tpot: 0.07,
    throughput: 383,
    batchSize: 25,
    color: '#84cc16'  // Lime
  },
  'deepseek-v2.5-tp-16h20': {
    label: 'DeepSeek-V2.5 / BF16 / 16xH20 / SGLang (TP)',
    model: 'DeepSeek-V2.5',
    precision: 'BF16',
    gpu: '16xH20',
    system: 'SGLang v0.5.4 (TP)',
    accuracy: 53.7,
    cost: 8000,  // 16 GPUs × 500W
    tpot: 0.10,
    throughput: 595,
    batchSize: 57,
    color: '#0ea5e9'  // Sky
  },
  'deepseek-v2.5-tp-8h20': {
    label: 'DeepSeek-V2.5 / BF16 / 8xH20 / SGLang (TP)',
    model: 'DeepSeek-V2.5',
    precision: 'BF16',
    gpu: '8xH20',
    system: 'SGLang v0.5.4 (TP)',
    accuracy: 53.7,
    cost: 4000,  // 8 GPUs × 500W
    tpot: 0.05,
    throughput: 500,
    batchSize: 25,
    color: '#d946ef'  // Fuchsia
  },
  'deepseek-v2.5-dp-ep-16h20': {
    label: 'DeepSeek-V2.5 / BF16 / 16xH20 / SGLang (DP+EP)',
    model: 'DeepSeek-V2.5',
    precision: 'BF16',
    gpu: '16xH20',
    system: 'SGLang v0.5.4 (DP+EP)',
    accuracy: 53.7,
    cost: 8000,  // 16 GPUs × 500W
    tpot: 0.11,
    throughput: 1028,
    batchSize: 112,
    color: '#64748b'  // Slate
  },
  'deepseek-v2.5-dp-ep-8h20': {
    label: 'DeepSeek-V2.5 / BF16 / 8xH20 / SGLang (DP+EP)',
    model: 'DeepSeek-V2.5',
    precision: 'BF16',
    gpu: '8xH20',
    system: 'SGLang v0.5.4 (DP+EP)',
    accuracy: 53.7,
    cost: 4000,  // 8 GPUs × 500W
    tpot: 0.08,
    throughput: 602,
    batchSize: 46,
    color: '#fb7185'  // Rose light
  },
  // DeepSeek-R1 - Accuracy: 58.3%
  'deepseek-r1-dp-ep-16h20': {
    label: 'DeepSeek-R1 / BF16 / 16xH20 / SGLang (DP+EP)',
    model: 'DeepSeek-R1',
    precision: 'BF16',
    gpu: '16xH20',
    system: 'SGLang v0.5.4 (DP+EP)',
    accuracy: 58.3,
    cost: 8000,  // 16 GPUs × 500W
    tpot: 0.11,
    throughput: 1401,
    batchSize: 160,
    color: '#10b981'  // Emerald
  },
  'deepseek-r1-tp-ep-16h20': {
    label: 'DeepSeek-R1 / BF16 / 16xH20 / SGLang (TP+EP)',
    model: 'DeepSeek-R1',
    precision: 'BF16',
    gpu: '16xH20',
    system: 'SGLang v0.5.4 (TP+EP)',
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
  'qwen1.5-moe-1xa6000': {
    label: 'Qwen1.5-MoE-A2.7B-Chat / BF16 / 1xRTX A6000 / SGLang',
    model: 'Qwen1.5-MoE-A2.7B-Chat',
    precision: 'BF16',
    gpu: '1xRTX A6000',
    system: 'SGLang v0.5.4',
    accuracy: 45.72,
    cost: 7158.92,
    tpot: 0.03,
    throughput: 599.35,
    color: '#22c55e'
  },
  'qwen3-235b-fp8-2xh200': {
    label: 'Qwen3-235B-A22B-Thinking / FP8 / 2xH200 / SGLang',
    model: 'Qwen3-235B-A22B-Thinking-2507-FP8',
    precision: 'FP8',
    gpu: '2xH200',
    system: 'SGLang v0.5.4',
    accuracy: 68.84,
    cost: 104052.07,
    tpot: 0.02,
    throughput: 1136.77,
    color: '#f97316'
  },
  'qwen3-235b-bf16-4xh200': {
    label: 'Qwen3-235B-A22B-Thinking / BF16 / 4xH200 / SGLang',
    model: 'Qwen3-235B-A22B-Thinking-2507',
    precision: 'BF16',
    gpu: '4xH200',
    system: 'SGLang v0.5.4',
    accuracy: 70.28,
    cost: 195252.11,
    tpot: 0.02,
    throughput: 1206.32,
    color: '#a855f7'
  },
  'qwen3-235b-bf16-8xh100': {
    label: 'Qwen3-235B-A22B / BF16 / 8xH100 / SGLang',
    model: 'Qwen3-235B-A22B',
    precision: 'BF16',
    gpu: '8xH100',
    system: 'SGLang v0.5.4',
    accuracy: 71.19,
    cost: 344657.14,
    tpot: 0.03,
    throughput: 1694.30,
    color: '#ef4444'
  },
  'qwen3-30b-instruct-4xa6000': {
    label: 'Qwen3-30B-A3B-Instruct / BF16 / 4xRTX A6000 / SGLang',
    model: 'Qwen3-30B-A3B-Instruct-2507',
    precision: 'BF16',
    gpu: '4xRTX A6000',
    system: 'SGLang v0.5.4',
    accuracy: 53.30,
    cost: 21600.27,
    tpot: 0.02,
    throughput: 638.03,
    color: '#60a5fa'
  },
  'qwen3-30b-thinking-4xa6000': {
    label: 'Qwen3-30B-A3B-Thinking / BF16 / 4xRTX A6000 / SGLang',
    model: 'Qwen3-30B-A3B-Thinking-2507',
    precision: 'BF16',
    gpu: '4xRTX A6000',
    system: 'SGLang v0.5.4',
    accuracy: 69.29,
    cost: 21600.54,
    tpot: 0.04,
    throughput: 1701.41,
    color: '#4ade80'
  },
  'qwen3-30b-4xa6000': {
    label: 'Qwen3-30B-A3B / BF16 / 4xRTX A6000 / SGLang',
    model: 'Qwen3-30B-A3B',
    precision: 'BF16',
    gpu: '4xRTX A6000',
    system: 'SGLang v0.5.4',
    accuracy: 80.67,
    cost: 21600.69,
    tpot: 0.03,
    throughput: 1417.49,
    color: '#9333ea'
  },
  'qwen3-30b-2xa100': {
    label: 'Qwen3-30B-A3B / BF16 / 2xA100 / SGLang',
    model: 'Qwen3-30B-A3B',
    precision: 'BF16',
    gpu: '2xA100',
    system: 'SGLang v0.5.4',
    accuracy: 80.97,
    cost: 54380.91,
    tpot: 0.01,
    throughput: 1806.09,
    color: '#f87171'
  },
  // Qwen3-30B-A3B with different systems
  'qwen3-30b-ktransformers-1xa5000': {
    label: 'Qwen3-30B-A3B / BF16 / 1 x A5000 + AMD 7453 / K-Transformers',
    model: 'Qwen3-30B-A3B',
    precision: 'BF16',
    gpu: '1 x A5000 + AMD 7453',
    system: 'K-Transformers',
    accuracy: 80.0,
    cost: 3800,  // Cost in $
    tpot: 0.073,
    throughput: 1753.42466,
    color: '#f59e0b'  // Amber
  },
  'qwen3-30b-moe-infinity-1xa5000': {
    label: 'Qwen3-30B-A3B / BF16 / 1 x A5000 + AMD 7454 / MoE-Infinity',
    model: 'Qwen3-30B-A3B',
    precision: 'BF16',
    gpu: '1 x A5000 + AMD 7454',
    system: 'MoE-Infinity',
    accuracy: 91.1,
    cost: 3800,  // Cost in $
    tpot: 0.15,
    throughput: 853.3,
    color: '#06b6d4'  // Cyan
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
      // TTFT calculation params
      perTokenCompute: 14, // GFLOPs (2 * 7B activated = 14)
      perTokenKVSize: 0.000131072, // GB (2 * 32 * 128 * 8 * 2 bytes = 131KB)
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
      // TTFT calculation params
      perTokenCompute: 44, // GFLOPs (2 * 22B activated = 44)
      perTokenKVSize: 0.000229376, // GB (2 * 56 * 128 * 8 * 2 bytes = 224KB)
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
      // TTFT calculation params
      perTokenCompute: 5.4, // GFLOPs (2 * 2.7B activated = 5.4)
      perTokenKVSize: 0.000196608, // GB (2 * 24 * 128 * 16 * 2 bytes = 192KB)
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
      // TTFT calculation params (DeepSeek uses MLA)
      perTokenCompute: 74, // GFLOPs (2 * 37B activated = 74)
      perTokenKVSize: 0.000070272, // GB (61 * (512 + 64) * 2 bytes = 68.6KB, MLA format)
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
      // TTFT calculation params (DeepSeek uses MLA)
      perTokenCompute: 4.8, // GFLOPs (2 * 2.4B activated = 4.8)
      perTokenKVSize: 0.000031104, // GB (27 * (512 + 64) * 2 bytes = 30.4KB, MLA format)
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
  const [selectedModel, setSelectedModel] = useState('deepseek-v2-lite');
  const [scenario, setScenario] = useState('5k-ref');
  
  // Inputs - default to 5k reference (4750 + 250 = 5000)
  const [batchSize, setBatchSize] = useState(1);
  const [inputLen, setInputLen] = useState(4750);
  const [outputLen, setOutputLen] = useState(250);
  const [sloMs, setSloMs] = useState(100); // Target Time Per Output Token (ms) - default 100ms = 0.1s
  const [hardwareBw, setHardwareBw] = useState(768); // Default A6000
  const [smbu, setSmbu] = useState(16.33); // Fixed S-MBU
  const [numGpus, setNumGpus] = useState(1); // Supply side GPU count
  const [yAxisType, setYAxisType] = useState('tpot'); // 'bandwidth', 'tpot', or 'ttft'

  // Real benchmark data points (measured values)
  const REAL_BENCHMARK_DATA = {
    // TPOT real data points
    tpot: [
      {
        name: 'Qwen1.5-MoE',
        model: 'qwen1.5-moe',
        context: '4k-1k',
        tp: 1,
        gpu: 'NVIDIA H100-SXM',
        engine: 'SGLang v0.5.8',
        batchSize: 1,
        power: 700,
        tpot: 4.0, // ms
        color: '#ef4444', // red for real data
        showLabel: true,
      },
      {
        name: 'Qwen1.5-MoE',
        model: 'qwen1.5-moe',
        context: '4k-1k',
        tp: 1,
        gpu: 'NVIDIA H100-SXM',
        engine: 'SGLang v0.5.8',
        batchSize: 32,
        power: 700,
        tpot: 15.3, // ms
        color: '#ef4444', // red for real data
        showLabel: true,
      },
      {
        name: 'Qwen1.5-MoE',
        model: 'qwen1.5-moe',
        context: '13k-1k',
        tp: 1,
        gpu: 'NVIDIA H100-SXM',
        engine: 'SGLang v0.5.8',
        batchSize: 1,
        power: 700,
        tpot: 4.6, // ms
        color: '#ef4444', // red for real data
        showLabel: true,
      },
      {
        name: 'DeepSeek-V2-Lite',
        model: 'deepseek-v2-lite',
        context: '13k-1k',
        tp: 1,
        gpu: 'NVIDIA H100-SXM',
        engine: 'SGLang v0.5.8',
        batchSize: 1,
        power: 700,
        tpot: 4.9, // ms
        color: '#ef4444', // red for real data
        showLabel: true,
      },
      {
        name: 'DeepSeek-V2-Lite',
        model: 'deepseek-v2-lite',
        context: '4k-1k',
        tp: 1,
        gpu: 'NVIDIA H100-SXM',
        engine: 'SGLang v0.5.8',
        batchSize: 1,
        power: 700,
        tpot: 4.7, // ms
        color: '#ef4444', // red for real data
        showLabel: true,
      },
      {
        name: 'DeepSeek-V2-Lite',
        model: 'deepseek-v2-lite',
        context: '4k-1k',
        tp: 1,
        gpu: 'NVIDIA H100-SXM',
        engine: 'SGLang v0.5.8',
        batchSize: 32,
        power: 700,
        tpot: 12.5, // ms
        color: '#ef4444', // red for real data
        showLabel: true,
      },
      // vLLM v0.11.0 data points
      {
        name: 'DeepSeek-V2-Lite',
        model: 'deepseek-v2-lite',
        context: '4k-1k',
        tp: 1,
        gpu: 'NVIDIA H100-SXM',
        engine: 'vLLM v0.11.0',
        batchSize: 1,
        power: 700,
        tpot: 6.9, // ms
        color: '#6366f1', // indigo for vLLM
        showLabel: true,
      },
      {
        name: 'DeepSeek-V2-Lite',
        model: 'deepseek-v2-lite',
        context: '4k-1k',
        tp: 1,
        gpu: 'NVIDIA H100-SXM',
        engine: 'vLLM v0.11.0',
        batchSize: 32,
        power: 700,
        tpot: 14.3, // ms
        color: '#6366f1', // indigo for vLLM
        showLabel: true,
      },
      {
        name: 'DeepSeek-V2-Lite',
        model: 'deepseek-v2-lite',
        context: '13k-1k',
        tp: 1,
        gpu: 'NVIDIA H100-SXM',
        engine: 'vLLM v0.11.0',
        batchSize: 1,
        power: 700,
        tpot: 7.4, // ms
        color: '#6366f1', // indigo for vLLM
        showLabel: true,
      },
      {
        name: 'Qwen1.5-MoE',
        model: 'qwen1.5-moe',
        context: '4k-1k',
        tp: 1,
        gpu: 'NVIDIA H100-SXM',
        engine: 'vLLM v0.11.0',
        batchSize: 1,
        power: 700,
        tpot: 4.7, // ms
        color: '#6366f1', // indigo for vLLM
        showLabel: true,
      },
      {
        name: 'Qwen1.5-MoE',
        model: 'qwen1.5-moe',
        context: '4k-1k',
        tp: 1,
        gpu: 'NVIDIA H100-SXM',
        engine: 'vLLM v0.11.0',
        batchSize: 32,
        power: 700,
        tpot: 15.5, // ms
        color: '#6366f1', // indigo for vLLM
        showLabel: true,
      },
      {
        name: 'Qwen1.5-MoE',
        model: 'qwen1.5-moe',
        context: '13k-1k',
        tp: 1,
        gpu: 'NVIDIA H100-SXM',
        engine: 'vLLM v0.11.0',
        batchSize: 1,
        power: 700,
        tpot: 5.3, // ms
        color: '#6366f1', // indigo for vLLM
        showLabel: true,
      },
      // NVIDIA A6000 data points (SGLang v0.5.8)
      {
        name: 'Qwen1.5-MoE',
        model: 'qwen1.5-moe',
        context: '4k-1k',
        tp: 1,
        gpu: 'NVIDIA A6000',
        engine: 'SGLang v0.5.8',
        batchSize: 1,
        power: 300,
        tpot: 10.06, // ms
        color: '#ef4444',
        showLabel: true,
      },
      {
        name: 'Qwen1.5-MoE',
        model: 'qwen1.5-moe',
        context: '13k-1k',
        tp: 1,
        gpu: 'NVIDIA A6000',
        engine: 'SGLang v0.5.8',
        batchSize: 1,
        power: 300,
        tpot: 12.53, // ms
        color: '#ef4444',
        showLabel: true,
      },
      {
        name: 'DeepSeek-V2-Lite',
        model: 'deepseek-v2-lite',
        context: '4k-1k',
        tp: 1,
        gpu: 'NVIDIA A6000',
        engine: 'SGLang v0.5.8',
        batchSize: 1,
        power: 300,
        tpot: 11.18, // ms
        color: '#ef4444',
        showLabel: true,
      },
      {
        name: 'DeepSeek-V2-Lite',
        model: 'deepseek-v2-lite',
        context: '13k-1k',
        tp: 1,
        gpu: 'NVIDIA A6000',
        engine: 'SGLang v0.5.8',
        batchSize: 1,
        power: 300,
        tpot: 15.64, // ms
        color: '#ef4444',
        showLabel: true,
      },
      // DGX-H100 (8xH100) TPOT data points
      {
        name: 'Qwen1.5-MoE',
        model: 'qwen1.5-moe',
        context: '4k-1k',
        tp: 8,
        gpu: 'DGX-H100 (8xH100)',
        engine: 'SGLang v0.5.8',
        batchSize: 1,
        power: 10200,
        tpot: 2.87, // ms (0.00287s)
        color: '#ef4444', // red for SGLang
        showLabel: true,
      },
      {
        name: 'Qwen1.5-MoE',
        model: 'qwen1.5-moe',
        context: '4k-1k',
        tp: 8,
        gpu: 'DGX-H100 (8xH100)',
        engine: 'SGLang v0.5.8',
        batchSize: 32,
        power: 10200,
        tpot: 5.0, // ms (0.005s)
        color: '#ef4444',
        showLabel: true,
      },
      {
        name: 'Qwen1.5-MoE',
        model: 'qwen1.5-moe',
        context: '13k-1k',
        tp: 8,
        gpu: 'DGX-H100 (8xH100)',
        engine: 'SGLang v0.5.8',
        batchSize: 1,
        power: 10200,
        tpot: 2.94, // ms (0.00294s)
        color: '#ef4444',
        showLabel: true,
      },
      {
        name: 'Qwen1.5-MoE',
        model: 'qwen1.5-moe',
        context: '13k-1k',
        tp: 8,
        gpu: 'DGX-H100 (8xH100)',
        engine: 'SGLang v0.5.8',
        batchSize: 32,
        power: 10200,
        tpot: 5.87, // ms (0.00587s)
        color: '#ef4444',
        showLabel: true,
      },
      {
        name: 'DeepSeek-V2-Lite',
        model: 'deepseek-v2-lite',
        context: '4k-1k',
        tp: 8,
        gpu: 'DGX-H100 (8xH100)',
        engine: 'SGLang v0.5.8',
        batchSize: 1,
        power: 10200,
        tpot: 3.98, // ms (0.00398s)
        color: '#ef4444',
        showLabel: true,
      },
      {
        name: 'DeepSeek-V2-Lite',
        model: 'deepseek-v2-lite',
        context: '4k-1k',
        tp: 8,
        gpu: 'DGX-H100 (8xH100)',
        engine: 'SGLang v0.5.8',
        batchSize: 32,
        power: 10200,
        tpot: 6.48, // ms (0.00648s)
        color: '#ef4444',
        showLabel: true,
      },
      {
        name: 'DeepSeek-V2-Lite',
        model: 'deepseek-v2-lite',
        context: '13k-1k',
        tp: 8,
        gpu: 'DGX-H100 (8xH100)',
        engine: 'SGLang v0.5.8',
        batchSize: 1,
        power: 10200,
        tpot: 4.09, // ms (0.00409s)
        color: '#ef4444',
        showLabel: true,
      },
      {
        name: 'DeepSeek-V2-Lite',
        model: 'deepseek-v2-lite',
        context: '13k-1k',
        tp: 8,
        gpu: 'DGX-H100 (8xH100)',
        engine: 'SGLang v0.5.8',
        batchSize: 32,
        power: 10200,
        tpot: 7.5, // ms (0.0075s)
        color: '#ef4444',
        showLabel: true,
      },
      // DGX-H100 BS=64 data points
      {
        name: 'Qwen1.5-MoE',
        model: 'qwen1.5-moe',
        context: '4k-1k',
        tp: 8,
        gpu: 'DGX-H100 (8xH100)',
        engine: 'SGLang v0.5.8',
        batchSize: 64,
        power: 10200,
        tpot: 7.04, // ms (0.00704s)
        color: '#ef4444',
        showLabel: true,
      },
      {
        name: 'Qwen1.5-MoE',
        model: 'qwen1.5-moe',
        context: '13k-1k',
        tp: 8,
        gpu: 'DGX-H100 (8xH100)',
        engine: 'SGLang v0.5.8',
        batchSize: 64,
        power: 10200,
        tpot: 8.95, // ms (0.00895s)
        color: '#ef4444',
        showLabel: true,
      },
      {
        name: 'DeepSeek-V2-Lite',
        model: 'deepseek-v2-lite',
        context: '4k-1k',
        tp: 8,
        gpu: 'DGX-H100 (8xH100)',
        engine: 'SGLang v0.5.8',
        batchSize: 64,
        power: 10200,
        tpot: 8.97, // ms (0.00897s)
        color: '#ef4444',
        showLabel: true,
      },
      {
        name: 'DeepSeek-V2-Lite',
        model: 'deepseek-v2-lite',
        context: '13k-1k',
        tp: 8,
        gpu: 'DGX-H100 (8xH100)',
        engine: 'SGLang v0.5.8',
        batchSize: 64,
        power: 10200,
        tpot: 11.23, // ms (0.01123s)
        color: '#ef4444',
        showLabel: true,
      },
      // DGX-H100 BS=128 data points
      {
        name: 'Qwen1.5-MoE',
        model: 'qwen1.5-moe',
        context: '4k-1k',
        tp: 8,
        gpu: 'DGX-H100 (8xH100)',
        engine: 'SGLang v0.5.8',
        batchSize: 128,
        power: 10200,
        tpot: 10.39, // ms (0.01039s)
        color: '#ef4444',
        showLabel: true,
      },
      {
        name: 'Qwen1.5-MoE',
        model: 'qwen1.5-moe',
        context: '13k-1k',
        tp: 8,
        gpu: 'DGX-H100 (8xH100)',
        engine: 'SGLang v0.5.8',
        batchSize: 128,
        power: 10200,
        tpot: 14.44, // ms (0.01444s)
        color: '#ef4444',
        showLabel: true,
      },
      {
        name: 'DeepSeek-V2-Lite',
        model: 'deepseek-v2-lite',
        context: '4k-1k',
        tp: 8,
        gpu: 'DGX-H100 (8xH100)',
        engine: 'SGLang v0.5.8',
        batchSize: 128,
        power: 10200,
        tpot: 12.43, // ms (0.01243s)
        color: '#ef4444',
        showLabel: true,
      },
      {
        name: 'DeepSeek-V2-Lite',
        model: 'deepseek-v2-lite',
        context: '13k-1k',
        tp: 8,
        gpu: 'DGX-H100 (8xH100)',
        engine: 'SGLang v0.5.8',
        batchSize: 128,
        power: 10200,
        tpot: 17.61, // ms (0.01761s)
        color: '#ef4444',
        showLabel: true,
      },
      // Mixtral-8x7B on DGX-H100 (vLLM)
      {
        name: 'Mixtral-8x7B',
        model: 'mixtral-8x7b',
        context: '4k-1k',
        tp: 8,
        gpu: 'DGX-H100 (8xH100)',
        engine: 'vLLM v0.11.0',
        batchSize: 1,
        power: 10200,
        tpot: 3.91, // ms (0.00391s)
        color: '#6366f1', // indigo for vLLM
        showLabel: true,
      },
      {
        name: 'Mixtral-8x7B',
        model: 'mixtral-8x7b',
        context: '4k-1k',
        tp: 8,
        gpu: 'DGX-H100 (8xH100)',
        engine: 'vLLM v0.11.0',
        batchSize: 32,
        power: 10200,
        tpot: 7.46, // ms (0.00746s)
        color: '#6366f1',
        showLabel: true,
      },
      {
        name: 'Mixtral-8x7B',
        model: 'mixtral-8x7b',
        context: '13k-1k',
        tp: 8,
        gpu: 'DGX-H100 (8xH100)',
        engine: 'vLLM v0.11.0',
        batchSize: 1,
        power: 10200,
        tpot: 4.01, // ms (0.00401s)
        color: '#6366f1',
        showLabel: true,
      },
      {
        name: 'Mixtral-8x7B',
        model: 'mixtral-8x7b',
        context: '13k-1k',
        tp: 8,
        gpu: 'DGX-H100 (8xH100)',
        engine: 'vLLM v0.11.0',
        batchSize: 32,
        power: 10200,
        tpot: 8.64, // ms (0.00864s)
        color: '#6366f1',
        showLabel: true,
      },
      // Mixtral-8x22B on DGX-H100 (vLLM)
      {
        name: 'Mixtral-8x22B',
        model: 'mixtral-8x22b',
        context: '4k-1k',
        tp: 8,
        gpu: 'DGX-H100 (8xH100)',
        engine: 'vLLM v0.11.0',
        batchSize: 1,
        power: 10200,
        tpot: 7.91, // ms (0.00791s)
        color: '#6366f1', // indigo for vLLM
        showLabel: true,
      },
      {
        name: 'Mixtral-8x22B',
        model: 'mixtral-8x22b',
        context: '4k-1k',
        tp: 8,
        gpu: 'DGX-H100 (8xH100)',
        engine: 'vLLM v0.11.0',
        batchSize: 32,
        power: 10200,
        tpot: 17.52, // ms (0.01752s)
        color: '#6366f1',
        showLabel: true,
      },
      {
        name: 'Mixtral-8x22B',
        model: 'mixtral-8x22b',
        context: '13k-1k',
        tp: 8,
        gpu: 'DGX-H100 (8xH100)',
        engine: 'vLLM v0.11.0',
        batchSize: 1,
        power: 10200,
        tpot: 8.08, // ms (0.00808s)
        color: '#6366f1',
        showLabel: true,
      },
      {
        name: 'Mixtral-8x22B',
        model: 'mixtral-8x22b',
        context: '13k-1k',
        tp: 8,
        gpu: 'DGX-H100 (8xH100)',
        engine: 'vLLM v0.11.0',
        batchSize: 32,
        power: 10200,
        tpot: 19.53, // ms (0.01953s)
        color: '#6366f1',
        showLabel: true,
      },
    ],
    // TTFT real data points
    ttft: [
      // SGLang data points (BS=1 only, /3.8 adjustment)
      {
        name: 'Qwen1.5-MoE',
        model: 'qwen1.5-moe',
        context: '4k-1k',
        tp: 1,
        gpu: 'NVIDIA H100-SXM',
        engine: 'SGLang v0.5.8',
        batchSize: 1,
        power: 700,
        ttft: 15.5, // ms (59.0 / 3.8)
        color: '#ef4444', // red for real data
        showLabel: true,
      },
      {
        name: 'Qwen1.5-MoE',
        model: 'qwen1.5-moe',
        context: '13k-1k',
        tp: 1,
        gpu: 'NVIDIA H100-SXM',
        engine: 'SGLang v0.5.8',
        batchSize: 1,
        power: 700,
        ttft: 40.4, // ms
        color: '#ef4444', // red for real data
        showLabel: true,
      },
      {
        name: 'DeepSeek-V2-Lite',
        model: 'deepseek-v2-lite',
        context: '13k-1k',
        tp: 1,
        gpu: 'NVIDIA H100-SXM',
        engine: 'SGLang v0.5.8',
        batchSize: 1,
        power: 700,
        ttft: 41.1, // ms (156.0 / 3.8)
        color: '#ef4444', // red for real data
        showLabel: true,
      },
      {
        name: 'DeepSeek-V2-Lite',
        model: 'deepseek-v2-lite',
        context: '4k-1k',
        tp: 1,
        gpu: 'NVIDIA H100-SXM',
        engine: 'SGLang v0.5.8',
        batchSize: 1,
        power: 700,
        ttft: 24.7, // ms (94.0 / 3.8)
        color: '#ef4444', // red for real data
        showLabel: true,
      },
      // vLLM v0.11.0 TTFT data points (BS=1 only, /3.8 adjustment)
      {
        name: 'DeepSeek-V2-Lite',
        model: 'deepseek-v2-lite',
        context: '4k-1k',
        tp: 1,
        gpu: 'NVIDIA H100-SXM',
        engine: 'vLLM v0.11.0',
        batchSize: 1,
        power: 700,
        ttft: 59.1, // ms (224.5 / 3.8)
        color: '#6366f1', // indigo for vLLM
        showLabel: true,
      },
      {
        name: 'DeepSeek-V2-Lite',
        model: 'deepseek-v2-lite',
        context: '13k-1k',
        tp: 1,
        gpu: 'NVIDIA H100-SXM',
        engine: 'vLLM v0.11.0',
        batchSize: 1,
        power: 700,
        ttft: 158.9, // ms (603.75 / 3.8)
        color: '#6366f1', // indigo for vLLM
        showLabel: true,
      },
      {
        name: 'Qwen1.5-MoE',
        model: 'qwen1.5-moe',
        context: '4k-1k',
        tp: 1,
        gpu: 'NVIDIA H100-SXM',
        engine: 'vLLM v0.11.0',
        batchSize: 1,
        power: 700,
        ttft: 46.4, // ms (176.5 / 3.8)
        color: '#6366f1', // indigo for vLLM
        showLabel: true,
      },
      {
        name: 'Qwen1.5-MoE',
        model: 'qwen1.5-moe',
        context: '13k-1k',
        tp: 1,
        gpu: 'NVIDIA H100-SXM',
        engine: 'vLLM v0.11.0',
        batchSize: 1,
        power: 700,
        ttft: 125.5, // ms (477.0 / 3.8)
        color: '#6366f1', // indigo for vLLM
        showLabel: true,
      },
      // NVIDIA A6000 TTFT data points (SGLang v0.5.8)
      {
        name: 'Qwen1.5-MoE',
        model: 'qwen1.5-moe',
        context: '4k-1k',
        tp: 1,
        gpu: 'NVIDIA A6000',
        engine: 'SGLang v0.5.8',
        batchSize: 1,
        power: 300,
        ttft: 278.9, // ms
        color: '#ef4444',
        showLabel: true,
      },
      {
        name: 'Qwen1.5-MoE',
        model: 'qwen1.5-moe',
        context: '13k-1k',
        tp: 1,
        gpu: 'NVIDIA A6000',
        engine: 'SGLang v0.5.8',
        batchSize: 1,
        power: 300,
        ttft: 266.1, // ms
        color: '#ef4444',
        showLabel: true,
      },
      {
        name: 'DeepSeek-V2-Lite',
        model: 'deepseek-v2-lite',
        context: '4k-1k',
        tp: 1,
        gpu: 'NVIDIA A6000',
        engine: 'SGLang v0.5.8',
        batchSize: 1,
        power: 300,
        ttft: 560.9, // ms
        color: '#ef4444',
        showLabel: true,
      },
      {
        name: 'DeepSeek-V2-Lite',
        model: 'deepseek-v2-lite',
        context: '13k-1k',
        tp: 1,
        gpu: 'NVIDIA A6000',
        engine: 'SGLang v0.5.8',
        batchSize: 1,
        power: 300,
        ttft: 1016.1, // ms
        color: '#ef4444',
        showLabel: true,
      },
      // DGX-H100 (8xH100) TTFT data points
      // BS=1: use raw TTFT; BS>1: TTFT * (BS / 3)
      {
        name: 'Qwen1.5-MoE',
        model: 'qwen1.5-moe',
        context: '4k-1k',
        tp: 8,
        gpu: 'DGX-H100 (8xH100)',
        engine: 'SGLang v0.5.8',
        batchSize: 1,
        power: 10200,
        ttft: 47.3, // ms (0.0473s)
        color: '#ef4444', // red for SGLang
        showLabel: true,
      },
      {
        name: 'Qwen1.5-MoE',
        model: 'qwen1.5-moe',
        context: '4k-1k',
        tp: 8,
        gpu: 'DGX-H100 (8xH100)',
        engine: 'SGLang v0.5.8',
        batchSize: 32,
        power: 10200,
        ttft: 658.4, // ms (0.0617s * 32/3)
        color: '#ef4444',
        showLabel: true,
      },
      {
        name: 'Qwen1.5-MoE',
        model: 'qwen1.5-moe',
        context: '13k-1k',
        tp: 8,
        gpu: 'DGX-H100 (8xH100)',
        engine: 'SGLang v0.5.8',
        batchSize: 1,
        power: 10200,
        ttft: 38.5, // ms (0.0385s)
        color: '#ef4444',
        showLabel: true,
      },
      {
        name: 'Qwen1.5-MoE',
        model: 'qwen1.5-moe',
        context: '13k-1k',
        tp: 8,
        gpu: 'DGX-H100 (8xH100)',
        engine: 'SGLang v0.5.8',
        batchSize: 32,
        power: 10200,
        ttft: 446.9, // ms (0.0419s * 32/3)
        color: '#ef4444',
        showLabel: true,
      },
      {
        name: 'DeepSeek-V2-Lite',
        model: 'deepseek-v2-lite',
        context: '4k-1k',
        tp: 8,
        gpu: 'DGX-H100 (8xH100)',
        engine: 'SGLang v0.5.8',
        batchSize: 1,
        power: 10200,
        ttft: 75.3, // ms (0.0753s)
        color: '#ef4444',
        showLabel: true,
      },
      {
        name: 'DeepSeek-V2-Lite',
        model: 'deepseek-v2-lite',
        context: '4k-1k',
        tp: 8,
        gpu: 'DGX-H100 (8xH100)',
        engine: 'SGLang v0.5.8',
        batchSize: 32,
        power: 10200,
        ttft: 795.5, // ms (0.0746s * 32/3)
        color: '#ef4444',
        showLabel: true,
      },
      {
        name: 'DeepSeek-V2-Lite',
        model: 'deepseek-v2-lite',
        context: '13k-1k',
        tp: 8,
        gpu: 'DGX-H100 (8xH100)',
        engine: 'SGLang v0.5.8',
        batchSize: 1,
        power: 10200,
        ttft: 59.1, // ms (0.0591s)
        color: '#ef4444',
        showLabel: true,
      },
      {
        name: 'DeepSeek-V2-Lite',
        model: 'deepseek-v2-lite',
        context: '13k-1k',
        tp: 8,
        gpu: 'DGX-H100 (8xH100)',
        engine: 'SGLang v0.5.8',
        batchSize: 32,
        power: 10200,
        ttft: 591.1, // ms (0.0554s * 32/3)
        color: '#ef4444',
        showLabel: true,
      },
      // DGX-H100 TTFT BS=64 data points
      {
        name: 'Qwen1.5-MoE',
        model: 'qwen1.5-moe',
        context: '4k-1k',
        tp: 8,
        gpu: 'DGX-H100 (8xH100)',
        engine: 'SGLang v0.5.8',
        batchSize: 64,
        power: 10200,
        ttft: 1193.5, // ms (0.0559s * 64/3)
        color: '#ef4444',
        showLabel: true,
      },
      {
        name: 'Qwen1.5-MoE',
        model: 'qwen1.5-moe',
        context: '13k-1k',
        tp: 8,
        gpu: 'DGX-H100 (8xH100)',
        engine: 'SGLang v0.5.8',
        batchSize: 64,
        power: 10200,
        ttft: 908.0, // ms (0.0426s * 64/3)
        color: '#ef4444',
        showLabel: true,
      },
      {
        name: 'DeepSeek-V2-Lite',
        model: 'deepseek-v2-lite',
        context: '4k-1k',
        tp: 8,
        gpu: 'DGX-H100 (8xH100)',
        engine: 'SGLang v0.5.8',
        batchSize: 64,
        power: 10200,
        ttft: 1482.4, // ms (0.0695s * 64/3)
        color: '#ef4444',
        showLabel: true,
      },
      {
        name: 'DeepSeek-V2-Lite',
        model: 'deepseek-v2-lite',
        context: '13k-1k',
        tp: 8,
        gpu: 'DGX-H100 (8xH100)',
        engine: 'SGLang v0.5.8',
        batchSize: 64,
        power: 10200,
        ttft: 1211.0, // ms (0.0568s * 64/3)
        color: '#ef4444',
        showLabel: true,
      },
      // DGX-H100 TTFT BS=128 data points
      {
        name: 'Qwen1.5-MoE',
        model: 'qwen1.5-moe',
        context: '4k-1k',
        tp: 8,
        gpu: 'DGX-H100 (8xH100)',
        engine: 'SGLang v0.5.8',
        batchSize: 128,
        power: 10200,
        ttft: 2020.4, // ms (0.0474s * 128/3)
        color: '#ef4444',
        showLabel: true,
      },
      {
        name: 'Qwen1.5-MoE',
        model: 'qwen1.5-moe',
        context: '13k-1k',
        tp: 8,
        gpu: 'DGX-H100 (8xH100)',
        engine: 'SGLang v0.5.8',
        batchSize: 128,
        power: 10200,
        ttft: 1628.9, // ms (0.0382s * 128/3)
        color: '#ef4444',
        showLabel: true,
      },
      {
        name: 'DeepSeek-V2-Lite',
        model: 'deepseek-v2-lite',
        context: '4k-1k',
        tp: 8,
        gpu: 'DGX-H100 (8xH100)',
        engine: 'SGLang v0.5.8',
        batchSize: 128,
        power: 10200,
        ttft: 2837.7, // ms (0.0665s * 128/3)
        color: '#ef4444',
        showLabel: true,
      },
      {
        name: 'DeepSeek-V2-Lite',
        model: 'deepseek-v2-lite',
        context: '13k-1k',
        tp: 8,
        gpu: 'DGX-H100 (8xH100)',
        engine: 'SGLang v0.5.8',
        batchSize: 128,
        power: 10200,
        ttft: 2273.4, // ms (0.0533s * 128/3)
        color: '#ef4444',
        showLabel: true,
      },
      // Mixtral-8x7B on DGX-H100 (vLLM)
      {
        name: 'Mixtral-8x7B',
        model: 'mixtral-8x7b',
        context: '4k-1k',
        tp: 8,
        gpu: 'DGX-H100 (8xH100)',
        engine: 'vLLM v0.11.0',
        batchSize: 1,
        power: 10200,
        ttft: 57.7, // ms (0.0577s)
        color: '#6366f1', // indigo for vLLM
        showLabel: true,
      },
      {
        name: 'Mixtral-8x7B',
        model: 'mixtral-8x7b',
        context: '4k-1k',
        tp: 8,
        gpu: 'DGX-H100 (8xH100)',
        engine: 'vLLM v0.11.0',
        batchSize: 32,
        power: 10200,
        ttft: 4935.5, // ms (0.4627s * 32/3)
        color: '#6366f1',
        showLabel: true,
      },
      {
        name: 'Mixtral-8x7B',
        model: 'mixtral-8x7b',
        context: '13k-1k',
        tp: 8,
        gpu: 'DGX-H100 (8xH100)',
        engine: 'vLLM v0.11.0',
        batchSize: 1,
        power: 10200,
        ttft: 128.1, // ms (0.1281s)
        color: '#6366f1',
        showLabel: true,
      },
      {
        name: 'Mixtral-8x7B',
        model: 'mixtral-8x7b',
        context: '13k-1k',
        tp: 8,
        gpu: 'DGX-H100 (8xH100)',
        engine: 'vLLM v0.11.0',
        batchSize: 32,
        power: 10200,
        ttft: 8044.5, // ms (0.7542s * 32/3)
        color: '#6366f1',
        showLabel: true,
      },
      // Mixtral-8x22B on DGX-H100 (vLLM)
      {
        name: 'Mixtral-8x22B',
        model: 'mixtral-8x22b',
        context: '4k-1k',
        tp: 8,
        gpu: 'DGX-H100 (8xH100)',
        engine: 'vLLM v0.11.0',
        batchSize: 1,
        power: 10200,
        ttft: 146.9, // ms (0.1469s)
        color: '#6366f1', // indigo for vLLM
        showLabel: true,
      },
      {
        name: 'Mixtral-8x22B',
        model: 'mixtral-8x22b',
        context: '4k-1k',
        tp: 8,
        gpu: 'DGX-H100 (8xH100)',
        engine: 'vLLM v0.11.0',
        batchSize: 32,
        power: 10200,
        ttft: 13892.3, // ms (1.3024s * 32/3)
        color: '#6366f1',
        showLabel: true,
      },
      {
        name: 'Mixtral-8x22B',
        model: 'mixtral-8x22b',
        context: '13k-1k',
        tp: 8,
        gpu: 'DGX-H100 (8xH100)',
        engine: 'vLLM v0.11.0',
        batchSize: 1,
        power: 10200,
        ttft: 336.9, // ms (0.3369s)
        color: '#6366f1',
        showLabel: true,
      },
      {
        name: 'Mixtral-8x22B',
        model: 'mixtral-8x22b',
        context: '13k-1k',
        tp: 8,
        gpu: 'DGX-H100 (8xH100)',
        engine: 'vLLM v0.11.0',
        batchSize: 32,
        power: 10200,
        ttft: 25084.3, // ms (2.3517s * 32/3)
        color: '#6366f1',
        showLabel: true,
      },
    ],
  };

  // CAP Radar Chart selections (3 configs)
  const [capConfig1, setCapConfig1] = useState('qwen3-30b-4xa6000');
  const [capConfig2, setCapConfig2] = useState('qwen3-30b-ktransformers-1xa5000');
  const [capConfig3, setCapConfig3] = useState('qwen3-30b-moe-infinity-1xa5000');
  const [capDataset, setCapDataset] = useState('gsm8k');

  // Select configs based on dataset
  const CAP_CONFIGS = capDataset === 'longbench-v2' ? LONGBENCH_CONFIGS : GSM8K_CONFIGS;

  // Track previous dataset to only reset when it actually changes (not on initial load)
  const prevDatasetRef = useRef(capDataset);
  useEffect(() => {
    if (prevDatasetRef.current !== capDataset) {
      const configs = capDataset === 'longbench-v2' ? LONGBENCH_CONFIGS : GSM8K_CONFIGS;
      const keys = Object.keys(configs);
      setCapConfig1(keys[0] || '');
      setCapConfig2(keys[1] || '');
      setCapConfig3(keys[2] || '');
      prevDatasetRef.current = capDataset;
    }
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
    // GFLOPS values from spreadsheet for TTFT calculation
    const peakDevices = [
      // Data Center Systems (Multi-GPU)
      { name: 'NVIDIA DGX-H100', bandwidth: 26800, power: 10200, gflops: 7.92e6, category: 'datacenter-system', type: 'peak', showLabel: true },
      { name: 'NVIDIA DGX-A100', bandwidth: 16296, power: 6500, gflops: 2.50e6, category: 'datacenter-system', type: 'peak', showLabel: false },
      // Data Center Cards
      { name: 'AMD MI300X', bandwidth: 5300, power: 750, gflops: null, category: 'datacenter-card', type: 'peak', showLabel: true },
      { name: 'NVIDIA H100-SXM', bandwidth: 3350, power: 700, gflops: 9.90e5, category: 'datacenter-card', type: 'peak', showLabel: true },
      { name: 'AWS Trainium 2', bandwidth: 2900, power: 480, gflops: null, category: 'datacenter-card', type: 'peak', showLabel: false },
      { name: 'NVIDIA A100-80G-SXM4', bandwidth: 2037, power: 400, gflops: 3.12e5, category: 'datacenter-card', type: 'peak', showLabel: false },
      { name: 'NVIDIA H100-PCIe', bandwidth: 2000, power: 350, gflops: 7.57e5, category: 'datacenter-card', type: 'peak', showLabel: false },
      { name: 'NVIDIA A100-80G-PCIe', bandwidth: 1935, power: 300, gflops: 3.12e5, category: 'datacenter-card', type: 'peak', showLabel: false },
      { name: 'NVIDIA A6000', bandwidth: 768, power: 300, gflops: 1.55e5, category: 'datacenter-card', type: 'peak', showLabel: false },
      { name: 'NVIDIA A5000', bandwidth: 768, power: 230, gflops: 1.10e5, category: 'datacenter-card', type: 'peak', showLabel: false },
      // Personal (Consumer GPUs) - 调整power避免重叠
      { name: 'NVIDIA RTX 5090', bandwidth: 1790, power: 575, gflops: 1.68e6, category: 'personal', type: 'peak', showLabel: true },
      { name: 'NVIDIA RTX 4090', bandwidth: 1010, power: 450, gflops: 6.60e5, category: 'personal', type: 'peak', showLabel: true },
      { name: 'NVIDIA RTX 3090Ti', bandwidth: 1010, power: 400, gflops: null, category: 'personal', type: 'peak', showLabel: false },
      { name: 'NVIDIA RTX 5080', bandwidth: 960, power: 360, gflops: 9.00e5, category: 'personal', type: 'peak', showLabel: false },
      { name: 'NVIDIA RTX 3080Ti', bandwidth: 912.4, power: 350, gflops: null, category: 'personal', type: 'peak', showLabel: false },
      { name: 'NVIDIA RTX 4080', bandwidth: 716.8, power: 320, gflops: null, category: 'personal', type: 'peak', showLabel: false },
      // SoC (Apple Silicon) - Unified Memory - 调整power避免重叠
      { name: 'Apple M4 max', bandwidth: 546, power: 90, gflops: null, category: 'soc', type: 'peak', showLabel: true },
      { name: 'Apple M3 max', bandwidth: 400, power: 70, gflops: null, category: 'soc', type: 'peak', showLabel: false },
      { name: 'Apple M2 max', bandwidth: 400, power: 50, gflops: null, category: 'soc', type: 'peak', showLabel: false },
      { name: 'Apple M1 max', bandwidth: 400, power: 35, gflops: null, category: 'soc', type: 'peak', showLabel: false },
      // Autonomous (NVIDIA Jetson)
      { name: 'NVIDIA Orin AGX', bandwidth: 204.8, power: 60, gflops: null, category: 'autonomous', type: 'peak', showLabel: true },
      { name: 'NVIDIA Xavier AGX', bandwidth: 136.5, power: 30, gflops: null, category: 'autonomous', type: 'peak', showLabel: false },
      { name: 'NVIDIA Orin NX', bandwidth: 102.4, power: 25, gflops: null, category: 'autonomous', type: 'peak', showLabel: false },
      { name: 'NVIDIA Jetson Nano', bandwidth: 25.6, power: 10, gflops: null, category: 'autonomous', type: 'peak', showLabel: true },
    ];
    
    // Offloading Bandwidth = PCIe/ethernet bandwidth (orange squares)
    const offloadDevices = [
      // Data Center Systems (Multi-GPU with NVLink)
      { name: 'NVIDIA DGX-H100', bandwidth: 1280, power: 10200, gflops: 7.92e6, category: 'datacenter-system', type: 'pcie', showLabel: true },
      { name: 'NVIDIA DGX-A100', bandwidth: 512, power: 6500, gflops: 2.50e6, category: 'datacenter-system', type: 'pcie', showLabel: false },
      // Data Center Cards (PCIe)
      { name: 'AMD MI300X', bandwidth: 128, power: 750, gflops: null, category: 'datacenter-card', type: 'pcie', showLabel: false },
      { name: 'NVIDIA H100-SXM', bandwidth: 128, power: 700, gflops: 9.90e5, category: 'datacenter-card', type: 'pcie', showLabel: true },
      { name: 'AWS Trainium 2', bandwidth: 128, power: 480, gflops: null, category: 'datacenter-card', type: 'pcie', showLabel: false },
      { name: 'NVIDIA H100-PCIe', bandwidth: 128, power: 350, gflops: 7.57e5, category: 'datacenter-card', type: 'pcie', showLabel: false },
      { name: 'NVIDIA A100-80G-SXM4', bandwidth: 64, power: 400, gflops: 3.12e5, category: 'datacenter-card', type: 'pcie', showLabel: false },
      { name: 'NVIDIA A100-80G-PCIe', bandwidth: 64, power: 300, gflops: 3.12e5, category: 'datacenter-card', type: 'pcie', showLabel: false },
      { name: 'NVIDIA A6000', bandwidth: 64, power: 300, gflops: 1.55e5, category: 'datacenter-card', type: 'pcie', showLabel: false },
      { name: 'NVIDIA A5000', bandwidth: 64, power: 230, gflops: 1.10e5, category: 'datacenter-card', type: 'pcie', showLabel: false },
      // Personal (Consumer GPUs - PCIe)
      { name: 'NVIDIA RTX 5090', bandwidth: 128, power: 575, gflops: 1.68e6, category: 'personal', type: 'pcie', showLabel: true },
      { name: 'NVIDIA RTX 5080', bandwidth: 128, power: 360, gflops: 9.00e5, category: 'personal', type: 'pcie', showLabel: false },
      { name: 'NVIDIA RTX 4090', bandwidth: 64, power: 450, gflops: 6.60e5, category: 'personal', type: 'pcie', showLabel: false },
      { name: 'NVIDIA RTX 4080', bandwidth: 64, power: 320, gflops: null, category: 'personal', type: 'pcie', showLabel: false },
      { name: 'NVIDIA RTX 3090Ti', bandwidth: 64, power: 400, gflops: null, category: 'personal', type: 'pcie', showLabel: false },
      { name: 'NVIDIA RTX 3080Ti', bandwidth: 64, power: 350, gflops: null, category: 'personal', type: 'pcie', showLabel: false },
      // Autonomous (NVIDIA Jetson)
      { name: 'NVIDIA Orin AGX', bandwidth: 16, power: 60, gflops: null, category: 'autonomous', type: 'pcie', showLabel: true },
      { name: 'NVIDIA Xavier AGX', bandwidth: 16, power: 30, gflops: null, category: 'autonomous', type: 'pcie', showLabel: false },
      { name: 'NVIDIA Orin NX', bandwidth: 16, power: 25, gflops: null, category: 'autonomous', type: 'pcie', showLabel: false },
      { name: 'NVIDIA Jetson Nano', bandwidth: 4, power: 10, gflops: null, category: 'autonomous', type: 'pcie', showLabel: true },
    ];

    // Calculate required bandwidth at SLO=100ms for TPOT calculation
    // For TPOT mode, we use fixed SLO=100ms (0.1s) as reference
    const refSloSeconds = 0.1; // Fixed 100ms SLO for TPOT calculation
    const statsForTpot = calculateDemand(batchSize);
    // The required bandwidth at 100ms SLO is stored in model config
    // For current batch size, calculate required BW at 100ms SLO
    const MODEL_CONFIG_LOCAL = MODEL_CONFIGS[selectedModel];
    const is14k = scenario === '14k-ref';
    
    // Get reference bandwidth at current batch size for SLO=100ms
    let reqBwAt100ms;
    const bsRefPoints = { 1: is14k && MODEL_CONFIG_LOCAL.refBwBS1_14k ? MODEL_CONFIG_LOCAL.refBwBS1_14k : MODEL_CONFIG_LOCAL.refBwBS1 };
    if (MODEL_CONFIG_LOCAL.refBwBS32) bsRefPoints[32] = is14k && MODEL_CONFIG_LOCAL.refBwBS32_14k ? MODEL_CONFIG_LOCAL.refBwBS32_14k : MODEL_CONFIG_LOCAL.refBwBS32;
    if (MODEL_CONFIG_LOCAL.refBwBS64) bsRefPoints[64] = is14k && MODEL_CONFIG_LOCAL.refBwBS64_14k ? MODEL_CONFIG_LOCAL.refBwBS64_14k : MODEL_CONFIG_LOCAL.refBwBS64;
    if (MODEL_CONFIG_LOCAL.refBwBS128) bsRefPoints[128] = is14k && MODEL_CONFIG_LOCAL.refBwBS128_14k ? MODEL_CONFIG_LOCAL.refBwBS128_14k : MODEL_CONFIG_LOCAL.refBwBS128;
    
    if (bsRefPoints[batchSize]) {
      reqBwAt100ms = bsRefPoints[batchSize];
    } else {
      // Interpolate for unknown batch sizes
      const knownBSValues = Object.keys(bsRefPoints).map(Number).sort((a, b) => a - b);
      let lowerBS = 1, upperBS = 1;
      let lowerBW = bsRefPoints[1], upperBW = bsRefPoints[1];
      for (let i = 0; i < knownBSValues.length; i++) {
        if (knownBSValues[i] <= batchSize) { lowerBS = knownBSValues[i]; lowerBW = bsRefPoints[lowerBS]; }
        if (knownBSValues[i] >= batchSize && upperBS === 1) { upperBS = knownBSValues[i]; upperBW = bsRefPoints[upperBS]; }
      }
      if (upperBS < batchSize) { upperBS = knownBSValues[knownBSValues.length - 1]; upperBW = bsRefPoints[upperBS]; }
      reqBwAt100ms = lowerBS === upperBS ? lowerBW : lowerBW + ((batchSize - lowerBS) / (upperBS - lowerBS)) * (upperBW - lowerBW);
    }
    
    // Add TPOT calculation to each device: TPOT = 0.1s * (reqBwAt100ms / devicePeakBw)
    // TPOT in ms for display
    // For DeepSeek-V2-Lite, divide TPOT by 1.3 (model-specific correction)
    const tpotCorrectionFactor = selectedModel === 'deepseek-v2-lite' ? 1.3 : 1.0;
    
    // Calculate TTFT (Time To First Token) for each device
    // TTFT = max(compute_time, memory_time)
    // Compute time = Batch × Input Length × Per Token Compute / Peak GFLOPS
    // Memory time = Batch × Input Length × Per Token KV Size / Peak Bandwidth
    const perTokenCompute = MODEL_CONFIG_LOCAL.perTokenCompute; // in GFLOPs
    const perTokenKVSize = MODEL_CONFIG_LOCAL.perTokenKVSize; // in GB
    const currentInputLen = is14k ? 13000 : 4750; // Input tokens based on scenario
    
    const calculateTTFT = (device) => {
      if (!device.gflops || !perTokenCompute || !perTokenKVSize) {
        return null; // Cannot calculate if missing data
      }
      // Compute time in seconds: (batch × inputLen × perTokenCompute GFLOPs) / (device GFLOPs/s)
      const computeTime = (batchSize * currentInputLen * perTokenCompute) / device.gflops;
      // Memory time in seconds: (batch × inputLen × perTokenKVSize GB) / (device bandwidth GB/s)
      const memoryTime = (batchSize * currentInputLen * perTokenKVSize) / device.bandwidth;
      // TTFT = max of the two, converted to ms
      return Math.max(computeTime, memoryTime) * 1000;
    };
    
    const peakDevicesWithTpot = peakDevices.map(d => ({
      ...d,
      tpot: (refSloSeconds * reqBwAt100ms / d.bandwidth) * 1000 / tpotCorrectionFactor, // Convert to ms
      ttft: calculateTTFT(d) // Peak bandwidth (HBM) - calculate TTFT
    }));
    
    const offloadDevicesWithTpot = offloadDevices.map(d => ({
      ...d,
      tpot: (refSloSeconds * reqBwAt100ms / d.bandwidth) * 1000 / tpotCorrectionFactor, // Convert to ms
      ttft: null // Offloading bandwidth (PCIe) - no TTFT calculation
    }));
    
    // Separate DGX devices (multi-GPU systems) for different color
    const dgxPeakDevices = peakDevicesWithTpot.filter(d => d.name.includes('DGX'));
    const nonDgxPeakDevices = peakDevicesWithTpot.filter(d => !d.name.includes('DGX'));
    const dgxOffloadDevices = offloadDevicesWithTpot.filter(d => d.name.includes('DGX'));
    const nonDgxOffloadDevices = offloadDevicesWithTpot.filter(d => !d.name.includes('DGX'));
    
    // Reference TPOT value = 100ms (the SLO)
    const refTpotMs = 100;

    return { 
      peakDevices: nonDgxPeakDevices, 
      offloadDevices: nonDgxOffloadDevices, 
      dgxPeakDevices, 
      dgxOffloadDevices,
      bwBS1, currentBw, fullyActivatedBw, actualBw, reqBwAt100ms, refTpotMs
    };
  }, [hardwareBw, numGpus, currentSmbu, sloMs, batchSize, selectedModel, inputLen, outputLen, scenario]);

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

  // Find closest batch size to fully activated bandwidth
  const closestBatchSize = useMemo(() => {
    // Hardcode for specific case: 5K, Mixtral-8x22B
    if (scenario === '5k-ref' && selectedModel === 'mixtral-8x22b') {
      return 33;
    }

    if (scenario === '5k-ref' && selectedModel === 'mixtral-8x7b') {
      return 33;
    }
    
    const fullyActivatedBw = calculateDenseBandwidth();
    let closest = 1;
    let minDiff = Infinity;
    
    for (let b = 1; b <= 256; b += (b < 32 ? 1 : (b < 64 ? 2 : 4))) {
      const stats = calculateDemand(b);
      const diff = Math.abs(stats.reqBwGBs - fullyActivatedBw);
      if (diff < minDiff) {
        minDiff = diff;
        closest = b;
      }
    }
    
    // Find nearest device bandwidth to determine offset direction
    const { peakDevices, offloadDevices } = chartData;
    const allDevices = [...peakDevices, ...offloadDevices];
    let nearestDeviceBw = null;
    let minDeviceDiff = Infinity;
    
    allDevices.forEach(device => {
      const diff = Math.abs(device.bandwidth - fullyActivatedBw);
      if (diff < minDeviceDiff) {
        minDeviceDiff = diff;
        nearestDeviceBw = device.bandwidth;
      }
    });
    
    // If nearest device is above fullyActivatedBw, add 3; if below, subtract 3
    const offset = nearestDeviceBw && nearestDeviceBw > fullyActivatedBw ? 3 : -4;
    return closest + offset;
  }, [sloMs, selectedModel, inputLen, outputLen, scenario, chartData]);

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
            <a 
              href="https://github.com/TEAS-project/TEASBench" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-slate-300 hover:text-blue-400 transition-colors"
              title="View on GitHub"
            >
              <Github className="w-5 h-5 sm:w-6 sm:h-6" />
            </a>
            <span className="text-xs text-slate-400 hidden md:inline">Tracking Evolving AI and Systems</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 lg:gap-6 text-xs sm:text-sm">
            <a href="#moe" className="text-slate-300 hover:text-blue-400 transition-colors">LLM Inference with MoE</a>
            <a href="#test-time-scaling" className="text-slate-300 hover:text-blue-400 transition-colors">Test Time Scaling</a>
            <a href="#agentic-workflow" className="text-slate-300 hover:text-blue-400 transition-colors">Agentic Workflow</a>
            <Link to="/detail-results" className="text-slate-300 hover:text-blue-400 transition-colors">Trade-off Plots</Link>
            <Link to="/documentation" className="text-slate-300 hover:text-blue-400 transition-colors">Documentation</Link>
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
            We aim to create a next-generation benchmark that tracks the fast-evolving landscape of AI by:
            <ul className="list-disc list-inside pl-4 space-y-1 text-slate-300">
              <li>
                Focusing on frontier AI inference including <strong>sparse</strong>, <strong>reasoning</strong>, and <strong>agentic models</strong>.
                  These pose unique challenges for benchmarking as they involve sparse activations, memory-bound generation, heterogeneous hardware, and dynamic workflows.
              </li>
              <li>
                Measuring not only <strong>performance</strong>, but also <strong>costs</strong> and <strong>accuracy</strong>, to study their complex trade-offs.
              </li>
              <li>
                Providing analytical models to <strong>forecast performance</strong> in new hardware.
              </li>
            </ul>
            This is facilitated by a broad team with extensive expertise in AI based at the{' '}
            <a href="https://www.ed.ac.uk/" className="text-blue-400 hover:underline">University of Edinburgh</a>,{' '}
            <a href="https://www.epcc.ed.ac.uk/" className="text-blue-400 hover:underline">EPCC</a>, and{' '}
            <a href="https://www.imperial.ac.uk/" className="text-blue-400 hover:underline">Imperial College London</a>. 
            <br />
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
              LLM Inference with MoE
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
            <button
              onClick={() => exportAllMoEData(chartData, MODEL_CONFIG.name, scenario, batchSize, CAP_CONFIGS, capDataset, REAL_BENCHMARK_DATA)}
              className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 bg-emerald-700 hover:bg-emerald-600 border border-emerald-600 rounded-full text-xs sm:text-sm text-white transition-colors"
              title="Download all benchmark data as CSV"
            >
              <Download className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Download CSV</span>
            </button>
            <Link
              to="/detail-results"
              className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 bg-purple-700 hover:bg-purple-600 border border-purple-600 rounded-full text-xs sm:text-sm text-white transition-colors"
            >
              <span>CAP Radar</span>
            </Link>
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
              Hardware Map
            </h3>
            <Link to="/documentation" className="text-xs text-blue-400 hover:text-blue-300 transition-colors underline">View Documentation</Link>
          </div>
          
          {/* Justification / Explanation */}
          <div className="bg-slate-800/50 rounded-lg p-3 mb-4 text-xs text-slate-300 leading-relaxed">
            <p className="mb-2">
              <span className="text-blue-400 font-semibold">X-axis (Power):</span> Power consumption reflects operational cost and enables comparison across device classes—from edge devices (~10W) to datacenter systems (~10kW).
            </p>
            <p className="mb-2">
              <span className="text-blue-400 font-semibold">Y-axis Options:</span> <span className="text-cyan-400">Bandwidth</span> shows memory throughput requirements for MoE inference at target SLO. 
              <span className="text-cyan-400"> TPOT</span> (Time Per Output Token) measures decode latency—bandwidth-bound since each decode step loads model weights plus the accumulated KV cache from all prior tokens. 
              <span className="text-cyan-400"> TTFT</span> (Time To First Token) measures prefill latency—compute-bound for short contexts, but memory-bound for long contexts due to KV cache writes.
            </p>
            <p className="mb-2">
              <span className="text-blue-400 font-semibold">Context Scenarios:</span> <span className="text-green-400">5K (4K+1K)</span> represents short-context tasks like GSM8K, where model weights dominate memory access. 
              <span className="text-green-400"> 14K (13K+1K)</span> represents long-context tasks like LongBench-V2, where KV cache becomes the dominant factor in memory bandwidth.
            </p>
            <p>
              <span className="text-blue-400 font-semibold">Batch Size:</span> <span className="text-yellow-400">1</span> for latency-critical single-user scenarios. 
              <span className="text-yellow-400"> 32</span> is entry-level batching that amortizes weight loading overhead. 
              <span className="text-yellow-400"> 64</span> balances throughput and memory for mid-range GPUs. 
              <span className="text-yellow-400"> 128</span> approaches the limit for high-end GPUs (H100)—beyond this, KV cache memory pressure becomes the bottleneck.
            </p>
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
                <option value="5k-ref">5K (4K+1K) - GSM8K</option>
                <option value="14k-ref">14K (13K+1K) - LongBench V2</option>
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
            
            {/* Y-Axis Type */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Y-Axis</label>
              <select 
                value={yAxisType}
                onChange={(e) => setYAxisType(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs focus:border-blue-500 outline-none"
              >
                <option value="bandwidth">Bandwidth (GB/s)</option>
                <option value="tpot">TPOT (ms)</option>
                <option value="ttft">TTFT (ms)</option>
              </select>
            </div>
            
            {/* Target SLO (decode) - only show when bandwidth is selected */}
            {yAxisType === 'bandwidth' && (
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
            )}
          </div>
          
          {/* Point Legend - own row, full width, horizontal so entries stay on one line */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 bg-slate-900 border border-slate-700 rounded px-3 py-2 mb-4">
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-3 h-3 rounded-full bg-blue-500 shrink-0"></div>
              <span className="text-xs text-slate-300 whitespace-nowrap">Peak Bandwidth (Memory) Estimate</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-3 h-3 rounded-full bg-orange-500 shrink-0"></div>
              <span className="text-xs text-slate-300 whitespace-nowrap">PCIe Bandwidth (Offloading) Estimate</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-3 h-3 rounded-full bg-green-500 shrink-0"></div>
              <span className="text-xs text-slate-300 whitespace-nowrap">Multi-GPU Systems (Peak) Estimate</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-3 h-3 rounded-full bg-lime-400 shrink-0"></div>
              <span className="text-xs text-slate-300 whitespace-nowrap">Multi-GPU Systems (PCIe) Estimate</span>
            </div>
            {(yAxisType === 'tpot' || yAxisType === 'ttft') && (
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-b-[10px] border-l-transparent border-r-transparent border-b-red-500 shrink-0"></div>
              <span className="text-xs text-slate-300 whitespace-nowrap">Measured (Real Benchmark)</span>
            </div>
            )}
          </div>
          
          {/* Line Legend - below controls (only show for bandwidth mode) */}
          {yAxisType === 'bandwidth' && (
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
              <span className="text-xs text-slate-300">All expert activated (Batch Size≈{closestBatchSize}): <span className="text-red-400 font-semibold">{chartData.fullyActivatedBw?.toFixed(0)} GB/s</span></span>
            </div>
          </div>
          )}
          

          
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
                dataKey={yAxisType === 'tpot' ? 'tpot' : (yAxisType === 'ttft' ? 'ttft' : 'bandwidth')}
                type="number"
                stroke="#94a3b8"
                scale="log"
                domain={yAxisType === 'tpot' || yAxisType === 'ttft'
                  ? [0.1, 10000]  // TPOT/TTFT range in ms (from 0.1ms to 10s)
                  : [10, Math.max(30000, chartData.fullyActivatedBw * 1.5)]}
                tick={{ fill: '#94a3b8', fontSize: 9 }}
                ticks={yAxisType === 'tpot' || yAxisType === 'ttft'
                  ? [0.1, 0.5, 1, 5, 10, 50, 100, 500, 1000, 5000]
                  : [10, 50, 100, 500, 1000, 5000, 10000, 30000]}
                tickFormatter={(value) => yAxisType === 'tpot' || yAxisType === 'ttft'
                  ? (value >= 1000 ? `${(value/1000).toFixed(0)}s` : `${value}ms`)
                  : (value >= 1000 ? `${(value/1000).toFixed(0)}k` : value)}
                label={{ value: yAxisType === 'tpot' ? 'TPOT (ms)' : (yAxisType === 'ttft' ? 'TTFT (ms)' : 'Bandwidth (GB/s)'), angle: -90, position: 'insideLeft', offset: -5, fill: '#94a3b8', fontSize: 11 }}
                allowDataOverflow={false}
                name={yAxisType === 'tpot' ? 'tpot' : (yAxisType === 'ttft' ? 'ttft' : 'bandwidth')}
              />
              <ZAxis range={[60, 60]} />
              <Tooltip 
                cursor={{ strokeDasharray: '3 3', stroke: '#64748b' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length > 0) {
                    const data = payload[0]?.payload;
                    if (data && data.name) {
                      // Real benchmark data has 'context' property, theoretical data does not
                      const isReal = data.context !== undefined;
                      const isPeak = data.type === 'peak';
                      const isDgx = data.name?.includes('DGX');
                      // DGX Peak: green (#22c55e), DGX PCIe: lime (#84cc16), Single Peak: blue, Single PCIe: orange, Real: use data.color
                      const color = isReal ? (data.color || '#ef4444') : (isDgx ? (isPeak ? '#22c55e' : '#84cc16') : (isPeak ? '#3b82f6' : '#f97316'));
                      const typeLabel = isReal ? 'Real Benchmark' : (isPeak ? 'Peak BW (Memory)' : 'PCIe BW');
                      return (
                        <div style={{ backgroundColor: '#1e293b', border: `2px solid ${color}`, padding: '10px 14px', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                          <div style={{ color: color, fontWeight: 600, marginBottom: '6px', fontSize: '14px' }}>
                            {data.name}
                          </div>
                          {!isReal && (
                          <div style={{ color: color, fontSize: '13px', fontWeight: 500 }}>
                            {typeLabel}: {data.bandwidth?.toLocaleString()} GB/s
                          </div>
                          )}
                          {isReal && data.gpu && (
                          <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '2px' }}>
                            GPU: {data.gpu} (TP={data.tp})
                          </div>
                          )}
                          {isReal && data.engine && (
                          <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '2px' }}>
                            Engine: {data.engine}
                          </div>
                          )}
                          {isReal && data.context && (
                          <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '2px' }}>
                            Context: {data.context}, BS={data.batchSize}
                          </div>
                          )}
                          {(yAxisType === 'tpot' && data.tpot !== undefined) && (
                          <div style={{ color: '#22d3ee', fontSize: '13px', fontWeight: 500, marginTop: '4px' }}>
                            TPOT: {data.tpot?.toFixed(1)} ms
                          </div>
                          )}
                          {(yAxisType === 'ttft' && data.ttft !== undefined) && (
                          <div style={{ color: '#22d3ee', fontSize: '13px', fontWeight: 500, marginTop: '4px' }}>
                            TTFT: {data.ttft?.toFixed(1)} ms
                          </div>
                          )}
                          {(yAxisType === 'ttft' && !isReal && data.gflops) && (
                          <div style={{ color: '#a78bfa', fontSize: '13px', fontWeight: 500, marginTop: '4px' }}>
                            Compute Speed: {(data.gflops / 1e3).toFixed(0)} TFLOPS
                          </div>
                          )}
                          <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '4px' }}>
                            Power: {data.power}W
                          </div>
                          {!isReal && data.category && (
                          <div style={{ color: '#64748b', fontSize: '11px', marginTop: '2px', textTransform: 'capitalize' }}>
                            {data.category?.replace(/-/g, ' ')}
                          </div>
                          )}
                        </div>
                      );
                    }
                  }
                  return null;
                }}
              />
              
              {/* Horizontal reference lines for model bandwidth requirements - only in bandwidth mode */}
              {yAxisType === 'bandwidth' && (
              <>
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
              </>
              )}

              {/* Real benchmark data points - triangles for actual measured data (rendered first so circles appear on top) */}
              {(yAxisType === 'tpot' || yAxisType === 'ttft') && (
              <Scatter 
                data={(yAxisType === 'tpot' ? REAL_BENCHMARK_DATA.tpot : REAL_BENCHMARK_DATA.ttft).filter(d => 
                  d.model === selectedModel &&
                  d.batchSize === batchSize && 
                  ((scenario === '5k-ref' && d.context === '4k-1k') || (scenario === '14k-ref' && d.context === '13k-1k'))
                )}
                name="Measured (Real Benchmark)"
                isAnimationActive={false}
                shape={(props) => {
                  const { cx, cy, payload } = props;
                  const color = payload.color || '#ef4444';
                  return (
                    <polygon 
                      points={`${cx},${cy-8} ${cx-7},${cy+6} ${cx+7},${cy+6}`}
                      fill={color}
                      stroke={color}
                      strokeWidth={1}
                    />
                  );
                }}
              />
              )}

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
                    // Hide most labels in TTFT mode, show only key devices
                    if (!device) return null;
                    const name = device.name;
                    
                    // In TTFT mode, only show label for RTX 4090
                    if (yAxisType === 'ttft') {
                      if (!name.includes('RTX 4090')) return null;
                    } else {
                      if (!device.showLabel) return null;
                    }
                    if (yAxisType === 'tpot' && (name.includes('4090') || name.includes('5090'))) return null;
                    
                    // Smart positioning based on device
                    let dy = -15;
                    let dx = 0;
                    if (name.includes('DGX-H100')) dy = -20;
                    if (name.includes('MI300X')) { dy = -5; dx = 45; }
                    if (name.includes('H100-SXM')) { dy = -5; dx = 20; }
                    if (name.includes('5090')) { dy = -7; dx = 30; }
                    if (name.includes('4090')) { dy = -15; dx = 30; }
                    if (name.includes('M4')) { dy = -15; dx = 0; }
                    if (name.includes('Orin AGX')) { dy = -15; dx = 0; }
                    if (name.includes('Jetson Nano')) { dy = -15; dx = 0; }
                    
                    return (
                      <>
                        {/* Connecting line from point center to label */}
                        <line
                          x1={x}
                          y1={y}
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
              {/* Only show in bandwidth/tpot mode, hide in TTFT mode */}
              {yAxisType !== 'ttft' && (
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
                    if (!device) return null;
                    const name = device.name;
                    
                    // In TTFT mode, only show labels for H100-SXM and RTX 4090
                    if (yAxisType === 'ttft') {
                      if (!name.includes('H100-SXM') && !name.includes('RTX 4090')) return null;
                    } else {
                      if (!device.showLabel) return null;
                    }
                    
                    // Smart positioning based on device
                    let dy = -15;
                    let dx = 0;
                    if (name.includes('DGX-H100')) dy = 25;
                    if (name.includes('H100-SXM')) { dy = 25; dx = 10; }
                    if (name.includes('5090')) { dy = -10; dx = 5; }
                    if (name.includes('4090')) { dy = 25; dx = 30; }
                    
                    return (
                      <>
                        {/* Connecting line from point center to label */}
                        <line
                          x1={x}
                          y1={y}
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
              )}

              {/* DGX systems - green circles for Peak Bandwidth (Multi-GPU) */}
              <Scatter 
                data={chartData.dgxPeakDevices}
                name="DGX Peak Bandwidth"
                fill="#22c55e"
                isAnimationActive={false}
              >
                <LabelList
                  content={(props) => {
                    const { x, y, index } = props;
                    const device = chartData.dgxPeakDevices[index];
                    // Hide labels in TTFT mode
                    if (!device || !device.showLabel || yAxisType === 'ttft') return null;
                    
                    let dy = -20;
                    let dx = 0;
                    const name = device.name;
                    if (name.includes('DGX-A100')) { dy = -15; dx = 0; }
                    
                    return (
                      <>
                        <line
                          x1={x}
                          y1={y}
                          x2={x + dx}
                          y2={y + dy}
                          stroke="#22c55e"
                          strokeWidth={1}
                          strokeOpacity={0.5}
                        />
                        <text
                          x={x + dx}
                          y={y + dy}
                          fill="#22c55e"
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

              {/* DGX systems - lime/light green circles for Offloading Bandwidth */}
              {/* Only show in bandwidth/tpot mode, hide in TTFT mode */}
              {yAxisType !== 'ttft' && (
              <Scatter 
                data={chartData.dgxOffloadDevices}
                name="DGX Offloading Bandwidth"
                fill="#84cc16"
                isAnimationActive={false}
              >
                <LabelList
                  content={(props) => {
                    const { x, y, index } = props;
                    const device = chartData.dgxOffloadDevices[index];
                    // Hide labels in TTFT mode
                    if (!device || !device.showLabel || yAxisType === 'ttft') return null;
                    
                    let dy = 25;
                    let dx = 0;
                    const name = device.name;
                    
                    return (
                      <>
                        <line
                          x1={x}
                          y1={y}
                          x2={x + dx}
                          y2={y + dy}
                          stroke="#84cc16"
                          strokeWidth={1}
                          strokeOpacity={0.5}
                        />
                        <text
                          x={x + dx}
                          y={y + dy}
                          fill="#84cc16"
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
              )}
              
            </ScatterChart>
          </ResponsiveContainer>
          </div>
        </Card>

        </main>
      </div>

        {/* Test Time Scaling Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-6" id="test-time-scaling">
          <header className="mb-6 sm:mb-8">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
              <h1 className="text-xl sm:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-sky-400">
                Test Time Scaling
              </h1>
              <button
                onClick={exportAllTTSData}
                className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 bg-emerald-700 hover:bg-emerald-600 border border-emerald-600 rounded-full text-xs sm:text-sm text-white transition-colors shrink-0"
                title="Download all test time scaling benchmark data as CSV"
              >
                <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Download CSV</span>
              </button>
              <Link
                to="/detail-results"
                className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 bg-purple-700 hover:bg-purple-600 border border-purple-600 rounded-full text-xs sm:text-sm text-white transition-colors shrink-0"
              >
                <span>Trade-off Plot</span>
              </Link>
            </div>
          </header>
          <TestTimeScalingSection />
        </div>

        {/* Agentic Workflow Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-6" id="agentic-workflow">
          <header className="mb-6 sm:mb-8">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
              <h1 className="text-xl sm:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-orange-400">
                Agentic Workflow
              </h1>
              <span className="px-2 py-0.5 bg-amber-900/50 border border-amber-700 rounded text-xs text-amber-400">
                Under Construction
              </span>
              <button
                onClick={() => document.getElementById('agentic-download-btn').click()}
                className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 bg-emerald-700 hover:bg-emerald-600 border border-emerald-600 rounded-full text-xs sm:text-sm text-white transition-colors shrink-0"
                title="Download all agentic workflow benchmark data as CSV"
              >
                <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Download CSV</span>
              </button>
              <Link
                to="/detail-results"
                className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 bg-purple-700 hover:bg-purple-600 border border-purple-600 rounded-full text-xs sm:text-sm text-white transition-colors shrink-0"
              >
                <span>Trade-off Plot</span>
              </Link>
            </div>
          </header>
          <AgenticWorkflowSection />
        </div>

    </div>
  );
}
