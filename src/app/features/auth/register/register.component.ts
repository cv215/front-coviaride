import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { messageErreur } from '../../../core/services/toast.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';

/**
 * Inscription.
 * Le mot de passe n'est pas choisi ici : le serveur génère un mot de passe
 * temporaire envoyé par email, que l'utilisateur remplace sur « Activer mon compte ».
 */
@Component({
  selector: 'app-register',
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
      <h1 class="auth-title">Inscription</h1>
      <p class="auth-sub" style="margin-bottom:2rem">Créez votre compte en quelques minutes</p>

      <span class="lx-label-plain">Je suis un</span>
      <div class="roles" role="radiogroup" aria-label="Type de compte">
        <button type="button" class="role" role="radio" [attr.aria-checked]="role() === 'PASSAGER'"
          [class.is-active]="role() === 'PASSAGER'" (click)="setRole('PASSAGER')">
          <lx-icon name="user" [size]="24" /><span>Client</span>
        </button>
        <button type="button" class="role" role="radio" [attr.aria-checked]="role() === 'CHAUFFEUR'"
          [class.is-active]="role() === 'CHAUFFEUR'" (click)="setRole('CHAUFFEUR')">
          <lx-icon name="car" [size]="24" /><span>Chauffeur</span>
        </button>
      </div>

      <form class="auth-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <div class="lx-form-grid">
          <div>
            <label class="lx-label-plain" for="r-prenom">Prénom</label>
            <input id="r-prenom" class="lx-input" formControlName="prenom" placeholder="Jean" autocomplete="given-name" />
            @if (invalide('prenom')) { <div class="lx-error">2 caractères minimum</div> }
          </div>
          <div>
            <label class="lx-label-plain" for="r-nom">Nom</label>
            <input id="r-nom" class="lx-input" formControlName="nom" placeholder="Dupont" autocomplete="family-name" />
            @if (invalide('nom')) { <div class="lx-error">2 caractères minimum</div> }
          </div>
        </div>

        <div>
          <label class="lx-label-plain" for="r-email">Adresse email</label>
          <div class="lx-field has-icon">
            <span class="lx-field-icon"><lx-icon name="mail" /></span>
            <input id="r-email" class="lx-input" type="email" formControlName="email" placeholder="votre@email.com" autocomplete="email" />
          </div>
          @if (invalide('email')) { <div class="lx-error">Adresse email invalide</div> }
        </div>

        <div class="lx-form-grid">
          <div>
            <label class="lx-label-plain" for="r-tel">Téléphone</label>
            <div class="lx-field has-icon">
              <span class="lx-field-icon"><lx-icon name="phone" /></span>
              <input id="r-tel" class="lx-input" type="tel" formControlName="telephone" placeholder="650000000" autocomplete="tel" />
            </div>
            @if (invalide('telephone')) { <div class="lx-error">Numéro camerounais (ex : 650000000)</div> }
          </div>
          <div>
            <label class="lx-label-plain" for="r-dn">Date de naissance</label>
            <input id="r-dn" class="lx-input" type="date" formControlName="dateNaissance" [max]="maxDate" />
            @if (invalide('dateNaissance')) { <div class="lx-error">Vous devez avoir 18 ans</div> }
          </div>
        </div>

        @if (role() === 'CHAUFFEUR') {
          <div class="driver-fields">
            <div>
              <label class="lx-label-plain" for="r-voiture">Modèle de voiture</label>
              <div class="lx-field has-icon">
                <span class="lx-field-icon"><lx-icon name="car" /></span>
                <input id="r-voiture" class="lx-input" formControlName="modeleVoiture" placeholder="Toyota Corolla" />
              </div>
            </div>
            <div class="lx-form-grid">
              <div>
                <label class="lx-label-plain" for="r-immat">Immatriculation</label>
                <input id="r-immat" class="lx-input lx-mono" formControlName="immatriculation" placeholder="LT 123 AB" />
              </div>
              <div>
                <label class="lx-label-plain" for="r-permis">Numéro de permis</label>
                <input id="r-permis" class="lx-input lx-mono" formControlName="numeroPermis" placeholder="123456789" />
                @if (invalide('numeroPermis')) { <div class="lx-error">Obligatoire pour un chauffeur</div> }
              </div>
            </div>
          </div>
        }

        <div>
          <label class="lx-label-plain" for="r-parrain">Code de parrainage <span class="lx-muted">(facultatif)</span></label>
          <div class="lx-field has-icon">
            <span class="lx-field-icon"><lx-icon name="gift" /></span>
            <input id="r-parrain" class="lx-input lx-mono" formControlName="codeParrainage" placeholder="CR0001XXXX" autocomplete="off" />
          </div>
        </div>

        <div class="lx-alert lx-alert-info">
          <lx-icon name="mail" />
          <span>Un mot de passe temporaire vous sera envoyé par email. Vous choisirez votre mot de passe définitif en activant votre compte.</span>
        </div>

        <label class="lx-check">
          <input type="checkbox" formControlName="cgu" />
          <span>J'accepte les conditions d'utilisation et la politique de confidentialité de Coviaride.</span>
        </label>

        @if (error()) { <div class="lx-alert lx-alert-error"><lx-icon name="alert" /> {{ error() }}</div> }
        @if (success()) { <div class="lx-alert lx-alert-success"><lx-icon name="check-circle" /> {{ success() }}</div> }

        <button type="submit" class="lx-btn lx-btn-primary lx-btn-block lx-btn-lg" [disabled]="loading() || !!success()">
          @if (loading()) { <lx-icon name="refresh" class="lx-spin" /> Création en cours… } @else { Créer mon compte }
        </button>
      </form>

      <p class="auth-foot">Déjà inscrit ? <a routerLink="/connexion">Se connecter</a></p>
    </div>
  </div>

  <div class="auth-visual" aria-hidden="true">
    <img [src]="role() === 'CHAUFFEUR'
      ? 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1600'
      : 'https://images.unsplash.com/photo-1628188735694-354dbb2c6eef?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1600'" alt="" />
    <span class="auth-visual-shade"></span>
    <div class="auth-tiles">
      <div class="auth-tiles-grid">
        <div class="auth-tile"><span class="lx-icon-tile"><lx-icon name="shield-check" /></span><strong>Vérifiés</strong><span>Chauffeurs contrôlés</span></div>
        <div class="auth-tile"><span class="lx-icon-tile"><lx-icon name="smartphone" /></span><strong>Mobile Money</strong><span>MTN et Orange</span></div>
        <div class="auth-tile"><span class="lx-icon-tile"><lx-icon name="navigation" /></span><strong>Suivi GPS</strong><span>En temps réel</span></div>
        <div class="auth-tile"><span class="lx-icon-tile"><lx-icon name="message" /></span><strong>7j / 7</strong><span>Service client</span></div>
      </div>
    </div>
  </div>
</div>
  `,
  styles: [`
    .roles { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; margin-bottom: 1.75rem; }
    .role {
      display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 1rem 1.5rem; cursor: pointer;
      background: var(--lx-input); color: rgba(240, 236, 227, 0.4); border: 2px solid rgba(240, 236, 227, 0.1);
      border-radius: var(--lx-r-md); font-size: 0.95rem; transition: border-color 0.15s, background 0.15s, color 0.15s;
      span { color: var(--lx-fg); }
      &:hover { border-color: rgba(240, 236, 227, 0.2); }
      &.is-active { border-color: var(--lx-primary); background: rgba(200, 146, 42, 0.05); color: var(--lx-primary); }
    }
    .driver-fields { display: flex; flex-direction: column; gap: 1.25rem; animation: lx-rise 0.3s ease-out; }
  `]
})
export class RegisterComponent {
  role = signal<'PASSAGER' | 'CHAUFFEUR'>('PASSAGER');
  loading = signal(false);
  error = signal('');
  success = signal('');
  maxDate: string;

  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    route: ActivatedRoute
  ) {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    const p = (n: number) => String(n).padStart(2, '0');
    this.maxDate = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;

    this.form = this.fb.group({
      prenom: ['', [Validators.required, Validators.minLength(2)]],
      nom: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      telephone: ['', [Validators.required, Validators.pattern(/^(\+?237)?[6-9][0-9]{8}$/)]],
      dateNaissance: ['', [Validators.required, (c: any) => this.majeur(c.value)]],
      modeleVoiture: [''],
      immatriculation: [''],
      numeroPermis: [''],
      codeParrainage: [''],
      cgu: [false, Validators.requiredTrue]
    });

    const r = route.snapshot.queryParamMap.get('role');
    const code = route.snapshot.queryParamMap.get('code');
    if (r === 'chauffeur') this.setRole('CHAUFFEUR');
    if (code) this.form.patchValue({ codeParrainage: code });
  }

  /** Vérifie l'âge minimal même si le navigateur ignore l'attribut max. */
  private majeur(valeur: string) {
    if (!valeur) return null;
    return valeur <= this.maxDate ? null : { mineur: true };
  }

  invalide(champ: string): boolean {
    const c = this.form.get(champ);
    return !!c && c.invalid && c.touched;
  }

  setRole(r: 'PASSAGER' | 'CHAUFFEUR') {
    this.role.set(r);
    const permis = this.form.get('numeroPermis');
    if (r === 'CHAUFFEUR') permis?.setValidators(Validators.required);
    else permis?.clearValidators();
    permis?.updateValueAndValidity();
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      if (this.form.get('cgu')?.invalid) this.error.set("Acceptez les conditions d'utilisation pour continuer.");
      return;
    }
    this.loading.set(true);
    this.error.set('');

    const v = this.form.value;
    const chauffeur = this.role() === 'CHAUFFEUR';
    this.authService.inscrire({
      prenom: v.prenom.trim(),
      nom: v.nom.trim(),
      email: v.email.trim(),
      telephone: v.telephone.trim(),
      dateNaissance: v.dateNaissance,
      role: this.role(),
      numeroPermis: chauffeur ? v.numeroPermis || undefined : undefined,
      modeleVoiture: chauffeur ? v.modeleVoiture || undefined : undefined,
      immatriculation: chauffeur ? v.immatriculation || undefined : undefined,
      codeParrainage: v.codeParrainage?.trim() || undefined,
    }).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.success.set(`${res.message} Vérifiez votre email pour activer votre compte.`);
        setTimeout(() => this.router.navigate(['/valider-compte'], { queryParams: { email: v.email.trim() } }), 2500);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(messageErreur(err, 'Une erreur est survenue'));
      }
    });
  }
}
