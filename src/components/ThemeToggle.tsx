import { Sun, Moon, Palette, Sparkles, Square, Cpu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTheme, type ThemeMode } from '@/hooks/useTheme';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const themes: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
    { value: 'blue-pink', label: 'Blue-Pink', icon: Palette },
    { value: 'dark', label: 'Escuro', icon: Moon },
    { value: 'light', label: 'Claro', icon: Sun },
    { value: 'elegante', label: 'Elegante', icon: Sparkles },
    { value: 'minimalista', label: 'Minimalista', icon: Square },
    { value: 'tecnologico', label: 'Tecnológico', icon: Cpu },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          {theme === 'light' && <Sun className="h-5 w-5" />}
          {theme === 'dark' && <Moon className="h-5 w-5" />}
          {theme === 'blue-pink' && <Palette className="h-5 w-5" />}
          {theme === 'elegante' && <Sparkles className="h-5 w-5" />}
          {theme === 'minimalista' && <Square className="h-5 w-5" />}
          {theme === 'tecnologico' && <Cpu className="h-5 w-5" />}
          <span className="sr-only">Alternar tema</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {themes.map((t) => {
          const Icon = t.icon;
          return (
            <DropdownMenuItem
              key={t.value}
              onClick={() => setTheme(t.value)}
              className={theme === t.value ? 'bg-accent' : ''}
            >
              <Icon className="mr-2 h-4 w-4" />
              <span>{t.label}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
