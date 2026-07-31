import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { PasswordStrengthComponent } from '../../../shared/components/password-strength/password-strength.component';


@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink,PasswordStrengthComponent],
  template: `
<div class="auth-split">
  <!-- FORM SIDE -->
  <div class="auth-form-side">
    <div class="auth-logo">CoviaRide</div>
    <div class="back-link">
      <a routerLink="/" class="btn btn-ghost btn-sm">← Retour</a>
    </div>
    <h1>Créer un compte</h1>
    <p class="auth-subtitle">Rejoignez CoviaRide en quelques minutes</p>

    <!-- ROLE TOGGLE -->
    <div class="role-toggle" style="margin-bottom:1.5rem">
      <button class="role-btn" [class.selected]="role()==='PASSAGER'" (click)="setRole('PASSAGER')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
        <span>Client</span>
      </button>
      <button class="role-btn" [class.selected]="role()==='CHAUFFEUR'" (click)="setRole('CHAUFFEUR')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="1" y="3" width="15" height="13"/>
          <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
          <circle cx="5.5" cy="18.5" r="2.5"/>
          <circle cx="18.5" cy="18.5" r="2.5"/>
        </svg>
        <span>Chauffeur</span>
      </button>
    </div>

    <form class="auth-form" [formGroup]="form" (ngSubmit)="submit()">
      <div class="input">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
        <input type="text" placeholder="Nom complet" formControlName="nom"/>
      </div>

      <div class="input">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
          <polyline points="22,6 12,13 2,6"/>
        </svg>
        <input type="email" placeholder="Email" formControlName="email"/>
      </div>

      <div class="input">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.84h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.4a16 16 0 0 0 5.69 5.69l1.6-1.6a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
        </svg>
        <input type="tel" placeholder="Téléphone" formControlName="telephone"/>
      </div>

      <div>
  <!-- Champ mot de passe (inchangé) -->
  <div class="input" style="margin-bottom: 0.5rem">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
    <input
      [type]="showPwd ? 'text' : 'password'"
      placeholder="Mot de passe"
      formControlName="motDePasse"
      (input)="onPwdInput($event)"/>
    <button type="button" (click)="showPwd=!showPwd"
      style="background:none;border:none;cursor:pointer;padding:0">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    </button>
  </div>

  <!-- AIDE INITIALE avant de commencer à taper -->
  <div *ngIf="pwdValue.length === 0" style="
    display:flex; align-items:flex-start; gap:0.4rem;
    padding:0.6rem 0.75rem; background:#EFF6FF;
    border:1px solid #BFDBFE; border-radius:8px;
    font-size:0.8rem; color:#1E40AF; line-height:1.5">
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor"
      stroke-width="1.8" style="width:14px;flex-shrink:0;margin-top:1px">
      <circle cx="10" cy="10" r="8"/>
      <line x1="10" y1="6" x2="10" y2="11"/>
      <circle cx="10" cy="14" r="0.5" fill="currentColor"/>
    </svg>
    votre mot de passe doit contenir 8 caractères : <br>· une Majuscule <br>· une minuscule <br>· un chiffre <br>· un signe (&#64;#$%!)
  </div>

  <!-- INDICATEUR DE FORCE (s'affiche dès le 1er caractère) -->
  <app-password-strength
    *ngIf="pwdValue.length > 0"
    [password]="pwdValue">
  </app-password-strength>
</div>

      <div class="form-group">
        <label>Date de naissance (doit avoir ≥ 18 ans)</label>
        <input type="date" class="field" formControlName="dateNaissance" [max]="maxDate"/>
      </div>

      @if (role() === 'CHAUFFEUR') {
        <div class="input">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
            <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
          </svg>
          <input type="text" placeholder="Modèle de voiture" formControlName="modeleVoiture"/>
        </div>
        <div class="input">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
            <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
          </svg>
          <input type="text" placeholder="Plaque d'immatriculation" formControlName="immatriculation"/>
        </div>
        <div class="input">
          <input type="text" placeholder="Numéro de permis" formControlName="numeroPermis"/>
        </div>
      }

      @if (error()) {
        <div class="alert alert-error">{{ error() }}</div>
      }
      @if (success()) {
        <div class="alert alert-success">{{ success() }}</div>
      }

      <button type="submit" class="btn btn-primary btn-full btn-lg"
        [disabled]="loading() || form.invalid || !pwdStrong">
        {{ loading() ? 'Création en cours...' : 'Créer mon compte →' }}
      </button>
    </form>

    <div class="auth-footer">
      Déjà inscrit ? <a routerLink="/connexion">Se connecter</a>
    </div>
  </div>

  <!-- HERO SIDE -->
  <div class="auth-hero-side">
    <div class="hero-bg">
      <div class="hero-overlay">
        <div class="hero-stats">
          <div class="stat"><div class="value">2,500+</div><div class="label">Chauffeurs</div></div>
          <div class="stat"><div class="value">4.9</div><div class="label">Note moyenne</div></div>
          <div class="stat"><div class="value">50k+</div><div class="label">Courses</div></div>
        </div>
        <div class="hero-features" style="margin-top:1rem">
          <div class="feature">
            <div class="check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></div>
            Inscription gratuite et rapide
          </div>
          <div class="feature">
            <div class="check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></div>
            Pas de frais cachés
          </div>
          <div class="feature">
            <div class="check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></div>
            Support client 24/7
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
  `,
  styles: [`
    .back-link { margin-bottom:1.5rem; }
    .hero-bg {
      background: linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%);
      width:100%; height:100%; display:flex; align-items:flex-end; padding:2rem; }
    .hero-features .feature { display:flex; align-items:center; gap:0.6rem; font-size:0.9rem; }
    .check { width:22px;height:22px;border-radius:50%;background:#f0f0f0;
      display:flex;align-items:center;justify-content:center;flex-shrink:0;
      svg{width:12px;height:12px;} }
  `]
})
export class RegisterComponent {
  role = signal<'PASSAGER' | 'CHAUFFEUR'>('PASSAGER');
  loading = signal(false);
  error = signal('');
  success = signal('');
  showPwd  = false;
  pwdValue = '';      // ← AJOUTER
  pwdStrong = false;  // ← AJOUTER
  maxDate: string;

  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    this.maxDate = d.toISOString().split('T')[0];

