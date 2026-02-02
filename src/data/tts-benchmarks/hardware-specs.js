// Hardware specifications from the MoE-CAP benchmark spreadsheet
// Peak Bandwidth (GB/s), Peak GFLOPS, Peak Power (W)

export const HARDWARE_SPECS = [
  // Data Center Cards
  { name: "A100-80G-SXM4", category: "Data Center Cards", peakBandwidth: 2037, pciBandwidth: 64, memory: 80, peakGFLOPS: 3.12e5, peakPower: 400 },
  { name: "A100-80G-PCIe", category: "Data Center Cards", peakBandwidth: 1935, pciBandwidth: 64, memory: 80, peakGFLOPS: 3.12e5, peakPower: 300 },
  { name: "A6000", category: "Data Center Cards", peakBandwidth: 768, pciBandwidth: 64, memory: 48, peakGFLOPS: 1.55e5, peakPower: 300 },
  { name: "A5000", category: "Data Center Cards", peakBandwidth: 768, pciBandwidth: 64, memory: 24, peakGFLOPS: 1.11e5, peakPower: 230 },
  { name: "H100-SXM", category: "Data Center Cards", peakBandwidth: 3350, pciBandwidth: 128, memory: 80, peakGFLOPS: 9.90e5, peakPower: 700 },
  { name: "H100-PCIe", category: "Data Center Cards", peakBandwidth: 2000, pciBandwidth: 128, memory: 80, peakGFLOPS: 7.57e5, peakPower: 350 },
  { name: "AMD MI300X", category: "Data Center Cards", peakBandwidth: 5300, pciBandwidth: 128, memory: 192, peakGFLOPS: null, peakPower: 750 },
  { name: "AWS Trainium 2", category: "Data Center Cards", peakBandwidth: 2900, pciBandwidth: 128, memory: 96, peakGFLOPS: null, peakPower: 1200 },
  { name: "CS-2", category: "Data Center Cards", peakBandwidth: 20000000, pciBandwidth: 12.5, memory: 40, peakGFLOPS: null, peakPower: 23000 },
  { name: "CS-3", category: "Data Center Cards", peakBandwidth: 21000000, pciBandwidth: 12.5, memory: 44, peakGFLOPS: null, peakPower: 23000 },

  // Personal GPUs
  { name: "5090", category: "Personal", peakBandwidth: 1790, pciBandwidth: 128, memory: 32, peakGFLOPS: 1.68e6, peakPower: 575 },
  { name: "5080", category: "Personal", peakBandwidth: 960, pciBandwidth: 128, memory: 16, peakGFLOPS: 9.00e5, peakPower: 360 },
  { name: "4090", category: "Personal", peakBandwidth: 1010, pciBandwidth: 64, memory: 24, peakGFLOPS: 6.60e5, peakPower: 450 },
  { name: "4080", category: "Personal", peakBandwidth: 716.8, pciBandwidth: 64, memory: 16, peakGFLOPS: null, peakPower: 320 },
  { name: "3090Ti", category: "Personal", peakBandwidth: 1010, pciBandwidth: 64, memory: 24, peakGFLOPS: null, peakPower: 450 },
  { name: "3080Ti", category: "Personal", peakBandwidth: 912.4, pciBandwidth: 64, memory: 12, peakGFLOPS: null, peakPower: 350 },

  // Autonomous
  { name: "Orin NX", category: "Autonomous", peakBandwidth: 102.4, pciBandwidth: 16, memory: 16, peakGFLOPS: null, peakPower: 25 },
  { name: "Jetson Nano", category: "Autonomous", peakBandwidth: 25.6, pciBandwidth: 4, memory: 4, peakGFLOPS: null, peakPower: 10 },
  { name: "Xavier AGX", category: "Autonomous", peakBandwidth: 136.5, pciBandwidth: 16, memory: 32, peakGFLOPS: null, peakPower: 30 },
  { name: "Orin AGX", category: "Autonomous", peakBandwidth: 204.8, pciBandwidth: 16, memory: 64, peakGFLOPS: null, peakPower: 60 },

  // SoC (Apple Silicon)
  { name: "Apple M4 Max", category: "SoC", peakBandwidth: 546, pciBandwidth: null, memory: 128, peakGFLOPS: null, peakPower: 90 },
  { name: "Apple M3 Max", category: "SoC", peakBandwidth: 400, pciBandwidth: null, memory: 128, peakGFLOPS: null, peakPower: 56 },
  { name: "Apple M2 Max", category: "SoC", peakBandwidth: 400, pciBandwidth: null, memory: 96, peakGFLOPS: null, peakPower: 36 },
  { name: "Apple M1 Max", category: "SoC", peakBandwidth: 400, pciBandwidth: null, memory: 64, peakGFLOPS: null, peakPower: 30 },

  // Data Center Systems
  { name: "DGX-H100", category: "Data Center Systems", peakBandwidth: 26800, pciBandwidth: 1280, memory: 640, peakGFLOPS: 7.92e6, peakPower: 10200 },
  { name: "DGX-A100", category: "Data Center Systems", peakBandwidth: 16296, pciBandwidth: 512, memory: 640, peakGFLOPS: 2.50e6, peakPower: 6500 },
];

