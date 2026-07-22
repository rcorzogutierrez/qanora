import { initializeApp } from 'firebase-admin/app';

initializeApp();

export { onUserCreate } from './auth/on-user-create';

import { onRequest } from 'firebase-functions/v2/https';
import type { Account } from '@qanora/shared';

const newAccountDefaults: Pick<Account, 'plan' | 'codesCount'> = {
  plan: 'trial',
  codesCount: 0,
};

// Fase 0 — smoke test: confirma que Functions compila, corre en el
// emulador, y resuelve el paquete compartido @qanora/shared.
export const ping = onRequest((req, res) => {
  res.status(200).json({ ok: true, defaultPlan: newAccountDefaults.plan });
});
