import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

/**
 * Tailwind lee los design tokens de src/styles/tokens.css (variables HSL).
 * Cambiar de tema (oscuro↔claro / white-label) = reescribir tokens, no clases.
 */
export default {
  darkMode: ['selector', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'hsl(var(--bg) / <alpha-value>)',
        surface: {
          DEFAULT: 'hsl(var(--surface) / <alpha-value>)',
          raised: 'hsl(var(--surface-raised) / <alpha-value>)',
        },
        border: 'hsl(var(--border) / <alpha-value>)',
        fg: {
          DEFAULT: 'hsl(var(--fg) / <alpha-value>)',
          muted: 'hsl(var(--fg-muted) / <alpha-value>)',
          subtle: 'hsl(var(--fg-subtle) / <alpha-value>)',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary) / <alpha-value>)',
          strong: 'hsl(var(--primary-strong) / <alpha-value>)',
          fg: 'hsl(var(--primary-fg) / <alpha-value>)',
        },
        success: 'hsl(var(--success) / <alpha-value>)',
        warning: 'hsl(var(--warning) / <alpha-value>)',
        danger: 'hsl(var(--danger) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', 'system-ui', 'sans-serif'],
        display: ['"Montserrat Variable"', 'Montserrat', '"Inter Variable"', 'sans-serif'],
      },
      fontSize: {
        '2xs': 'var(--text-2xs)',
        xs2: 'var(--text-xs2)',
      },
      borderRadius: {
        card: 'var(--radius-card)',
        control: 'var(--radius-control)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        overlay: 'var(--shadow-overlay)',
        glass: 'var(--shadow-glass)',
      },
      backdropBlur: {
        glass: 'var(--blur-glass)',
      },
      transitionTimingFunction: {
        out: 'var(--ease-out)',
      },
      transitionDuration: {
        fast: 'var(--duration-fast)',
      },
      zIndex: {
        map: 'var(--z-map)',
        panel: 'var(--z-panel)',
        overlay: 'var(--z-overlay)',
        modal: 'var(--z-modal)',
        toast: 'var(--z-toast)',
      },
    },
  },
  // Genera clases (`animate-in`, `fade-in-0`, `zoom-in-95`…); no añade JS al bundle.
  plugins: [animate],
} satisfies Config;
