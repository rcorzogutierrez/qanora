import { Injectable } from '@angular/core';

/**
 * Stub temporal hasta Fase 3 (planes reales en `plans/{planId}` de Firestore).
 * Centralizado aca para que ningun componente hardcodee limites (anti-patron
 * prohibido en CLAUDE.md): cuando exista la coleccion `plans`, este servicio
 * pasa a leerla en vez de devolver estos defaults fijos.
 */
@Injectable({ providedIn: 'root' })
export class PlanLimitsService {
  readonly maxDownloadPx = 1000;
  readonly allowSvg = true;
}
