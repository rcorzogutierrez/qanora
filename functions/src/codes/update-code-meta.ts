import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

interface UpdateCodeMetaRequest {
  codeId: string;
  name?: string;
  description?: string;
}

/** Editar name/description de un codigo (cualquier tipo). No toca shortSlugs. */
export const updateCodeMeta = onCall<UpdateCodeMetaRequest>(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Debes iniciar sesion.');
  }
  const accountId = request.auth?.token?.['accountId'] as string | undefined;
  if (!accountId) {
    throw new HttpsError('failed-precondition', 'La cuenta todavia no esta lista.');
  }

  const { codeId, name, description } = request.data;
  if (!codeId || (name === undefined && description === undefined)) {
    throw new HttpsError('invalid-argument', 'Faltan campos requeridos.');
  }
  if (name !== undefined && !name.trim()) {
    throw new HttpsError('invalid-argument', 'El nombre no puede estar vacío.');
  }

  const db = getFirestore();
  const codeRef = db.collection('codes').doc(codeId);
  const codeSnap = await codeRef.get();
  if (!codeSnap.exists || codeSnap.data()?.['accountId'] !== accountId) {
    throw new HttpsError('permission-denied', 'El código no pertenece a tu cuenta.');
  }

  await codeRef.update({
    ...(name !== undefined ? { name: name.trim() } : {}),
    ...(description !== undefined ? { description } : {}),
    updatedAt: Timestamp.now(),
  });

  return { ok: true };
});
