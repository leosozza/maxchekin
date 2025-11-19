import { useTheme } from "@/hooks/useTheme";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Palette, Moon, Sun } from "lucide-react";

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme();

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">Tema da Aplicação</h3>
          <RadioGroup value={theme} onValueChange={setTheme} className="space-y-4">
            <div className="flex items-center space-x-3 p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors">
              <RadioGroupItem value="blue-pink" id="blue-pink" />
              <Label htmlFor="blue-pink" className="flex items-center gap-3 cursor-pointer flex-1">
                <Palette className="w-5 h-5 text-primary" />
                <div>
                  <div className="font-medium">Azul e Rosa</div>
                  <div className="text-sm text-muted-foreground">Tema vibrante com cores azul e rosa</div>
                </div>
              </Label>
            </div>

            <div className="flex items-center space-x-3 p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors">
              <RadioGroupItem value="dark" id="dark" />
              <Label htmlFor="dark" className="flex items-center gap-3 cursor-pointer flex-1">
                <Moon className="w-5 h-5 text-primary" />
                <div>
                  <div className="font-medium">Escuro</div>
                  <div className="text-sm text-muted-foreground">Tema escuro elegante</div>
                </div>
              </Label>
            </div>

            <div className="flex items-center space-x-3 p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors">
              <RadioGroupItem value="light" id="light" />
              <Label htmlFor="light" className="flex items-center gap-3 cursor-pointer flex-1">
                <Sun className="w-5 h-5 text-primary" />
                <div>
                  <div className="font-medium">Claro</div>
                  <div className="text-sm text-muted-foreground">Tema claro e clean</div>
                </div>
              </Label>
            </div>
          </RadioGroup>
        </div>
      </div>
    </Card>
  );
}
