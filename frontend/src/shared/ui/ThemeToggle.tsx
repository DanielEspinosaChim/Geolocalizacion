import { Moon, Sun } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import { getTheme, subscribeTheme, toggleTheme } from '@core/theme';
import { IconButton } from './IconButton';

/**
 * Alterna claro/oscuro. El estado vive en core/theme (module store) para que
 * cualquier instancia —header, login— quede sincronizada sin contexto extra.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const theme = useSyncExternalStore(subscribeTheme, getTheme, () => 'light' as const);
  const oscuro = theme === 'dark';

  return (
    <IconButton
      variant="ghost"
      icon={oscuro ? Sun : Moon}
      label={oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      onClick={toggleTheme}
      className={className}
    />
  );
}
