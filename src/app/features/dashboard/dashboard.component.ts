import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AccountService } from '../../core/account/account.service';
import { AuthService } from '../../core/auth/auth.service';
import { TrialBannerComponent } from '../../shared/components/trial-banner/trial-banner.component';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [TrialBannerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent {
  private readonly accountService = inject(AccountService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly account = this.accountService.account;

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
