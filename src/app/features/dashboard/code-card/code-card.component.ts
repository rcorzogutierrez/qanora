import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import QRCodeStyling, { CornerSquareType, DotType } from 'qr-code-styling';
import type { QrCode } from '@qanora/shared';
import { CodeWithId, CodesService } from '../../../core/codes/codes.service';
import { resolveQrContent } from '../../../shared/utils/resolve-qr-content';

const THUMB_PX = 96;

@Component({
  selector: 'app-code-card',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './code-card.component.html',
})
export class CodeCardComponent {
  private readonly codesService = inject(CodesService);

  readonly code = input.required<CodeWithId>();

  protected readonly qrCodeData = computed(() => (this.code().type === 'qr' ? (this.code() as QrCode) : null));
  protected readonly isDynamic = computed(() => this.qrCodeData()?.qrMode === 'dynamic');

  private readonly thumbContainer = viewChild<ElementRef<HTMLDivElement>>('thumb');
  private qrCode?: QRCodeStyling;

  readonly editingDestination = signal(false);
  readonly destinationDraft = signal('');
  readonly editingName = signal(false);
  readonly nameDraft = signal('');
  readonly busy = signal(false);
  readonly errorMessage = signal<string | null>(null);

  constructor() {
    effect(() => {
      const container = this.thumbContainer();
      const qr = this.qrCodeData();
      if (!container || !qr) {
        return;
      }
      let content: string;
      try {
        content = resolveQrContent(qr);
      } catch {
        return;
      }
      if (!this.qrCode) {
        this.qrCode = new QRCodeStyling({
          width: THUMB_PX,
          height: THUMB_PX,
          data: content,
          dotsOptions: { color: qr.design.dotColor, type: qr.design.dotStyle as DotType },
          cornersSquareOptions: { type: qr.design.cornerStyle as CornerSquareType },
          backgroundOptions: { color: qr.design.bgColor },
        });
        this.qrCode.append(container.nativeElement);
      } else {
        this.qrCode.update({ data: content });
      }
    });
  }

  startEditDestination(): void {
    const qr = this.qrCodeData();
    if (!qr) {
      return;
    }
    this.destinationDraft.set(qr.destination ?? '');
    this.errorMessage.set(null);
    this.editingDestination.set(true);
  }

  cancelEditDestination(): void {
    this.editingDestination.set(false);
  }

  async saveDestination(): Promise<void> {
    this.busy.set(true);
    this.errorMessage.set(null);
    try {
      await this.codesService.updateDestination({
        codeId: this.code().id,
        destination: this.destinationDraft(),
      });
      this.editingDestination.set(false);
    } catch {
      this.errorMessage.set('No se pudo actualizar el destino.');
    } finally {
      this.busy.set(false);
    }
  }

  startEditName(): void {
    this.nameDraft.set(this.code().name);
    this.errorMessage.set(null);
    this.editingName.set(true);
  }

  cancelEditName(): void {
    this.editingName.set(false);
  }

  async saveName(): Promise<void> {
    const name = this.nameDraft().trim();
    if (!name) {
      this.errorMessage.set('El nombre no puede estar vacío.');
      return;
    }
    this.busy.set(true);
    this.errorMessage.set(null);
    try {
      await this.codesService.updateMeta({ codeId: this.code().id, name });
      this.editingName.set(false);
    } catch {
      this.errorMessage.set('No se pudo actualizar el nombre.');
    } finally {
      this.busy.set(false);
    }
  }

  async togglePause(): Promise<void> {
    this.busy.set(true);
    this.errorMessage.set(null);
    const nextStatus = this.code().status === 'paused' ? 'active' : 'paused';
    try {
      await this.codesService.updateStatus({ codeId: this.code().id, status: nextStatus });
    } catch {
      this.errorMessage.set('No se pudo actualizar el estado.');
    } finally {
      this.busy.set(false);
    }
  }

  async duplicate(): Promise<void> {
    const qr = this.qrCodeData();
    if (!qr) {
      return;
    }
    this.busy.set(true);
    this.errorMessage.set(null);
    try {
      await this.codesService.createQrCode({
        projectId: qr.projectId,
        qrMode: qr.qrMode,
        destination: qr.qrMode === 'dynamic' ? (qr.destination ?? '') : (qr.content ?? ''),
        design: qr.design,
        name: `Copia de ${this.code().name}`,
      });
    } catch {
      this.errorMessage.set('No se pudo duplicar el código.');
    } finally {
      this.busy.set(false);
    }
  }

  async download(): Promise<void> {
    await this.qrCode?.download({ name: this.code().name || 'qanora-qr', extension: 'png' });
  }
}
