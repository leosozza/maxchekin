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
  onError: (error: string) => void,
  timeout: number = 60000 // 60 segundos default
): Promise<void> => {
  // Prevenir múltiplas instâncias
  if (scannerActive) {
    console.warn('[CAPACITOR] Scanner já está ativo');
    return;
  }

  try {
    scannerActive = true;
    
    // Verificar permissões
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      scannerActive = false;
      onError('Permissão de câmera não concedida');
      return;
    }

    console.log('[CAPACITOR] Permissões OK, iniciando scanner...');

    // Para Android: verificar se o Google Barcode Scanner Module está disponível
    if (Capacitor.getPlatform() === 'android') {
      try {
        const { available } = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
        console.log('[CAPACITOR] Google Barcode Scanner Module disponível:', available);
        
        if (!available) {
          console.log('[CAPACITOR] Instalando Google Barcode Scanner Module...');
          await BarcodeScanner.installGoogleBarcodeScannerModule();
          console.log('[CAPACITOR] Módulo instalado com sucesso');
        }
      } catch (err) {
        console.warn('[CAPACITOR] Erro ao verificar/instalar módulo:', err);
        // Continua mesmo com erro - pode funcionar em alguns dispositivos
      }
    }

    // Esconde o WebView para mostrar a câmera nativa
    document.body.classList.add('scanner-active');
    console.log('[CAPACITOR] Classe scanner-active adicionada');
    
    // Adicionar timeout
    const timeoutId = setTimeout(() => {
      if (scannerActive) {
        stopNativeScan();
        onError('Tempo limite excedido. Nenhum QR Code foi detectado.');
      }
    }, timeout);
    
    // Usar o método scan() que retorna um único código
    console.log('[CAPACITOR] Chamando BarcodeScanner.scan()...');
    const { barcodes } = await BarcodeScanner.scan();
    
    clearTimeout(timeoutId);
    console.log('[CAPACITOR] Scan completado, códigos detectados:', barcodes?.length || 0);
    
    // Remove a classe quando terminar
    document.body.classList.remove('scanner-active');
    scannerActive = false;
    
    if (barcodes && barcodes.length > 0) {
      const firstBarcode = barcodes[0];
      console.log('[CAPACITOR] Primeiro código:', firstBarcode);
      
      if (firstBarcode.rawValue) {
        console.log('[CAPACITOR] Código lido com sucesso:', firstBarcode.rawValue);
        onSuccess(firstBarcode.rawValue);
      } else {
        console.error('[CAPACITOR] Código sem rawValue:', firstBarcode);
        onError('Código detectado mas sem valor');
      }
    } else {
      console.warn('[CAPACITOR] Nenhum código detectado');
      onError('Nenhum código detectado');
    }
  } catch (error) {
    // SEMPRE limpar estado
    document.body.classList.remove('scanner-active');
    scannerActive = false;
    
    // Tentar parar scanner explicitamente
    try {
      await BarcodeScanner.stopScan();
    } catch {
      // Ignore errors when stopping
    }
    
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
    document.body.classList.remove('scanner-active');
    scannerActive = false;
  }
};
