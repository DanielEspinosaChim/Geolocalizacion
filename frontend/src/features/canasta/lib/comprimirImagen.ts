/**
 * Comprime una imagen de factura antes de enviarla al backend.
 *
 * Las fotos tomadas desde la galería del teléfono pesan 10-20 MB y provocaban
 * timeouts al subirlas; además Gemini lee mejor imágenes limpias (≤2 MB).
 * Por eso redimensionamos el lado mayor a `maxPx` y recomprimimos a JPEG con
 * calidad `quality`. Si algo falla al decodificar la imagen se devuelve el
 * archivo original (fallback seguro: mejor subir la foto tal cual que romper el
 * escaneo).
 */
export function comprimirImagen(file: File, maxPx = 1920, quality = 0.88): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const ratio = Math.min(1, maxPx / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (blob) => {
          resolve(blob ? new File([blob], 'factura.jpg', { type: 'image/jpeg' }) : file);
        },
        'image/jpeg',
        quality,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };

    img.src = url;
  });
}
