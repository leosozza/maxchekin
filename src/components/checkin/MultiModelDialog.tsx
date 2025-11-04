import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, RotateCcw } from "lucide-react";

interface MultiModelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadData: {
    lead_id: string;
    name: string;
    previousModelName: string;
    checkedInAt: string;
  };
  onRecheckIn: () => void;
  onCreateNewModel: (newModelName: string) => void;
}

export function MultiModelDialog({
  open,
  onOpenChange,
  leadData,
  onRecheckIn,
  onCreateNewModel,
}: MultiModelDialogProps) {
  const [mode, setMode] = useState<'choose' | 'new-model'>('choose');
  const [newModelName, setNewModelName] = useState("");

  const handleConfirmNewModel = () => {
    if (!newModelName.trim()) {
      return;
    }
    onCreateNewModel(newModelName);
    setNewModelName("");
    setMode('choose');
  };

  const handleClose = () => {
    setNewModelName("");
    setMode('choose');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        {mode === 'choose' ? (
          <>
            <DialogHeader>
              <DialogTitle>Check-in já realizado</DialogTitle>
              <DialogDescription className="space-y-2">
                <p>
                  Este lead já possui check-in registrado:
                </p>
                <div className="bg-muted p-3 rounded-lg space-y-1 text-sm">
                  <p><strong>Lead:</strong> #{leadData.lead_id}</p>
                  <p><strong>Nome:</strong> {leadData.name}</p>
                  <p><strong>Modelo:</strong> {leadData.previousModelName}</p>
                  <p><strong>Check-in:</strong> {new Date(leadData.checkedInAt).toLocaleString('pt-BR')}</p>
                </div>
                <p className="pt-2">
                  Deseja refazer o check-in ou cadastrar outro modelo?
                </p>
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-3 pt-4">
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  onRecheckIn();
                  handleClose();
                }}
                className="w-full"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Refazer Check-in
              </Button>

              <Button
                variant="default"
                size="lg"
                onClick={() => setMode('new-model')}
                className="w-full"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Cadastrar Outro Modelo
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Cadastrar Novo Modelo</DialogTitle>
              <DialogDescription>
                Informe o nome do novo modelo para criar um check-in adicional vinculado ao mesmo lead.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="new-model-name">Nome do Modelo</Label>
                <Input
                  id="new-model-name"
                  value={newModelName}
                  onChange={(e) => setNewModelName(e.target.value)}
                  placeholder="Digite o nome do novo modelo"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newModelName.trim()) {
                      handleConfirmNewModel();
                    }
                  }}
                  autoFocus
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setMode('choose')}
                  className="flex-1"
                >
                  Voltar
                </Button>
                <Button
                  onClick={handleConfirmNewModel}
                  disabled={!newModelName.trim()}
                  className="flex-1"
                >
                  Confirmar
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
