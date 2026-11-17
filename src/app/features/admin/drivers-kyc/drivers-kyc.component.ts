import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { AdminService } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { CommonModule } from '@angular/common';
import { UtilisateurService } from '../../../core/services/utilisateur.service';
import { Utilisateur } from '../../../core/models';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ApercuDocumentComponent, LIBELLES_DOCUMENTS } from '../../../shared/components/apercu-document/apercu-document.component';
import { DocumentKyc, TypeDocument } from '../../../core/models';

@Component({
  selector: 'app-drivers-kyc',
  standalone: true,
  imports: [CommonModule, IconComponent, ApercuDocumentComponent],
  template: `
<div>
  <div class="lx-page-head">
    <div>
      <span class="lx-eyebrow">Vérification</span>
      <h2>KYC des chauffeurs</h2>
      <p>Contrôlez le permis, la pièce d'identité, l'assurance et la carte grise avant d'autoriser un chauffeur à publier.</p>
    </div>
    <button class="lx-btn lx-btn-secondary" (click)="charger()" [disabled]="loading()"><lx-icon name="refresh" [class.lx-spin]="loading()" /> Actualiser</button>
  </div>

  <div class="kpis">
    <div class="lx-stat"><lx-icon name="clock" style="color:var(--lx-amber)" /><div class="lx-stat-value">{{ enAttente().length }}</div><div class="lx-stat-label">dossiers · en attente</div></div>
    <div class="lx-stat"><lx-icon name="shield-check" style="color:var(--lx-emerald)" /><div class="lx-stat-value">{{ valides().length }}</div><div class="lx-stat-label">chauffeurs · validés</div></div>
    <div class="lx-stat"><lx-icon name="x" style="color:var(--lx-red)" /><div class="lx-stat-value">{{ bloques().length }}</div><div class="lx-stat-label">dossiers · refusés</div></div>
  </div>

  <nav class="lx-tabs" role="tablist" style="margin-top:1.5rem">
    <button class="lx-tab" [class.is-active]="vue() === 'attente'" (click)="vue.set('attente')">En attente <span class="lx-tab-count">{{ enAttente().length }}</span></button>
    <button class="lx-tab" [class.is-active]="vue() === 'valides'" (click)="vue.set('valides')">Validés <span class="lx-tab-count">{{ valides().length }}</span></button>
    <button class="lx-tab" [class.is-active]="vue() === 'bloques'" (click)="vue.set('bloques')">Refusés <span class="lx-tab-count">{{ bloques().length }}</span></button>
  </nav>

  @if (loading()) {
    <div class="grid">@for (i of [1,2,3]; track i) { <div class="lx-skeleton" style="min-height:200px"></div> }</div>
  } @else if (liste().length === 0) {
    <div class="lx-empty">
      <lx-icon [name]="vue() === 'attente' ? 'shield-check' : 'users'" />
      <p>{{ vue() === 'attente' ? 'Aucun dossier en attente : tous les chauffeurs sont traités.' : 'Aucun chauffeur dans cette catégorie.' }}</p>
    </div>
  } @else {
    <div class="grid">
      @for (c of liste(); track c.id) {
        <article class="lx-card dossier">
          <div class="dossier-head">
            <span class="lx-avatar is-ring">{{ initiales(c) }}</span>
            <div class="min-w-0" style="flex:1">
              <div class="name lx-truncate">{{ c.prenom }} {{ c.nom }}</div>
              <div class="lx-list-sub">{{ c.email }}</div>
              @if (c.telephone) { <div class="lx-list-sub">{{ c.telephone }}</div> }
            </div>
            @if (c.kycValide) { <span class="lx-badge lx-badge-success">Validé</span> }
            @else if (c.statut === 'BLOQUE') { <span class="lx-badge lx-badge-danger">Refusé</span> }
            @else { <span class="lx-badge lx-badge-warning">À vérifier</span> }
          </div>

          <ul class="checks">
            <li [class.ok]="c.permisValide || c.kycValide"><lx-icon [name]="c.permisValide || c.kycValide ? 'check-circle' : 'clock'" [size]="15" /> Permis de conduire</li>
            <li [class.ok]="c.kycValide"><lx-icon [name]="c.kycValide ? 'check-circle' : 'clock'" [size]="15" /> Pièce d'identité</li>
            @if (c.vehicules?.length) {
              <li class="ok"><lx-icon name="car" [size]="15" /> {{ c.vehicules![0].marque }} {{ c.vehicules![0].modele }}</li>
            } @else {
              <li><lx-icon name="car" [size]="15" /> Véhicule non communiqué</li>
            }
            @if (c.noteMoyenne > 0) {
              <li class="ok"><lx-icon name="star" [size]="15" /> {{ c.noteMoyenne | number:'1.1-1' }} · {{ c.nombreAvis }} avis</li>
            }
          </ul>

          <button class="lx-btn lx-btn-secondary lx-btn-sm docs-toggle" (click)="basculerDocuments(c)" [attr.aria-expanded]="ouvert() === c.id">
            <lx-icon name="file" /> Justificatifs
            @if (docs()[c.id]; as liste) { <span class="lx-badge">{{ liste.length }}/4</span> }
            <lx-icon name="chevron-down" class="chev" [class.is-open]="ouvert() === c.id" />
          </button>

          @if (ouvert() === c.id) {
            <div class="docs">
              @if (!docs()[c.id]) {
                <div class="lx-muted" style="font-size:.8rem;padding:.5rem 0">Chargement…</div>
              } @else {
                @for (t of types; track t) {
                  <div class="doc" [attr.data-statut]="docDe(c.id, t)?.statutVerification || 'ABSENT'">
                    <div class="min-w-0" style="flex:1">
                      <div class="doc-title">{{ libelles[t] }}</div>
                      <div class="doc-sub">
                        @if (docDe(c.id, t); as d) {
                          {{ statutDoc(d) }}@if (d.dateDepot) { · déposé le {{ d.dateDepot | date:'dd/MM/yyyy' }} }
                        } @else { Non déposé }
                      </div>
                    </div>
                    @if (docDe(c.id, t); as d) {
                      <div class="doc-actions">
                        <button class="lx-btn lx-btn-ghost lx-btn-sm" (click)="apercu.set({ userId: c.id, doc: d })" aria-label="Voir le document"><lx-icon name="eye" /></button>
                        @if (d.statutVerification !== 'VALIDE') {
                          <button class="lx-btn lx-btn-success lx-btn-sm" (click)="decider(c, d, true)" [disabled]="busy() === d.id" aria-label="Valider"><lx-icon name="check" /></button>
                        }
                        @if (d.statutVerification !== 'REJETE') {
                          <button class="lx-btn lx-btn-danger lx-btn-sm" (click)="decider(c, d, false)" [disabled]="busy() === d.id" aria-label="Refuser"><lx-icon name="x" /></button>
                        }
                      </div>
                    }
                  </div>
                }
              }
            </div>
          }

          @if (!c.kycValide && c.statut !== 'BLOQUE') {
            <div class="dossier-actions">
              <button class="lx-btn lx-btn-danger lx-btn-sm" (click)="bloquer(c)" [disabled]="busy() === c.id">Bloquer le compte</button>
              <button class="lx-btn lx-btn-primary lx-btn-sm" (click)="validerKyc(c)" [disabled]="busy() === c.id"><lx-icon name="shield-check" /> Tout valider</button>
            </div>
          }
        </article>
      }
    </div>
  }

  @if (apercu(); as a) {
    <lx-apercu-document [utilisateurId]="a.userId" [doc]="a.doc" (fermer)="apercu.set(null)" />
  }
</div>`,
  styles: [`
    :host { display: block; }
    .min-w-0 { min-width: 0; }
    .kpis { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; }
    .dossier { display: flex; flex-direction: column; gap: 1rem; padding: 1.25rem; }
    .dossier-head { display: flex; align-items: flex-start; gap: 0.8rem; }
    .name { font-weight: 500; }
    .checks { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.45rem; font-size: 0.85rem; color: var(--lx-muted-fg);
      li { display: flex; align-items: center; gap: 0.5rem; } li.ok { color: var(--lx-fg); } li.ok lx-icon { color: var(--lx-emerald); } }
    .docs-toggle { align-self: flex-start; .chev { transition: transform 0.2s; &.is-open { transform: rotate(180deg); } } }
    .docs { display: flex; flex-direction: column; gap: 0.45rem; animation: lx-fade 0.2s; }
    .doc { display: flex; align-items: center; gap: 0.6rem; padding: 0.55rem 0.7rem; border-radius: var(--lx-r-md); background: var(--lx-secondary); border-left: 3px solid var(--lx-border-strong);
      &[data-statut="VALIDE"] { border-left-color: var(--lx-emerald); } &[data-statut="REJETE"] { border-left-color: var(--lx-red); }
      &[data-statut="EN_ATTENTE"] { border-left-color: var(--lx-amber); } &[data-statut="ABSENT"] { opacity: 0.6; } }
    .doc-title { font-size: 0.8rem; font-weight: 500; }
    .doc-sub { font-size: 0.7rem; color: var(--lx-muted-fg); }
    .doc-actions { display: flex; gap: 0.25rem; flex-shrink: 0; .lx-btn { padding: 0.4rem 0.5rem; } }
    .dossier-actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: auto; padding-top: 0.9rem; border-top: 1px solid var(--lx-border); }
    @media (max-width: 640px) {
      .kpis { grid-template-columns: 1fr; }
      .grid { grid-template-columns: 1fr; }
      .dossier-actions .lx-btn { flex: 1; }
    }
  `]
})
export class DriversKycComponent implements OnInit {
  private userSvc = inject(UtilisateurService);
  private adminSvc = inject(AdminService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);

