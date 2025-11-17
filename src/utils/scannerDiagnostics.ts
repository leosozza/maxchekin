/**
 * Scanner Diagnostics Utility
 * 
 * This module provides diagnostic functions to help identify and debug
 * QR code scanner issues in the MaxCheckin application.
 */

interface DiagnosticResult {
  success: boolean;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Check if the browser supports all required features for QR scanning
 */
export async function checkBrowserCompatibility(): Promise<DiagnosticResult> {
  const results: Record<string, boolean> = {};
  
  // Check getUserMedia support
  results.getUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  
  // Check camera permission API
  results.permissionsAPI = 'permissions' in navigator;
  
  // Check if running in secure context (HTTPS or localhost)
  results.secureContext = window.isSecureContext;
  
  // Check BarcodeDetector API availability (experimental feature)
  results.barcodeDetectorAPI = 'BarcodeDetector' in window;
  
  const allSupported = Object.values(results).every(v => v);
  
  return {
    success: allSupported,
    message: allSupported 
      ? 'Navegador suporta todas as funcionalidades necessárias'
      : 'Navegador não suporta algumas funcionalidades',
    details: {
      ...results,
      userAgent: navigator.userAgent,
      platform: navigator.platform,
    }
  };
}

/**
 * Check camera availability and permissions
 */
export async function checkCameraAccess(): Promise<DiagnosticResult> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter(device => device.kind === 'videoinput');
    
    if (cameras.length === 0) {
      return {
        success: false,
        message: 'Nenhuma câmera encontrada no dispositivo',
        details: { deviceCount: devices.length }
      };
    }
    
    // Try to get camera permission
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      // Stop the stream immediately after checking
      stream.getTracks().forEach(track => track.stop());
      
      return {
        success: true,
        message: `${cameras.length} câmera(s) encontrada(s) e acessível(is)`,
        details: {
          cameraCount: cameras.length,
          cameras: cameras.map(cam => ({
            deviceId: cam.deviceId,
            label: cam.label || 'Sem nome',
          }))
        }
      };
    } catch (permError) {
      return {
        success: false,
        message: 'Permissão de câmera negada ou câmera em uso',
        details: {
          cameraCount: cameras.length,
          error: permError instanceof Error ? permError.message : String(permError)
        }
      };
    }
  } catch (error) {
    return {
      success: false,
      message: 'Erro ao verificar câmeras',
      details: {
        error: error instanceof Error ? error.message : String(error)
      }
    };
  }
}

/**
 * Check if the #qr-reader element is present and properly configured
 */
export function checkScannerElement(): DiagnosticResult {
  const element = document.getElementById('qr-reader');
  
  if (!element) {
    return {
      success: false,
      message: 'Elemento #qr-reader não encontrado no DOM'
    };
  }
  
  const rect = element.getBoundingClientRect();
  const isVisible = rect.width > 0 && rect.height > 0;
  
  return {
    success: isVisible,
    message: isVisible 
      ? 'Elemento #qr-reader presente e visível'
      : 'Elemento #qr-reader presente mas não está visível',
    details: {
      width: rect.width,
      height: rect.height,
      top: rect.top,
      left: rect.left,
      display: window.getComputedStyle(element).display,
      visibility: window.getComputedStyle(element).visibility,
    }
  };
}

/**
 * Run all diagnostics and return a comprehensive report
 */
export async function runFullDiagnostics(): Promise<{
  overall: boolean;
  results: {
    browserCompatibility: DiagnosticResult;
    cameraAccess: DiagnosticResult;
    scannerElement: DiagnosticResult;
  };
  timestamp: string;
}> {
  console.log('[DIAGNOSTICS] ========================================');
  console.log('[DIAGNOSTICS] Executando diagnóstico completo do scanner');
  console.log('[DIAGNOSTICS] Timestamp:', new Date().toISOString());
  
  const browserCompatibility = await checkBrowserCompatibility();
  console.log('[DIAGNOSTICS] Compatibilidade do navegador:', browserCompatibility);
  
  const cameraAccess = await checkCameraAccess();
  console.log('[DIAGNOSTICS] Acesso à câmera:', cameraAccess);
  
  const scannerElement = checkScannerElement();
  console.log('[DIAGNOSTICS] Elemento do scanner:', scannerElement);
  
  const overall = browserCompatibility.success && cameraAccess.success && scannerElement.success;
  
  console.log('[DIAGNOSTICS] Resultado geral:', overall ? '✅ SUCESSO' : '❌ FALHA');
  console.log('[DIAGNOSTICS] ========================================');
  
  return {
    overall,
    results: {
      browserCompatibility,
      cameraAccess,
      scannerElement,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Export diagnostics to console in a formatted way
 */
export function logDiagnostics(diagnostics: Awaited<ReturnType<typeof runFullDiagnostics>>): void {
  console.group('📊 Relatório de Diagnóstico do Scanner');
  console.log('⏰ Timestamp:', diagnostics.timestamp);
  console.log('📋 Status Geral:', diagnostics.overall ? '✅ OK' : '❌ PROBLEMAS DETECTADOS');
  console.log('');
  
  console.group('🌐 Compatibilidade do Navegador');
  console.log('Status:', diagnostics.results.browserCompatibility.success ? '✅' : '❌');
  console.log('Mensagem:', diagnostics.results.browserCompatibility.message);
  if (diagnostics.results.browserCompatibility.details) {
    console.table(diagnostics.results.browserCompatibility.details);
  }
  console.groupEnd();
  
  console.group('📷 Acesso à Câmera');
  console.log('Status:', diagnostics.results.cameraAccess.success ? '✅' : '❌');
  console.log('Mensagem:', diagnostics.results.cameraAccess.message);
  if (diagnostics.results.cameraAccess.details) {
    console.table(diagnostics.results.cameraAccess.details);
  }
  console.groupEnd();
  
  console.group('🎯 Elemento do Scanner');
  console.log('Status:', diagnostics.results.scannerElement.success ? '✅' : '❌');
  console.log('Mensagem:', diagnostics.results.scannerElement.message);
  if (diagnostics.results.scannerElement.details) {
    console.table(diagnostics.results.scannerElement.details);
  }
  console.groupEnd();
  
  console.groupEnd();
}
