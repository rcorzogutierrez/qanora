import { beforeUserCreated } from 'firebase-functions/v2/identity';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import type { Account, Member, Project } from '@qanora/shared';

const TRIAL_DAYS = 14;
// Placeholder hasta que el cliente confirme la zona horaria real del
// navegador (Intl.DateTimeFormat) justo despues del primer login; este
// trigger no tiene acceso a esa info porque corre en el servidor.
const DEFAULT_TIME_ZONE = 'America/Mexico_City';

export const onUserCreate = beforeUserCreated(async (event) => {
  const user = event.data;
  if (!user) {
    return;
  }

  const db = getFirestore();
  const accountRef = db.collection('accounts').doc();
  const accountId = accountRef.id;
  const now = Timestamp.now();
  const trialEndsAt = Timestamp.fromMillis(now.toMillis() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

  const account: Account = {
    name: user.displayName ?? user.email ?? 'Mi cuenta',
    createdAt: now,
    plan: 'trial',
    trialEndsAt,
    codesCount: 0,
    timeZone: DEFAULT_TIME_ZONE,
    language: 'es',
  };

  const member: Member = {
    email: user.email ?? '',
    displayName: user.displayName ?? '',
    role: 'admin',
    createdAt: now,
  };

  const project: Project = {
    accountId,
    name: 'Default',
    isArchived: false,
    createdAt: now,
    updatedAt: now,
  };

  const batch = db.batch();
  batch.set(accountRef, account);
  batch.set(accountRef.collection('members').doc(user.uid), member);
  batch.set(db.collection('projects').doc(), project);
  await batch.commit();

  return {
    customClaims: { accountId },
  };
});
