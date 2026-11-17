import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { messageErreur } from '../../../core/services/toast.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, IconComponent],
  host: { class: 'lx' },
  styleUrl: '../auth-shell.scss',
  template: `
<div class="auth">
  <div class="auth-form-side">
    <div class="auth-box">
      <a routerLink="/" class="auth-brand">
        <span class="auth-brand-mark"><lx-icon name="car" [size]="16" /></span>
        <span class="auth-brand-name">Coviaride</span>
      </a>
      <h1 class="auth-title">Mot de passe oublié</h1>
      <p class="auth-sub">
        @if (!codeEnvoye()) { Recevez un code de réinitialisation par email. }
        @else { Saisissez le code reçu et votre nouveau mot de passe. }
      </p>

      @if (!codeEnvoye()) {
        <form class="auth-form" [formGroup]="form" (ngSubmit)="onSubmit()" novalidate>
          <div>
            <label class="lx-label-plain" for="f-email">Adresse email</label>
            <div class="lx-field has-icon">
              <span class="lx-field-icon"><lx-icon name="mail" /></span>
              <input id="f-email" class="lx-input auth-input" type="email" formControlName="email" placeholder="votre@email.com" autocomplete="email" />
            </div>
          </div>
          @if (erreur()) { <div class="lx-alert lx-alert-error"><lx-icon name="alert" /> {{ erreur() }}</div> }
          <button type="submit" class="lx-btn lx-btn-primary lx-btn-block lx-btn-lg" [disabled]="form.invalid || loading()">
            {{ loading() ? 'Envoi…' : 'Recevoir le code' }}
          </button>
        </form>
      } @else {
        <form class="auth-form" [formGroup]="resetForm" (ngSubmit)="onReset()" novalidate>
          @if (info()) { <div class="lx-alert lx-alert-success"><lx-icon name="check-circle" /> {{ info() }}</div> }
          <div>
            <label class="lx-label-plain" for="f-code">Code reçu par email</label>
            <input id="f-code" class="lx-input auth-input lx-mono" formControlName="code" placeholder="123456" inputmode="numeric" autocomplete="one-time-code" />
          </div>
          <div>
            <label class="lx-label-plain" for="f-pwd">Nouveau mot de passe</label>
            <div class="lx-field has-icon has-action">
              <span class="lx-field-icon"><lx-icon name="lock" /></span>
              <input id="f-pwd" class="lx-input auth-input" [type]="showPwd ? 'text' : 'password'" formControlName="nouveauMotDePasse" placeholder="••••••••" autocomplete="new-password" />
              <button type="button" class="lx-field-action" (click)="showPwd = !showPwd" [attr.aria-label]="showPwd ? 'Masquer' : 'Afficher'">
                <lx-icon [name]="showPwd ? 'eye-off' : 'eye'" />
              </button>
            </div>
            <div [class]="resetForm.get('nouveauMotDePasse')?.invalid && resetForm.get('nouveauMotDePasse')?.touched ? 'lx-error' : 'lx-help'">
              8 caractères minimum, avec une majuscule, une minuscule et un chiffre.
            </div>
          </div>
          @if (erreur()) { <div class="lx-alert lx-alert-error"><lx-icon name="alert" /> {{ erreur() }}</div> }
          <button type="submit" class="lx-btn lx-btn-primary lx-btn-block lx-btn-lg" [disabled]="resetForm.invalid || loading() || termine()">
            {{ loading() ? 'Validation…' : 'Valider le nouveau mot de passe' }}
          </button>
          <button type="button" class="lx-link" style="align-self:center" (click)="recommencer()">Changer d'adresse email</button>
        </form>
      }

      <p class="auth-foot"><a routerLink="/connexion">Retour à la connexion</a></p>
    </div>
  </div>

  <div class="auth-visual" aria-hidden="true">
    <img src="https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1600" alt="" />
    <span class="auth-visual-shade"></span>
    <div class="auth-visual-text">
      <h2>On s'occupe de tout</h2>
      <p>Un code à usage unique vous permet de choisir un nouveau mot de passe en toute sécurité.</p>
    </div>
  </div>
</div>
  `
})
export class ForgotPasswordComponent {
  form: FormGroup;
  resetForm: FormGroup;
  loading = signal(false);
  codeEnvoye = signal(false);
  termine = signal(false);
  info = signal('');
  erreur = signal('');
  showPwd = false;

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
      nouveauMotDePasse: ['', [Validators.required, Validators.minLength(8),
        Validators.pattern(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).{8,}$/)]]
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.erreur.set('');
    const email = (this.form.value.email as string).trim();

    this.authService.demanderResetPassword({ email }).subscribe({
      next: () => {
        this.codeEnvoye.set(true);
        this.resetForm.patchValue({ email });
        this.info.set(`Un code a été envoyé à ${email}.`);
        this.loading.set(false);
      },
      error: (err) => {
        this.erreur.set(messageErreur(err, "Impossible d'envoyer le code pour cet email."));
        this.loading.set(false);
      }
    });
  }

  onReset(): void {
    if (this.resetForm.invalid) { this.resetForm.markAllAsTouched(); return; }
    this.loading.set(true);
    this.erreur.set('');
    this.info.set('');

    this.authService.reinitialiserMotDePasse(this.resetForm.value).subscribe({
      next: () => {
        this.loading.set(false);
        this.termine.set(true);
        this.info.set('Mot de passe réinitialisé. Redirection vers la connexion…');
        setTimeout(() => this.router.navigate(['/connexion']), 1500);
      },
      error: (err) => {
        this.erreur.set(messageErreur(err, 'Code invalide ou expiré. Veuillez renouveler la demande.'));
        this.loading.set(false);
      }
    });
  }

  recommencer() {
    this.codeEnvoye.set(false);
    this.erreur.set('');
    this.info.set('');
    this.resetForm.reset();
  }
}
