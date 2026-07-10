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
import react from 'eslint-plugin-react';
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
      react,
      'react-hooks': reactHooks,
    },
    settings: {
      react: { version: 'detect' },
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
      // React Router usa `throw redirect()` (Response) en loaders — patrón oficial
      '@typescript-eslint/only-throw-error': [
        'error',
        { allow: [{ from: 'lib', name: 'Response' }] },
      ],
      ...jsxA11y.flatConfigs.recommended.rules,
      // El plugin no puede mirar dentro de nuestros componentes: sin esto no
      // reconoce que <Checkbox> renderiza un <input> y marca como inválido un
      // <label> que lo envuelve (asociación implícita, perfectamente correcta).
      'jsx-a11y/label-has-associated-control': [
        'error',
        {
          controlComponents: ['Checkbox', 'TextField', 'TextareaField', 'SelectField'],
          // El texto de la etiqueta puede vivir un par de <span> más abajo.
          depth: 4,
        },
      ],

      /* ── 1. Fronteras entre capas ──────────────────────────────────── */
      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          rules: [
            { from: ['app'], allow: ['app', 'feature', 'shared', 'core'] },
            // feature→feature permitido SOLO vía su index.ts (lo exige entry-point)
            { from: ['feature'], allow: ['shared', 'core', 'feature'] },
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

      /* ── 2. Imports: sin rutas profundas, orden por capas ──────────── */
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
      'import/order': [
        'warn',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          pathGroups: [
            { pattern: '@core/**', group: 'internal', position: 'before' },
            { pattern: '@shared/**', group: 'internal' },
            { pattern: '@features/**', group: 'internal', position: 'after' },
          ],
          pathGroupsExcludedImportTypes: ['builtin'],
          'newlines-between': 'never',
        },
      ],

      /* ── 3. Límites de tamaño y profundidad (anti-espagueti) ───────── */
      // Ahora en error (el proyecto ya cumple): evita regresión a god-components.
      'max-lines': ['error', { max: 250, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['error', { max: 60, skipComments: true }],
      'max-depth': ['error', 3],
      complexity: ['error', 12],
      'max-params': ['error', 4],
      'max-nested-callbacks': ['error', 3],
      // Callback/JSX hell: limita el anidamiento de elementos JSX.
      'react/jsx-max-depth': ['error', { max: 7 }],
      'react/jsx-no-useless-fragment': 'warn',

      /* ── 4. Higiene de seguridad ───────────────────────────────────── */
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: 'Usa http de @core/api (interceptores + auth).' },
        { name: 'confirm', message: 'Usa useConfirm() de @shared/ui.' },
        { name: 'alert', message: 'Usa toast de @shared/ui.' },
        { name: 'prompt', message: 'Usa un Modal con TextField de @shared/ui.' },
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'window',
          property: 'fetch',
          message: 'Prohibido monkey-patch de fetch. Usa el cliente @core/api.',
        },
        {
          object: 'window',
          property: 'confirm',
          message: 'Usa useConfirm() de @shared/ui.',
        },
        {
          object: 'window',
          property: 'alert',
          message: 'Usa toast de @shared/ui.',
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
        {
          selector: 'Literal[value=/(?:bg|text|border)-\\[#/]',
          message: 'Color arbitrario en clase: usa los tokens del tema (tokens.css).',
        },
      ],
    },
  },

  // Componentes JSX: el markup es verboso, así que el límite por función sube a
  // 90 (el de 60 se mantiene en la lógica .ts). Sigue atrapando god-components.
  {
    files: ['src/**/*.tsx'],
    rules: {
      'max-lines-per-function': ['error', { max: 90, skipComments: true }],
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
