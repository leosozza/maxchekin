import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CustomField } from '@/hooks/useCustomFields';

interface CustomFieldModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fields: CustomField[];
  onSubmit: (values: Record<string, any>) => void;
}

export function CustomFieldModal({ open, onOpenChange, fields, onSubmit }: CustomFieldModalProps) {
  const [fieldValues, setFieldValues] = useState<Record<string, any>>({});

  const handleSubmit = () => {
    onSubmit(fieldValues);
    setFieldValues({});
    onOpenChange(false);
  };

  const renderField = (field: CustomField) => {
    switch (field.field_type) {
      case 'text':
        return (
          <Input
            value={fieldValues[field.field_key] || ''}
            onChange={(e) => setFieldValues(prev => ({ ...prev, [field.field_key]: e.target.value }))}
            placeholder={`Digite ${field.field_label}`}
          />
        );
      
      case 'number':
        return (
          <Input
            type="number"
            value={fieldValues[field.field_key] || ''}
            onChange={(e) => setFieldValues(prev => ({ ...prev, [field.field_key]: e.target.value }))}
            placeholder={`Digite ${field.field_label}`}
          />
        );
      
      case 'list': {
        const options = (field as any).field_options || [];
        return (
          <Select
            value={fieldValues[field.field_key] || ''}
            onValueChange={(value) => setFieldValues(prev => ({ ...prev, [field.field_key]: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Selecione ${field.field_label}`} />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              {options.map((option: string) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }
      
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-primary">Preencher Campos</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {fields.map((field) => (
            <div key={field.id}>
              <Label className="text-foreground text-sm">{field.field_label}</Label>
              {renderField(field)}
            </div>
          ))}
        </div>

        <div className="flex gap-2 justify-end mt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Confirmar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