    this.form = this.fb.group({
      nom: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      telephone: ['', [Validators.required, Validators.pattern(/^(\+?237)?[6-9][0-9]{8}$/)]],
      motDePasse: ['', [Validators.required, Validators.minLength(8),
        Validators.pattern(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).{8,}$/)]],
      dateNaissance: ['', Validators.required],
      modeleVoiture: [''],
      immatriculation: [''],
      numeroPermis: ['']
    });
  }

  // ← AJOUTER CETTE MÉTHODE
  onPwdInput(event: Event) {
  const val = (event.target as HTMLInputElement).value;
  this.pwdValue = val;
  this.pwdStrong = val.length >= 8
    && /[A-Z]/.test(val)
    && /[a-z]/.test(val)
    && /[0-9]/.test(val)
    && /[@#$%&!*\-_=+?^]/.test(val);
  }

  setRole(r: 'PASSAGER' | 'CHAUFFEUR') {
    this.role.set(r);
    if (r === 'CHAUFFEUR') {
      this.form.get('numeroPermis')?.setValidators(Validators.required);
    } else {
      this.form.get('numeroPermis')?.clearValidators();
    }
    this.form.get('numeroPermis')?.updateValueAndValidity();
  }

  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);
    this.error.set('');

    const v = this.form.value;
    const [prenom, ...rest] = (v.nom as string).split(' ');

    this.authService.inscrire({
      nom: rest.join(' ') || prenom,
      prenom,
      email: v.email,
      telephone: v.telephone,
      dateNaissance: v.dateNaissance,
      role: this.role(),
      numeroPermis: v.numeroPermis || undefined,
      modeleVoiture: v.modeleVoiture || undefined,
      immatriculation: v.immatriculation || undefined,
    }).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.success.set(res.message + ' Vérifiez votre email pour activer votre compte.');
        setTimeout(() => this.router.navigate(['/valider-compte'], {
          queryParams: { email: v.email }
        }), 2000);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message || 'Une erreur est survenue');
      }
    });
  }
}
