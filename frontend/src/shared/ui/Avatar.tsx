const TAMANOS = {
  sm: 'h-8 w-8 text-xs2',
  md: 'h-10 w-10 text-sm',
} as const;

interface AvatarProps {
  /** Nombre o correo; se toma su inicial. */
  nombre: string;
  size?: keyof typeof TAMANOS;
}

/** Círculo con la inicial. Sustituye a los avatares hechos a mano en el header y Admin. */
export function Avatar({ nombre, size = 'md' }: AvatarProps) {
  const inicial = nombre.trim()[0]?.toUpperCase() ?? '?';
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full bg-primary/20 font-bold text-primary ${TAMANOS[size]}`}
    >
      {inicial}
    </span>
  );
}
