import { CodeStatus } from './code.model';

/** shortSlugs/{slug} — indice inverso para redireccion O(1); desnormalizado a proposito */
export interface ShortSlug {
  codeId: string;
  accountId: string;
  projectId: string;
  destination: string;
  status: CodeStatus;
}
