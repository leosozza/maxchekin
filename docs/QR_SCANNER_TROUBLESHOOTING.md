# QR Scanner Troubleshooting Guide

## Overview

This document provides guidance for troubleshooting QR code scanning issues in the MaxCheckin application.

## Recent Improvements

The following improvements have been made to enhance QR code reader reliability and debugging:

### 1. Enhanced Logging
- **Comprehensive error logging**: All error types are now logged with detailed context
- **Timestamp tracking**: Every log includes ISO timestamps for precise debugging
- **Scanner lifecycle logging**: Every step of initialization is logged
- **Success tracking**: Successful scans are logged with QR code content and metadata

### 2. Error Detection
The scanner now specifically detects and reports:
- **Permission errors** (NotAllowedError)
- **Camera not found** (NotFoundError)
- **Camera hardware errors** (NotReadableError)
- **QR parse errors** (malformed QR codes)
- **Empty QR codes** (validation before processing)

### 3. Diagnostic Tools
A new diagnostic utility (`scannerDiagnostics.ts`) provides:
- Browser compatibility checks
- Camera access verification
- Scanner element validation
- Automatic diagnostic runs on failure

## How to Debug Scanner Issues

### 1. Enable Browser Console
Open the browser's developer console (F12) to see detailed logs:
- Chrome/Edge: Press `F12` or `Ctrl+Shift+I`
- Firefox: Press `F12` or `Ctrl+Shift+K`
- Safari: Enable Developer Menu in Preferences, then press `Cmd+Option+C`

### 2. Look for Scanner Logs
All scanner-related logs are prefixed with:
- `[SCANNER]` - Web scanner (html5-qrcode)
- `[CAPACITOR]` - Native app scanner
- `[DIAGNOSTICS]` - Diagnostic utility
- `[CHECK-IN]` - Check-in process
- `[CAMERA]` - Camera management

### 3. Common Issues and Solutions

#### Issue: "Permissão de câmera negada"
**Cause**: Browser blocked camera access
**Solution**: 
1. Click the camera icon in the browser address bar
2. Allow camera access
3. Reload the page

#### Issue: "Nenhuma câmera encontrada"
**Cause**: No camera device detected
**Solution**:
1. Ensure camera is properly connected
2. Check if camera is working in other applications
3. Try a different browser
4. Check camera drivers (Windows/Linux)

#### Issue: "Erro ao acessar a câmera. A câmera pode estar em uso"
**Cause**: Camera is being used by another application
**Solution**:
1. Close other applications using the camera
2. Restart the browser
3. Check if video conferencing apps are running

#### Issue: Scanner doesn't detect QR codes
**Possible causes**:
1. **Poor lighting**: Ensure good lighting conditions
2. **QR code quality**: Check if QR code is clear and not damaged
3. **Distance**: Hold QR code at proper distance (15-30cm)
4. **Focus**: Wait for camera to focus before scanning

### 4. Run Manual Diagnostics

You can manually run diagnostics from the browser console:

```javascript
// Run full diagnostics
const diagnostics = await runFullDiagnostics();
logDiagnostics(diagnostics);

// Check individual components
const browser = await checkBrowserCompatibility();
console.log(browser);

const camera = await checkCameraAccess();
console.log(camera);

const element = checkScannerElement();
console.log(element);
```

Note: These functions are imported in CheckInNew.tsx and available in the console when on the check-in page.

### 5. Reload Camera Button

A "🔄 Recarregar Câmera" button is always visible below the scanner. Click it to:
1. Run automatic diagnostics
2. Restart the scanner
3. Clear any error states

## Log Examples

### Successful Scan
```
✅ [SCANNER] QR Code detectado com sucesso!
[SCANNER] Conteúdo: "12345"
[SCANNER] Timestamp: 2025-11-17T16:22:13.766Z
[SCANNER] Tipo: string, Comprimento: 5 caracteres
[SCANNER] ✅ QR Code válido (não vazio)
[CHECK-IN] 🚀 Processando check-in para Lead ID: 12345
```

### Permission Error
```
❌ [SCANNER] ❌ Erro de permissão de câmera:
{
  type: 'object',
  error: DOMException: Permission denied,
  message: 'NotAllowedError: Permission denied',
  timestamp: '2025-11-17T16:22:13.766Z'
}
```

### Initialization Success
```
[SCANNER] ========================================
[SCANNER] Iniciando Html5QrcodeScanner...
[SCANNER] Timestamp: 2025-11-17T16:22:13.766Z
[SCANNER] ✅ getUserMedia disponível
[SCANNER] ✅ Elemento #qr-reader encontrado!
[SCANNER] Dispositivo mobile: false
[SCANNER] Configuração do scanner: {...}
[SCANNER] Criando instância do Html5QrcodeScanner...
[SCANNER] ✅ Instância criada
[SCANNER] Renderizando scanner (chamando scanner.render)...
✅ [SCANNER] Scanner renderizado com sucesso!
[SCANNER] ========================================
```

## Technical Details

### Libraries Used
- **html5-qrcode v2.3.8**: For web-based QR scanning
- **@capacitor-mlkit/barcode-scanning v7.3.0**: For native mobile scanning

### Browser Requirements
- HTTPS or localhost (secure context required)
- getUserMedia API support
- Camera permission granted

### Supported Platforms
- Web (Chrome, Firefox, Safari, Edge)
- iOS (via Capacitor)
- Android (via Capacitor + Google Barcode Scanner Module)

## Security Considerations

All QR code input is validated:
1. Lead IDs must be numeric
2. Empty QR codes are rejected
3. Input is sanitized before processing
4. Duplicate scans are blocked (3-second cooldown)

## Further Assistance

If issues persist after following this guide:
1. Check browser console for specific error messages
2. Run diagnostics and capture the output
3. Note the browser and device information
4. Contact support with the diagnostic results

## Files Modified

- `src/pages/CheckInNew.tsx` - Enhanced error handling and logging
- `src/utils/capacitorScanner.ts` - Improved native scanner logging
- `src/utils/scannerDiagnostics.ts` - New diagnostic utility
