import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

interface UpdateCodeStatusRequest {
  codeId: string;
  status: 'active' | 'paused';
}

/**
 * Pausar/reactivar un codigo. Para QR dinamicos con shortSlug, tambien
 * actualiza shortSlugs.status en el mismo batch — es lo que la Function de
 * redirect chequea para mostrar la pagina de "pausado" (Regla de Dominio #3:
 * nada se borra, se pausa).
 */
export const updateCodeStatus = onCall<UpdateCodeStatusRequest>(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Debes iniciar sesion.');
  }
  const accountId = request.auth?.token?.['accountId'] as string | undefined;
  if (!accountId) {
    throw new HttpsError('failed-precondition', 'La cuenta todavia no esta lista.');
  }

  const { codeId, status } = request.data;
  if (!codeId || (status !== 'active' && status !== 'paused')) {
    throw new HttpsError('invalid-argument', 'Faltan campos requeridos.');
  }

  const db = getFirestore();
  const codeRef = db.collection('codes').doc(codeId);
  const codeSnap = await codeRef.get();
  if (!codeSnap.exists || codeSnap.data()?.['accountId'] !== accountId) {
    throw new HttpsError('permission-denied', 'El código no pertenece a tu cuenta.');
  }
  const codeData = codeSnap.data()!;

  const batch = db.batch();
  batch.update(codeRef, { status, updatedAt: Timestamp.now() });
  const slug = codeData['shortSlug'] as string | undefined;
  if (codeData['type'] === 'qr' && codeData['qrMode'] === 'dynamic' && slug) {
    batch.update(db.collection('shortSlugs').doc(slug), { status });
  }
  await batch.commit();

  return { ok: true };
});
