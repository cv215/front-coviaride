import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { UtilisateurService } from '../../../core/services/utilisateur.service';
import { AdminService } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { Utilisateur } from '../../../core/models';
import { IconComponent } from '../../../shared/components/icon/icon.component';

type FiltreRole = '' | 'PASSAGER' | 'CHAUFFEUR';
type FiltreStatut = '' | 'ACTIF' | 'BLOQUE' | 'KYC';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
<div class="adm">
  <div class="lx-page-head">
    <div>
      <span class="lx-eyebrow">Comptes</span>
      <h2>Utilisateurs</h2>
      <p>{{ total() }} résultat{{ total() > 1 ? 's' : '' }}@if (totalPages() > 1) { · page {{ page() + 1 }} / {{ totalPages() }} }</p>
    </div>
    <button class="lx-btn lx-btn-secondary" (click)="charger()" [disabled]="loading()"><lx-icon name="refresh" [class.lx-spin]="loading()" /> Actualiser</button>
  </div>

  <div class="toolbar">
    <div class="lx-field has-icon search">
      <span class="lx-field-icon"><lx-icon name="search" /></span>
      <input class="lx-input" type="search" placeholder="Nom, email, téléphone ou n° de compte…" aria-label="Rechercher un utilisateur"
        [ngModel]="recherche()" (ngModelChange)="surRecherche($event)">
    </div>
    <div class="lx-tabs" style="margin:0">
      @for (r of roles; track r.v) {
        <button class="lx-tab" [class.is-active]="filtreRole() === r.v" (click)="filtreRole.set(r.v); relancer()">{{ r.l }}</button>
      }
      <span class="sep"></span>
      @for (s of statuts; track s.v) {
        <button class="lx-tab" [class.is-active]="filtreStatut() === s.v" (click)="filtreStatut.set(s.v); relancer()">{{ s.l }}</button>
      }
    </div>
  </div>

  @if (loading() && utilisateurs().length === 0) {
    <div class="lx-stack-sm">@for (i of [1,2,3,4]; track i) { <div class="lx-skeleton" style="min-height:72px"></div> }</div>
  } @else if (erreur()) {
    <div class="lx-empty"><lx-icon name="alert" /><p>{{ erreur() }}</p><button class="lx-btn lx-btn-primary lx-btn-sm" (click)="charger()">Réessayer</button></div>
  } @else if (filtres().length === 0) {
    <div class="lx-empty"><lx-icon name="users" /><p>Aucun utilisateur ne correspond à ces critères.</p></div>
  } @else {
    <div class="lx-list">
      <div class="row head" aria-hidden="true">
        <span>Utilisateur</span><span>Rôle</span><span>Note</span><span>Statut</span><span>KYC</span><span class="right">Actions</span>
      </div>
      @for (u of filtres(); track u.id) {
        <div class="row" [class.is-blocked]="u.statut === 'BLOQUE'">
          <div class="who">
            <span class="lx-avatar">{{ initiales(u) }}</span>
            <div class="min-w-0">
              <div class="name lx-truncate">{{ nomComplet(u) }} <span class="lx-muted id">#{{ u.id }}</span></div>
              <div class="lx-list-sub">{{ u.email }}{{ u.telephone ? ' · ' + u.telephone : '' }}</div>
            </div>
          </div>
          <div class="cell"><span class="cell-label">Rôle</span><span class="lx-badge" [class.lx-badge-info]="estChauffeur(u)">{{ libelleRole(u.role) }}</span></div>
          <div class="cell"><span class="cell-label">Note</span>
            @if (u.noteMoyenne > 0) { <span class="rating"><lx-icon name="star" [fill]="true" [size]="13" /> {{ u.noteMoyenne | number:'1.1-1' }} <span class="lx-muted">({{ u.nombreAvis }})</span></span> }
            @else { <span class="lx-muted">—</span> }
          </div>
          <div class="cell"><span class="cell-label">Statut</span><span class="lx-badge" [ngClass]="badgeStatut(u.statut)">{{ libelleStatut(u.statut) }}</span></div>
          <div class="cell"><span class="cell-label">KYC</span>
            @if (u.kycValide) { <span class="lx-badge lx-badge-success"><lx-icon name="check" [size]="12" /> Validé</span> }
            @else if (estChauffeur(u)) { <span class="lx-badge lx-badge-warning">À vérifier</span> }
            @else { <span class="lx-muted">—</span> }
          </div>
          <div class="actions">
            @if (!u.kycValide && estChauffeur(u)) {
              <button class="lx-btn lx-btn-secondary lx-btn-sm" (click)="validerKyc(u)" [disabled]="busy() === u.id"><lx-icon name="shield-check" /> Valider KYC</button>
            }
            @if (u.statut !== 'BLOQUE') {
              <button class="lx-btn lx-btn-danger lx-btn-sm" (click)="bloquer(u)" [disabled]="busy() === u.id">Bloquer</button>
            } @else {
              <button class="lx-btn lx-btn-success lx-btn-sm" (click)="debloquer(u)" [disabled]="busy() === u.id">Débloquer</button>
            }
          </div>
        </div>
      }
    </div>

    @if (totalPages() > 1) {
      <div class="pager">
        <span class="lx-muted">Page {{ page() + 1 }} / {{ totalPages() }}</span>
        <div class="lx-row" style="gap:.5rem">
          <button class="lx-btn lx-btn-secondary lx-btn-sm" [disabled]="page() === 0 || loading()" (click)="allerPage(page() - 1)"><lx-icon name="arrow-left" /> Préc.</button>
          <button class="lx-btn lx-btn-secondary lx-btn-sm" [disabled]="page() >= totalPages() - 1 || loading()" (click)="allerPage(page() + 1)">Suiv. <lx-icon name="arrow-right" /></button>
        </div>
      </div>
    }
  }