  loading = signal(true);
  busy = signal<number | null>(null);
  chauffeurs = signal<Utilisateur[]>([]);

  vue = signal<'attente' | 'valides' | 'bloques'>('attente');
  enAttente = computed(() => this.chauffeurs().filter(c => !c.kycValide && c.statut !== 'BLOQUE'));
  valides   = computed(() => this.chauffeurs().filter(c => c.kycValide));
  bloques   = computed(() => this.chauffeurs().filter(c => !c.kycValide && c.statut === 'BLOQUE'));
  readonly types: TypeDocument[] = ['PERMIS', 'CNI', 'ASSURANCE', 'CARTE_GRISE'];
  readonly libelles = LIBELLES_DOCUMENTS;
  ouvert = signal<number | null>(null);
  docs = signal<Record<number, DocumentKyc[]>>({});
  apercu = signal<{ userId: number; doc: DocumentKyc } | null>(null);

  basculerDocuments(c: Utilisateur) {
    if (this.ouvert() === c.id) { this.ouvert.set(null); return; }
    this.ouvert.set(c.id);
    this.userSvc.getDocuments(c.id).subscribe({
      next: d => this.docs.update(m => ({ ...m, [c.id]: d ?? [] })),
      error: err => { this.docs.update(m => ({ ...m, [c.id]: [] })); this.toast.error('Justificatifs indisponibles', err); }
    });
  }

