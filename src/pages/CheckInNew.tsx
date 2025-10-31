import { useEffect, useState, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, QrCode, Search, X, Delete, User, Menu, Loader2, Phone, UserPlus, Edit, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { isNativeApp, startNativeScan, stopNativeScan } from "@/utils/capacitorScanner";
import { findLeadsByPhone, createLead, BitrixLead } from "@/hooks/useBitrixLead";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ModelData {
  lead_id: string;
  name: string;
  photo: string;
  responsible: string;
  [key: string]: unknown;
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

type ScreenState = 'scanner' | 'welcome' | 'transition';

export default function CheckInNew() {
  const [screenState, setScreenState] = useState<ScreenState>('scanner');
  const [scanning, setScanning] = useState(false);
  const [modelData, setModelData] = useState<ModelData | null>(null);
  const [pendingCheckInData, setPendingCheckInData] = useState<ModelData | null>(null);
  const [editableData, setEditableData] = useState<ModelData | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [photoError, setPhotoError] = useState(false);
  const [manualSearchOpen, setManualSearchOpen] = useState(false);
  const [searchId, setSearchId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState("Seja bem-vinda");
  const [displayDuration, setDisplayDuration] = useState(5);
  const [showResponsible, setShowResponsible] = useState(true);
  const [showLeadId, setShowLeadId] = useState(false);
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

  // Phone search states
  const [searchMode, setSearchMode] = useState<'id' | 'phone'>('id');
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneSearchResults, setPhoneSearchResults] = useState<BitrixLead[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newLeadData, setNewLeadData] = useState({
    nome: "",
    nome_do_modelo: "",
    idade: "",
    telefone: "",
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
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setWelcomeMessage(data.welcome_message || "Seja bem-vinda");
      setDisplayDuration(data.display_duration_seconds || 5);
      setShowResponsible(data.show_responsible !== false);
      setShowLeadId(data.show_lead_id === true);
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

  /**
   * Parse Bitrix lead URL and extract lead_id
   * Accepts formats:
   * - https://maxsystem.bitrix24.com/crm/lead/details/12345/
   * - https://maxsystem.bitrix24.com/crm/lead/details/12345
   * - Just the numeric lead_id: 12345
   */
  const parseBitrixLeadId = (input: string): string => {
    // If input is already numeric, return it
    if (/^\d+$/.test(input.trim())) {
      return input.trim();
    }

    // Try to extract from Bitrix URL pattern
    const urlPattern = /\/crm\/lead\/details\/(\d+)\/?/;
    const match = input.match(urlPattern);
    
    if (match && match[1]) {
      return match[1];
    }

    // If no match, return the original (will be validated later)
    return input.trim();
  };

  const processCheckIn = async (leadId: string, method: 'qr' | 'manual' | 'usb' = 'qr') => {
    try {
      setIsLoading(true);
      console.log(`[CHECK-IN] Iniciando check-in - Input: ${leadId}, Método: ${method}`);
      
      // Parse Bitrix URL if needed
      const parsedLeadId = parseBitrixLeadId(leadId);
      console.log(`[CHECK-IN] Lead ID extraído: ${parsedLeadId}`);
      
      const modelData = await fetchModelDataFromBitrix(parsedLeadId, method);
      
      // Validate mandatory fields
      if (!modelData.name || modelData.name === "Modelo Sem Nome") {
        throw new Error(`Nome do modelo não encontrado no Lead ${leadId}. Verifique os campos no Bitrix24.`);
      }
      
      console.log(`[CHECK-IN] Validação OK, exibindo confirmação...`);
      
      setScanning(false);
      
      // Stop scanner if active - use the safe stopScanner function
      await stopScanner();

      // Show confirmation dialog instead of immediately saving
      setPendingCheckInData(modelData);
      setEditableData({ ...modelData }); // Create a copy for editing
      setIsEditMode(false); // Start in view mode
      setPhotoError(false); // Reset photo error
      setShowConfirmDialog(true);
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

  /**
   * Sync check-in data back to Bitrix
   * Updates specific fields: timestamp and photo
   */
  const syncCheckInToBitrix = async (leadId: string, photo: string | undefined) => {
    if (!webhookUrl) {
      console.warn('[CHECK-IN-SYNC] Webhook não configurado, pulando sincronização');
      return;
    }

    const fields: Record<string, any> = {
      // UF_CRM_1755007072212: Timestamp - data/hora de chegada
      UF_CRM_1755007072212: new Date().toISOString(),
    };

    // UF_CRM_1745431662: Imagem - foto do modelo se houver
    if (photo) {
      fields.UF_CRM_1745431662 = photo;
    }

    try {
      const response = await fetch(`${webhookUrl}/crm.lead.update.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: leadId,
          fields: fields,
        }),
      });

      if (!response.ok) {
        throw new Error(`Bitrix API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('[CHECK-IN-SYNC] Campos sincronizados com Bitrix:', data);
    } catch (error) {
      console.error('[CHECK-IN-SYNC] Erro ao sincronizar:', error);
      throw error;
    }
  };

  const confirmCheckIn = async () => {
    if (!editableData) return;

    try {
      setIsLoading(true);
      console.log(`[CHECK-IN] Confirmando check-in...`);

      // Use editableData instead of pendingCheckInData (to save edited values)
      const { error: insertError } = await supabase.from("check_ins").insert({
        lead_id: editableData.lead_id,
        model_name: editableData.name,
        model_photo: editableData.photo,
        responsible: editableData.responsible,
      });

      if (insertError) {
        console.error(`[CHECK-IN] Erro ao salvar:`, insertError);
        throw new Error(`Erro ao salvar check-in: ${insertError.message}`);
      }

      console.log(`[CHECK-IN] Sucesso!`);

      // Sync fields back to Bitrix after successful check-in
      try {
        console.log(`[CHECK-IN] Sincronizando campos com Bitrix...`);
        await syncCheckInToBitrix(editableData.lead_id, editableData.photo);
      } catch (syncError) {
        // Don't fail check-in if sync fails, just log it
        console.error(`[CHECK-IN] Erro ao sincronizar com Bitrix (não crítico):`, syncError);
      }

      setModelData(editableData);
      setPendingCheckInData(null);
      setEditableData(null);
      setIsEditMode(false);
      setShowConfirmDialog(false);

      toast({
        title: "Check-in realizado!",
        description: `Bem-vinda, ${editableData.name}!`,
      });

      // Muda para tela de boas-vindas
      setScreenState('welcome');

      // Auto-reset after configured duration and restart scanner
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
        }, 800);
      }, displayDuration * 1000);
    } catch (error) {
      console.error(`[CHECK-IN] Erro ao confirmar:`, error);
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : "Erro ao salvar check-in";
      
      toast({
        title: "Erro ao confirmar check-in",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveEdits = () => {
    if (!editableData) return;

    // Validate required fields
    if (!editableData.name || editableData.name.trim() === "") {
      toast({
        title: "Erro de validação",
        description: "O nome é obrigatório",
        variant: "destructive",
      });
      return;
    }

    // Reset photo error state
    setPhotoError(false);
    
    // Exit edit mode after saving
    setIsEditMode(false);
    
    toast({
      title: "Edições salvas",
      description: "As alterações foram aplicadas",
    });
  };

  const cancelCheckIn = () => {
    setPendingCheckInData(null);
    setEditableData(null);
    setIsEditMode(false);
    setPhotoError(false);
    setShowConfirmDialog(false);
    
    // Restart scanner
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

  const handlePhoneSearch = async () => {
    if (!phoneNumber.trim()) {
      toast({
        title: "Telefone vazio",
        description: "Digite um número de telefone",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setPhoneSearchResults([]);
    setShowCreateForm(false);

    try {
      const leads = await findLeadsByPhone(phoneNumber);
      setPhoneSearchResults(leads || []);

      if (!leads || leads.length === 0) {
        // Prefill phone in create form and show it
        setNewLeadData({ nome: "", nome_do_modelo: "", idade: "", telefone: phoneNumber });
        setShowCreateForm(true);
        toast({
          title: "Nenhum lead encontrado",
          description: "Você pode criar um novo lead com este telefone",
        });
      } else {
        toast({
          title: "Leads encontrados",
          description: `Encontrados ${leads.length} lead(s) com este telefone`,
        });
      }
    } catch (error) {
      console.error("Error searching leads by phone:", error);
      toast({
        title: "Erro na busca",
        description: error instanceof Error ? error.message : "Erro ao buscar leads",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPhoneLead = async (lead: BitrixLead) => {
    // Process check-in with the selected lead
    await processCheckIn(lead.ID, 'manual');
    setManualSearchOpen(false);
    setPhoneNumber("");
    setPhoneSearchResults([]);
  };

  const handleCreateLead = async () => {
    if (!newLeadData.nome.trim()) {
      toast({
        title: "Erro",
        description: "O nome é obrigatório",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Include SOURCE_ID: 'CALL' in the payload for check-in reception flow
      const response = await createLead({
        ...newLeadData,
        SOURCE_ID: 'CALL'
      });
      
      console.log("[CREATE-LEAD] Response from createLead:", response);
      
      // Support multiple response shapes from different createLead implementations
      let createdId: string | number | undefined;
      
      if (response && typeof response === "object") {
        // Shape 1: { result: number }
        if ("result" in response && response.result) {
          createdId = response.result;
        }
        // Shape 2: { id: number }
        else if ("id" in response && response.id) {
          createdId = (response as any).id;
        }
        // Shape 3: { ID: string }
        else if ("ID" in response && response.ID) {
          createdId = (response as any).ID;
        }
      } else if (typeof response === "string" || typeof response === "number") {
        // Shape 4: direct id return
        createdId = response;
      }

      // Validate createdId is a valid value
      if (!createdId || (typeof createdId !== "string" && typeof createdId !== "number")) {
        console.error("[CREATE-LEAD] Invalid response:", response);
        throw new Error(`ID do lead criado é inválido. Resposta: ${JSON.stringify(response)}`);
      }

      console.log("[CREATE-LEAD] Lead created successfully with ID:", createdId);

      toast({
        title: "Lead criado com sucesso",
        description: `O novo lead foi criado no Bitrix24 (ID: ${createdId})`,
      });

      // Perform check-in with the newly created lead
      await processCheckIn(String(createdId), 'manual');
      
      // Reset form and close dialog
      setNewLeadData({ nome: "", nome_do_modelo: "", idade: "", telefone: "" });
      setShowCreateForm(false);
      setPhoneNumber("");
      setPhoneSearchResults([]);
      setManualSearchOpen(false);
    } catch (error) {
      console.error("Error creating lead:", error);
      toast({
        title: "Erro ao criar lead",
        description: error instanceof Error ? error.message : "Erro ao criar lead",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onScanError = (err: unknown) => {
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

  return (
    <>
      {/* Overlay durante transição */}
      {isTransitioning && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center">
          <Loader2 className="w-16 h-16 animate-spin text-primary" />
        </div>
      )}

      {/* Main Check-in Interface */}
      <div className={`min-h-screen max-h-screen overflow-hidden bg-gradient-to-b from-studio-dark via-background to-studio-dark flex flex-col items-center justify-between p-4 md:p-8 portrait:orientation-portrait transition-all duration-800 ${
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

      {/* Botão de Busca (Lupa) - sempre visível no topo */}
      <Button
        onClick={() => setManualSearchOpen(true)}
        variant="outline"
        size="icon"
        className="fixed top-4 left-16 sm:left-20 z-50 border-primary/30 hover:bg-primary/10 hover:border-primary/50 transition-all"
        title="Buscar Lead"
      >
        <Search className="w-5 h-5 text-primary" />
      </Button>

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
            <div className="text-lg sm:text-xl text-muted-foreground mt-2 sm:mt-4 space-y-1">
              <p>Check-in confirmado ✓</p>
              {showResponsible && modelData.responsible && (
                <p className="text-base sm:text-lg">
                  <span className="text-gold">Responsável:</span> {modelData.responsible}
                </p>
              )}
              {showLeadId && (
                <p className="text-sm sm:text-base text-white/60">
                  ID: {modelData.lead_id}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Manual Search Dialog */}
      <Dialog open={manualSearchOpen} onOpenChange={setManualSearchOpen}>
        <DialogContent className="bg-studio-dark border-2 border-gold/30 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-3xl text-center bg-gradient-gold bg-clip-text text-transparent">
              Buscar Lead
            </DialogTitle>
          </DialogHeader>

          <Tabs value={searchMode} onValueChange={(v) => setSearchMode(v as 'id' | 'phone')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="id">Por ID</TabsTrigger>
              <TabsTrigger value="phone">Por Telefone</TabsTrigger>
            </TabsList>

            {/* ID Search Tab */}
            <TabsContent value="id" className="space-y-4">
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
            </TabsContent>

            {/* Phone Search Tab */}
            <TabsContent value="phone" className="space-y-4">
              <div className="space-y-4">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label htmlFor="phone">Telefone com DDD</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="(11) 99999-9999"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !isLoading) {
                          handlePhoneSearch();
                        }
                      }}
                      disabled={isLoading}
                      className="h-12 text-lg"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={handlePhoneSearch} disabled={isLoading} className="h-12">
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Buscando...
                        </>
                      ) : (
                        <>
                          <Phone className="mr-2 h-4 w-4" />
                          Buscar
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Search Results */}
                {phoneSearchResults.length > 0 && (
                  <div className="space-y-2">
                    <Label>Resultados da busca:</Label>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {phoneSearchResults.map((lead) => (
                        <div
                          key={lead.ID}
                          className="p-4 bg-muted/50 border border-gold/20 rounded-lg cursor-pointer hover:bg-gold/10 transition-colors"
                          onClick={() => handleSelectPhoneLead(lead)}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-semibold text-foreground">{lead.NAME || "Sem nome"}</p>
                              <p className="text-sm text-muted-foreground">
                                {lead.TITLE || "Sem título"}
                              </p>
                              {Array.isArray(lead.PHONE) && lead.PHONE.length > 0 && (
                                <p className="text-sm text-muted-foreground">
                                  📞 {lead.PHONE[0].VALUE}
                                </p>
                              )}
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectPhoneLead(lead);
                              }}
                            >
                              Selecionar
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Create Lead Form */}
                {showCreateForm && (
                  <div className="space-y-4 border-t border-gold/20 pt-4">
                    <div className="flex items-center gap-2 text-gold">
                      <UserPlus className="h-5 w-5" />
                      <h3 className="font-semibold">Criar Novo Lead</h3>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="nome">Nome *</Label>
                      <Input
                        id="nome"
                        placeholder="Nome do lead"
                        value={newLeadData.nome}
                        onChange={(e) => setNewLeadData({ ...newLeadData, nome: e.target.value })}
                        disabled={isLoading}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="nome_do_modelo">Nome do Modelo</Label>
                      <Input
                        id="nome_do_modelo"
                        placeholder="Nome do modelo"
                        value={newLeadData.nome_do_modelo}
                        onChange={(e) => setNewLeadData({ ...newLeadData, nome_do_modelo: e.target.value })}
                        disabled={isLoading}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="idade">Idade</Label>
                      <Input
                        id="idade"
                        type="number"
                        placeholder="Idade"
                        value={newLeadData.idade}
                        onChange={(e) => setNewLeadData({ ...newLeadData, idade: e.target.value })}
                        disabled={isLoading}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="telefone">Telefone</Label>
                      <Input
                        id="telefone"
                        placeholder="Telefone"
                        value={newLeadData.telefone}
                        onChange={(e) => setNewLeadData({ ...newLeadData, telefone: e.target.value })}
                        disabled={isLoading}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        onClick={handleCreateLead} 
                        disabled={isLoading} 
                        className="flex-1 bg-primary hover:bg-primary/90"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Criando...
                          </>
                        ) : (
                          <>
                            <UserPlus className="mr-2 h-4 w-4" />
                            Criar e Fazer Check-in
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowCreateForm(false)}
                        disabled={isLoading}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="bg-studio-dark border-2 border-gold/30 max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl text-center bg-gradient-gold bg-clip-text text-transparent">
              {isEditMode ? "Editar Dados" : "Confirmar Check-in"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center space-y-4">
              {editableData && (
                <div className="py-4">
                  <div className="flex justify-center mb-4">
                    {isEditMode ? (
                      <div className="w-full space-y-2">
                        <Label htmlFor="edit-photo" className="text-foreground">URL da Foto</Label>
                        <Input
                          id="edit-photo"
                          value={editableData.photo || ""}
                          onChange={(e) => {
                            setEditableData({ ...editableData, photo: e.target.value });
                            setPhotoError(false); // Reset error when URL changes
                          }}
                          placeholder="https://exemplo.com/foto.jpg"
                          className="text-foreground"
                        />
                        {editableData.photo && !photoError ? (
                          <img
                            src={editableData.photo}
                            alt="Preview"
                            className="w-32 h-32 rounded-full object-cover border-4 border-gold mx-auto mt-2"
                            onError={() => setPhotoError(true)}
                          />
                        ) : editableData.photo && photoError ? (
                          <div className="w-32 h-32 rounded-full bg-muted border-4 border-gold flex items-center justify-center mx-auto mt-2">
                            <User className="w-16 h-16 text-muted-foreground" />
                            <p className="absolute text-xs text-destructive mt-24">URL inválida</p>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <>
                        {editableData.photo ? (
                          <img
                            src={editableData.photo}
                            alt={editableData.name}
                            className="w-32 h-32 rounded-full object-cover border-4 border-gold"
                          />
                        ) : (
                          <div className="w-32 h-32 rounded-full bg-muted border-4 border-gold flex items-center justify-center">
                            <User className="w-16 h-16 text-muted-foreground" />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  
                  {isEditMode ? (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="edit-name" className="text-foreground">Nome</Label>
                        <Input
                          id="edit-name"
                          value={editableData.name}
                          onChange={(e) => setEditableData({ ...editableData, name: e.target.value })}
                          className="text-foreground"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-responsible" className="text-foreground">Responsável</Label>
                        <Input
                          id="edit-responsible"
                          value={editableData.responsible || ""}
                          onChange={(e) => setEditableData({ ...editableData, responsible: e.target.value })}
                          className="text-foreground"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-foreground">Lead ID (somente leitura)</Label>
                        <Input
                          value={editableData.lead_id}
                          disabled
                          className="text-muted-foreground"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xl font-bold text-foreground">{editableData.name}</p>
                      <p className="text-sm text-muted-foreground">{editableData.responsible}</p>
                      <p className="text-sm text-muted-foreground">Lead ID: {editableData.lead_id}</p>
                    </div>
                  )}
                  
                  {!isEditMode && (
                    <p className="mt-4 text-foreground">Deseja confirmar o check-in para esta pessoa?</p>
                  )}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel onClick={cancelCheckIn} disabled={isLoading} className="w-full sm:w-auto">
              Cancelar
            </AlertDialogCancel>
            
            {!isEditMode && (
              <Button
                onClick={() => setIsEditMode(true)}
                variant="outline"
                disabled={isLoading}
                className="w-full sm:w-auto border-primary/30 hover:bg-primary/10"
              >
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </Button>
            )}
            
            {isEditMode ? (
              <Button
                onClick={saveEdits}
                disabled={isLoading}
                className="w-full sm:w-auto bg-primary hover:bg-primary/90"
              >
                <Save className="mr-2 h-4 w-4" />
                Salvar Edições
              </Button>
            ) : (
              <AlertDialogAction 
                onClick={confirmCheckIn} 
                disabled={isLoading}
                className="w-full sm:w-auto bg-primary hover:bg-primary/90"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  "Confirmar Check-in"
                )}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </>
  );
}
