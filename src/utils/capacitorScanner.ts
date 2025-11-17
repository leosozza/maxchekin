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
    console.warn('[CAPACITOR] ⚠️ Scanner já está ativo, ignorando nova chamada');
    return;
  }

  try {
    scannerActive = true;
    console.log('[CAPACITOR] ========================================');
    console.log('[CAPACITOR] Iniciando scanner nativo');
    console.log('[CAPACITOR] Plataforma:', Capacitor.getPlatform());
    console.log('[CAPACITOR] Timeout configurado:', timeout, 'ms');
    console.log('[CAPACITOR] Timestamp:', new Date().toISOString());
    
    // Verificar permissões
    console.log('[CAPACITOR] Verificando permissões de câmera...');
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      console.error('[CAPACITOR] ❌ Permissão de câmera negada');
      scannerActive = false;
      onError('Permissão de câmera não concedida');
      return;
    }

    console.log('[CAPACITOR] ✅ Permissões OK, iniciando scanner...');

    // Para Android: verificar se o Google Barcode Scanner Module está disponível
    if (Capacitor.getPlatform() === 'android') {
      try {
        console.log('[CAPACITOR] Verificando Google Barcode Scanner Module...');
        const { available } = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
        console.log('[CAPACITOR] Google Barcode Scanner Module disponível:', available);
        
        if (!available) {
          console.log('[CAPACITOR] Instalando Google Barcode Scanner Module...');
          await BarcodeScanner.installGoogleBarcodeScannerModule();
          console.log('[CAPACITOR] ✅ Módulo instalado com sucesso');
        } else {
          console.log('[CAPACITOR] ✅ Módulo já estava instalado');
        }
      } catch (err) {
        console.warn('[CAPACITOR] ⚠️ Erro ao verificar/instalar módulo:', err);
        // Continua mesmo com erro - pode funcionar em alguns dispositivos
      }
    }

    // Esconde o WebView para mostrar a câmera nativa
    document.body.classList.add('scanner-active');
    console.log('[CAPACITOR] ✅ Classe scanner-active adicionada ao body');
    
    // Adicionar timeout
    const timeoutId = setTimeout(() => {
      if (scannerActive) {
        console.warn('[CAPACITOR] ⏱️ Timeout atingido, parando scanner');
        stopNativeScan();
        onError('Tempo limite excedido. Nenhum QR Code foi detectado.');
      }
    }, timeout);
    
    // Usar o método scan() que retorna um único código
    console.log('[CAPACITOR] 📸 Chamando BarcodeScanner.scan()...');
    const { barcodes } = await BarcodeScanner.scan();
    
    clearTimeout(timeoutId);
    console.log('[CAPACITOR] ✅ Scan completado');
    console.log('[CAPACITOR] Códigos detectados:', barcodes?.length || 0);
    
    if (barcodes && barcodes.length > 0) {
      console.log('[CAPACITOR] Detalhes dos códigos:', JSON.stringify(barcodes, null, 2));
    }
    
    // Remove a classe quando terminar
    document.body.classList.remove('scanner-active');
    scannerActive = false;
    console.log('[CAPACITOR] ✅ Classe scanner-active removida');
    
    if (barcodes && barcodes.length > 0) {
      const firstBarcode = barcodes[0];
      console.log('[CAPACITOR] Processando primeiro código:', firstBarcode);
      
      if (firstBarcode.rawValue && firstBarcode.rawValue.trim() !== '') {
        console.log('[CAPACITOR] ✅ Código lido com sucesso:', firstBarcode.rawValue);
        console.log('[CAPACITOR] Tipo do código:', firstBarcode.format);
        console.log('[CAPACITOR] Comprimento:', firstBarcode.rawValue.length, 'caracteres');
        console.log('[CAPACITOR] ========================================');
        onSuccess(firstBarcode.rawValue.trim());
      } else {
        console.error('[CAPACITOR] ❌ Código vazio ou sem rawValue:', firstBarcode);
        console.log('[CAPACITOR] ========================================');
        onError('Código detectado mas está vazio ou inválido');
      }
    } else {
      console.warn('[CAPACITOR] ⚠️ Nenhum código detectado no resultado');
      console.log('[CAPACITOR] ========================================');
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
    
    console.error('[CAPACITOR] ❌ Erro ao escanear:', error);
    console.error('[CAPACITOR] Stack trace:', (error as Error)?.stack);
    console.log('[CAPACITOR] ========================================');
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
