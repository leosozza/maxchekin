import { FileText, ExternalLink, Share2, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { FormShareModal } from "./FormShareModal";

interface FormShareButtonProps {
  dealId: string;
  modelName: string;
  leadName: string;
}

export function FormShareButton({ dealId, modelName, leadName }: FormShareButtonProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const formUrl = `https://tabuladormax.lovable.app/cadastro?deal=${dealId}`;

  const handleOpenForm = () => {
    window.open(formUrl, "_blank");
  };

  const handleWhatsAppShare = () => {
    const message = encodeURIComponent(
      `Olá! Aqui está o link para preencher sua ficha cadastral:\n\n${formUrl}\n\nModelo: ${modelName}\nNegócio: ${dealId}`
    );
    window.open(`https://wa.me/?text=${message}`, "_blank");
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            <FileText className="h-4 w-4" />
            Ficha Cadastral
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="bg-background z-50">
          <DropdownMenuItem onClick={handleOpenForm}>
            <ExternalLink className="mr-2 h-4 w-4" />
            Abrir Formulário
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleWhatsAppShare}>
            <Share2 className="mr-2 h-4 w-4" />
            Compartilhar WhatsApp
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setModalOpen(true)}>
            <QrCode className="mr-2 h-4 w-4" />
            Compartilhar QR Code
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <FormShareModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        formUrl={formUrl}
        modelName={modelName}
        leadName={leadName}
        dealId={dealId}
      />
    </>
  );
}
