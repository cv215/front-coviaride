import { FermerCompteComponent } from '../../../shared/components/fermer-compte/fermer-compte.component';
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
import { ApercuDocumentComponent, LIBELLES_DOCUMENTS } from '../../../shared/components/apercu-document/apercu-document.component';
import { DocumentKyc, TypeDocument } from '../../../core/models';

/** Identifiant du compte « Service client » côté chat. */
const SUPPORT_ID = 1;

@Component({
  selector: 'app-chauffeur-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, IconComponent, ApercuDocumentComponent, FermerCompteComponent],
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
              Vos quatre justificatifs ont été contrôlés. Vous pouvez publier des trajets et accepter des passagers.
            } @else {
              Déposez une photo nette ou un PDF de chaque justificatif (5 Mo max). Votre compte est validé dès que les quatre sont acceptés.
            }
          </p>
        </div>
      </div>

      <div class="lx-progress" [attr.aria-label]="nbValides() + ' documents validés sur 4'"><span [style.width.%]="nbValides() * 25"></span></div>

      <ul class="docs">
        @for (t of typesDocuments; track t) {
          <li class="doc" [attr.data-statut]="docDe(t)?.statutVerification || 'ABSENT'">
            <div class="doc-head">
              <span class="doc-icon"><lx-icon [name]="iconeStatut(t)" [size]="18" /></span>
              <div class="min-w-0" style="flex:1">
                <div class="doc-title">{{ libelles[t] }}</div>
                <div class="doc-sub">{{ libelleStatut(t) }}</div>
              </div>
            </div>
            @if (docDe(t)?.statutVerification === 'REJETE' && docDe(t)?.motifRejet) {
              <div class="doc-motif"><lx-icon name="info" [size]="13" /> {{ docDe(t)!.motifRejet }}</div>
            }
            <div class="doc-actions">
              @if (docDe(t); as d) {
                <button class="lx-btn lx-btn-ghost lx-btn-sm" (click)="apercu.set(d)"><lx-icon name="eye" /> Voir</button>
              }
              @if (docDe(t)?.statutVerification !== 'VALIDE') {
                <label class="lx-btn lx-btn-sm" [class.lx-btn-primary]="!docDe(t)" [class.lx-btn-secondary]="!!docDe(t)" [class.is-busy]="envoi() === t">
                  @if (envoi() === t) { <lx-icon name="refresh" class="lx-spin" /> Envoi… }
                  @else { <lx-icon name="download" style="transform:rotate(180deg)" /> {{ docDe(t) ? 'Remplacer' : 'Déposer' }} }
                  <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" hidden [disabled]="!!envoi()"
                    (change)="deposer(t, $event)" />
                </label>
              }
            </div>
          </li>
        }
      </ul>
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

    @if (apercu(); as d) {
      <lx-apercu-document [utilisateurId]="monId()" [doc]="d" (fermer)="apercu.set(null)" />
    }

    <div class="lx-list">
      <button class="lx-list-item is-danger" (click)="auth.deconnexion()">
        <lx-icon name="log-out" /><span class="lx-list-body">Se déconnecter</span>
      </button>
    </div>
    <lx-fermer-compte />
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
      &.is-ok { border-color: rgba(52, 211, 153, 0.3); } }
    .lx-icon-tile.is-ok { background: rgba(52, 211, 153, 0.12); color: var(--lx-emerald); }
    .docs { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.75rem; }
    .doc { background: var(--lx-secondary); border-radius: var(--lx-r-md); padding: 0.85rem 0.95rem; display: flex; flex-direction: column; gap: 0.6rem;
      border: 1px solid transparent; min-width: 0;
      &[data-statut="VALIDE"] { border-color: rgba(52, 211, 153, 0.3); .doc-icon { color: var(--lx-emerald); background: rgba(52, 211, 153, 0.12); } }
      &[data-statut="REJETE"] { border-color: rgba(224, 83, 74, 0.35); .doc-icon { color: var(--lx-red); background: rgba(224, 83, 74, 0.12); } }
      &[data-statut="EN_ATTENTE"] .doc-icon { color: var(--lx-amber); background: rgba(251, 191, 36, 0.12); } }
    .doc-head { display: flex; align-items: center; gap: 0.7rem; }
    .doc-icon { width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; background: var(--lx-card); color: var(--lx-muted-fg); flex-shrink: 0; }
    .doc-title { font-size: 0.85rem; font-weight: 500; }
    .doc-sub { font-size: 0.72rem; color: var(--lx-muted-fg); }
    .doc-motif { display: flex; gap: 0.35rem; font-size: 0.75rem; color: #fca5a5; line-height: 1.4; lx-icon { margin-top: 2px; } }
    .doc-actions { display: flex; justify-content: flex-end; gap: 0.4rem; margin-top: auto; label.is-busy { pointer-events: none; opacity: 0.7; } }
    .plate { font-size: 0.75rem; background: var(--lx-secondary); padding: 0.2rem 0.5rem; border-radius: 6px; letter-spacing: 0.06em; }
    .form-actions { display: flex; justify-content: flex-end; }
    @media (max-width: 520px) {
      .identity { flex-direction: column; text-align: center; .lx-row { justify-content: center; } }
      .docs { grid-template-columns: 1fr; }
      .form-actions .lx-btn { width: 100%; }
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
  readonly typesDocuments: TypeDocument[] = ['PERMIS', 'CNI', 'ASSURANCE', 'CARTE_GRISE'];
  readonly libelles = LIBELLES_DOCUMENTS;
  documents = signal<DocumentKyc[]>([]);
  envoi = signal<TypeDocument | null>(null);
  apercu = signal<DocumentKyc | null>(null);
  nbValides = computed(() => this.typesDocuments.filter(t => this.docDe(t)?.statutVerification === 'VALIDE').length);

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
    this.userSvc.getDocuments(u.compteId).subscribe({ next: d => this.documents.set(d ?? []), error: () => {} });
  }

  monId(): number { return this.auth.currentUser()?.compteId ?? 0; }

  docDe(t: TypeDocument): DocumentKyc | undefined {
    return this.documents().find(d => d.typeDocument === t);
  }

  libelleStatut(t: TypeDocument): string {
    const d = this.docDe(t);
    if (!d) return 'À déposer';
    return ({ EN_ATTENTE: 'Déposé · en cours de vérification', VALIDE: 'Validé', REJETE: 'Refusé · à remplacer' } as Record<string, string>)[d.statutVerification] ?? d.statutVerification;
  }

  iconeStatut(t: TypeDocument): string {
    const d = this.docDe(t);
    if (!d) return 'file';
    return ({ EN_ATTENTE: 'clock', VALIDE: 'check-circle', REJETE: 'alert' } as Record<string, string>)[d.statutVerification] ?? 'file';
  }

  deposer(type: TypeDocument, ev: Event) {
    const champ = ev.target as HTMLInputElement;
    const fichier = champ.files?.[0];
    champ.value = '';
    const u = this.auth.currentUser();
    if (!fichier || !u) return;
    if (fichier.size > 5 * 1024 * 1024) { this.toast.warning('Fichier trop volumineux', '5 Mo maximum.'); return; }
    if (!/^(image\/(jpeg|png|webp)|application\/pdf)$/.test(fichier.type)) {
      this.toast.warning('Format non accepté', 'Envoyez une photo (JPG, PNG, WEBP) ou un PDF.');
      return;
    }
    this.envoi.set(type);
    this.userSvc.deposerDocument(u.compteId, type, fichier).subscribe({
      next: doc => {
        this.envoi.set(null);
        this.documents.update(arr => [doc, ...arr.filter(d => d.typeDocument !== type)]);
        // Un nouveau dépôt remet le profil en vérification.
        this.profil.update(p => p ? { ...p, kycValide: false } : p);
        this.toast.success('Document envoyé', `${this.libelles[type]} · en attente de vérification.`);
      },
      error: err => { this.envoi.set(null); this.toast.error('Envoi impossible', err); }
    });
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
    this.auth.changerMotDePasse(this.formMdp.value.ancien!, this.formMdp.value.nouveau!).subscribe({
      next: res => {
        this.enregistrement.set(false);
        this.formMdp.reset();
        this.toast.success('Mot de passe modifié', res?.message);
      },
      error: err => { this.enregistrement.set(false); this.toast.error(messageErreur(err, 'Mot de passe actuel incorrect.')); }
    });
  }
}
