/** plans/{planId} — configuracion de limites, editable sin deploy */
export interface Plan {
  maxDynamicCodes: number;
  maxScansPerMonth: number;
  maxDownloadPx: number;
  maxProjects: number;
  maxMembers: number;
  allowSvg: boolean;
  allowBatch: boolean;
  allowApi: boolean;
  allowGaForwarding: boolean;
  allowCustomDomain: boolean;
  statsHistoryDays: number;
}
