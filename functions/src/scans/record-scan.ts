import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { UAParser } from 'ua-parser-js';

export interface ScanContext {
  codeId: string;
  userAgent?: string;
  country?: string;
  referrer?: string;
}

/** yyyy-mm-dd en UTC (Regla de Dominio #8: statsDaily siempre corta en UTC) */
function utcDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function recordScan(ctx: ScanContext): Promise<void> {
  const db = getFirestore();
  const { device, os } = UAParser(ctx.userAgent ?? '');
  const deviceType = device.type ?? 'desktop';
  const osName = os.name ?? 'unknown';
  const country = ctx.country ?? 'unknown';

  const dateKey = utcDateKey(new Date());
  const codeRef = db.collection('codes').doc(ctx.codeId);
  const scanRef = codeRef.collection('scans').doc();
  const statsRef = codeRef.collection('statsDaily').doc(dateKey);

  const scanData = {
    scannedAt: FieldValue.serverTimestamp(),
    country,
    deviceType,
    os: osName,
    ...(ctx.referrer ? { referrer: ctx.referrer } : {}),
  };

  const batch = db.batch();
  batch.set(scanRef, scanData);
  batch.update(codeRef, { scanCount: FieldValue.increment(1) });
  batch.set(
    statsRef,
    {
      total: FieldValue.increment(1),
      byCountry: { [country]: FieldValue.increment(1) },
      byDevice: { [deviceType]: FieldValue.increment(1) },
      byOs: { [osName]: FieldValue.increment(1) },
    },
    { merge: true },
  );

  await batch.commit();
}