// MoE Model specifications
// Per-token compute (GFLOPs) = 2 * activated_params (in billions)
// Per-token KV size calculated from HuggingFace configs
export const MOE_MODELS = [
  {
    name: "DeepSeek-R1",
    activatedParams: "37B",
    perTokenCompute: 74, // GFLOPs (2 * 37B = 74 GFLOPs)
    // DeepSeek uses MLA: n_layers * (kv_lora_rank + qk_rope_head_dim)
    // 61 layers, kv_lora_rank=512, qk_rope_head_dim=64
    // 61 * (512 + 64) = 35,136 elements * 2 bytes (bf16) = 70,272 bytes
    perTokenKVSize: 70272, // bytes (bf16)
    color: "#ef4444", // red
  },
  {
    name: "Mixtral-8x22B",
    activatedParams: "22B",
    perTokenCompute: 44, // GFLOPs
    // Standard KV cache: 2 * n_layers * d_head * n_kv_heads
    // 56 layers, head_dim=128, n_kv_heads=8
    // 2 * 56 * 128 * 8 = 114,688 elements * 2 bytes = 229,376 bytes
    perTokenKVSize: 229376, // bytes (bf16)
    color: "#f97316", // orange
  },
  {
    name: "Mixtral-8x7B",
    activatedParams: "7B",
    perTokenCompute: 14, // GFLOPs
    // 32 layers, head_dim=128, n_kv_heads=8
    // 2 * 32 * 128 * 8 = 65,536 elements * 2 bytes = 131,072 bytes
    perTokenKVSize: 131072, // bytes (bf16)
    color: "#eab308", // yellow
  },
  {
    name: "Qwen1.5-MoE-A2.7B",
    activatedParams: "2.7B",
    perTokenCompute: 5.4, // GFLOPs
    // 24 layers, head_dim=128, n_kv_heads=16
    // 2 * 24 * 128 * 16 = 98,304 elements * 2 bytes = 196,608 bytes
    perTokenKVSize: 196608, // bytes (bf16)
    color: "#22c55e", // green
  },
  {
    name: "DeepSeek-V2-Lite",
    activatedParams: "2.4B",
    perTokenCompute: 4.8, // GFLOPs
    // DeepSeek uses MLA: n_layers * (kv_lora_rank + qk_rope_head_dim)
    // 27 layers, kv_lora_rank=512, qk_rope_head_dim=64
    // 27 * (512 + 64) = 15,552 elements * 2 bytes = 31,104 bytes
    perTokenKVSize: 31104, // bytes (bf16)
    color: "#3b82f6", // blue
  },
];

/**
 * Calculate theoretical minimum TTFT (Time To First Token)
 * 
 * TTFT is bottlenecked by the maximum of:
 * 1. Compute time: Total compute / Peak GFLOPS
 * 2. Memory bandwidth time: Total KV data / Peak Bandwidth
 * 
 * @param {Object} hardware - Hardware spec object
 * @param {Object} model - Model spec object
 * @param {number} inputLength - Number of input tokens
 * @param {number} batchSize - Batch size (default 1)
 * @returns {Object} - TTFT breakdown
 */
export function calculateTTFT(hardware, model, inputLength, batchSize = 1) {
  // Total compute = Batch Size * Input Length * Per Token Compute (in GFLOPs)
  const totalComputeGFLOPs = batchSize * inputLength * model.perTokenCompute;
  
  // Total KV data = Batch Size * Input Length * Per Token KV Size (in bytes)
  const totalKVDataBytes = batchSize * inputLength * model.perTokenKVSize;
  const totalKVDataGB = totalKVDataBytes / (1024 * 1024 * 1024); // Convert to GB
  
  // Compute time (seconds)
  // Peak GFLOPS = GFLOP/s, so time = GFLOP / (GFLOP/s) = seconds
  const computeTime = hardware.peakGFLOPS 
    ? (totalComputeGFLOPs * 1e9) / (hardware.peakGFLOPS * 1e9) // GFLOPs / (GFLOP/s)
    : Infinity;
  
  // Memory bandwidth time (seconds)
  // Peak Bandwidth in GB/s, so time = GB / (GB/s) = seconds
  const memoryTime = totalKVDataGB / hardware.peakBandwidth;
  
  // TTFT is the maximum (bottleneck)
  const ttft = Math.max(computeTime, memoryTime);
  
  return {
    totalComputeGFLOPs,
    totalKVDataGB,
    computeTime,
    memoryTime,
    ttft,
    bottleneck: computeTime > memoryTime ? "compute" : "memory",
  };
}

/**
 * Generate TTFT data for all hardware-model combinations at a given input length
 */
export function generateTTFTData(inputLength, batchSize = 1) {
  const results = [];
  
  for (const hardware of HARDWARE_SPECS) {
    // Skip hardware without GFLOPS info for compute-bound calculations
    if (!hardware.peakGFLOPS) continue;
    
    for (const model of MOE_MODELS) {
      const ttftInfo = calculateTTFT(hardware, model, inputLength, batchSize);
      results.push({
        hardware: hardware.name,
        hardwareCategory: hardware.category,
        model: model.name,
        modelColor: model.color,
        inputLength,
        batchSize,
        ...ttftInfo,
      });
    }
  }
  
  return results;
}

/**
 * Generate TTFT curve data across different input lengths for a specific hardware
 */
export function generateTTFTCurve(hardware, inputLengths, batchSize = 1) {
  const curves = {};
  
  for (const model of MOE_MODELS) {
    curves[model.name] = inputLengths.map((inputLength) => {
      const ttftInfo = calculateTTFT(hardware, model, inputLength, batchSize);
      return {
        inputLength,
        ttft: ttftInfo.ttft,
        ttftMs: ttftInfo.ttft * 1000, // Convert to milliseconds
        computeTime: ttftInfo.computeTime,
        memoryTime: ttftInfo.memoryTime,
        bottleneck: ttftInfo.bottleneck,
      };
    });
  }
  
  return curves;
}
