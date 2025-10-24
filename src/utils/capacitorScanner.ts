import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { Capacitor } from '@capacitor/core';

// Controle de estado para evitar múltiplas instâncias
let scannerActive = false;

export const isNativeApp = () => Capacitor.isNativePlatform();

export const requestCameraPermission = async (): Promise<boolean> => {
  try {
    const { camera } = await BarcodeScanner.requestPermissions();
    return camera === 'granted' || camera === 'limited';
  } catch (error) {
    console.error('[CAPACITOR] Erro ao verificar permissão:', error);
    return false;
  }
};

export const startNativeScan = async (
  onSuccess: (result: string) => void,
  onError: (error: string) => void
): Promise<void> => {
  // Prevenir múltiplas instâncias
  if (scannerActive) {
    console.warn('[CAPACITOR] Scanner já está ativo');
    return;
  }

  try {
    scannerActive = true;
    const hasPermission = await requestCameraPermission();
    
    if (!hasPermission) {
      scannerActive = false;
      onError('Permissão de câmera não concedida');
      return;
    }

    // Esconde o body para mostrar a câmera nativa
    document.body.classList.add('scanner-active');
    
    const { barcodes } = await BarcodeScanner.scan();
    
    // Remove a classe quando terminar
    document.body.classList.remove('scanner-active');
    scannerActive = false;
    
    if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
      onSuccess(barcodes[0].rawValue);
    }
  } catch (error) {
    document.body.classList.remove('scanner-active');
    scannerActive = false;
    console.error('[CAPACITOR] Erro ao escanear:', error);
    onError(error instanceof Error ? error.message : 'Erro desconhecido');
  }
};

export const stopNativeScan = async (): Promise<void> => {
  if (!scannerActive) {
    return;
  }
  
  try {
    await BarcodeScanner.stopScan();
    document.body.classList.remove('scanner-active');
    scannerActive = false;
    console.log('[CAPACITOR] Scanner parado com sucesso');
  } catch (error) {
    console.error('[CAPACITOR] Erro ao parar scanner:', error);
    scannerActive = false;
  }
};
