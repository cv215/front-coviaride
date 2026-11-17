import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-shell">
      <div class="auth-card">
        <h2>Réinitialiser le mot de passe</h2>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" *ngIf="!isCodeSent; else resetStep">
          <div class="field">
            <label>Email</label>
            <input type="email" formControlName="email" placeholder="ex: nom@email.com" />
          </div>

          <button type="submit" [disabled]="form.invalid || loading">
            {{ loading ? 'Envoi...' : 'Recevoir le code' }}
          </button>
        </form>

        <ng-template #resetStep>
          <form [formGroup]="resetForm" (ngSubmit)="onReset()">
            <div class="field">
              <label>Email</label>
              <input type="email" formControlName="email" placeholder="ex: nom@email.com" />
            </div>

            <div class="field">
              <label>Code reçu par email</label>
              <input type="text" formControlName="code" placeholder="123456" />
            </div>

            <div class="field">
              <label>Nouveau mot de passe</label>
              <input type="password" formControlName="nouveauMotDePasse" placeholder="••••••••" />
            </div>

            <button type="submit" [disabled]="resetForm.invalid || loading">
              {{ loading ? 'Validation...' : 'Valider le mot de passe' }}
            </button>
          </form>
        </ng-template>

        <div class="auth-footer">
          <a routerLink="/connexion">Retour à la connexion</a>
        </div>

        <div class="message" *ngIf="message">{{ message }}</div>
      </div>
    </div>
  `,
  styles: [
    `
      .auth-shell {
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: #f4f7fb;
        padding: 24px;
      }
      .auth-card {
        width: min(460px, 100%);
        background: white;
        border-radius: 16px;
        padding: 28px;
        box-shadow: 0 12px 32px rgba(16, 24, 40, 0.08);
      }
      h2 {
        margin: 0 0 18px;
        text-align: center;
      }
      form {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .field {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      input {
        border: 1px solid #d7dce5;
        border-radius: 10px;
        padding: 12px 14px;
        font-size: 15px;
      }
      button {
        background: #1f6feb;
        color: #fff;
        border: none;
        border-radius: 10px;
        padding: 12px 16px;
        font-weight: 600;
        cursor: pointer;
      }
      button[disabled] {
        opacity: 0.6;
        cursor: not-allowed;
      }
      .auth-footer {
        text-align: center;
        margin-top: 16px;
      }
      .auth-footer a {
        color: #1f6feb;
        text-decoration: none;
      }
      .message {
        margin-top: 16px;
        color: #0b7a4d;
        font-weight: 600;
        text-align: center;
      }
    `
  ]
})
export class ForgotPasswordComponent {
  form: FormGroup;
  resetForm: FormGroup;
  loading = false;
  isCodeSent = false;
  message = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });

    this.resetForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      code: ['', [Validators.required, Validators.minLength(4)]],
      nouveauMotDePasse: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.loading = true;
    this.message = '';

    this.authService.demanderResetPassword({ email: this.form.value.email }).subscribe({
      next: () => {
        this.isCodeSent = true;
        this.resetForm.patchValue({ email: this.form.value.email });
        this.message = 'Un code de validation a été envoyé à votre email.';
        this.loading = false;
      },
      error: () => {
        this.message = 'Impossible d’envoyer le code pour cet email.';
        this.loading = false;
      }
    });
  }

  onReset(): void {
    if (this.resetForm.invalid) return;

    this.loading = true;
    this.message = '';

    this.authService.reinitialiserMotDePasse(this.resetForm.value).subscribe({
      next: () => {
        this.message = 'Mot de passe réinitialisé avec succès.';
        this.loading = false;
        setTimeout(() => this.router.navigate(['/connexion']), 1200);
      },
      error: () => {
        this.message = 'Code invalide ou expiré. Veuillez renouveler la demande.';
        this.loading = false;
      }
    });
  }
}
