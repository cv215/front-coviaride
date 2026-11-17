import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { messageErreur } from '../../../core/services/toast.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';

@Component({
  selector: 'app-validate-password',
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
      <h1 class="auth-title">Activez votre compte</h1>
      <p class="auth-sub">Saisissez le mot de passe temporaire reçu par email, puis choisissez votre mot de passe.</p>

      <form class="auth-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <div>
          <label class="lx-label-plain" for="v-email">Adresse email</label>
          <div class="lx-field has-icon">
            <span class="lx-field-icon"><lx-icon name="mail" /></span>
            <input id="v-email" class="lx-input auth-input" type="email" formControlName="email" placeholder="votre@email.com" autocomplete="email" />
          </div>
        </div>
        <div>
          <label class="lx-label-plain" for="v-tmp">Mot de passe temporaire</label>
          <div class="lx-field has-icon has-action">
            <span class="lx-field-icon"><lx-icon name="lock" /></span>
            <input id="v-tmp" class="lx-input auth-input" [type]="showPwdT ? 'text' : 'password'" formControlName="motDePasseTemporaire"
              placeholder="Reçu par email" autocomplete="one-time-code" />
            <button type="button" class="lx-field-action" (click)="showPwdT = !showPwdT" [attr.aria-label]="showPwdT ? 'Masquer' : 'Afficher'">
              <lx-icon [name]="showPwdT ? 'eye-off' : 'eye'" />
            </button>
          </div>
        </div>
        <div>
          <label class="lx-label-plain" for="v-new">Nouveau mot de passe</label>
          <div class="lx-field has-icon has-action">
            <span class="lx-field-icon"><lx-icon name="lock" /></span>
            <input id="v-new" class="lx-input auth-input" [type]="showPwd ? 'text' : 'password'" formControlName="nouveauMotDePasse"
              placeholder="••••••••" autocomplete="new-password" />
            <button type="button" class="lx-field-action" (click)="showPwd = !showPwd" [attr.aria-label]="showPwd ? 'Masquer' : 'Afficher'">
              <lx-icon [name]="showPwd ? 'eye-off' : 'eye'" />
            </button>
          </div>
          <div [class]="form.get('nouveauMotDePasse')?.invalid && form.get('nouveauMotDePasse')?.touched ? 'lx-error' : 'lx-help'">
            8 caractères minimum, avec une majuscule, une minuscule et un chiffre.
          </div>
        </div>

        @if (error()) { <div class="lx-alert lx-alert-error"><lx-icon name="alert" /> {{ error() }}</div> }
        @if (success()) { <div class="lx-alert lx-alert-success"><lx-icon name="check-circle" /> {{ success() }}</div> }

        <button type="submit" class="lx-btn lx-btn-primary lx-btn-block lx-btn-lg" [disabled]="loading() || !!success()">
          @if (loading()) { <lx-icon name="refresh" class="lx-spin" /> Activation… } @else { Activer mon compte }
        </button>
      </form>
      <p class="auth-foot"><a routerLink="/connexion">Retour à la connexion</a></p>
    </div>
  </div>

  <div class="auth-visual" aria-hidden="true">
    <img src="https://images.unsplash.com/photo-1582834202430-ddcd18987a61?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1600" alt="" />
    <span class="auth-visual-shade"></span>
    <div class="auth-visual-text">
      <h2>Vérifiez votre boîte mail</h2>
      <p>Votre mot de passe temporaire vient de vous être envoyé. Pensez à regarder dans les courriers indésirables.</p>
    </div>
  </div>
</div>`
})
export class ValidatePasswordComponent {
  showPwdT = false;
  showPwd = false;
  loading = signal(false);
  error = signal('');
  success = signal('');
  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    motDePasseTemporaire: ['', Validators.required],
    nouveauMotDePasse: ['', [Validators.required, Validators.minLength(8),
      Validators.pattern(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).{8,}$/)]]
  });

  constructor(private fb: FormBuilder, private auth: AuthService,
              private router: Router, private route: ActivatedRoute) {
    const email = this.route.snapshot.queryParamMap.get('email');
    if (email) this.form.patchValue({ email });
  }

  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);
    this.error.set('');
    const v = this.form.getRawValue();
    this.auth.validerMotDePasse({
      email: (v.email ?? '').trim(),
      motDePasseTemporaire: (v.motDePasseTemporaire ?? '').trim(),
      nouveauMotDePasse: v.nouveauMotDePasse ?? ''
    }).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.success.set('Compte activé ! Redirection…');
        // Même logique d'orientation que l'écran de connexion
        const espace = res.role === 'SUPER_ADMIN' ? '/admin'
          : (res.role === 'CHAUFFEUR' || res.role === 'PASSAGER_ET_CHAUFFEUR') ? '/chauffeur' : '/client';
        setTimeout(() => this.router.navigate([espace + '/dashboard']), 1500);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(messageErreur(err, 'Mot de passe temporaire incorrect.'));
      }
    });
  }
}
