import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './register.component.html',
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.errorMessage.set(null);
    const { email, password } = this.form.getRawValue();
    try {
      await this.auth.signUp(email, password);
      await this.router.navigateByUrl('/dashboard');
    } catch {
      this.errorMessage.set('No se pudo crear la cuenta. Probá con otro email.');
    } finally {
      this.submitting.set(false);
    }
  }

  async submitWithGoogle(): Promise<void> {
    this.submitting.set(true);
    this.errorMessage.set(null);
    try {
      await this.auth.signInWithGoogle();
      await this.router.navigateByUrl('/dashboard');
    } catch {
      this.errorMessage.set('No se pudo continuar con Google.');
    } finally {
      this.submitting.set(false);
    }
  }
}
