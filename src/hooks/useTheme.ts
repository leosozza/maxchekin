import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type ThemeMode = 'light' | 'dark' | 'blue-pink' | 'elegante' | 'minimalista' | 'tecnologico';

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    // Check localStorage first
    const stored = localStorage.getItem('theme') as ThemeMode;
    return stored || 'blue-pink';
  });

  const [isLoading, setIsLoading] = useState(true);

  // Load theme from database on mount (if authenticated)
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const { data, error } = await supabase
            .from('theme_preferences')
            .select('theme_mode')
            .eq('user_id', user.id)
            .maybeSingle();

          if (!error && data) {
            setThemeState(data.theme_mode as ThemeMode);
            localStorage.setItem('theme', data.theme_mode);
            document.documentElement.setAttribute('data-theme', data.theme_mode);
          }
        }
      } catch (error) {
        console.error('Error loading theme:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTheme();
  }, []);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const setTheme = async (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);

    // Save to database if authenticated
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: existing } = await supabase
          .from('theme_preferences')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('theme_preferences')
            .update({ theme_mode: newTheme })
            .eq('user_id', user.id);
        } else {
          await supabase
            .from('theme_preferences')
            .insert({ user_id: user.id, theme_mode: newTheme });
        }
      }
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  return { theme, setTheme, isLoading };
}
