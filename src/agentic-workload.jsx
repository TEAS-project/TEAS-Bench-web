import { useState, useMemo } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ZAxis, LabelList
} from 'recharts';
import { Activity, Download } from 'lucide-react';
import { AGENTIC_BENCHMARK_DATA, getUniqueDatasets, getUniqueModels, getUniqueToolModes } from './data/agentic-benchmarks/index.js';

// Card component
const Card = ({ children, className = "" }) => (
  <div className={`bg-slate-800 border border-slate-700 rounded-lg p-3 sm:p-4 ${className}`}>
    {children}
  </div>
);

// CSV utilities
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

// Color mapping for datasets
const DATASET_COLORS = {
  'imo_answerbench_full_nt': '#22c55e',     // green
  'imo_answerbench_full_combi': '#3b82f6',  // blue
};

// Dataset display names
const DATASET_DISPLAY_NAMES = {
  'imo_answerbench_full_nt': 'IMO AnswerBench Number Theory',
  'imo_answerbench_full_combi': 'IMO AnswerBench Combinatorics',
};

// Hardware power constants
const GPU_POWER_H100 = 700; // Watts
const CPU_POWER = 14; // Watts
const TOTAL_POWER = GPU_POWER_H100 + CPU_POWER; // 714W
const CPU_INFO = '4 cores of Intel Xeon Platinum 8558';

// Custom tooltip for Trade-off plot
const TradeoffTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;
  const displayName = DATASET_DISPLAY_NAMES[data.dataset] || data.dataset;
  return (
    <div className="bg-slate-900 border border-slate-600 rounded-lg p-3 text-sm">
      <div className="font-bold text-white mb-2">{data.modelShort}</div>
      <div className="text-slate-300">Dataset: {displayName}</div>
      <div className="text-slate-300">Tool Mode: {data.toolMode}</div>
      <div className="text-slate-300">Run: {data.date}/{data.run}</div>
      <div className="text-slate-300 mt-1">Accuracy: {data.accuracy.toFixed(2)}%</div>
      <div className="text-slate-300">Mean Latency: {data.meanTime.toFixed(2)}s</div>
      <div className="text-slate-300">Mean Prefill Tokens / Request: {data.meanTotalPrefill.toFixed(0)}</div>
      <div className="text-slate-300">Mean Decode Tokens / Request: {data.meanTotalDecode.toFixed(0)}</div>
      <div className="text-slate-300">Questions: {data.correctQuestions}/{data.totalQuestions}</div>
    </div>
  );
};

// Custom tooltip for Hardware Map
const HardwareMapTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;
  const displayName = DATASET_DISPLAY_NAMES[data.dataset] || data.dataset;
  // Format date: 20260126 -> 2026-01-26
  const dateStr = data.date ? `${data.date.slice(0,4)}-${data.date.slice(4,6)}-${data.date.slice(6,8)}` : 'N/A';
  return (
    <div className="bg-slate-900 border border-slate-600 rounded-lg p-3 text-sm">
      <div className="font-bold text-white mb-2">{displayName}</div>
      <div className="text-slate-300">Model: {data.modelShort}</div>
      <div className="text-slate-300">Tool Mode: {data.toolMode}</div>
      <div className="text-slate-300">Date: {dateStr}</div>
      <div className="text-slate-300 mt-2 pt-2 border-t border-slate-700">GPU: {data.gpu}</div>
      <div className="text-slate-300">GPU Power: {GPU_POWER_H100}W</div>
      <div className="text-slate-300">CPU: {CPU_INFO}</div>
      <div className="text-slate-300">CPU Power: {CPU_POWER}W</div>
      <div className="text-slate-300">Total Power: {TOTAL_POWER}W</div>
      <div className="text-slate-300 mt-2 pt-2 border-t border-slate-700">Accuracy: {data.accuracy.toFixed(2)}%</div>
      <div className="text-slate-300">Time to Answer: {data.meanTime.toFixed(2)}s</div>
    </div>
  );
};

