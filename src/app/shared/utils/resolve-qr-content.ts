import type { QrCode } from '@qanora/shared';

/**
 * Regla de Dominio #1: un QR dinamico SIEMPRE codifica el short link
 * (shortUrl), NUNCA el destino final. Editar el destino no regenera el QR.
 * Funcion pura y testeada para que ningun caller pueda violar esto sin que
 * un test falle.
 */
export function resolveQrContent(code: Pick<QrCode, 'qrMode' | 'shortUrl' | 'content'>): string {
  if (code.qrMode === 'dynamic') {
    if (!code.shortUrl) {
      throw new Error('QR dinamico sin shortUrl asignado todavia');
    }
    return code.shortUrl;
  }
  return code.content ?? '';
}
