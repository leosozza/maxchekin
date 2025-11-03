import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CustomField {
  id: string;
  field_key: string;
  field_label: string;
  field_type: 'text' | 'number' | 'date' | 'image' | 'boolean' | 'list';
  field_options?: string[];
}

interface CustomFieldModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fields: unknown[];
  onSubmit: (values: Record<string, unknown>) => void;
}

export function CustomFieldModal({ open, onOpenChange, fields, onSubmit }: CustomFieldModalProps) {
  const [fieldValues, setFieldValues] = useState<Record<string, unknown>>({});

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
            value={(fieldValues[field.field_key] as string) || ''}
            onChange={(e) =>
              setFieldValues((prev) => ({ ...prev, [field.field_key]: e.target.value }))
            }
            placeholder={`Digite ${field.field_label}`}
            className="bg-input border-border text-foreground"
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={(fieldValues[field.field_key] as string) || ''}
            onChange={(e) =>
              setFieldValues((prev) => ({ ...prev, [field.field_key]: e.target.value }))
            }
            placeholder={`Digite ${field.field_label}`}
            className="bg-input border-border text-foreground"
          />
        );

      case 'list': {
        const options = field.field_options || [];
        return (
          <Select
            value={(fieldValues[field.field_key] as string) || ''}
            onValueChange={(value) =>
              setFieldValues((prev) => ({ ...prev, [field.field_key]: value }))
            }
          >
            <SelectTrigger className="bg-input border-border text-foreground">
              <SelectValue placeholder={`Selecione ${field.field_label}`} />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              {options.map((option: string) => (
                <SelectItem key={option} value={option} className="text-popover-foreground">
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
          {fields.map((field) => {
            const typedField = field as CustomField;
            return (
              <div key={typedField.id}>
                <Label className="text-muted-foreground text-sm">{typedField.field_label}</Label>
                {renderField(typedField)}
              </div>
            );
          })}
        </div>

        <div className="flex gap-2 justify-end mt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-border text-foreground"
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} className="bg-primary text-primary-foreground">
            Confirmar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
