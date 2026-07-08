/**
 * ESLint — fronteras de Screaming Architecture como código.
 *
 * Capas (dirección del flujo: app → features → shared → core):
 *   app      compone la aplicación; puede importar de todas las capas.
 *   feature  autocontenida; solo importa shared/core y SU PROPIO interior.
 *            Otras features solo se consumen vía su index.ts (API pública).
 *   shared   agnóstico al dominio; solo importa shared/core.
 *   core     infraestructura (http, auth, query, config); solo importa core.
 */
import js from '@eslint/js';
import boundaries from 'eslint-plugin-boundaries';
import importPlugin from 'eslint-plugin-import';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage'] },

  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      boundaries,
      import: importPlugin,
      'jsx-a11y': jsxA11y,
      'react-hooks': reactHooks,
    },
    settings: {
      'import/resolver': { typescript: { project: './tsconfig.app.json' } },
      'boundaries/elements': [
        { type: 'app', pattern: 'src/app' },
        { type: 'feature', pattern: 'src/features/*', capture: ['name'] },
        { type: 'shared', pattern: 'src/shared' },
        { type: 'core', pattern: 'src/core' },
      ],
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      ...jsxA11y.flatConfigs.recommended.rules,

      /* ── 1. Fronteras entre capas ──────────────────────────────────── */
      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          rules: [
            { from: ['app'], allow: ['app', 'feature', 'shared', 'core'] },
            {
              from: ['feature'],
              allow: ['shared', 'core', ['feature', { name: '${from.name}' }]],
            },
            { from: ['shared'], allow: ['shared', 'core'] },
            { from: ['core'], allow: ['core'] },
          ],
        },
      ],
      // Entre features, solo la API pública (index.ts) — nunca su interior
      'boundaries/entry-point': [
        'error',
        {
          default: 'disallow',
          rules: [
            { target: ['feature'], allow: ['index.ts', 'index.tsx'] },
            { target: ['app', 'shared', 'core'], allow: '**' },
          ],
        },
      ],

      /* ── 2. Nada de rutas largas / imports profundos ───────────────── */
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../../*'],
              message:
                'Import relativo profundo: usa los alias @app/@core/@shared/@features.',
            },
            {
              group: ['@features/*/**'],
              message:
                'Importa la feature por su index (@features/<x>), no sus archivos internos.',
            },
          ],
        },
      ],
      'import/no-duplicates': 'error',

      /* ── 3. Límites de tamaño y profundidad (anti-espagueti) ───────── */
      'max-lines': ['warn', { max: 250, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['warn', { max: 60, skipComments: true }],
      'max-depth': ['error', 3],
      complexity: ['warn', 12],
      'max-params': ['warn', 4],
      'max-nested-callbacks': ['error', 3],

      /* ── 4. Higiene de seguridad ───────────────────────────────────── */
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: 'Usa http de @core/api (interceptores + auth).' },
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'window',
          property: 'fetch',
          message: 'Prohibido monkey-patch de fetch. Usa el cliente @core/api.',
        },
        {
          object: 'localStorage',
          property: 'setItem',
          message: 'No guardes tokens/estado sensible en localStorage.',
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message: 'dangerouslySetInnerHTML prohibido: superficie XSS. Usa JSX.',
        },
      ],
    },
  },

  // Tests: se relajan los límites de tamaño (arrange/act/assert crece rápido)
  {
    files: ['src/**/*.test.{ts,tsx}'],
    rules: {
      'max-lines-per-function': 'off',
      'max-nested-callbacks': ['error', 5],
    },
  },
);