// =====================
// Hardware Map Section (for main page)
// =====================
export function AgenticHardwareMapSection() {
  // Filter states
  const [selectedDataset, setSelectedDataset] = useState('all');
  const [selectedModel, setSelectedModel] = useState('all');
  const [selectedToolMode, setSelectedToolMode] = useState('all');

  const datasets = useMemo(() => getUniqueDatasets(), []);
  const models = useMemo(() => getUniqueModels(), []);
  const toolModes = useMemo(() => getUniqueToolModes(), []);

  // Filter and get best accuracy run for each dataset (only complete runs with 100 questions)
  const filteredData = useMemo(() => {
    return AGENTIC_BENCHMARK_DATA.filter(d => {
      if (d.totalQuestions !== 100) return false;
      if (selectedDataset !== 'all' && d.dataset !== selectedDataset) return false;
      if (selectedModel !== 'all' && d.modelShort !== selectedModel) return false;
      if (selectedToolMode !== 'all' && d.toolMode !== selectedToolMode) return false;
      return true;
    }).map(d => ({
      ...d,
      x: TOTAL_POWER, // Power (W)
      y: d.meanTime, // Time to Answer (s)
      color: DATASET_COLORS[d.dataset] || '#888',
    }));
  }, [selectedDataset, selectedModel, selectedToolMode]);

  // Group by dataset for legend
  const dataByDataset = useMemo(() => {
    const grouped = {};
    filteredData.forEach(d => {
      if (!grouped[d.dataset]) grouped[d.dataset] = [];
      grouped[d.dataset].push(d);
    });
    return grouped;
  }, [filteredData]);

  // Export function
  const exportAgenticData = () => {
    const exportData = AGENTIC_BENCHMARK_DATA.map(d => ({
      date: d.date,
      run: d.run,
      dataset: d.dataset,
      model: d.model,
      tool_mode: d.toolMode,
      gpu: d.gpu,
      gpu_power_w: GPU_POWER_H100,
      cpu_power_w: CPU_POWER,
      total_power_w: TOTAL_POWER,
      total_questions: d.totalQuestions,
      correct_questions: d.correctQuestions,
      accuracy_percent: d.accuracy,
      mean_time_to_answer_s: d.meanTime,
      mean_total_prefill: d.meanTotalPrefill,
      mean_total_decode: d.meanTotalDecode,
    }));
    const dateStr = new Date().toISOString().split('T')[0];
    downloadCSV(exportData, `agentic_workflow_benchmark_${dateStr}.csv`);
  };

  return (
    <div className="space-y-4">
      {/* Hidden button for external trigger */}
      <button 
        id="agentic-download-btn" 
        onClick={exportAgenticData} 
        style={{ display: 'none' }} 
      />

      <Card>
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold pl-2 border-l-4 border-amber-500">
            Hardware Map
          </h3>
        </div>
        
        {/* Justification / Explanation */}
        <div className="bg-slate-800/50 rounded-lg p-3 mb-4 text-xs text-slate-300 leading-relaxed">
          <p className="mb-2">
            <span className="text-blue-400 font-semibold">Motivation:</span> Agentic workflows benefit from strong CPUs—tool calls increase accuracy, and faster CPUs reduce tool execution latency. 
            Better agentic workflow performance (accuracy + system efficiency) depends on faster heterogeneous hardware—here CPU + GPU working together. 
            Therefore, we consider total system power (GPU + CPU), as CPU power is non-negligible in agentic scenarios.
          </p>
          <p className="mb-2">
            <span className="text-blue-400 font-semibold">Tool Call vs No Tool:</span> We benchmark both modes to quantify the accuracy-latency trade-off. 
            Tool calls (e.g., Python execution) can significantly improve answer accuracy on complex reasoning tasks, but introduce additional latency. 
            Comparing both modes reveals when tool-augmented inference is worth the overhead.
          </p>
          <p className="mb-2">
            <span className="text-blue-400 font-semibold">X-axis (Power):</span> Total system power = GPU + CPU.
          </p>
          <p>
            <span className="text-blue-400 font-semibold">Y-axis (Time to Answer):</span> End-to-end latency per question, including model inference and tool execution time. 
            Unlike streaming LLM inference where users see incremental output, agentic workflows often take minutes to complete—users care about the final answer, not intermediate reasoning steps, making end-to-end latency the key metric.
          </p>
        </div>
        
        {/* Controls Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          {/* Model */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Model</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs focus:border-blue-500 outline-none"
            >
              <option value="all">All Models</option>
              {models.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Tool Mode */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Tool Mode</label>
            <select
              value={selectedToolMode}
              onChange={(e) => setSelectedToolMode(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs focus:border-blue-500 outline-none"
            >
              <option value="all">All Modes</option>
              {toolModes.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Dataset */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Dataset</label>
            <select
              value={selectedDataset}
              onChange={(e) => setSelectedDataset(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs focus:border-blue-500 outline-none"
            >
              <option value="all">All Datasets</option>
              {datasets.map(d => (
                <option key={d} value={d}>{DATASET_DISPLAY_NAMES[d] || d}</option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Chart */}
        <div className="h-[400px] sm:h-[500px]">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 30, bottom: 60, left: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis 
                type="number" 
                dataKey="x" 
                name="Power"
                domain={[0, 1000]}
                tickFormatter={(v) => `${v}W`}
                stroke="#94a3b8"
                label={{ 
                  value: 'Power (W)', 
                  position: 'bottom', 
                  offset: 40,
                  fill: '#94a3b8' 
                }}
              />
              <YAxis 
                type="number" 
                dataKey="y" 
                name="Time to Answer"
                stroke="#94a3b8"
                tickFormatter={(v) => `${v.toFixed(0)}s`}
                label={{ 
                  value: 'Time to Answer (s)', 
                  angle: -90, 
                  position: 'insideLeft',
                  offset: -45,
                  fill: '#94a3b8',
                  style: { textAnchor: 'middle' }
                }}
              />
              <ZAxis range={[200, 200]} />
              <Tooltip content={<HardwareMapTooltip />} />
              <Legend 
                verticalAlign="top"
                wrapperStyle={{ paddingBottom: '10px' }}
              />
              
              {Object.entries(dataByDataset).map(([dataset, data], datasetIndex) => (
                <Scatter
                  key={dataset}
                  name={DATASET_DISPLAY_NAMES[dataset] || dataset}
                  data={data}
                  fill={DATASET_COLORS[dataset] || '#888'}
                  shape="circle"
                >
                  <LabelList
                    content={(props) => {
                      const { x, y, index } = props;
                      // Only show label on first point of first dataset
                      if (datasetIndex !== 0 || index !== 0) return null;
                      return (
                        <text
                          x={x + 15}
                          y={y}
                          fill={DATASET_COLORS[dataset] || '#888'}
                          fontSize={9}
                          fontWeight={500}
                        >
                          H100 + {CPU_INFO}
                        </text>
                      );
                    }}
                  />
                </Scatter>
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

// =====================
// Trade-off Section (for Trade-off Plots page)
// =====================
export function AgenticTradeoffSection() {
  // Filter states
  const [selectedDataset, setSelectedDataset] = useState('all');
  const [selectedModel, setSelectedModel] = useState('all');
  const [selectedToolMode, setSelectedToolMode] = useState('all');
  const [yAxisMetric, setYAxisMetric] = useState('latency'); // 'latency', 'input', or 'output'

  const datasets = useMemo(() => getUniqueDatasets(), []);
  const models = useMemo(() => getUniqueModels(), []);
  const toolModes = useMemo(() => getUniqueToolModes(), []);

  // Filter data
  const filteredData = useMemo(() => {
    return AGENTIC_BENCHMARK_DATA.filter(d => {
      if (d.totalQuestions !== 100) return false; // Only show complete runs
      if (selectedDataset !== 'all' && d.dataset !== selectedDataset) return false;
      if (selectedModel !== 'all' && d.modelShort !== selectedModel) return false;
      if (selectedToolMode !== 'all' && d.toolMode !== selectedToolMode) return false;
      return true;
    }).map(d => {
      let yValue;
      if (yAxisMetric === 'latency') {
        yValue = d.meanTime;
      } else if (yAxisMetric === 'input') {
        yValue = d.meanTotalPrefill;
      } else {
        yValue = d.meanTotalDecode;
      }
      return {
        ...d,
        x: d.accuracy,
        y: yValue,
        color: DATASET_COLORS[d.dataset] || '#888',
      };
    });
  }, [selectedDataset, selectedModel, selectedToolMode, yAxisMetric]);

  // Group by dataset for legend
  const dataByDataset = useMemo(() => {
    const grouped = {};
    filteredData.forEach(d => {
      if (!grouped[d.dataset]) grouped[d.dataset] = [];
      grouped[d.dataset].push(d);
    });
    return grouped;
  }, [filteredData]);

  // Export function
  const exportAgenticData = () => {
    const exportData = AGENTIC_BENCHMARK_DATA.map(d => ({
      date: d.date,
      run: d.run,
      dataset: d.dataset,
      model: d.model,
      tool_mode: d.toolMode,
      gpu: d.gpu,
      total_questions: d.totalQuestions,
      correct_questions: d.correctQuestions,
      accuracy_percent: d.accuracy,
      mean_latency_s: d.meanTime,
      mean_total_prefill: d.meanTotalPrefill,
      mean_total_decode: d.meanTotalDecode,
    }));
    const dateStr = new Date().toISOString().split('T')[0];
    downloadCSV(exportData, `agentic_workflow_benchmark_${dateStr}.csv`);
  };

  const yAxisLabel = yAxisMetric === 'latency' 
    ? 'Mean Latency per Question (s)' 
    : yAxisMetric === 'input'
    ? 'Mean Prefill Tokens / Request'
    : 'Mean Decode Tokens / Request';

  return (
    <Card className="mb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
        <div>
          <h3 className="text-lg font-semibold mb-2 pl-2 border-l-4 border-amber-500">
            Accuracy–Latency Trade-off
          </h3>
          <p className="text-xs text-slate-400 pl-2">
            Each datapoint represents a benchmark run with specific configuration.
          </p>
        </div>
        <button
          onClick={exportAgenticData}
          className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-700 hover:bg-emerald-600 border border-emerald-600 rounded-full text-xs text-white transition-colors shrink-0"
        >
          <Download className="w-3 h-3" />
          <span>Download CSV</span>
        </button>
      </div>
      
      {/* Controls */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {/* Dataset */}
        <div>
          <label className="block text-xs text-slate-400 mb-1">Dataset</label>
          <select
            value={selectedDataset}
            onChange={(e) => setSelectedDataset(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-white"
          >
            <option value="all">All Datasets</option>
            {datasets.map(d => (
              <option key={d} value={d}>{DATASET_DISPLAY_NAMES[d] || d}</option>
            ))}
          </select>
        </div>

        {/* Model */}
        <div>
          <label className="block text-xs text-slate-400 mb-1">Model</label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-white"
          >
            <option value="all">All Models</option>
            {models.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        {/* Tool Mode */}
        <div>
          <label className="block text-xs text-slate-400 mb-1">Tool Mode</label>
          <select
            value={selectedToolMode}
            onChange={(e) => setSelectedToolMode(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-white"
          >
            <option value="all">All Modes</option>
            {toolModes.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Y-Axis Metric */}
        <div>
          <label className="block text-xs text-slate-400 mb-1">Y-Axis Metric</label>
          <select
            value={yAxisMetric}
            onChange={(e) => setYAxisMetric(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-white"
          >
            <option value="latency">Mean Latency (s)</option>
            <option value="input">Mean Prefill Tokens / Request</option>
            <option value="output">Mean Decode Tokens / Request</option>
          </select>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[400px] sm:h-[500px]">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 30, bottom: 60, left: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis 
              type="number" 
              dataKey="x" 
              name="Accuracy"
              domain={[60, 100]}
              tickFormatter={(v) => `${v}%`}
              stroke="#94a3b8"
              label={{ 
                value: 'Accuracy (%)', 
                position: 'bottom', 
                offset: 40,
                fill: '#94a3b8' 
              }}
            />
            <YAxis 
              type="number" 
              dataKey="y" 
              name={yAxisLabel}
              stroke="#94a3b8"
              label={{ 
                value: yAxisLabel, 
                angle: -90, 
                position: 'insideLeft',
                offset: -45,
                fill: '#94a3b8',
                style: { textAnchor: 'middle' }
              }}
            />
            <ZAxis range={[100, 100]} />
            <Tooltip content={<TradeoffTooltip />} />
            <Legend 
              verticalAlign="top"
              wrapperStyle={{ paddingBottom: '10px' }}
            />
            
            {Object.entries(dataByDataset).map(([dataset, data]) => (
              <Scatter
                key={dataset}
                name={DATASET_DISPLAY_NAMES[dataset] || dataset}
                data={data}
                fill={DATASET_COLORS[dataset] || '#888'}
                shape="circle"
              />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Stats */}
      <div className="mt-4">
        <h4 className="text-sm font-semibold text-slate-300 mb-3">Summary Statistics</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {Object.entries(dataByDataset).map(([dataset, data]) => {
            const avgAccuracy = data.reduce((s, d) => s + d.accuracy, 0) / data.length;
            const avgLatency = data.reduce((s, d) => s + d.meanTime, 0) / data.length;
            const modelList = [...new Set(data.map(d => d.modelShort))].join(', ');
            const toolModeList = [...new Set(data.map(d => d.toolMode))].join(', ');
            const displayName = DATASET_DISPLAY_NAMES[dataset] || dataset;
            return (
              <div key={dataset} className="bg-slate-700/50 rounded p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: DATASET_COLORS[dataset] }}
                  />
                  <span className="font-medium text-white text-xs">{displayName}</span>
                </div>
                <div className="text-slate-400 text-xs">
                  <div>Model: {modelList}</div>
                  <div>Tool Mode: {toolModeList || 'N/A'}</div>
                  <div>Runs: {data.length}</div>
                  <div>Avg Accuracy: {avgAccuracy.toFixed(1)}%</div>
                  <div>Avg Latency: {avgLatency.toFixed(1)}s</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

// Legacy export for backward compatibility - now uses Hardware Map
export function AgenticWorkflowSection() {
  return <AgenticHardwareMapSection />;
}

export default AgenticWorkflowSection;
