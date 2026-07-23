import { randomInt } from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';

const BASE62_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const SLUG_LENGTH = 6;
const MAX_ATTEMPTS = 10;

function randomSlug(length: number): string {
  let slug = '';
  for (let i = 0; i < length; i++) {
    slug += BASE62_CHARS[randomInt(BASE62_CHARS.length)];
  }
  return slug;
}

/**
 * Genera un candidato de slug base62 (6 chars) que no existe todavia en
 * shortSlugs. Este chequeo es best-effort para elegir un candidato probable;
 * la unicidad REAL la debe garantizar quien crea el codigo, releyendo
 * shortSlugs/{slug} dentro de la MISMA transaccion que escribe codes +
 * shortSlugs (shortSlug es inmutable tras creacion, Regla de Dominio #2).
 */
export async function generateUniqueSlug(db: Firestore): Promise<string> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const candidate = randomSlug(SLUG_LENGTH);
    const doc = await db.collection('shortSlugs').doc(candidate).get();
    if (!doc.exists) {
      return candidate;
    }
  }
  throw new Error('No se pudo generar un slug unico tras varios intentos');
}
