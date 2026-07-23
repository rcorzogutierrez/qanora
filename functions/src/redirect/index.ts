import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import type { ShortSlug } from '@qanora/shared';
import { recordScan } from '../scans/record-scan';

function renderStatusPage(title: string, message: string): string {
  return `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><title>${title}</title></head>
<body style="font-family: system-ui, sans-serif; text-align: center; padding: 4rem 1rem;">
  <h1>${title}</h1>
  <p>${message}</p>
</body>
</html>`;
}

const NOT_FOUND_PAGE = renderStatusPage('No encontrado', 'Este código no existe.');
const PAUSED_PAGE = renderStatusPage('Código pausado', 'Este código QR fue pausado por su propietario.');
const EXPIRED_PAGE = renderStatusPage('Código no disponible', 'Este código ya no está disponible.');

export const redirect = onRequest(async (req, res) => {
  const slug = req.path.replace(/^\/+/, '');

  if (!slug) {
    res.status(404).send(NOT_FOUND_PAGE);
    return;
  }

  const db = getFirestore();
  const slugSnap = await db.collection('shortSlugs').doc(slug).get();

  if (!slugSnap.exists) {
    res.status(404).send(NOT_FOUND_PAGE);
    return;
  }

  const slugData = slugSnap.data() as ShortSlug;

  if (slugData.status === 'paused') {
    res.status(200).send(PAUSED_PAGE);
    return;
  }

  if (slugData.status === 'expired') {
    res.status(200).send(EXPIRED_PAGE);
    return;
  }

  // Regla de Dominio #7: el 302 responde ANTES de registrar el escaneo,
  // nunca esperar escrituras en Firestore ni el reenvio a GA4.
  res.redirect(302, slugData.destination);

  await recordScan({
    codeId: slugData.codeId,
    userAgent: req.get('user-agent'),
    // Header inyectado por Firebase Hosting en el edge; no reproducible en
    // el emulador de Hosting, verificar en el primer deploy real.
    country: req.get('x-country'),
    referrer: req.get('referer'),
  });
});
