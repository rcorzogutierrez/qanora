import { before, after, describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';

let testEnv;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-qanora-rules-test',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
    },
  });
});

after(async () => {
  await testEnv.cleanup();
});

describe('firestore.rules — baseline deny-all (Fase 0)', () => {
  it('bloquea lectura sin autenticar', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, 'accounts/acc1')));
  });

  it('bloquea lectura de una cuenta ajena (uid sin doc en members)', async () => {
    const db = testEnv.authenticatedContext('user1').firestore();
    await assertFails(getDoc(doc(db, 'accounts/acc1')));
  });

  it('bloquea escritura directa del cliente en codes (solo Functions escriben)', async () => {
    const db = testEnv.authenticatedContext('user1').firestore();
    await assertFails(setDoc(doc(db, 'codes/code1'), { foo: 'bar' }));
  });
});

describe('firestore.rules — accounts/members/projects (Fase 1.1)', () => {
  it('permite a un miembro leer su propia cuenta', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const seedDb = context.firestore();
      await setDoc(doc(seedDb, 'accounts/acc1'), { plan: 'trial' });
      await setDoc(doc(seedDb, 'accounts/acc1/members/user1'), { role: 'admin' });
    });

    const db = testEnv.authenticatedContext('user1').firestore();
    await assertSucceeds(getDoc(doc(db, 'accounts/acc1')));
  });

  it('bloquea la escritura directa de un miembro sobre su propia cuenta', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const seedDb = context.firestore();
      await setDoc(doc(seedDb, 'accounts/acc1'), { plan: 'trial' });
      await setDoc(doc(seedDb, 'accounts/acc1/members/user1'), { role: 'admin' });
    });

    const db = testEnv.authenticatedContext('user1').firestore();
    await assertFails(setDoc(doc(db, 'accounts/acc1'), { plan: 'pro' }, { merge: true }));
  });

  it('permite a un miembro leer un proyecto de su cuenta', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const seedDb = context.firestore();
      await setDoc(doc(seedDb, 'accounts/acc1/members/user1'), { role: 'admin' });
      await setDoc(doc(seedDb, 'projects/proj1'), { accountId: 'acc1', name: 'Default' });
    });

    const db = testEnv.authenticatedContext('user1').firestore();
    await assertSucceeds(getDoc(doc(db, 'projects/proj1')));
  });

  it('bloquea a un no-miembro leer un proyecto de otra cuenta', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const seedDb = context.firestore();
      await setDoc(doc(seedDb, 'accounts/acc1/members/user1'), { role: 'admin' });
      await setDoc(doc(seedDb, 'projects/proj1'), { accountId: 'acc1', name: 'Default' });
    });

    const db = testEnv.authenticatedContext('intruder').firestore();
    await assertFails(getDoc(doc(db, 'projects/proj1')));
  });
});

describe('firestore.rules — codes (Fase 1.3)', () => {
  it('permite a un miembro leer un code de su cuenta', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const seedDb = context.firestore();
      await setDoc(doc(seedDb, 'accounts/acc1/members/user1'), { role: 'admin' });
      await setDoc(doc(seedDb, 'codes/code1'), { accountId: 'acc1', projectId: 'proj1', type: 'qr' });
    });

    const db = testEnv.authenticatedContext('user1').firestore();
    await assertSucceeds(getDoc(doc(db, 'codes/code1')));
  });

  it('bloquea a un no-miembro leer un code de otra cuenta', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const seedDb = context.firestore();
      await setDoc(doc(seedDb, 'accounts/acc1/members/user1'), { role: 'admin' });
      await setDoc(doc(seedDb, 'codes/code1'), { accountId: 'acc1', projectId: 'proj1', type: 'qr' });
    });

    const db = testEnv.authenticatedContext('intruder').firestore();
    await assertFails(getDoc(doc(db, 'codes/code1')));
  });

  it('bloquea escritura directa de un miembro sobre un code (solo la Function escribe)', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const seedDb = context.firestore();
      await setDoc(doc(seedDb, 'accounts/acc1/members/user1'), { role: 'admin' });
      await setDoc(doc(seedDb, 'codes/code1'), { accountId: 'acc1', projectId: 'proj1', type: 'qr' });
    });

    const db = testEnv.authenticatedContext('user1').firestore();
    await assertFails(setDoc(doc(db, 'codes/code1'), { status: 'paused' }, { merge: true }));
  });
});
