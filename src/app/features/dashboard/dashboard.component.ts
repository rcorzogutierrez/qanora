import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AccountService } from '../../core/account/account.service';
import { AuthService } from '../../core/auth/auth.service';
import { CodesService } from '../../core/codes/codes.service';
import { TrialBannerComponent } from '../../shared/components/trial-banner/trial-banner.component';
import { CodeCardComponent } from './code-card/code-card.component';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [TrialBannerComponent, RouterLink, CodeCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent {
  private readonly accountService = inject(AccountService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly codesService = inject(CodesService);

  readonly account = this.accountService.account;
  readonly codes = this.codesService.codes;

  readonly daysRemaining = computed(() => {
    const account = this.account();
    if (!account) {
      return 0;
    }
    const msRemaining = account.trialEndsAt.toDate().getTime() - Date.now();
    return Math.max(0, Math.ceil(msRemaining / MS_PER_DAY));
  });

  async signOut(): Promise<void> {
    await this.authService.signOutUser();
    await this.router.navigateByUrl('/auth/login');
  }
}
