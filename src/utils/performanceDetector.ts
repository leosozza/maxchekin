export type PerformanceMode = 'enhanced' | 'lite';

interface PerformanceMetrics {
  hasWebGL: boolean;
  cpuCores: number;
  deviceMemory: number;
  pixelRatio: number;
}

function getPerformanceMetrics(): PerformanceMetrics {
  // Test WebGL support
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  const hasWebGL = !!gl;

  // Get CPU cores
  const cpuCores = navigator.hardwareConcurrency || 2;

  // Get device memory (GB) - may not be available in all browsers
  const deviceMemory = (navigator as any).deviceMemory || 4;

  // Get pixel ratio
  const pixelRatio = window.devicePixelRatio || 1;

  return { hasWebGL, cpuCores, deviceMemory, pixelRatio };
}

export function detectPerformanceMode(): PerformanceMode {
  const metrics = getPerformanceMetrics();

  // Enhanced mode requires (critérios mais flexíveis):
  // - WebGL support
  // - 2+ CPU cores (reduzido de 4)
  // - 2GB+ RAM (reduzido de 4)
  // - Pixel ratio até 3 (aumentado de 2 para suportar telas Retina/AMOLED)
  const isEnhanced =
    metrics.hasWebGL &&
    metrics.cpuCores >= 2 &&
    metrics.deviceMemory >= 2 &&
    metrics.pixelRatio <= 3;

  console.log('🎨 Performance Detection:', {
    mode: isEnhanced ? 'enhanced' : 'lite',
    webgl: metrics.hasWebGL,
    cores: metrics.cpuCores,
    memory: metrics.deviceMemory + 'GB',
    pixelRatio: metrics.pixelRatio
  });

  return isEnhanced ? 'enhanced' : 'lite';
}

export function getPerformanceConfig(mode: PerformanceMode) {
  if (mode === 'enhanced') {
    return {
      blurLayers: 3,
      particleCount: 50,
      transitionDuration: 1200,
      enableAdvancedEffects: true,
      targetFPS: 60,
    };
  }

  return {
    blurLayers: 1,
    particleCount: 20,
    transitionDuration: 800,
    enableAdvancedEffects: false,
    targetFPS: 30,
  };
}
