import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function Documentation() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Navigation Bar */}
      <nav className="bg-slate-900/80 border-b border-slate-800 sticky top-0 z-50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-400">
              TEAS
            </Link>
            <span className="text-xs text-slate-400 hidden sm:inline">Tracking Evolving AI and Systems</span>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <Link to="/" className="text-slate-300 hover:text-blue-400 transition-colors flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="bg-gradient-to-b from-slate-800 to-slate-900 py-16 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-8 pb-1 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400" style={{ lineHeight: '1.2' }}>
            Documentation
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Learn about the benchmarks, metrics, and visualizations used in TEAS.
          </p>
        </div>
      </div>

      {/* Documentation Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        
        {/* Mixture-of-Experts Section */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 sm:p-8 mb-8">
          <h2 className="text-2xl font-bold text-slate-100 mb-6 pl-3 border-l-4 border-blue-500">Mixture-of-Experts (MoE)</h2>
          
          {/* Hardware Map Subsection */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
              Hardware Map
            </h3>
            
            {/* Overview */}
            <div className="bg-slate-900/50 rounded-lg p-4 mb-6 border border-slate-700">
              <p className="text-slate-300 leading-relaxed">
                Dotted lines represent the required bandwidth at a given batch size, context configuration, and SLO constraint for the selected MoE model. 
                Dots represent hardware options; those above the line have sufficient bandwidth to meet the requirements.
              </p>
            </div>

            <div className="space-y-6 pl-4 border-l-2 border-slate-700">
              {/* Bandwidth Mode */}
              <div>
                <h4 className="font-medium text-blue-400 mb-2 text-lg">Bandwidth Mode</h4>
                <p className="leading-relaxed text-slate-400">
                  Visualizes memory bandwidth requirements vs. hardware capabilities. Dotted lines represent the required bandwidth 
                  for the selected model configuration (batch size, context length, and SLO constraint). Hardware points positioned 
                  above the line have sufficient bandwidth to meet the target latency.
                </p>
              </div>
              
              {/* TPOT Mode */}
              <div>
                <h4 className="font-medium text-cyan-400 mb-2 text-lg">TPOT Mode</h4>
                <p className="leading-relaxed text-slate-400 mb-4">
                  Displays the theoretical best Time Per Output Token (TPOT) achievable by each hardware platform.
                </p>
                <div className="bg-slate-900/50 rounded-lg p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="text-blue-400 text-xl">●</span>
                    <div>
                      <span className="text-slate-200 font-medium">Round dots (Theoretical):</span>
                      <span className="text-slate-400 ml-2">TPOT calculated from peak memory bandwidth — represents the theoretical best performance for single device, offloading, or multi-GPU configurations</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-red-500 text-xl">▲</span>
                    <div>
                      <span className="text-slate-200 font-medium">Red Triangle (SGLang):</span>
                      <span className="text-slate-400 ml-2">Measured TPOT/TTFT from SGLang v0.5.8 benchmarks</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-indigo-500 text-xl">▲</span>
                    <div>
                      <span className="text-slate-200 font-medium">Indigo Triangle (vLLM):</span>
                      <span className="text-slate-400 ml-2">Measured TPOT/TTFT from vLLM v0.11.0 benchmarks</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Point Types */}
              <div>
                <h4 className="font-medium text-slate-200 mb-3 text-lg">Point Types</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-blue-400 text-2xl">●</span>
                      <span className="text-blue-400 font-semibold">Blue (Single GPU - Peak Memory)</span>
                    </div>
                    <p className="text-slate-400 text-sm">
                      HBM/GDDR memory bandwidth — GPU memory capacity is sufficient for the model.
                    </p>
                  </div>
                  
                  <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-orange-400 text-2xl">●</span>
                      <span className="text-orange-400 font-semibold">Orange (Single GPU - PCIe/Offloading)</span>
                    </div>
                    <p className="text-slate-400 text-sm">
                      Memory capacity is insufficient — offloading required, PCIe becomes the bottleneck.
                    </p>
                  </div>
                  
                  <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-green-500 text-2xl">●</span>
                      <span className="text-green-500 font-semibold">Green (Multi-GPU - Peak Memory)</span>
                    </div>
                    <p className="text-slate-400 text-sm">
                      DGX systems (e.g., DGX-H100, DGX-A100) — aggregate HBM bandwidth from multiple GPUs.
                    </p>
                  </div>
                  
                  <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lime-400 text-2xl">●</span>
                      <span className="text-lime-400 font-semibold">Lime (Multi-GPU - NVLink/PCIe)</span>
                    </div>
                    <p className="text-slate-400 text-sm">
                      DGX systems with offloading — NVLink or PCIe bandwidth between GPUs becomes the bottleneck.
                    </p>
                  </div>
                </div>
              </div>

              {/* Purpose */}
              <div>
                <h4 className="font-medium text-slate-200 mb-3 text-lg">Purpose</h4>
                <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                  <p className="text-slate-400 leading-relaxed">
                    The hardware map serves two purposes: (1) indicate whether a given hardware's bandwidth is sufficient for the target SLO, and 
                    (2) show that meeting certain latency requirements may require scaling memory capacity rather than continuously increasing bandwidth per device.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Test Time Scaling Section */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 sm:p-8 mb-8">
          <h2 className="text-2xl font-bold text-slate-100 mb-6 pl-3 border-l-4 border-purple-500">Test Time Scaling</h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Test-time scaling improves solution quality by spending more compute at inference time.
            The main knobs trade off <span className="text-slate-200 font-medium">latency</span>,{" "}
            <span className="text-slate-200 font-medium">throughput</span>,{" "}
            <span className="text-slate-200 font-medium">cost</span>, and{" "}
            <span className="text-slate-200 font-medium">accuracy</span>.
          </p>

          <div className="space-y-6 pl-4 border-l-2 border-slate-700">
            <div>
              <h3 className="text-xl font-semibold text-slate-200 mb-2">Parallel scaling</h3>
              <p className="leading-relaxed text-slate-400">
                Run multiple independent samples/attempts in parallel (e.g., self-consistency / majority vote).
                Typically increases accuracy and robustness, but increases compute cost linearly with the number
                of samples and may require higher serving throughput to keep latency bounded.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-slate-200 mb-2">Sequential scaling</h3>
              <p className="leading-relaxed text-slate-400">
                Spend more steps per query (e.g., iterative refinement, tool-augmented loops, reflection, or
                verifier-guided retries). Can improve hard problems with fewer parallel samples, but increases
                end-to-end latency and may be sensitive to stop criteria and time budgets.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-slate-200 mb-2">Hybrid parallel + sequential scaling</h3>
              <p className="leading-relaxed text-slate-400 mb-4">
                Combine both: 1) When given a task, the model is initially asked to generate P responses in parallel. 
                2) Next, randomly select a subset of N responses generated in step 1. Ask the model to reflect on their quality, and generate a new response.
                3) Repeat step 2 P times to generate P new responses. 
                4) Repeat steps 2 and 3 for a total of S times. At each generation in a new stage, the N samples are drawn from the P responses from the previous stage.
                5) The final output is a single, final aggregated response at the end of the final stage.
                Often gives a better accuracy–cost frontier, but requires careful
                scheduling (when to stop, how to allocate budget across rounds, and how to handle early exits).
              </p>
              <p className="leading-relaxed text-slate-400">
                Note: For datapoints with Sequential S = 1, there is no value for N (number of samples), as this
                is equivalent to full parallel scaling with majority voting. There is no subsequent sampling and aggregation.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-slate-200 mb-2">Quantization</h3>
              <p className="leading-relaxed text-slate-400">
                Use lower-precision weights/activations (e.g., FP8/INT8) to reduce memory bandwidth and increase
                throughput. This can enable larger batch sizes or more parallel attempts under the same hardware
                budget, but may slightly reduce accuracy or change numerical behavior depending on the scheme and model.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-slate-200 mb-2">Inference Engine (KV-cache eviction policy)</h3>
              <p className="leading-relaxed text-slate-400">
                Different inference engines have different kv-cache eviction policies. When context is long or memory is constrained, inference engines may evict parts of the KV cache
                (e.g., sliding window, chunk-based eviction, or attention sinks). Eviction improves capacity and
                throughput, but can reduce quality if important tokens are dropped—especially for long-context
                reasoning and retrieval-heavy tasks.
              </p>
            </div>
          </div>
        </div>

        {/* Agentic Workflow Section */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-slate-100 mb-6 pl-3 border-l-4 border-amber-500">Agentic Workflow</h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Benchmarks for agent-based AI workflows that involve multi-step reasoning, tool calling, and code execution.
            These workloads test the ability of LLMs to solve complex tasks autonomously.
          </p>

          <div className="space-y-6 pl-4 border-l-2 border-slate-700">
            {/* Chart Description */}
            <div>
              <h3 className="text-xl font-semibold text-slate-200 mb-2">Accuracy vs Latency/Output Chart</h3>
              <p className="leading-relaxed text-slate-400 mb-4">
                The scatter plot visualizes the trade-off between accuracy and computational cost for agentic workflows.
                Each point represents a benchmark run with a specific configuration.
              </p>
              <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-slate-200 font-medium">X-Axis:</span>
                  <span className="text-slate-400">Accuracy (%) — percentage of questions answered correctly</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-200 font-medium">Y-Axis:</span>
                  <span className="text-slate-400">Mean Latency per Question (seconds) or Mean Output Tokens per Question</span>
                </div>
              </div>
            </div>

            {/* Tool Modes */}
            <div>
              <h3 className="text-xl font-semibold text-slate-200 mb-3">Tool Modes</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-green-500 text-2xl">●</span>
                    <span className="text-green-500 font-semibold">No Tool</span>
                  </div>
                  <p className="text-slate-400 text-sm">
                    Pure reasoning mode — the model solves problems using only its internal knowledge and reasoning capabilities, without access to external tools or code execution.
                  </p>
                </div>
                
                <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-blue-500 text-2xl">●</span>
                    <span className="text-blue-500 font-semibold">Tool Call</span>
                  </div>
                  <p className="text-slate-400 text-sm">
                    Agent mode with tool access — the model can call external tools (e.g., Python interpreter, calculators) to assist in solving problems. This typically increases latency but may improve accuracy on certain tasks.
                  </p>
                </div>
              </div>
            </div>

            {/* Datasets */}
            <div>
              <h3 className="text-xl font-semibold text-slate-200 mb-3">Datasets</h3>
              <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                <div className="flex items-start gap-3">
                  <span className="text-amber-400 font-semibold">IMO AnswerBench:</span>
                  <span className="text-slate-400">
                    International Mathematical Olympiad problems requiring advanced mathematical reasoning. 
                    Tests the model's ability to solve competition-level math problems with or without computational tools.
                  </span>
                </div>
              </div>
            </div>

            {/* Metrics */}
            <div>
              <h3 className="text-xl font-semibold text-slate-200 mb-3">Metrics</h3>
              <div className="space-y-3">
                <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                  <span className="text-slate-200 font-medium">Mean Latency per Question:</span>
                  <span className="text-slate-400 ml-2">Average end-to-end time (in seconds) to generate a complete response for each question, including all reasoning steps and tool calls.</span>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                  <span className="text-slate-200 font-medium">Mean Output Tokens per Question:</span>
                  <span className="text-slate-400 ml-2">Average number of tokens generated per question. Higher values indicate more verbose reasoning or multiple tool call iterations.</span>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                  <span className="text-slate-200 font-medium">Accuracy:</span>
                  <span className="text-slate-400 ml-2">Percentage of questions answered correctly. Determined by exact match or majority voting across parallel samples.</span>
                </div>
              </div>
            </div>

            {/* Benchmark Configuration */}
            <div>
              <h3 className="text-xl font-semibold text-slate-200 mb-3">Benchmark Configuration</h3>
              <p className="leading-relaxed text-slate-400 mb-4">
                Current benchmarks use parallel sampling with majority voting to improve robustness:
              </p>
              <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-slate-200 font-medium">Parallel Samples:</span>
                  <span className="text-slate-400">8 independent attempts per question</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-200 font-medium">Majority Threshold:</span>
                  <span className="text-slate-400">4 (answer must appear in at least 4 samples to be selected)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-200 font-medium">Temperature:</span>
                  <span className="text-slate-400">1.0 (for diverse sampling)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-200 font-medium">Max New Tokens:</span>
                  <span className="text-slate-400">16,384 tokens per response</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
