import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime } from 'rxjs';
import QRCodeStyling from 'qr-code-styling';
import type { QrContentType } from '@qanora/shared';
import { environment } from '../../../environments/environment';
import { CodesService } from '../../core/codes/codes.service';
import { PlanLimitsService } from '../../core/plan-limits/plan-limits.service';
import { ProjectService } from '../../core/projects/project.service';

const DOT_STYLES = ['square', 'dots', 'rounded', 'classy', 'classy-rounded', 'extra-rounded'] as const;
const CORNER_STYLES = ['square', 'dot', 'extra-rounded'] as const;
const PREVIEW_PX = 240;

export interface QrTypeOption {
  id: QrContentType;
  label: string;
  description: string;
  enabled: boolean;
}

// Solo 'website' esta implementado en el MVP (Fase 1.3). El resto se
// muestran como "Proximamente" para comunicar el roadmap sin fingir
// funcionalidad que todavia no existe (vcard/wifi/whatsapp/menu/pdf: Fase 2.3).
const QR_TYPES: QrTypeOption[] = [
  { id: 'website', label: 'Sitio web', description: 'Mostrá tu sitio, red social o cualquier URL', enabled: true },
  { id: 'vcard', label: 'Tarjeta de contacto', description: 'Compartí tus datos de contacto (vCard)', enabled: false },
  { id: 'wifi', label: 'WiFi', description: 'Conectá a una red WiFi al escanear', enabled: false },
  { id: 'whatsapp', label: 'WhatsApp', description: 'Iniciá un chat de WhatsApp', enabled: false },
  { id: 'menu', label: 'Menú', description: 'Mostrá un menú con PDFs o imágenes', enabled: false },
  { id: 'pdf', label: 'Archivo PDF', description: 'Compartí un documento PDF', enabled: false },
];

@Component({
  selector: 'app-qr-editor',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './qr-editor.component.html',
})
export class QrEditorComponent {
  private readonly fb = inject(FormBuilder);
  private readonly projectService = inject(ProjectService);
  private readonly codesService = inject(CodesService);
  private readonly planLimits = inject(PlanLimitsService);

  protected readonly qrTypes = QR_TYPES;
  protected readonly selectedType = signal<QrContentType | null>(null);

  protected readonly dotStyles = DOT_STYLES;
  protected readonly cornerStyles = CORNER_STYLES;
  protected readonly allowSvg = this.planLimits.allowSvg;

  private readonly previewContainer = viewChild<ElementRef<HTMLDivElement>>('preview');
  private qrCode?: QRCodeStyling;

  readonly form = this.fb.nonNullable.group({
    qrMode: this.fb.nonNullable.control<'static' | 'dynamic'>('dynamic'),
    destination: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],
    dotColor: this.fb.nonNullable.control('#000000'),
    bgColor: this.fb.nonNullable.control('#ffffff'),
    dotStyle: this.fb.nonNullable.control<(typeof DOT_STYLES)[number]>('square'),
    cornerStyle: this.fb.nonNullable.control<(typeof CORNER_STYLES)[number]>('square'),
  });

  private readonly formValue = toSignal(this.form.valueChanges.pipe(debounceTime(150)), {
    initialValue: this.form.getRawValue(),
  });

  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly createdShortUrl = signal<string | null>(null);
  readonly createdCodeId = signal<string | null>(null);

  protected readonly previewContent = computed(() => {
    const value = this.formValue();
    if (value.qrMode === 'dynamic') {
      return this.createdShortUrl() ?? `${environment.redirectBaseUrl}/······`;
    }
    return value.destination || 'https://ejemplo.com';
  });

  constructor() {
    // El contenedor #preview solo existe en el DOM una vez elegido el tipo
    // 'website' (paso 2 del wizard), asi que la instancia se crea de forma
    // perezosa cuando el viewChild aparece.
    effect(() => {
      const container = this.previewContainer();
      if (!container || this.qrCode) {
        return;
      }
      const value = this.form.getRawValue();
      this.qrCode = new QRCodeStyling({
        width: PREVIEW_PX,
        height: PREVIEW_PX,
        data: this.previewContent(),
        dotsOptions: { color: value.dotColor, type: value.dotStyle },
        cornersSquareOptions: { type: value.cornerStyle },
        backgroundOptions: { color: value.bgColor },
      });
      this.qrCode.append(container.nativeElement);
    });

    effect(() => {
      const value = this.formValue();
      const content = this.previewContent();
      this.qrCode?.update({
        data: content,
        dotsOptions: { color: value.dotColor, type: value.dotStyle },
        cornersSquareOptions: { type: value.cornerStyle },
        backgroundOptions: { color: value.bgColor },
      });
    });
  }

  selectType(type: QrTypeOption): void {
    if (!type.enabled) {
      return;
    }
    this.selectedType.set(type.id);
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const project = this.projectService.defaultProject();
    if (!project) {
      this.errorMessage.set('Todavía no se cargó tu proyecto. Probá de nuevo en un momento.');
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);
    const value = this.form.getRawValue();

    try {
      const result = await this.codesService.createQrCode({
        projectId: project.id,
        qrMode: value.qrMode,
        destination: value.destination,
        design: {
          dotColor: value.dotColor,
          bgColor: value.bgColor,
          dotStyle: value.dotStyle,
          cornerStyle: value.cornerStyle,
        },
      });
      this.createdCodeId.set(result.codeId);
      this.createdShortUrl.set(result.shortUrl ?? null);
    } catch {
      this.errorMessage.set('No se pudo crear el código. Probá de nuevo.');
    } finally {
      this.submitting.set(false);
    }
  }

  async download(extension: 'png' | 'jpeg' | 'svg'): Promise<void> {
    if (extension === 'svg' && !this.allowSvg) {
      return;
    }
    const downloadPx = this.planLimits.maxDownloadPx;
    this.qrCode?.update({ width: downloadPx, height: downloadPx });
    await this.qrCode?.download({ name: 'qanora-qr', extension });
    this.qrCode?.update({ width: PREVIEW_PX, height: PREVIEW_PX });
  }
}
