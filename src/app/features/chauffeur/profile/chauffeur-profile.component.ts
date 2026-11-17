import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { UtilisateurService } from '../../../core/services/utilisateur.service';

@Component({
  selector: 'app-chauffeur-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
<div class="chauffeur-profile-page">
  <div style="display:flex;align-items:center;justify-content:space-between;gap:1rem;margin-bottom:1.5rem">
    <div>
      <h2 style="margin:0 0 0.35rem">Profil chauffeur</h2>
      <p style="margin:0;color:var(--color-muted)">Complétez vos documents pour obtenir l'accès aux actions du chauffeur.</p>
    </div>
    <span class="badge" [class]="profileValid() ? 'badge-success' : 'badge-danger'">
      {{ profileValid() ? 'Profil valide' : 'Profil non valide' }}
    </span>
  </div>

  @if (!profileValid()) {
    <div class="alert alert-warning" style="margin-bottom:1rem">
      Votre profil est actuellement <strong>non valide</strong>. Vous ne pouvez pas publier, accepter ou gérer des courses tant que vos documents sont refusés ou non validés.
    </div>
  } @else {
    <div class="alert alert-success" style="margin-bottom:1rem">
      Votre profil est <strong>validé</strong>. Vous pouvez maintenant utiliser l'interface chauffeur.
    </div>
  }

  <div class="two-col-grid" style="gap:1rem;align-items:flex-start">
    <section class="card profile-card">
      <div class="profile-top">
        <div class="avatar-large">{{ initials() }}</div>
        <div>
          <div class="title-strong">{{ accountName() }}</div>
          <div class="subtle">{{ currentEmail() }}</div>
        </div>
      </div>

      <div class="status-row">
        <div>
          <div class="mini-label">Statut profil</div>
          <div class="status-state" [class.invalid]="!profileValid()" [class.valid]="profileValid()">
            {{ profileValid() ? '✓ Validé' : '✕ Non valide' }}
          </div>
        </div>
        <div>
          <div class="mini-label">Validation admin</div>
          <div class="subtle">{{ adminValidationTitle() }}</div>
        </div>
      </div>

      <div style="margin-top:1rem">
        <div class="section-title">Documents demandés à l’inscription</div>
        <form [formGroup]="docForm" (ngSubmit)="soumettreDocuments()">
          <div class="doc-grid">
            <div class="form-group upload-area">
              <label for="permis">Permis de conduire</label>
              <input type="file" id="permis" class="field" formControlName="permis" accept="image/*,.pdf" />
              <small class="helper-text">Téléverser une photo réelle du permis</small>
            </div>

            <div class="form-group upload-area">
              <label for="cni">Pièce d’identité / CNI</label>
              <input type="file" id="cni" class="field" formControlName="cni" accept="image/*,.pdf" />
              <small class="helper-text">Photo claire de la pièce</small>
            </div>

            <div class="form-group upload-area">
              <label for="assurance">Assurance du véhicule</label>
              <input type="file" id="assurance" class="field" formControlName="assurance" accept="image/*,.pdf" />
              <small class="helper-text">Attestation d’assurance</small>
            </div>

            <div class="form-group upload-area">
              <label for="carteGrise">Carte grise</label>
              <input type="file" id="carteGrise" class="field" formControlName="carteGrise" accept="image/*,.pdf" />
              <small class="helper-text">Carte grise du véhicule</small>
            </div>
          </div>

          @if (docError()) {
            <div class="alert alert-error" style="margin-top:1rem">{{ docError() }}</div>
          }

          @if (docSuccess()) {
            <div class="alert alert-success" style="margin-top:1rem">{{ docSuccess() }}</div>
          }

          <div style="display:flex;gap:0.75rem;margin-top:1rem">
            <button class="btn btn-primary" type="submit" [disabled]="loading()">
              {{ loading() ? 'Soumission...' : 'Soumettre les documents' }}
            </button>
            <button class="btn btn-outline" type="button" (click)="resetForm()">Réinitialiser</button>
          </div>
        </form>
      </div>
    </section>

    <aside class="card verification-card">
      <div class="section-title">Vérification administrateur</div>
      <div class="verification-stack">
        <div class="verification-item">
          <span class="icon-dot">●</span>
          <div>
            <div class="label-text">Permis</div>
            <div class="subtle">
              {{ profileValid() ? 'Validé' : 'En attente / à corriger' }}
            </div>
          </div>
        </div>
        <div class="verification-item">
          <span class="icon-dot">●</span>
          <div>
            <div class="label-text">CNI</div>
            <div class="subtle">
              {{ profileValid() ? 'Validé' : 'En attente / à corriger' }}
            </div>
          </div>
        </div>
        <div class="verification-item">
          <span class="icon-dot">●</span>
          <div>
            <div class="label-text">Assurance et carte grise</div>
            <div class="subtle">
              {{ profileValid() ? 'Validé' : 'En attente / à corriger' }}
            </div>
          </div>
        </div>
      </div>

      <div class="lock-panel">
        <div class="lock-icon">⛔</div>
        <div>
          <div class="label-text">Interface verrouillée</div>
          <div class="subtle">
            {{ profileValid() ? 'Accès autorisé à l’interface chauffeur' : 'Actions interdites tant que le profil n’est pas validé' }}
          </div>
        </div>
      </div>
    </aside>
  </div>
</div>
  `,
  styles: [`
    :host { display: block; }
    .chauffeur-profile-page { padding: 1rem; }
    .profile-card, .verification-card { background: #fff; border-radius: 16px; padding: 1.25rem; border: 1px solid var(--color-border); }
    .profile-top { display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; }
    .avatar-large { width: 78px; height: 78px; border-radius: 50%; background: var(--color-primary); color: white; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.1rem; }
    .title-strong { font-weight: 800; font-size: 1.15rem; color: var(--color-text); }
    .subtle { color: var(--color-muted); font-size: 0.82rem; }
    .mini-label { font-size: 0.72rem; font-weight: 700; color: var(--color-muted); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 0.25rem; }
    .status-row { display: flex; justify-content: space-between; gap: 1rem; align-items: center; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--color-border); }
    .status-state { font-weight: 800; font-size: 0.88rem; }
    .status-state.valid { color: var(--color-success); }
    .status-state.invalid { color: var(--color-danger); }
    .section-title { font-weight: 800; font-size: 0.95rem; margin-bottom: 0.85rem; color: var(--color-primary); }
    .doc-grid { display: grid; grid-template-columns: repeat(2, minmax(220px, 1fr)); gap: 1rem; margin-top: 0.8rem; }
    .upload-area { border: 1px dashed var(--color-border); background: #fbfbfb; padding: 0.85rem; border-radius: 12px; }
    .helper-text { color: var(--color-muted); display: block; margin-top: 0.4rem; font-size: 0.72rem; }
    .verification-stack { display: flex; flex-direction: column; gap: 0.8rem; margin-top: 1rem; }
    .verification-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.8rem; border-radius: 12px; background: #f8fafc; border: 1px solid var(--color-border); }
    .icon-dot { color: var(--color-warning); font-size: 1rem; }
    .label-text { font-size: 0.84rem; font-weight: 800; }
    .lock-panel { margin-top: 1rem; padding: 0.85rem; border-radius: 12px; border: 1px solid var(--color-border); background: #F8FAFC; display: flex; gap: 0.75rem; align-items: center; }
    .lock-icon { font-size: 1.4rem; color: var(--color-danger); }
    @media (max-width: 720px) { .doc-grid { grid-template-columns: 1fr; } }
  `]
})
export class ChauffeurProfileComponent implements OnInit {
  profileValid = signal(false);
  loading = signal(false);
  docError = signal('');
  docSuccess = signal('');

  currentEmail = signal('');
  accountName = signal('Chauffeur');

  docForm = this.fb.group({
    permis: ['', Validators.required],
    cni: ['', Validators.required],
    assurance: ['', Validators.required],
    carteGrise: ['', Validators.required]
  });

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private userSvc: UtilisateurService
  ) {}

  ngOnInit() {
    const u = this.auth.currentUser();
    if (!u) return;
    this.currentEmail.set(u.email);

    this.userSvc.getProfil(u.compteId).subscribe({
      next: p => {
        this.profileValid.set(!!p.kycValide);
        this.accountName.set(`${p.prenom || ''} ${p.nom || ''}`.trim() || 'Chauffeur');
      },
      error: () => {}
    });
  }

  initials(): string {
    const a = this.accountName();
    if (!a) return 'CH';
    const parts = a.split(' ').filter(Boolean);
    return parts.slice(0, 2).map(x => x[0]).join('').toUpperCase();
  }

  adminValidationTitle(): string {
    return this.profileValid() ? 'Documents validés par admin' : 'En attente de validation admin';
  }

  resetForm() {
    this.docForm.reset();
    this.docSuccess.set('');
    this.docError.set('');
  }

  soumettreDocuments() {
    if (this.docForm.invalid) {
      this.docError.set('Veuillez télécharger les quatre documents demandés.');
      return;
    }

    this.loading.set(true);
    this.docError.set('');

    setTimeout(() => {
      this.loading.set(false);
      this.docSuccess.set('Documents soumis. En attente de validation administrateur.');
      this.profileValid.set(false);
    }, 500);
  }
}
