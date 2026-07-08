export const campanasKeys = {
  all: ['campanas'] as const,
  list: (status: string | null) => ['campanas', 'list', status ?? 'todas'] as const,
  detail: (id: string) => ['campanas', 'detail', id] as const,
  plantillas: ['plantillas'] as const,
};
