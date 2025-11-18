import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import QRCode from "react-qr-code";

interface FormShareModalProps {
  open: boolean;
  onClose: () => void;
  formUrl: string;
  modelName: string;
  leadName: string;
  dealId: string;
}

export function FormShareModal({ open, onClose, formUrl, modelName, leadName, dealId }: FormShareModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ficha Cadastral - QR Code</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2 text-sm">
            <p><strong>Nome:</strong> {leadName}</p>
            <p><strong>Modelo:</strong> {modelName}</p>
            <p><strong>Negócio ID:</strong> {dealId}</p>
            <p className="break-all text-xs"><strong>Link:</strong> {formUrl}</p>
          </div>

          <div className="flex justify-center p-4 bg-white rounded-lg">
            <QRCode
              value={formUrl}
              size={256}
              level="H"
              style={{ height: "auto", maxWidth: "100%", width: "100%" }}
            />
          </div>

          <Button onClick={onClose} className="w-full">
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
