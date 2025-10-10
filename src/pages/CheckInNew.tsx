import { useEffect, useState, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, QrCode, Search, X, Delete } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ModelData {
  lead_id: string;
  name: string;
  photo: string;
  responsible: string;
  [key: string]: any;
}

export default function CheckInNew() {
  const [scanning, setScanning] = useState(true);
  const [modelData, setModelData] = useState<ModelData | null>(null);
  const [manualSearchOpen, setManualSearchOpen] = useState(false);
  const [searchId, setSearchId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const usbInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Load webhook config on mount
  useEffect(() => {
    loadWebhookConfig();
  }, []);

  const loadWebhookConfig = async () => {
    const { data } = await supabase
      .from("webhook_config")
      .select("bitrix_webhook_url")
      .eq("is_active", true)
      .maybeSingle();

    if (data?.bitrix_webhook_url) {
      setWebhookUrl(data.bitrix_webhook_url);
    }
  };

  // Focus USB input when not in manual search
  useEffect(() => {
    if (!manualSearchOpen && usbInputRef.current && scanning) {
      usbInputRef.current.focus();
    }
  }, [manualSearchOpen, scanning]);

  useEffect(() => {
    initScanner();
    return () => {
      stopScanner();
    };
  }, []);

  const initScanner = async () => {
    try {
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        onScanSuccess,
        onScanError
      );
    } catch (err) {
      console.error("Failed to start scanner:", err);
      toast({
        title: "Erro no scanner",
        description: "Não foi possível iniciar o scanner QR",
        variant: "destructive",
      });
    }
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(console.error);
    }
  };

  const fetchModelDataFromBitrix = async (leadId: string) => {
    try {
      if (!webhookUrl) {
        throw new Error("Webhook URL não configurada. Configure em Admin → Webhooks");
      }

      // Get lead data from Bitrix24
      const getResponse = await fetch(
        `${webhookUrl}/crm.lead.get.json?ID=${leadId}`
      );
      
      if (!getResponse.ok) {
        throw new Error("Lead não encontrado");
      }

      const getData = await getResponse.json();
      
      if (!getData.result) {
        throw new Error("Lead não encontrado no Bitrix24");
      }

      const lead = getData.result;

      // Get field mappings
      const { data: mappings } = await supabase
        .from("field_mapping")
        .select("*")
        .eq("is_active", true);

      // Build model data dynamically from mappings
      const modelData: any = { lead_id: leadId };

      if (mappings && mappings.length > 0) {
        mappings.forEach((mapping) => {
          const bitrixValue = lead[mapping.bitrix_field_name];
          
          // Set value with fallback
          if (mapping.maxcheckin_field_name === "model_name") {
            modelData.name = bitrixValue || lead.NAME || lead.TITLE || "Modelo";
          } else if (mapping.maxcheckin_field_name === "model_photo") {
            modelData.photo = bitrixValue || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400";
          } else if (mapping.maxcheckin_field_name === "responsible") {
            modelData.responsible = bitrixValue || lead.ASSIGNED_BY_NAME || "MaxFama";
          } else {
            modelData[mapping.maxcheckin_field_name] = bitrixValue;
          }
        });
      } else {
        // Fallback to default fields if no mappings configured
        modelData.name = lead.NAME || lead.TITLE || "Modelo";
        modelData.photo = lead.PHOTO || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400";
        modelData.responsible = lead.ASSIGNED_BY_NAME || "MaxFama";
      }

      // Find presenca_confirmada field mapping
      const presencaMapping = mappings?.find(
        m => m.maxcheckin_field_name === "presenca_confirmada"
      );

      // Update lead in Bitrix24
      const updateFields: any = {
        UF_CRM_CHECK_IN_TIME: new Date().toISOString(),
      };

      if (presencaMapping?.bitrix_field_name) {
        updateFields[presencaMapping.bitrix_field_name] = "Sim";
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

  const processCheckIn = async (leadId: string, method: 'qr' | 'manual' | 'usb') => {
    try {
      setIsLoading(true);
      const modelData = await fetchModelDataFromBitrix(leadId);
      
      setModelData(modelData);
      setScanning(false);
      
      // Stop scanner if active
      if (scannerRef.current) {
        await scannerRef.current.stop();
      }

      // Save to database
      await supabase.from("check_ins").insert({
        lead_id: leadId,
        model_name: modelData.name,
        model_photo: modelData.photo,
        responsible: modelData.responsible,
      });

      toast({
        title: "Check-in realizado!",
        description: `Bem-vinda, ${modelData.name}!`,
      });

      // Auto-reset after 5 seconds
      setTimeout(async () => {
        setModelData(null);
        setScanning(true);
        if (method !== 'manual') {
          await initScanner();
        }
        if (usbInputRef.current) {
          usbInputRef.current.value = "";
          usbInputRef.current.focus();
        }
      }, 5000);
    } catch (error) {
      toast({
        title: "Erro no check-in",
        description: error instanceof Error ? error.message : "ID não encontrado",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onScanSuccess = async (decodedText: string) => {
    console.log("QR Code detected:", decodedText);
    await processCheckIn(decodedText, 'qr');
  };

  const handleUsbInput = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && usbInputRef.current?.value) {
      const leadId = usbInputRef.current.value.trim();
      if (leadId) {
        await processCheckIn(leadId, 'usb');
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

    await processCheckIn(searchId, 'manual');
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-studio-dark via-background to-studio-dark flex flex-col items-center justify-center p-8 portrait:orientation-portrait">
      {/* Hidden USB input for barcode scanner */}
      <input
        ref={usbInputRef}
        type="text"
        className="absolute opacity-0 pointer-events-none"
        onKeyDown={handleUsbInput}
        autoFocus
      />

      {/* Logo */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 z-10">
        <h1 className="text-4xl font-bold bg-gradient-gold bg-clip-text text-transparent">
          MaxFama
        </h1>
      </div>

      {/* Manual Search Button */}
      {scanning && !modelData && (
        <button
          onClick={() => setManualSearchOpen(true)}
          className="fixed bottom-8 right-8 w-20 h-20 rounded-full bg-gold/20 backdrop-blur-sm border-2 border-gold/40 hover:bg-gold/30 hover:border-gold/60 transition-all shadow-glow z-50 flex items-center justify-center group"
        >
          <Search className="w-10 h-10 text-gold group-hover:scale-110 transition-transform" />
        </button>
      )}

      {scanning && !modelData && (
        <div className="flex flex-col items-center space-y-8 animate-fade-in">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-gold blur-3xl opacity-20 animate-pulse-glow"></div>
            <QrCode className="w-32 h-32 text-gold animate-pulse relative z-10" />
          </div>
          
          <div id="qr-reader" className="w-full max-w-md"></div>
          
          <div className="text-center space-y-2">
            <p className="text-2xl font-light text-foreground">
              Bem-vindo à MaxFama
            </p>
            <p className="text-lg text-muted-foreground">
              Aproxime sua credencial ou use o leitor USB
            </p>
          </div>
        </div>
      )}

      {modelData && (
        <div className="flex flex-col items-center space-y-8 animate-scale-in">
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
            <img
              src={modelData.photo}
              alt={modelData.name}
              className="w-64 h-64 rounded-full object-cover border-4 border-gold shadow-glow relative z-10 animate-scale-in"
            />
          </div>

          {/* Welcome Message */}
          <div className="text-center space-y-4 z-10">
            <h2 className="text-5xl font-bold bg-gradient-gold bg-clip-text text-transparent">
              Seja bem-vinda,
            </h2>
            <p className="text-6xl font-bold text-foreground animate-shimmer">
              {modelData.name}!
            </p>
            <p className="text-xl text-muted-foreground mt-4">
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
  );
}