  docDe(userId: number, t: TypeDocument): DocumentKyc | undefined {
    return this.docs()[userId]?.find(d => d.typeDocument === t);
  }

  statutDoc(d: DocumentKyc): string {
    return ({ EN_ATTENTE: 'À vérifier', VALIDE: 'Validé', REJETE: 'Refusé' } as Record<string, string>)[d.statutVerification] ?? d.statutVerification;
  }

  async decider(c: Utilisateur, d: DocumentKyc, valide: boolean) {
    let motif: string | undefined;
    if (!valide) {
      const saisi = await this.confirm.ask({
        title: `Refuser : ${this.libelles[d.typeDocument]}`,
        message: 'Le chauffeur verra ce motif et pourra déposer un nouveau document.',
        confirmLabel: 'Refuser le document', danger: true,
        input: { label: 'Motif du refus', type: 'textarea', minLength: 5, placeholder: 'Ex : photo floue, document expiré…' }
      });
      if (!saisi || typeof saisi !== 'string') return;
      motif = saisi;
    }
    this.busy.set(d.id);
    this.userSvc.deciderDocument(d.id, valide, motif).subscribe({
      next: maj => {
        this.busy.set(null);
        const liste = (this.docs()[c.id] ?? []).map(x => x.id === d.id ? { ...x, ...maj } : x);
        this.docs.update(m => ({ ...m, [c.id]: liste }));
        // Le serveur valide le KYC quand les 4 documents sont validés.
        const complet = this.types.every(t => liste.some(x => x.typeDocument === t && x.statutVerification === 'VALIDE'));
        this.chauffeurs.update(arr => arr.map(x => x.id === c.id ? { ...x, kycValide: complet } : x));
        this.toast.success(valide ? 'Document validé' : 'Document refusé', complet ? 'Les 4 justificatifs sont validés : le chauffeur est vérifié.' : this.libelles[d.typeDocument]);
      },
      error: err => { this.busy.set(null); this.toast.error('Décision impossible', err); }
    });
  }

