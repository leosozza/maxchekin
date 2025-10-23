import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { Capacitor } from '@capacitor/core';

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
  try {
    const hasPermission = await requestCameraPermission();
    
    if (!hasPermission) {
      onError('Permissão de câmera não concedida');
      return;
    }

    // Esconde o body para mostrar a câmera nativa
    document.body.classList.add('scanner-active');
    
    const { barcodes } = await BarcodeScanner.scan();
    
    // Remove a classe quando terminar
    document.body.classList.remove('scanner-active');
    
    if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
      onSuccess(barcodes[0].rawValue);
    }
  } catch (error) {
    document.body.classList.remove('scanner-active');
    console.error('[CAPACITOR] Erro ao escanear:', error);
    onError(error instanceof Error ? error.message : 'Erro desconhecido');
  }
};

export const stopNativeScan = async (): Promise<void> => {
  try {
    await BarcodeScanner.stopScan();
    document.body.classList.remove('scanner-active');
  } catch (error) {
    console.error('[CAPACITOR] Erro ao parar scanner:', error);
  }
};
