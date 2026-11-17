import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { UtilisateurService } from '../../../core/services/utilisateur.service';
import { ToastService, messageErreur } from '../../../core/services/toast.service';
import { Utilisateur, Vehicule } from '../../../core/models';
import { environment } from '../../../../environments/environment';
import { IconComponent } from '../../../shared/components/icon/icon.component';

/** Identifiant du compte « Service client » côté chat. */
const SUPPORT_ID = 1;

@Component({
  selector: 'app-chauffeur-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, IconComponent],
  template: `
<div class="lx-page profile">

  @if (chargement()) {
    <div class="lx-stack"><div class="lx-skeleton" style="min-height:120px"></div><div class="lx-skeleton" style="min-height:220px"></div></div>
  } @else {
    <!-- Identité -->
    <section class="lx-card identity lx-rise">
      <span class="lx-avatar is-xl is-ring">{{ initiales() }}</span>
      <div class="identity-body">
        <div class="identity-name lx-display">{{ nomComplet() }}</div>
        <div class="lx-muted" style="font-size:.85rem;overflow-wrap:anywhere">{{ email() }}@if (profil()?.telephone) { · {{ profil()!.telephone }} }</div>
        <div class="lx-row" style="gap:.5rem;margin-top:.6rem">
          <span class="lx-badge" [class.lx-badge-success]="kycValide()" [class.lx-badge-warning]="!kycValide()">
            <lx-icon [name]="kycValide() ? 'shield-check' : 'clock'" [size]="12" />
            {{ kycValide() ? 'Profil vérifié' : 'Vérification en attente' }}
          </span>
          @if (profil()?.noteMoyenne) {
            <span class="rating"><lx-icon name="star" [fill]="true" [size]="13" /> {{ profil()!.noteMoyenne | number:'1.1-1' }} · {{ profil()!.nombreAvis || 0 }} avis</span>
          }
        </div>
      </div>
    </section>

    <!-- Vérification -->
    <section class="lx-card kyc" [class.is-ok]="kycValide()">
      <div class="lx-row" style="gap:.75rem;flex-wrap:nowrap;align-items:flex-start">
        <span class="lx-icon-tile" [class.is-gold]="!kycValide()" [class.is-ok]="kycValide()"><lx-icon [name]="kycValide() ? 'shield-check' : 'shield'" /></span>
        <div>
          <h3 class="lx-card-title" style="margin:0 0 .3rem">{{ kycValide() ? 'Votre profil est validé' : 'Faites vérifier votre profil' }}</h3>
          <p style="margin:0;font-size:.85rem;line-height:1.55">
            @if (kycValide()) {
              Vos documents ont été contrôlés par l'équipe Coviaride. Vous pouvez publier des trajets et accepter des passagers.
            } @else {
              Envoyez ces documents au service client depuis la messagerie. Un administrateur les vérifie et valide votre compte.
            }
          </p>
        </div>
      </div>
      <ul class="docs">
        @for (d of documents; track d) {
          <li><lx-icon [name]="kycValide() ? 'check-circle' : 'file'" [size]="16" /> {{ d }}</li>
        }
      </ul>
      @if (!kycValide()) {
        <a routerLink="/chauffeur/messages" [queryParams]="{ avec: supportId }" class="lx-btn lx-btn-primary">
          <lx-icon name="send" /> Envoyer mes documents au support
        </a>
      }
    </section>

    <!-- Véhicules -->
    <section>
      <div class="lx-section-head">
        <h3>Mes véhicules</h3>
        <a routerLink="/chauffeur/courses" class="lx-link">Gérer <lx-icon name="chevron-right" /></a>
      </div>
      <div class="lx-list">
        @for (v of vehicules(); track v.id) {
          <div class="lx-list-item" style="cursor:default">
            <span class="lx-icon-tile is-soft"><lx-icon name="car" /></span>
            <span class="lx-list-body">
              <span class="lx-list-title">{{ v.marque }} {{ v.modele }}</span>
              <span class="lx-list-sub">{{ v.couleur }} · {{ v.nombrePlaces }} places</span>
            </span>
            <span class="lx-mono plate">{{ v.immatriculation }}</span>
          </div>
        } @empty {
          <a routerLink="/chauffeur/courses" class="lx-list-item">
            <span class="lx-icon-tile"><lx-icon name="plus" /></span>
            <span class="lx-list-body"><span class="lx-list-title">Ajouter un véhicule</span><span class="lx-list-sub">Obligatoire pour publier un trajet</span></span>
            <lx-icon name="chevron-right" class="lx-chevron" />
          </a>
        }
      </div>
    </section>

    <!-- Onglets d'édition -->
    <nav class="lx-tabs" role="tablist">
      <button role="tab" class="lx-tab" [class.is-active]="onglet() === 'infos'" (click)="onglet.set('infos')">Informations</button>
      <button role="tab" class="lx-tab" [class.is-active]="onglet() === 'mdp'" (click)="onglet.set('mdp')">Mot de passe</button>
    </nav>

    @if (onglet() === 'infos') {
      <form class="lx-card lx-stack" [formGroup]="formInfos" (ngSubmit)="sauvegarder()">
        <div class="lx-form-grid">
          <div><label class="lx-label-plain" for="cp-prenom">Prénom</label><input id="cp-prenom" class="lx-input" formControlName="prenom" autocomplete="given-name" /></div>
          <div><label class="lx-label-plain" for="cp-nom">Nom</label><input id="cp-nom" class="lx-input" formControlName="nom" autocomplete="family-name" /></div>
        </div>
        <div>
          <label class="lx-label-plain" for="cp-tel">Téléphone</label>
          <div class="lx-field has-icon"><span class="lx-field-icon"><lx-icon name="phone" /></span>
            <input id="cp-tel" class="lx-input" type="tel" formControlName="telephone" placeholder="650000000" autocomplete="tel" /></div>
          @if (formInfos.get('telephone')?.invalid && formInfos.get('telephone')?.touched) { <div class="lx-error">Numéro camerounais invalide (ex : 650000000)</div> }
        </div>
        <div class="form-actions">
          <button type="submit" class="lx-btn lx-btn-primary" [disabled]="enregistrement() || formInfos.invalid || formInfos.pristine">
            {{ enregistrement() ? 'Enregistrement…' : 'Enregistrer' }}
          </button>
        </div>
      </form>
    } @else {
      <form class="lx-card lx-stack" [formGroup]="formMdp" (ngSubmit)="changerMdp()">
        <div><label class="lx-label-plain" for="cp-a">Mot de passe actuel</label><input id="cp-a" class="lx-input" type="password" formControlName="ancien" autocomplete="current-password" /></div>
        <div>
          <label class="lx-label-plain" for="cp-n">Nouveau mot de passe</label>
          <input id="cp-n" class="lx-input" type="password" formControlName="nouveau" autocomplete="new-password" />
          <div [class]="formMdp.get('nouveau')?.invalid && formMdp.get('nouveau')?.touched ? 'lx-error' : 'lx-help'">8 caractères minimum, avec une majuscule, une minuscule et un chiffre.</div>
        </div>
        <div>
          <label class="lx-label-plain" for="cp-c">Confirmer</label>
          <input id="cp-c" class="lx-input" type="password" formControlName="confirm" autocomplete="new-password" />
          @if (formMdp.hasError('mismatch') && formMdp.get('confirm')?.touched) { <div class="lx-error">Les mots de passe ne correspondent pas.</div> }
        </div>
        <div class="form-actions">
          <button type="submit" class="lx-btn lx-btn-primary" [disabled]="enregistrement() || formMdp.invalid">
            {{ enregistrement() ? 'Modification…' : 'Changer le mot de passe' }}
          </button>
        </div>
      </form>
    }

    <div class="lx-list">
      <button class="lx-list-item is-danger" (click)="auth.deconnexion()">
        <lx-icon name="log-out" /><span class="lx-list-body">Se déconnecter</span>
      </button>
    </div>
  }
</div>
  `,
  styles: [`
    :host { display: block; }
    .profile { max-width: 680px; display: flex; flex-direction: column; gap: 1.5rem; }
    .identity { display: flex; align-items: center; gap: 1.25rem; }
    .identity-body { min-width: 0; }
    .identity-name { font-size: 1.5rem; line-height: 1.2; margin-bottom: 0.2rem; }
    .rating { display: inline-flex; align-items: center; gap: 0.3rem; color: var(--lx-amber); font-size: 0.8rem; font-weight: 500; }
    .kyc { display: flex; flex-direction: column; gap: 1.1rem; border-color: rgba(200, 146, 42, 0.3);
      &.is-ok { border-color: rgba(52, 211, 153, 0.3); } .lx-btn { align-self: flex-start; } }
    .lx-icon-tile.is-ok { background: rgba(52, 211, 153, 0.12); color: var(--lx-emerald); }
    .docs { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.5rem;
      li { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; background: var(--lx-secondary); border-radius: var(--lx-r-md); padding: 0.65rem 0.8rem; }
      lx-icon { color: var(--lx-primary); } }
    .is-ok .docs lx-icon { color: var(--lx-emerald); }
    .plate { font-size: 0.75rem; background: var(--lx-secondary); padding: 0.2rem 0.5rem; border-radius: 6px; letter-spacing: 0.06em; }
    .form-actions { display: flex; justify-content: flex-end; }
    @media (max-width: 520px) {
      .identity { flex-direction: column; text-align: center; .lx-row { justify-content: center; } }
      .docs { grid-template-columns: 1fr; }
      .kyc .lx-btn, .form-actions .lx-btn { width: 100%; align-self: stretch; }
    }
  `]
})
export class ChauffeurProfileComponent implements OnInit {
  auth = inject(AuthService);
  private userSvc = inject(UtilisateurService);
  private http = inject(HttpClient);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);

  readonly supportId = SUPPORT_ID;
  readonly documents = ['Permis de conduire', "Pièce d'identité (CNI)", 'Assurance du véhicule', 'Carte grise'];

  chargement = signal(true);
  enregistrement = signal(false);
  profil = signal<Utilisateur | null>(null);
  vehicules = signal<Vehicule[]>([]);
  onglet = signal<'infos' | 'mdp'>('infos');

  kycValide = computed(() => !!this.profil()?.kycValide);
  email = computed(() => this.profil()?.email || this.auth.currentUser()?.email || '');
  nomComplet = computed(() => [this.profil()?.prenom, this.profil()?.nom].filter(Boolean).join(' ').trim() || 'Chauffeur');

  formInfos = this.fb.group({
    prenom: ['', [Validators.required, Validators.minLength(2)]],
    nom: ['', [Validators.required, Validators.minLength(2)]],
    telephone: ['', [Validators.required, Validators.pattern(/^(\+?237)?[6-9][0-9]{8}$/)]]
  });

  formMdp = this.fb.group({
    ancien: ['', Validators.required],
    nouveau: ['', [Validators.required, Validators.minLength(8), Validators.pattern(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).{8,}$/)]],
    confirm: ['', Validators.required]
  }, { validators: (g: AbstractControl) => g.get('nouveau')?.value === g.get('confirm')?.value ? null : { mismatch: true } });

  ngOnInit() {
    const u = this.auth.currentUser();
    if (!u) { this.chargement.set(false); return; }
    this.userSvc.getProfil(u.compteId).subscribe({
      next: p => {
        this.profil.set(p);
        this.formInfos.patchValue({ prenom: p?.prenom ?? '', nom: p?.nom ?? '', telephone: p?.telephone ?? '' });
        this.formInfos.markAsPristine();
        this.chargement.set(false);
      },
      error: err => { this.chargement.set(false); this.toast.error('Profil indisponible', err); }
    });
    this.userSvc.getVehicules(u.compteId).subscribe({ next: v => this.vehicules.set(v ?? []), error: () => {} });
  }

  initiales(): string {
    return this.nomComplet().split(/\s+/).slice(0, 2).map(x => x.charAt(0)).join('').toUpperCase() || 'CH';
  }

  sauvegarder() {
    const u = this.auth.currentUser();
    if (!u || this.formInfos.invalid) return;
    this.enregistrement.set(true);
    this.userSvc.modifierProfil(u.compteId, this.formInfos.value as Partial<Utilisateur>).subscribe({
      next: p => {
        this.enregistrement.set(false);
        this.profil.update(cur => ({ ...(cur as Utilisateur), ...p }));
        this.formInfos.markAsPristine();
        this.toast.success('Profil mis à jour');
      },
      error: err => { this.enregistrement.set(false); this.toast.error('Enregistrement impossible', err); }
    });
  }

  changerMdp() {
    const u = this.auth.currentUser();
    if (!u || this.formMdp.invalid) return;
    this.enregistrement.set(true);
    this.http.put<{ message: string }>(`${environment.apiUrl}/utilisateurs/profil/${u.compteId}/changer-mot-de-passe`, {
      ancienMotDePasse: this.formMdp.value.ancien,
      nouveauMotDePasse: this.formMdp.value.nouveau
    }).subscribe({
      next: res => {
        this.enregistrement.set(false);
        this.formMdp.reset();
        this.toast.success('Mot de passe modifié', res?.message);
      },
      error: err => { this.enregistrement.set(false); this.toast.error(messageErreur(err, 'Mot de passe actuel incorrect.')); }
    });
  }
}