  liste     = computed(() => this.vue() === 'attente' ? this.enAttente() : this.vue() === 'valides' ? this.valides() : this.bloques());

  initiales(c: Utilisateur) {
    return (`${(c.prenom ?? '').charAt(0)}${(c.nom ?? '').charAt(0)}`.toUpperCase()) || (c.email ?? '?').charAt(0).toUpperCase();
  }

  ngOnInit() { this.charger(); }

  charger() {
    this.loading.set(true);
    this.userSvc.getAllAdmin(0, 200, { role: 'CHAUFFEUR' }).subscribe({
      next: p => {
        this.chauffeurs.set(p?.content ?? []);
        this.loading.set(false);
      },
      error: err => { this.loading.set(false); this.toast.error('Chargement impossible', err); }
    });
  }

  async validerKyc(c: Utilisateur) {
    const ok = await this.confirm.ask({
      title: `Valider ${c.prenom ?? ''} ${c.nom ?? ''} ?`,
      message: "Le chauffeur pourra publier des trajets. Confirmez avoir vérifié le permis, la CNI et le véhicule.",
      confirmLabel: 'Valider le KYC'
    });
    if (!ok) return;
    this.busy.set(c.id);
    this.userSvc.validerKyc(c.id).subscribe({
      next: updated => {
        this.busy.set(null);
        this.chauffeurs.update(arr => arr.map(x => x.id === c.id ? { ...x, ...updated } : x));
        this.toast.success('KYC validé', `${c.prenom ?? ''} ${c.nom ?? ''}`.trim());
      },
      error: err => { this.busy.set(null); this.toast.error('Validation impossible', err); }
    });
  }

  async bloquer(c: Utilisateur) {
    const ok = await this.confirm.ask({
      title: 'Refuser ce dossier ?',
      message: "Le compte du chauffeur sera bloqué (connexion comprise) jusqu'à nouvel ordre.",
      confirmLabel: 'Refuser et bloquer', danger: true
    });
    if (!ok) return;
    this.busy.set(c.id);
    this.userSvc.changerStatut(c.id, 'BLOQUE').subscribe({
      next: updated => {
        this.adminSvc.changerBlocageCompte(c.id, true).subscribe({
          error: () => this.toast.warning('Connexion non bloquée', "Le profil est refusé mais le compte de connexion n'a pas pu être bloqué — réessayez depuis Utilisateurs.")
        });
        this.busy.set(null);
        this.chauffeurs.update(arr => arr.map(x => x.id === c.id ? { ...x, ...updated } : x));
        this.toast.info('Dossier refusé', 'Le chauffeur a été bloqué.');
      },
      error: err => { this.busy.set(null); this.toast.error('Action impossible', err); }
    });
  }
}
