import { resolveQrContent } from './resolve-qr-content';

describe('resolveQrContent — Regla de Dominio #1', () => {
  it('un QR dinamico codifica el shortUrl, nunca el destino', () => {
    const content = resolveQrContent({
      qrMode: 'dynamic',
      shortUrl: 'https://qanora.web.app/abc123',
      content: undefined,
    });
    expect(content).toBe('https://qanora.web.app/abc123');
  });

  it('editar el destino no afecta el contenido codificado (shortUrl es lo unico que importa)', () => {
    const content = resolveQrContent({
      qrMode: 'dynamic',
      shortUrl: 'https://qanora.web.app/abc123',
      content: 'https://destino-cambiado-despues.com',
    });
    expect(content).toBe('https://qanora.web.app/abc123');
    expect(content).not.toContain('destino-cambiado-despues');
  });

  it('un QR dinamico sin shortUrl asignado todavia lanza error en vez de codificar el destino', () => {
    expect(() => resolveQrContent({ qrMode: 'dynamic', shortUrl: undefined, content: undefined })).toThrow();
  });

  it('un QR estatico codifica su content', () => {
    const content = resolveQrContent({
      qrMode: 'static',
      shortUrl: undefined,
      content: 'https://ejemplo.com',
    });
    expect(content).toBe('https://ejemplo.com');
  });
});