</div>`,
  styles: [`
    :host { display: block; }
    .min-w-0 { min-width: 0; }
    .toolbar { display: flex; flex-direction: column; gap: 0.85rem; margin-bottom: 1.25rem; }
    .search { max-width: 480px; }
    .sep { width: 1px; align-self: stretch; background: var(--lx-border-strong); margin: 0.25rem 0.3rem; flex-shrink: 0; }

    .row { display: grid; grid-template-columns: minmax(0, 2.6fr) 1.1fr 0.8fr 0.9fr 0.9fr minmax(0, 1.7fr); gap: 1rem; align-items: center;
      padding: 0.9rem 1.25rem; border-bottom: 1px solid var(--lx-border); font-size: 0.85rem;
      &:last-child { border-bottom: 0; }
      &.head { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--lx-muted-fg); padding-top: 0.75rem; padding-bottom: 0.75rem; }
      &:not(.head):hover { background: rgba(26, 29, 40, 0.3); }
      &.is-blocked .who { opacity: 0.6; } }
    .who { display: flex; align-items: center; gap: 0.75rem; min-width: 0; }
    .name { font-weight: 500; }
    .id { font-size: 0.72rem; font-weight: 400; }
    .cell-label { display: none; }
    .rating { display: inline-flex; align-items: center; gap: 0.25rem; color: var(--lx-amber); .lx-muted { font-size: 0.72rem; } }
    .right { text-align: right; }
    .actions { display: flex; gap: 0.4rem; justify-content: flex-end; flex-wrap: wrap; }
    .pager { display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin-top: 1rem; font-size: 0.85rem; }

    @media (max-width: 1000px) {
      .row.head { display: none; }
      .row { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.6rem 1rem; padding: 1rem; }
      .who, .actions { grid-column: 1 / -1; }
      .actions { justify-content: flex-start; padding-top: 0.6rem; border-top: 1px solid var(--lx-border); }
      .cell { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
      .cell-label { display: inline; font-size: 0.72rem; color: var(--lx-muted-fg); }
    }
    @media (max-width: 480px) {
      .row { grid-template-columns: 1fr; }
      .actions .lx-btn { flex: 1; }
    }
  `]
})
export class UsersComponent implements OnInit {
  private userSvc = inject(UtilisateurService);
  private adminSvc = inject(AdminService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);

  loading = signal(true);
  erreur = signal('');
  utilisateurs = signal<Utilisateur[]>([]);
  total = signal(0);
  totalPages = signal(1);
  page = signal(0);
  busy = signal<number | null>(null);
  recherche = signal('');
  filtreRole = signal<FiltreRole>('');
  filtreStatut = signal<FiltreStatut>('');

  readonly roles = [{ v: '' as FiltreRole, l: 'Tous' }, { v: 'PASSAGER' as FiltreRole, l: 'Clients' }, { v: 'CHAUFFEUR' as FiltreRole, l: 'Chauffeurs' }];
  readonly statuts = [{ v: '' as FiltreStatut, l: 'Tous statuts' }, { v: 'ACTIF' as FiltreStatut, l: 'Actifs' }, { v: 'BLOQUE' as FiltreStatut, l: 'Bloqués' }, { v: 'KYC' as FiltreStatut, l: 'KYC à vérifier' }];

  /** Résultats de la page courante (le filtrage est fait par le serveur sur toute la base). */
  filtres = this.utilisateurs;

  private destroyRef = inject(DestroyRef);
  private recherche$ = new Subject<string>();

  constructor() {
    this.recherche$.pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.relancer());
  }

  surRecherche(v: string) {
    this.recherche.set(v);
    this.recherche$.next(v.trim());
  }

  relancer() {
    this.page.set(0);
    this.charger();
  }

  ngOnInit() { this.charger(); }

  charger() {
    this.loading.set(true);
    const st = this.filtreStatut();
    this.userSvc.getAllAdmin(this.page(), 50, {
      recherche: this.recherche(),
      role: this.filtreRole(),
      statut: st === 'KYC' ? '' : st,
      kyc: st === 'KYC' ? 'A_VERIFIER' : ''
    }).subscribe({
      next: p => {
        this.utilisateurs.set(p.content ?? []);
        this.total.set(p.totalElements ?? 0);
        this.totalPages.set(Math.max(1, p.totalPages ?? 1));
        this.erreur.set('');
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.erreur.set('Impossible de charger les utilisateurs.');
        this.toast.error('Chargement impossible', err);
      }
    });
  }

  allerPage(p: number) { this.page.set(p); this.charger(); }

  async bloquer(u: Utilisateur) {
    const ok = await this.confirm.ask({
      title: `Bloquer ${this.nomComplet(u)} ?`,
      message: "L'utilisateur ne pourra plus se connecter ni réserver tant qu'il n'est pas débloqué.",
      confirmLabel: 'Bloquer', danger: true
    });
    if (ok) this.changerStatut(u, true);
  }

  debloquer(u: Utilisateur) { this.changerStatut(u, false); }

  private changerStatut(u: Utilisateur, bloquer: boolean) {
    this.busy.set(u.id);
    forkJoin([
      this.userSvc.changerStatut(u.id, bloquer ? 'BLOQUE' : 'ACTIF'),
      // Le profil et le compte de connexion sont dans deux services : on met les deux à jour.
      this.adminSvc.changerBlocageCompte(u.id, bloquer).pipe(catchError(() => of(null)))
    ]).subscribe({
      next: ([maj, compte]) => {
        this.busy.set(null);
        this.remplacer(maj);
        if (!compte) {
          this.toast.warning(bloquer ? 'Profil bloqué' : 'Profil débloqué',
            bloquer ? "Le compte de connexion n'a pas pu être bloqué — réessayez." : "Le compte de connexion n'a pas pu être réactivé — réessayez.");
        } else {
          this.toast.success(bloquer ? 'Utilisateur bloqué' : 'Utilisateur débloqué', this.nomComplet(u));
        }
      },
      error: err => { this.busy.set(null); this.toast.error('Action impossible', err); }
    });
  }

  async validerKyc(u: Utilisateur) {
    const ok = await this.confirm.ask({
      title: `Valider le KYC de ${this.nomComplet(u)} ?`,
      message: "Confirmez avoir vérifié la pièce d'identité et le permis de conduire.",
      confirmLabel: 'Valider'
    });
    if (!ok) return;
    this.busy.set(u.id);
    this.userSvc.validerKyc(u.id).subscribe({
      next: maj => { this.busy.set(null); this.remplacer(maj); this.toast.success('KYC validé', this.nomComplet(u)); },
      error: err => { this.busy.set(null); this.toast.error('Validation impossible', err); }
    });
  }

  private remplacer(maj: Utilisateur) {
    this.utilisateurs.update(arr => arr.map(x => x.id === maj.id ? { ...x, ...maj } : x));
  }

  estChauffeur(u: Utilisateur) { return u.role === 'CHAUFFEUR' || u.role === 'PASSAGER_ET_CHAUFFEUR'; }
  nomComplet(u: Utilisateur) { return `${u.prenom ?? ''} ${u.nom ?? ''}`.trim() || u.email || `#${u.id}`; }
  initiales(u: Utilisateur) {
    const i = `${(u.prenom ?? '').charAt(0)}${(u.nom ?? '').charAt(0)}`.toUpperCase();
    return i || (u.email ?? '?').charAt(0).toUpperCase();
  }
  libelleRole(r: string) {
    return ({ PASSAGER: 'Client', CHAUFFEUR: 'Chauffeur', PASSAGER_ET_CHAUFFEUR: 'Client & chauffeur' } as Record<string, string>)[r] ?? r;
  }
  libelleStatut(s: string) {
    return ({ ACTIF: 'Actif', BLOQUE: 'Bloqué', SUSPENDU: 'Suspendu', EN_ATTENTE_KYC: 'KYC en attente' } as Record<string, string>)[s] ?? s;
  }
  badgeStatut(s: string) {
    return ({ ACTIF: 'lx-badge-success', BLOQUE: 'lx-badge-danger', SUSPENDU: 'lx-badge-warning', EN_ATTENTE_KYC: 'lx-badge-info' } as Record<string, string>)[s] ?? '';
  }
}
