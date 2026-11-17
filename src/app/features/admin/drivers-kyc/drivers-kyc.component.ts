import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { AdminService } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { CommonModule } from '@angular/common';
import { UtilisateurService } from '../../../core/services/utilisateur.service';
import { Utilisateur } from '../../../core/models';
import { IconComponent } from '../../../shared/components/icon/icon.component';

@Component({
  selector: 'app-drivers-kyc',
  standalone: true,
  imports: [CommonModule, IconComponent],
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

          @if (!c.kycValide && c.statut !== 'BLOQUE') {
            <div class="dossier-actions">
              <button class="lx-btn lx-btn-danger lx-btn-sm" (click)="bloquer(c)" [disabled]="busy() === c.id">Refuser</button>
              <button class="lx-btn lx-btn-primary lx-btn-sm" (click)="validerKyc(c)" [disabled]="busy() === c.id"><lx-icon name="shield-check" /> Valider</button>
            </div>
          }
        </article>
      }
    </div>
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
  liste     = computed(() => this.vue() === 'attente' ? this.enAttente() : this.vue() === 'valides' ? this.valides() : this.bloques());

  initiales(c: Utilisateur) {
    return (`${(c.prenom ?? '').charAt(0)}${(c.nom ?? '').charAt(0)}`.toUpperCase()) || (c.email ?? '?').charAt(0).toUpperCase();
  }

  ngOnInit() { this.charger(); }

  charger() {
    this.loading.set(true);
    this.userSvc.getAllAdmin(0, 500).subscribe({
      next: p => {
        this.chauffeurs.set((p.content ?? []).filter(u => u.role === 'CHAUFFEUR' || u.role === 'PASSAGER_ET_CHAUFFEUR'));
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
