import { FirestoreTimestamp } from './firestore-timestamp';

export type CodeType = 'qr' | 'barcode';
export type CodeStatus = 'active' | 'paused' | 'expired';
export type QrMode = 'static' | 'dynamic';
export type QrContentType = 'website' | 'vcard' | 'wifi' | 'whatsapp' | 'pdf' | 'menu';
export type BarcodeSymbology = 'code39' | 'code128' | 'ean13' | 'upca' | 'gs1-128';

export interface QrDesign {
  dotColor: string;
  bgColor: string;
  dotStyle: string;
  cornerStyle: string;
  logoPath?: string;
}

export interface BarcodeOptions {
  prefix: string;
  suffix: string;
  padZeros: number;
  uppercase: boolean;
  checksum: boolean;
  barWidth: number;
  heightMm: number;
  sideMargin: number;
  showText: boolean;
  textSize: number;
}

interface CodeBase {
  accountId: string;
  /** OBLIGATORIO — el MVP crea un "Default project" */
  projectId: string;
  /** auditoria de quien lo creo; NUNCA usar como dueno del recurso (ver accountId) */
  createdByUid: string;
  /** editable; si no se especifica al crear, la Function pone un default */
  name: string;
  description?: string;
  status: CodeStatus;
  scanCount: number;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

export interface QrCode extends CodeBase {
  type: 'qr';
  qrMode: QrMode;
  qrType: QrContentType;
  /** solo dynamic; INMUTABLE tras creacion */
  shortSlug?: string;
  /** solo dynamic; INMUTABLE tras creacion (Regla de Dominio #2) */
  shortUrl?: string;
  /** solo dynamic; editable */
  destination?: string;
  /** solo static; valor crudo codificado (URL para qrType website), INMUTABLE */
  content?: string;
  design: QrDesign;
}

export interface BarcodeCode extends CodeBase {
  type: 'barcode';
  symbology: BarcodeSymbology;
  barcodeText: string;
  barcodeOptions: BarcodeOptions;
}

/** codes/{codeId} — union discriminada por `type` */
export type Code = QrCode | BarcodeCode;
