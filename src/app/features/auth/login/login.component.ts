import { messageErreur } from '../../../core/services/toast.service';
import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
<div class="auth-split">
  <div class="auth-form-side">
    <div class="auth-logo">CoviaRide</div>
    <h1>Bon retour</h1>
    <p class="auth-subtitle">Connectez-vous à votre espace CoviaRide</p>
    <form class="auth-form" [formGroup]="form" (ngSubmit)="submit()">
      <div class="input" [class.error]="form.get('email')?.invalid && form.get('email')?.touched">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
        </svg>
        <input type="email" placeholder="Email" formControlName="email"/>
      </div>
      <div class="input">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        <input [type]="showPwd ? 'text' : 'password'" placeholder="Mot de passe" formControlName="motDePasse"/>
        <button type="button" (click)="showPwd=!showPwd" style="background:none;border:none;cursor:pointer">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;color:var(--color-muted)"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        </button>
      </div>
      @if (error()) { <div class="alert alert-error">{{ error() }}</div> }
      <button type="submit" class="btn btn-primary btn-full btn-lg" [disabled]="loading()">
        {{ loading() ? 'Connexion...' : 'Se connecter →' }}
      </button>
    </form>
    <div class="auth-footer">
      Pas encore inscrit ? <a routerLink="/inscription">Créer un compte</a>
    </div>
    <div class="auth-footer" style="margin-top:0.5rem">
      Première connexion ? <a routerLink="/valider-compte">Activer mon compte</a>
    </div>
    <div class="auth-footer" style="margin-top:0.5rem">
      <a routerLink="/mot-de-passe-oublie">Mot de passe oublié ?</a>
    </div>
  </div>
  <div class="auth-hero-side">
    <div style="background-image:url('https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&q=80');background-size:cover;background-position:center;width:100%;height:100%;display:flex;align-items:flex-end;padding:2rem">
      <div class="hero-overlay" style="width:100%;background:rgba(255,255,255,0.88)">
        <div class="hero-stats">
          <div class="stat"><div class="value">2,500+</div><div class="label">Chauffeurs</div></div>
          <div class="stat"><div class="value">4.9</div><div class="label">Note moyenne</div></div>
          <div class="stat"><div class="value">50k+</div><div class="label">Courses</div></div>
        </div>
      </div>
    </div>
  </div>
</div>`,
  styles: []
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
    this.auth.connexion(this.form.value as any).subscribe({
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