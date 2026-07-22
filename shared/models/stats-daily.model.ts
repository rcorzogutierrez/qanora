/** codes/{codeId}/statsDaily/{yyyy-mm-dd} — agregados en UTC (Regla de Dominio #8) */
export interface StatsDaily {
  total: number;
  byCountry: Record<string, number>;
  byDevice: Record<string, number>;
  byOs: Record<string, number>;
}
