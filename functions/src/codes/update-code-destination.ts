import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

interface UpdateCodeDestinationRequest {
  codeId: string;
  destination: string;
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Solo QR dinamicos tienen destino editable (Regla de Dominio #2). El slug Y
 * la shortUrl son inmutables — este endpoint nunca los toca, solo actualiza
 * el destino en codes Y en shortSlugs (que es lo que realmente lee la
 * Function de redirect) en un batch write, para que ambos queden en sync.
 */
export const updateCodeDestination = onCall<UpdateCodeDestinationRequest>(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Debes iniciar sesion.');
  }
  const accountId = request.auth?.token?.['accountId'] as string | undefined;
  if (!accountId) {
    throw new HttpsError('failed-precondition', 'La cuenta todavia no esta lista.');
  }

  const { codeId, destination } = request.data;
  if (!codeId || !destination) {
    throw new HttpsError('invalid-argument', 'Faltan campos requeridos.');
  }
  if (!isValidHttpUrl(destination)) {
    throw new HttpsError('invalid-argument', 'El destino debe ser una URL http(s) valida.');
  }

  const db = getFirestore();
  const codeRef = db.collection('codes').doc(codeId);
  const codeSnap = await codeRef.get();
  if (!codeSnap.exists || codeSnap.data()?.['accountId'] !== accountId) {
    throw new HttpsError('permission-denied', 'El código no pertenece a tu cuenta.');
  }
  const codeData = codeSnap.data()!;
  if (codeData['type'] !== 'qr' || codeData['qrMode'] !== 'dynamic') {
    throw new HttpsError('failed-precondition', 'Solo los QR dinámicos tienen destino editable.');
  }
  const slug = codeData['shortSlug'] as string | undefined;
  if (!slug) {
    throw new HttpsError('internal', 'El código dinámico no tiene shortSlug asignado.');
  }

  const batch = db.batch();
  batch.update(codeRef, { destination, updatedAt: Timestamp.now() });
  batch.update(db.collection('shortSlugs').doc(slug), { destination });
  await batch.commit();

  return { ok: true };
});
