import { messageErreur } from '../../../core/services/toast.service';
import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';

@Component({
  selector: 'app-login',
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
      <h1 class="auth-title">Connexion</h1>
      <p class="auth-sub">Accédez à votre espace personnel</p>

      <form class="auth-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <div>
          <label class="lx-label-plain" for="login-email">Adresse email</label>
          <div class="lx-field has-icon">
            <span class="lx-field-icon"><lx-icon name="mail" /></span>
            <input id="login-email" class="lx-input auth-input" type="email" placeholder="votre@email.com"
              formControlName="email" autocomplete="email" />
          </div>
          @if (form.get('email')?.invalid && form.get('email')?.touched) {
            <div class="lx-error">Saisissez une adresse email valide.</div>
          }
        </div>

        <div>
          <label class="lx-label-plain" for="login-pwd">Mot de passe</label>
          <div class="lx-field has-icon has-action">
            <span class="lx-field-icon"><lx-icon name="lock" /></span>
            <input id="login-pwd" class="lx-input auth-input" [type]="showPwd ? 'text' : 'password'" placeholder="••••••••"
              formControlName="motDePasse" autocomplete="current-password" />
            <button type="button" class="lx-field-action" (click)="showPwd = !showPwd"
              [attr.aria-label]="showPwd ? 'Masquer le mot de passe' : 'Afficher le mot de passe'">
              <lx-icon [name]="showPwd ? 'eye-off' : 'eye'" />
            </button>
          </div>
          @if (form.get('motDePasse')?.invalid && form.get('motDePasse')?.touched) {
            <div class="lx-error">Le mot de passe est obligatoire.</div>
          }
        </div>

        <div class="auth-row">
          <a routerLink="/valider-compte" class="lx-link">Activer mon compte</a>
          <a routerLink="/mot-de-passe-oublie" class="lx-link">Mot de passe oublié ?</a>
        </div>

        @if (error()) { <div class="lx-alert lx-alert-error"><lx-icon name="alert" /> {{ error() }}</div> }

        <button type="submit" class="lx-btn lx-btn-primary lx-btn-block lx-btn-lg" [disabled]="loading()">
          @if (loading()) { <lx-icon name="refresh" class="lx-spin" /> Connexion… } @else { Se connecter }
        </button>
      </form>

      <p class="auth-foot">Pas encore de compte ? <a routerLink="/inscription">Inscrivez-vous</a></p>
    </div>
  </div>

  <div class="auth-visual" aria-hidden="true">
    <img src="https://images.unsplash.com/photo-1582834202430-ddcd18987a61?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1600" alt="" />
    <span class="auth-visual-shade"></span>
    <div class="auth-visual-text">
      <h2>Voyagez l'esprit tranquille</h2>
      <p>Réservez, suivez votre chauffeur en direct et payez en toute sécurité.</p>
    </div>
  </div>
</div>`
})
export class LoginComponent {
  showPwd = false;
  loading = signal(false);
  error = signal('');
  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    motDePasse: ['', Validators.required]
  });

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router, private route: ActivatedRoute) {
    if (this.route.snapshot.queryParamMap.get('expire')) {
      this.error.set('Votre session a expiré. Reconnectez-vous pour continuer.');
    }
  }

  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);
    this.error.set('');
    const { email, motDePasse } = this.form.getRawValue();
    this.auth.connexion({ email: (email ?? '').trim(), motDePasse: motDePasse ?? '' }).subscribe({
      next: (res) => {
        this.loading.set(false);
        const role = res.role;
        const retour = this.route.snapshot.queryParamMap.get('retour');
        const espace = role === 'SUPER_ADMIN' ? '/admin'
          : (role === 'CHAUFFEUR' || role === 'PASSAGER_ET_CHAUFFEUR') ? '/chauffeur' : '/client';
        if (retour && retour.startsWith(espace)) {
          this.router.navigateByUrl(retour);
        } else {
          this.router.navigate([espace + '/dashboard']);
        }
      },
      error: (err) => {
        this.loading.set(false);
        if (err.status === 401) {
          this.error.set('Email ou mot de passe incorrect. Veuillez réessayer.');
        } else {
          this.error.set(messageErreur(err, 'Erreur de connexion.'));
        }
      }
    });
  }
}
