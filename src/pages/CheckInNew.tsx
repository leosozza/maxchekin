import { useEffect, useState, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, QrCode, Search, X, Delete, User, Menu, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { z } from "zod";
import { useInactivityTimer } from "@/hooks/useInactivityTimer";
import { ScreensaverView } from "@/components/checkin/ScreensaverView";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { isNativeApp, startNativeScan, stopNativeScan } from "@/utils/capacitorScanner";

interface ModelData {
  lead_id: string;
  name: string;
  photo: string;
  responsible: string;
  [key: string]: any;
}

// Validation schemas for security
const leadIdSchema = z.string()
  .trim()
  .regex(/^[0-9]+$/, 'ID do Lead deve ser numérico')
  .min(1, 'ID do Lead é obrigatório')
  .max(20, 'ID do Lead muito longo');

const bitrixResponseSchema = z.object({
  result: z.object({
    ID: z.string(),
    NAME: z.string().optional(),
    TITLE: z.string().optional(),
}).passthrough()
});

type ScreenState = 'scanner' | 'screensaver' | 'welcome' | 'transition';

export default function CheckInNew() {
  const [screenState, setScreenState] = useState<ScreenState>('scanner');
  const [scanning, setScanning] = useState(false);
  const [modelData, setModelData] = useState<ModelData | null>(null);
  const [manualSearchOpen, setManualSearchOpen] = useState(false);
  const [searchId, setSearchId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState("Seja bem-vinda");
  const [lastScannedCode, setLastScannedCode] = useState<string>("");
  const [lastScanTime, setLastScanTime] = useState<number>(0);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const usbInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  
  const SCAN_COOLDOWN_MS = 3000;

  // Inactivity timer - após 30s sem interação, ativa screensaver
  const { resetTimer } = useInactivityTimer({
    onInactive: () => {
      if (screenState === 'scanner' && !modelData) {
        setScreenState('transition');
        setTimeout(() => {
          setScreenState('screensaver');
          stopScanner();
        }, 800);
      }
    },
    timeout: 30000,
    enabled: screenState === 'scanner' && !modelData && configLoaded,
  });

  // Salvar/Carregar configurações do localStorage para persistir no PWA
  const saveConfigToStorage = (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
      console.log(`[CONFIG] Salvo no localStorage: ${key}`);
    } catch (error) {
      console.error(`[CONFIG] Erro ao salvar ${key}:`, error);
    }
  };

  const loadConfigFromStorage = (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error(`[CONFIG] Erro ao carregar ${key}:`, error);
      return null;
    }
  };

  // Load webhook config on mount - works with or without login
  useEffect(() => {
    const loadConfigs = async () => {
      console.log("[CHECK-IN] Iniciando carregamento de configurações...");
      await Promise.all([loadWebhookConfig(), loadCheckInConfig()]);
      setConfigLoaded(true);
      console.log("[CHECK-IN] Configurações carregadas com sucesso");
    };
    
    loadConfigs();
  }, []);

  const loadWebhookConfig = async () => {
    try {
      console.log("[CHECK-IN] Buscando webhook config do servidor...");
      
      // SEMPRE buscar do banco primeiro para garantir dados atualizados
      const { data, error } = await supabase
        .from("webhook_config")
        .select("bitrix_webhook_url")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("[CHECK-IN] Erro ao buscar webhook:", error);
        // Tentar fallback do cache apenas em caso de erro
        const cachedWebhook = loadConfigFromStorage('maxcheckin_webhook_url');
        if (cachedWebhook) {
          console.log("[CHECK-IN] Usando webhook do cache como fallback");
          setWebhookUrl(cachedWebhook);
        }
        toast({
          title: "Erro de configuração",
          description: "Erro ao carregar webhook. Usando cache local.",
          variant: "destructive",
        });
        return;
      }

      if (data?.bitrix_webhook_url) {
        console.log("[CHECK-IN] Webhook URL carregada do banco");
        setWebhookUrl(data.bitrix_webhook_url);
        saveConfigToStorage('maxcheckin_webhook_url', data.bitrix_webhook_url);
      } else {
        console.error("[CHECK-IN] Nenhum webhook ativo encontrado!");
        toast({
          title: "Webhook não configurado",
          description: "Configure o webhook em Admin → Webhooks",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("[CHECK-IN] Exceção ao carregar webhook:", err);
    }
  };

  const loadCheckInConfig = async () => {
    const { data } = await supabase
      .from("check_in_config")
      .select("welcome_message")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data?.welcome_message) {
      setWelcomeMessage(data.welcome_message);
    }
  };

  // Focus USB input when not in manual search
  useEffect(() => {
    if (!manualSearchOpen && usbInputRef.current && scanning) {
      usbInputRef.current.focus();
    }
  }, [manualSearchOpen, scanning]);

  useEffect(() => {
    if (!configLoaded || !webhookUrl || screenState !== 'scanner') {
      return;
    }

    console.log("[CHECK-IN] Iniciando câmera...");
    setScanning(true);
    
    let isMounted = true;
    
    const initCamera = async () => {
      if (!isMounted) return;
      
      if (isNativeApp()) {
        console.log("[CAPACITOR] Detectado app nativo, usando scanner nativo");
        try {
          await startNativeScan(
            (code) => {
              if (isMounted) {
                console.log("[CAPACITOR] QR Code escaneado:", code);
                processCheckIn(code);
              }
            },
            (error) => {
              if (isMounted) {
                setCameraError(error);
                console.error('[NATIVE SCAN] Erro:', error);
                toast({
                  variant: "destructive",
                  title: "Erro na Câmera",
                  description: error,
                });
              }
            }
          );
        } catch (err) {
          console.error('[NATIVE SCAN] Falha ao iniciar:', err);
        }
      } else {
        initScanner();
      }
    };
    
    initCamera();
    
    return () => {
      isMounted = false;
      console.log("[CHECK-IN] Cleanup de câmera");
      
      if (isNativeApp()) {
        stopNativeScan().catch(err => 
          console.error('[NATIVE SCAN] Erro no cleanup:', err)
        );
      } else {
        stopScanner();
      }
    };
  }, [configLoaded, webhookUrl, screenState]);

  const forceReloadCamera = async () => {
    console.log("[CAMERA] Recarregando câmera...");
    setCameraError(null);
    await stopScanner();
    // Chamar initScanner diretamente sem delays
    initScanner();
  };

  const initScanner = async (retryCount = 0) => {
    const MAX_RETRIES = 3;
    
    try {
      setIsInitializing(true);
      setCameraError(null);
      
      console.log(`[SCANNER] Tentativa ${retryCount + 1}/${MAX_RETRIES}`);
      
      // Parar scanner existente
      if (scannerRef.current) {
        try {
          const state = await scannerRef.current.getState();
          if (state === 2) {
            await scannerRef.current.stop();
          }
          await scannerRef.current.clear();
        } catch (e) {
          console.log("[SCANNER] Nenhum scanner para parar");
        }
      }
      
      // Criar novo scanner
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;
      
      // Configurações mais permissivas
      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        disableFlip: false,
      };
      
      console.log("[SCANNER] Solicitando câmera traseira...");
      
      try {
        // Tentar câmera traseira primeiro
        await scanner.start(
          { facingMode: "environment" },
          config,
          onScanSuccess,
          onScanError
        );
        
        console.log("✅ [SCANNER] Câmera traseira iniciada com sucesso!");
        setIsInitializing(false);
        return;
        
      } catch (backError) {
        console.warn("[SCANNER] Falha na câmera traseira, tentando frontal...");
        
        try {
          // Tentar câmera frontal
          await scanner.start(
            { facingMode: "user" },
            config,
            onScanSuccess,
            onScanError
          );
          
          console.log("✅ [SCANNER] Câmera frontal iniciada!");
          setIsInitializing(false);
          return;
          
        } catch (frontError) {
          console.warn("[SCANNER] Falha nas câmeras específicas, listando todas...");
          
          // Último recurso: listar todas as câmeras e usar a primeira
          const devices = await Html5Qrcode.getCameras();
          
          if (devices && devices.length > 0) {
            const firstCamera = devices[0];
            console.log("[SCANNER] Usando primeira câmera disponível:", firstCamera);
            
            await scanner.start(
              firstCamera.id,
              config,
              onScanSuccess,
              onScanError
            );
            
            console.log("✅ [SCANNER] Câmera iniciada (primeira disponível)!");
            setIsInitializing(false);
            return;
          }
          
          throw new Error("Nenhuma câmera disponível no dispositivo");
        }
      }
      
    } catch (err: any) {
      console.error(`[SCANNER] Erro na tentativa ${retryCount + 1}:`, err);
      
      // Retry automático
      if (retryCount < MAX_RETRIES - 1) {
        const delay = retryCount * 500; // 0ms, 500ms, 1000ms
        console.log(`[SCANNER] Tentando novamente em ${delay}ms...`);
        
        setTimeout(() => {
          initScanner(retryCount + 1);
        }, delay);
        return;
      }
      
      // Falha definitiva após 3 tentativas
      setIsInitializing(false);
      
      let errorMessage = "Erro ao acessar câmera";
      
      if (err.name === 'NotAllowedError') {
        errorMessage = "Permissão de câmera negada. Clique em 'Permitir' quando solicitado.";
      } else if (err.name === 'NotFoundError') {
        errorMessage = "Nenhuma câmera encontrada no dispositivo";
      } else if (!window.isSecureContext) {
        errorMessage = "Use HTTPS ou localhost para acessar a câmera";
      }
      
      setCameraError(errorMessage);
      
      toast({
        title: "❌ Erro na Câmera",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };


  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        // Check if scanner is actually running before stopping
        const state = await scannerRef.current.getState();
        if (state === 2) { // 2 = Html5QrcodeScannerState.SCANNING
          await scannerRef.current.stop();
          console.log('[SCANNER] Scanner parado com sucesso');
        } else {
          console.log('[SCANNER] Scanner já estava parado (state:', state, ')');
        }
      } catch (error) {
        // Silently handle errors - scanner might already be stopped
        console.log('[SCANNER] Erro ao parar (provavelmente já estava parado):', error);
      }
    }
  };

  const fetchModelDataFromBitrix = async (leadId: string, source: 'qr' | 'usb' | 'manual' = 'qr') => {
    try {
      console.log("[CHECK-IN] Webhook atual:", webhookUrl ? "CONFIGURADO" : "VAZIO");
      
      // Validate lead ID format
      const validation = leadIdSchema.safeParse(leadId);
      if (!validation.success) {
        throw new Error(`Formato de ID inválido: ${validation.error.errors[0].message}`);
      }
      const validLeadId = validation.data;
      
      if (!webhookUrl) {
        console.error("[CHECK-IN] webhookUrl está vazio no momento da busca");
        // Tentar recarregar o webhook
        await loadWebhookConfig();
        
        // Verificar novamente após recarregar
        if (!webhookUrl) {
          throw new Error("Webhook URL não configurada. Configure em Admin → Webhooks");
        }
      }

      console.log(`[CHECK-IN] Buscando Lead ${validLeadId} no Bitrix...`);

      // Encode lead ID for URL safety
      const encodedLeadId = encodeURIComponent(validLeadId);

      // Get lead data from Bitrix24
      const getResponse = await fetch(
        `${webhookUrl}/crm.lead.get.json?ID=${encodedLeadId}`
      );
      
      if (!getResponse.ok) {
        throw new Error(`Lead ${validLeadId} não encontrado no Bitrix (Status: ${getResponse.status})`);
      }

      const getData = await getResponse.json();
      console.log(`[CHECK-IN] Resposta Bitrix:`, getData);
      
      // Validate Bitrix response structure
      const validatedData = bitrixResponseSchema.parse(getData);
      
      if (!validatedData.result || Object.keys(validatedData.result).length === 0) {
        throw new Error(`Lead ${validLeadId} não existe no Bitrix24`);
      }

      const lead = validatedData.result;

      // Get field mappings
      const { data: mappings } = await supabase
        .from("field_mapping")
        .select("*")
        .eq("is_active", true);

      console.log(`[CHECK-IN] Mapeamentos encontrados:`, mappings);

      // Build model data dynamically from mappings
      const modelData: any = { lead_id: validLeadId };

      if (mappings && mappings.length > 0) {
        mappings.forEach((mapping) => {
          const bitrixValue = lead[mapping.bitrix_field_name];
          
          // Set value with fallback chain
          if (mapping.maxcheckin_field_name === "model_name") {
            modelData.name = bitrixValue || lead.NAME || lead.TITLE || "Modelo Sem Nome";
          } else if (mapping.maxcheckin_field_name === "model_photo") {
            modelData.photo = bitrixValue || lead.PHOTO || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400";
          } else if (mapping.maxcheckin_field_name === "responsible") {
            modelData.responsible = bitrixValue || lead.ASSIGNED_BY_NAME || "MaxFama";
          } else {
            modelData[mapping.maxcheckin_field_name] = bitrixValue || null;
          }
        });
      } else {
        // Fallback to default fields if no mappings configured
        console.log(`[CHECK-IN] Sem mapeamentos, usando campos padrão`);
        modelData.name = lead.NAME || lead.TITLE || "Modelo Sem Nome";
        modelData.photo = lead.PHOTO || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400";
        modelData.responsible = lead.ASSIGNED_BY_NAME || "MaxFama";
      }

      console.log(`[CHECK-IN] Dados extraídos:`, {
        name: modelData.name,
        photo: modelData.photo,
        responsible: modelData.responsible
      });

      // Find presenca_confirmada field mapping
      const presencaMapping = mappings?.find(
        m => m.maxcheckin_field_name === "presenca_confirmada"
      );

      // Update lead in Bitrix24
      const updateFields: any = {
        UF_CRM_CHECK_IN_TIME: new Date().toISOString(),
      };

      if (presencaMapping?.bitrix_field_name) {
        updateFields[presencaMapping.bitrix_field_name] = "1";
      }

      await fetch(`${webhookUrl}/crm.lead.update.json`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ID: leadId,
          fields: updateFields,
        }),
      });

      return modelData as ModelData;
    } catch (error) {
      console.error("Error fetching from Bitrix:", error);
      throw error;
    }
  };

  const processCheckIn = async (leadId: string, method: 'qr' | 'manual' | 'usb' = 'qr') => {
    try {
      setIsLoading(true);
      console.log(`[CHECK-IN] Iniciando check-in - Lead: ${leadId}, Método: ${method}`);
      
      const modelData = await fetchModelDataFromBitrix(leadId, method);
      
      // Validate mandatory fields
      if (!modelData.name || modelData.name === "Modelo Sem Nome") {
        throw new Error(`Nome do modelo não encontrado no Lead ${leadId}. Verifique os campos no Bitrix24.`);
      }
      
      console.log(`[CHECK-IN] Validação OK, salvando no banco...`);
      
      setModelData(modelData);
      setScanning(false);
      
      // Stop scanner if active - use the safe stopScanner function
      await stopScanner();

      // Save to database
      const { error: insertError } = await supabase.from("check_ins").insert({
        lead_id: leadId,
        model_name: modelData.name,
        model_photo: modelData.photo,
        responsible: modelData.responsible,
      });

      if (insertError) {
        console.error(`[CHECK-IN] Erro ao salvar:`, insertError);
        throw new Error(`Erro ao salvar check-in: ${insertError.message}`);
      }

      console.log(`[CHECK-IN] Sucesso!`);

      toast({
        title: "Check-in realizado!",
        description: `Bem-vinda, ${modelData.name}!`,
      });

      // Muda para tela de boas-vindas
      setScreenState('welcome');

      // Auto-reset after 5 seconds and restart scanner
      setTimeout(() => {
        console.log("[CHECK-IN] Reiniciando scanner...");
        setModelData(null);
        setScreenState('transition');
        setTimeout(() => {
          setScreenState('scanner');
          setScanning(true);
          
          if (isNativeApp()) {
            startNativeScan(
              (code) => processCheckIn(code),
              (error) => {
                setCameraError(error);
                toast({
                  variant: "destructive",
                  title: "Erro na Câmera",
                  description: error,
                });
              }
            );
          } else {
            initScanner();
          }
          
          resetTimer();
        }, 800);
      }, 5000);
    } catch (error) {
      console.error(`[CHECK-IN] Erro:`, error);
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : `Lead ${leadId} não encontrado ou erro desconhecido`;
      
      toast({
        title: "Erro no check-in",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onScanSuccess = async (decodedText: string) => {
    const now = Date.now();
    
    // Ignorar se for o mesmo código dentro do cooldown period
    if (decodedText === lastScannedCode && (now - lastScanTime) < SCAN_COOLDOWN_MS) {
      console.log(`[CHECK-IN] Ignorando leitura duplicada do Lead ${decodedText}`);
      return;
    }
    
    console.log("QR Code detected:", decodedText);
    setLastScannedCode(decodedText);
    setLastScanTime(now);
    
    await processCheckIn(decodedText);
  };

  const handleUsbInput = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && usbInputRef.current?.value) {
      const leadId = usbInputRef.current.value.trim();
      if (leadId) {
        await processCheckIn(leadId);
      }
    }
  };

  const handleManualSearch = async () => {
    if (!searchId.trim()) {
      toast({
        title: "ID vazio",
        description: "Digite um ID válido",
        variant: "destructive",
      });
      return;
    }

    await processCheckIn(searchId);
    setManualSearchOpen(false);
    setSearchId("");
  };

  const handleNumberClick = (num: number | string) => {
    setSearchId(prev => prev + num.toString());
  };

  const handleClear = () => {
    setSearchId("");
  };

  const onScanError = (err: any) => {
    // Ignore scan errors (they happen constantly while scanning)
  };

  const handleMenuClick = () => {
    if (!user) {
      navigate('/admin/login');
    } else if (isAdmin) {
      navigate('/admin/dashboard');
    } else {
      toast({
        title: "Acesso Restrito",
        description: "Apenas administradores têm acesso ao painel.",
        variant: "destructive",
      });
    }
  };

  const handleScreensaverActivate = () => {
    setIsTransitioning(true);
    setScreenState('transition');
    
    // Timeout de segurança: forçar conclusão após 2s
    const safetyTimeout = setTimeout(() => {
      setIsTransitioning(false);
    }, 2000);
    
    setTimeout(() => {
      clearTimeout(safetyTimeout);
      setScreenState('scanner');
      setScanning(true);
      setIsTransitioning(false);
      
      if (isNativeApp()) {
        startNativeScan(
          (code) => processCheckIn(code),
          (error) => {
            setCameraError(error);
            toast({
              variant: "destructive",
              title: "Erro na Câmera",
              description: error,
            });
          }
        );
      } else {
        initScanner();
      }
      
      resetTimer();
    }, 800);
  };

  return (
    <>
      {/* Screensaver Mode */}
      {screenState === 'screensaver' && (
        <ScreensaverView onActivate={handleScreensaverActivate} />
      )}

      {/* Overlay durante transição */}
      {isTransitioning && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center">
          <Loader2 className="w-16 h-16 animate-spin text-primary" />
        </div>
      )}

      {/* Main Check-in Interface */}
      <div className={`min-h-screen max-h-screen overflow-hidden bg-gradient-to-b from-studio-dark via-background to-studio-dark flex flex-col items-center justify-between p-4 md:p-8 portrait:orientation-portrait transition-all duration-800 ${
        screenState === 'screensaver' ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
      } ${
        screenState === 'transition' ? 'animate-scanner-exit' : ''
      } ${
        screenState === 'scanner' && configLoaded && !modelData ? 'animate-scanner-enter' : ''
      }`}>
      {/* Hidden USB input for barcode scanner */}
      <input
        ref={usbInputRef}
        type="text"
        className="absolute opacity-0 pointer-events-none"
        onKeyDown={handleUsbInput}
        autoFocus
      />

      {/* Botão Menu/Login - Sempre visível */}
      <Button
        onClick={handleMenuClick}
        variant="outline"
        size="icon"
        className="fixed top-4 left-4 z-50 border-primary/30 hover:bg-primary/10 hover:border-primary/50 transition-all"
        title={user ? (isAdmin ? "Painel Admin" : "Menu") : "Fazer Login"}
      >
        {user ? (
          <Menu className="w-5 h-5 text-primary" />
        ) : (
          <User className="w-5 h-5 text-primary" />
        )}
      </Button>

      {/* Logo */}
      <div className="w-full text-center mb-4 sm:mb-8 flex flex-col items-center">
        <img 
          src="/logo-color.png" 
          alt="MaxCheckin" 
          className="h-16 sm:h-20 mb-2"
        />
        <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-gold bg-clip-text text-transparent">
          MaxCheckin
        </h1>
      </div>

      {/* Manual Search Button */}
      {scanning && !modelData && screenState === 'scanner' && (
        <button
          onClick={() => setManualSearchOpen(true)}
          className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gold/20 backdrop-blur-sm border-2 border-gold/40 hover:bg-gold/30 hover:border-gold/60 transition-all shadow-glow z-50 flex items-center justify-center group"
        >
          <Search className="w-8 h-8 sm:w-10 sm:h-10 text-gold group-hover:scale-110 transition-transform" />
        </button>
      )}

      {!configLoaded && screenState === 'scanner' && (
        <div className="flex flex-col items-center space-y-4 sm:space-y-8 animate-fade-in flex-1 justify-center w-full">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-gold blur-3xl opacity-20 animate-pulse-glow"></div>
            <QrCode className="w-20 h-20 sm:w-32 sm:h-32 text-gold animate-pulse relative z-10" />
          </div>
          <div className="text-center space-y-2 px-4">
            <p className="text-xl sm:text-2xl font-light text-foreground">
              Carregando configurações...
            </p>
          </div>
        </div>
      )}

      {configLoaded && scanning && !modelData && (
        <div className="flex flex-col items-center space-y-4 sm:space-y-8 animate-fade-in flex-1 justify-center w-full">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-gold blur-3xl opacity-20 animate-pulse-glow"></div>
            <QrCode className="w-20 h-20 sm:w-32 sm:h-32 text-gold animate-pulse relative z-10" />
          </div>
          
          {/* SEMPRE renderizar o elemento qr-reader, sem condições */}
          <div className="w-full max-w-md relative">
            {/* Elemento do scanner - SEMPRE presente */}
            <div 
              id="qr-reader" 
              className="w-full max-h-[250px] sm:max-h-[400px] min-h-[200px] overflow-hidden rounded-lg border-2 border-primary/20"
            ></div>
            
            {/* Overlay de loading */}
            {isInitializing && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg">
                <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                <p className="text-sm text-muted-foreground">Iniciando câmera...</p>
              </div>
            )}
            
            {/* Overlay de erro */}
            {cameraError && (
              <div className="absolute inset-0 bg-background/90 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg p-4 text-center">
                <p className="text-destructive font-semibold mb-2">⚠️ {cameraError}</p>
                <Button onClick={forceReloadCamera} size="lg" className="mt-2">
                  🔄 Tentar Novamente
                </Button>
              </div>
            )}
            
            {/* Botão de reload sempre visível na parte inferior */}
            <Button
              onClick={forceReloadCamera}
              variant="outline"
              size="sm"
              className="w-full mt-2"
            >
              🔄 Recarregar Câmera
            </Button>
          </div>
          
          <div className="text-center space-y-2 px-4">
            <p className="text-xl sm:text-2xl font-light text-foreground">
              Bem-vindo à MaxFama
            </p>
            <p className="text-base sm:text-lg text-muted-foreground">
              {isInitializing
                ? "Aguarde, carregando câmera..."
                : cameraError
                ? "Use busca manual ou recarregue a câmera"
                : "Aproxime sua credencial ou use o leitor USB"}
            </p>
          </div>
        </div>
      )}

      {modelData && screenState === 'welcome' && (
        <div className="flex flex-col items-center space-y-4 sm:space-y-8 animate-scale-in flex-1 justify-center">
          {/* Confetti Effect */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(20)].map((_, i) => (
              <Sparkles
                key={i}
                className="absolute text-gold animate-fade-in"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 0.5}s`,
                }}
              />
            ))}
          </div>

          {/* Model Photo */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-gold blur-2xl opacity-40"></div>
            {modelData.photo ? (
              <img
                src={modelData.photo}
                alt={modelData.name}
                className="w-48 h-48 sm:w-64 sm:h-64 rounded-full object-cover border-4 border-gold shadow-glow relative z-10 animate-scale-in"
              />
            ) : (
              <div className="w-48 h-48 sm:w-64 sm:h-64 rounded-full bg-muted border-4 border-gold shadow-glow relative z-10 animate-scale-in flex flex-col items-center justify-center">
                <User className="w-24 h-24 sm:w-32 sm:h-32 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Sem Foto</p>
              </div>
            )}
          </div>

          {/* Welcome Message */}
          <div className="text-center space-y-2 sm:space-y-4 z-10 px-4">
            <h2 className="text-3xl sm:text-5xl font-bold bg-gradient-gold bg-clip-text text-transparent">
              {welcomeMessage},
            </h2>
            <p className="text-4xl sm:text-6xl font-bold text-foreground animate-shimmer">
              {modelData.name}!
            </p>
            <p className="text-lg sm:text-xl text-muted-foreground mt-2 sm:mt-4">
              Check-in confirmado ✓
            </p>
          </div>
        </div>
      )}

      {/* Manual Search Dialog */}
      <Dialog open={manualSearchOpen} onOpenChange={setManualSearchOpen}>
        <DialogContent className="bg-studio-dark border-2 border-gold/30 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-3xl text-center bg-gradient-gold bg-clip-text text-transparent">
              Buscar por ID
            </DialogTitle>
          </DialogHeader>

          {/* Display Input */}
          <div className="my-6">
            <div className="bg-background/50 border-2 border-gold/40 rounded-lg p-6 text-center">
              <p className="text-5xl font-mono font-bold text-foreground min-h-[60px] flex items-center justify-center">
                {searchId || "—"}
              </p>
            </div>
          </div>

          {/* Numeric Keypad */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <Button
                key={num}
                onClick={() => handleNumberClick(num)}
                className="h-20 text-3xl font-bold bg-muted hover:bg-gold/20 border border-gold/20 hover:border-gold/40 transition-all"
                disabled={isLoading}
              >
                {num}
              </Button>
            ))}
            <Button
              onClick={handleClear}
              className="h-20 bg-destructive/80 hover:bg-destructive border border-destructive/40"
              disabled={isLoading}
            >
              <Delete className="w-6 h-6" />
            </Button>
            <Button
              onClick={() => handleNumberClick(0)}
              className="h-20 text-3xl font-bold bg-muted hover:bg-gold/20 border border-gold/20 hover:border-gold/40"
              disabled={isLoading}
            >
              0
            </Button>
            <Button
              onClick={handleManualSearch}
              className="h-20 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg"
              disabled={isLoading || !searchId}
            >
              {isLoading ? "..." : "Buscar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </>
  );
}
