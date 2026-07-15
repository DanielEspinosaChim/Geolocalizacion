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
    // El icono representa el modo ACTUAL (sol en claro, luna en oscuro); el
    // aria-label sí dice a qué modo se cambiará al pulsar.
    <IconButton
      variant="ghost"
      icon={oscuro ? Moon : Sun}
      label={oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      onClick={toggleTheme}
      className={className}
    />
  );
}
