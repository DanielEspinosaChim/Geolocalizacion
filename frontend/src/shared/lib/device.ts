/** Heurística móvil (paridad con el legacy): incluye iPad con trackpad. */
export function esMovil(): boolean {
  const ua = navigator.userAgent;
  return (
    /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua) ||
    (navigator.maxTouchPoints > 1 && /Mac/.test(ua))
  );
}
