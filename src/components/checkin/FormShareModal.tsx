import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface FormShareModalProps {
  open: boolean;
  onClose: () => void;
  formUrl: string;
  modelName: string;
  leadName: string;
  dealId: string;
}

export function FormShareModal({ open, onClose, formUrl, modelName, leadName, dealId }: FormShareModalProps) {
  const qrCodeUrl = `https://chart.googleapis.com/chart?cht=qr&chs=300x300&chl=${encodeURIComponent(formUrl)}`;

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
            <img src={qrCodeUrl} alt="QR Code" className="w-64 h-64" />
          </div>

          <Button onClick={onClose} className="w-full">
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
