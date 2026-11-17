import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-validate-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
<div class="auth-split">
  <div class="auth-form-side">
    <div class="auth-logo">CoviaRide</div>
    <h1>Activez votre compte</h1>
    <p class="auth-subtitle">Saisissez le mot de passe temporaire reçu par email et choisissez votre mot de passe permanent</p>
    <form class="auth-form" [formGroup]="form" (ngSubmit)="submit()">
      <div class="form-group">
        <label>Email</label>
        <input type="email" class="field" formControlName="email" placeholder="votre@email.com"/>
      </div>
      <div class="input">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        <input [type]="showPwdT ? 'text' : 'password'" placeholder="Mot de passe temporaire (reçu par email)" formControlName="motDePasseTemporaire"/>
        <button type="button" (click)="showPwdT=!showPwdT" style="background:none;border:none;cursor:pointer">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;color:var(--color-muted)"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        </button>
      </div>
      <div class="input">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        <input [type]="showPwd ? 'text' : 'password'" placeholder="Nouveau mot de passe (8+ car., Maj, chiffre)" formControlName="nouveauMotDePasse"/>
        <button type="button" (click)="showPwd=!showPwd" style="background:none;border:none;cursor:pointer">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;color:var(--color-muted)"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        </button>
      </div>
      <div class="alert alert-info" style="font-size:0.85rem">
        Le mot de passe doit contenir au minimum 8 caractères, une majuscule et un chiffre.
      </div>
      @if (error()) { <div class="alert alert-error">{{ error() }}</div> }
      @if (success()) { <div class="alert alert-success">{{ success() }}</div> }
      <button type="submit" class="btn btn-primary btn-full btn-lg" [disabled]="loading() || form.invalid">
        {{ loading() ? 'Activation...' : 'Activer mon compte →' }}
      </button>
    </form>
    <div class="auth-footer"><a routerLink="/connexion">← Retour à la connexion</a></div>
  </div>
  <div class="auth-hero-side">
    <div class="activation-hero-bg">
      <div class="activation-hero-content">
        <div class="activation-icon">✉️</div>
        <h2>Vérifiez votre email</h2>
        <p>Un email avec votre mot de passe temporaire a été envoyé à votre adresse</p>
      </div>
    </div>
  </div>
</div>`,
  styles: [`
    .auth-hero-side {
      min-height: 100%;
    }
    .activation-hero-bg {
      background-image: linear-gradient(rgba(1, 34, 29, 0.55), rgba(4, 116, 91, 0.62)), url('https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&q=80');
      background-size: cover;
      background-position: center;
      width: 100%;
      height: 100%;
      min-height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 3rem;
    }
    .activation-hero-content {
      text-align: center;
      color: white;
      max-width: 420px;
      padding: 2rem;
      border-radius: 1rem;
      background: rgba(6, 30, 24, 0.46);
      backdrop-filter: blur(6px);
    }
    .activation-icon {
      font-size: 5rem;
      margin-bottom: 1rem;
    }
    .activation-hero-content h2 {
      color: white;
      font-size: 1.75rem;
      margin-bottom: 0.5rem;
    }
    .activation-hero-content p {
      color: rgba(255,255,255,0.88);
      line-height: 1.7;
    }
  `]
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
    if (this.form.invalid) return;
    this.loading.set(true); this.error.set('');
    this.auth.validerMotDePasse(this.form.value as any).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.success.set('Compte activé ! Redirection...');
        setTimeout(() => {
          if (res.role === 'SUPER_ADMIN') this.router.navigate(['/admin']);
          else if (res.role === 'CHAUFFEUR') this.router.navigate(['/chauffeur']);
          else this.router.navigate(['/client']);
        }, 1500);
      },
      error: (err) => { this.loading.set(false); this.error.set(err.error?.message || 'Code incorrect'); }
    });
  }
}
