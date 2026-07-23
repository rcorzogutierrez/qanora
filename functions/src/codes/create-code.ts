import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import type { QrDesign } from '@qanora/shared';
import { generateUniqueSlug } from '../redirect/generate-slug';

interface CreateQrCodeRequest {
  projectId: string;
  qrMode: 'static' | 'dynamic';
  /** URL a codificar (static) o URL de redireccion inicial (dynamic) */
  destination: string;
  design: QrDesign;
  name?: string;
  description?: string;
}

interface CreateQrCodeResponse {
  codeId: string;
  shortUrl?: string;
}

const MAX_SLUG_ATTEMPTS = 5;

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export const createQrCode = onCall<CreateQrCodeRequest>(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Debes iniciar sesion.');
  }

  const accountId = request.auth?.token?.['accountId'] as string | undefined;
  if (!accountId) {
    throw new HttpsError('failed-precondition', 'La cuenta todavia no esta lista.');
  }

  const { projectId, qrMode, destination, design, name, description } = request.data;
  if (!projectId || !destination || !design || (qrMode !== 'static' && qrMode !== 'dynamic')) {
    throw new HttpsError('invalid-argument', 'Faltan campos requeridos.');
  }
  if (!isValidHttpUrl(destination)) {
    throw new HttpsError('invalid-argument', 'El destino debe ser una URL http(s) valida.');
  }

  const db = getFirestore();

  const projectSnap = await db.collection('projects').doc(projectId).get();
  if (!projectSnap.exists || projectSnap.data()?.['accountId'] !== accountId) {
    throw new HttpsError('permission-denied', 'El proyecto no pertenece a tu cuenta.');
  }

  const accountRef = db.collection('accounts').doc(accountId);
  const codeRef = db.collection('codes').doc();
  const now = Timestamp.now();

  // codesCount (accounts/{accountId}) es el contador desnormalizado
  // documentado en CLAUDE.md; tambien sirve de base para el nombre default
  // (ej. "Codigo QR 3") cuando el caller no especifica uno.
  function buildBaseFields(nextCodesCount: number) {
    return {
      accountId,
      projectId,
      createdByUid: uid,
      name: name?.trim() || `Código QR ${nextCodesCount}`,
      ...(description ? { description } : {}),
      type: 'qr' as const,
      status: 'active' as const,
      scanCount: 0,
      createdAt: now,
      updatedAt: now,
      qrType: 'website' as const,
      design,
    };
  }

  if (qrMode === 'static') {
    await db.runTransaction(async (tx) => {
      const accountSnap = await tx.get(accountRef);
      const nextCodesCount = ((accountSnap.data()?.['codesCount'] as number | undefined) ?? 0) + 1;
      tx.set(codeRef, {
        ...buildBaseFields(nextCodesCount),
        qrMode: 'static',
        content: destination,
      });
      tx.update(accountRef, { codesCount: nextCodesCount });
    });
    const response: CreateQrCodeResponse = { codeId: codeRef.id };
    return response;
  }

  const redirectBaseUrl = process.env.REDIRECT_BASE_URL;
  if (!redirectBaseUrl) {
    throw new HttpsError('internal', 'REDIRECT_BASE_URL no esta configurado.');
  }

  for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt++) {
    const slug = await generateUniqueSlug(db);
    const slugRef = db.collection('shortSlugs').doc(slug);
    const shortUrl = `${redirectBaseUrl}/${slug}`;

    try {
      await db.runTransaction(async (tx) => {
        const [existing, accountSnap] = await Promise.all([tx.get(slugRef), tx.get(accountRef)]);
        if (existing.exists) {
          throw new Error('SLUG_TAKEN');
        }
        const nextCodesCount = ((accountSnap.data()?.['codesCount'] as number | undefined) ?? 0) + 1;
        tx.set(codeRef, {
          ...buildBaseFields(nextCodesCount),
          qrMode: 'dynamic',
          shortSlug: slug,
          shortUrl,
          destination,
        });
        tx.set(slugRef, {
          codeId: codeRef.id,
          accountId,
          projectId,
          destination,
          status: 'active',
        });
        tx.update(accountRef, { codesCount: nextCodesCount });
      });
      const response: CreateQrCodeResponse = { codeId: codeRef.id, shortUrl };
      return response;
    } catch (err) {
      if ((err as Error).message === 'SLUG_TAKEN') {
        continue;
      }
      throw err;
    }
  }

  throw new HttpsError('resource-exhausted', 'No se pudo generar un slug unico, reintenta.');
});
