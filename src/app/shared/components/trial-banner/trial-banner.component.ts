import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

@Component({
  selector: 'app-trial-banner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visible()) {
      <div
        class="flex items-center justify-between gap-4 px-4 py-2 text-sm"
        [class.bg-status-paused]="urgent()"
        [class.text-white]="urgent()"
        [class.bg-brand-100]="!urgent()"
        [class.text-brand-900]="!urgent()"
      >
        <span>
          @if (daysRemaining() > 0) {
            Te quedan {{ daysRemaining() }} {{ daysRemaining() === 1 ? 'dia' : 'dias' }} de prueba.
          } @else {
            Tu prueba gratuita termino.
          }
        </span>
        @if (!urgent()) {
          <button type="button" class="underline" (click)="dismiss()">Cerrar</button>
        }
      </div>
    }
  `,
})
export class TrialBannerComponent {
  readonly daysRemaining = input.required<number>();

  private readonly dismissed = signal(false);

  readonly urgent = computed(() => this.daysRemaining() <= 5);
  readonly visible = computed(() => this.urgent() || !this.dismissed());

  dismiss(): void {
    this.dismissed.set(true);
  }
}
