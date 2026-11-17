import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { UtilisateurService } from '../../../core/services/utilisateur.service';
import { AdminService } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { Utilisateur } from '../../../core/models';

type FiltreRole = '' | 'PASSAGER' | 'CHAUFFEUR';
type FiltreStatut = '' | 'ACTIF' | 'BLOQUE' | 'KYC';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<div class="adm">
  <header class="adm-head">
    <div>
      <h2>Utilisateurs</h2>
      <p>{{ total() }} inscrits · {{ filtres().length }} affichés</p>
    </div>
    <button class="btn btn-outline btn-sm" (click)="charger()" [disabled]="loading()">⟳ Actualiser</button>
  </header>

  <div class="toolbar">
    <input class="field search" type="search" placeholder="Rechercher un nom, un email, un téléphone…"
           [ngModel]="recherche()" (ngModelChange)="recherche.set($event)">
    <div class="chips">
      @for (r of roles; track r.v) {
        <button class="chip" [class.on]="filtreRole() === r.v" (click)="filtreRole.set(r.v)">{{ r.l }}</button>
      }
      <span class="sep"></span>
      @for (s of statuts; track s.v) {
        <button class="chip" [class.on]="filtreStatut() === s.v" (click)="filtreStatut.set(s.v)">{{ s.l }}</button>
      }
    </div>
  </div>

  @if (loading() && utilisateurs().length === 0) {
    <div class="card skel"></div>
  } @else if (erreur()) {
    <div class="card empty"><p>{{ erreur() }}</p><button class="btn btn-primary btn-sm" (click)="charger()">Réessayer</button></div>
  } @else if (filtres().length === 0) {
    <div class="card empty"><p>Aucun utilisateur ne correspond à ces critères.</p></div>
  } @else {
    <div class="card table-wrap">
      <table class="data-table">
        <thead><tr>
          <th>Utilisateur</th><th>Rôle</th><th>Note</th><th>Statut</th><th>KYC</th><th class="right">Actions</th>
        </tr></thead>
        <tbody>
          @for (u of filtres(); track u.id) {
            <tr [class.blocked]="u.statut === 'BLOQUE'">
              <td>
                <div class="who">
                  <div class="avatar-sm">{{ initiales(u) }}</div>
                  <div class="who-txt">
                    <div class="name">{{ nomComplet(u) }}</div>
                    <div class="sub">{{ u.email }}{{ u.telephone ? ' · ' + u.telephone : '' }}</div>
                  </div>
                </div>
              </td>
              <td><span class="badge" [class]="u.role === 'PASSAGER' ? 'badge badge-muted' : 'badge badge-info'">{{ libelleRole(u.role) }}</span></td>
              <td>
                @if (u.noteMoyenne > 0) { <span class="star">★</span> {{ u.noteMoyenne | number:'1.1-1' }} <span class="sub">({{ u.nombreAvis }})</span> }
                @else { <span class="sub">—</span> }
              </td>
              <td><span [class]="badgeStatut(u.statut)">{{ libelleStatut(u.statut) }}</span></td>
              <td>
                @if (u.kycValide) { <span class="badge badge-success">✓ Validé</span> }
                @else if (estChauffeur(u)) { <span class="badge badge-warning">À vérifier</span> }
                @else { <span class="sub">—</span> }
              </td>
              <td class="right">
                <div class="row-actions">
                  @if (!u.kycValide && estChauffeur(u)) {
                    <button class="btn btn-outline btn-sm" (click)="validerKyc(u)" [disabled]="busy() === u.id">Valider KYC</button>
                  }
                  @if (u.statut !== 'BLOQUE') {
                    <button class="btn btn-danger btn-sm" (click)="bloquer(u)" [disabled]="busy() === u.id">Bloquer</button>
                  } @else {
                    <button class="btn btn-success btn-sm" (click)="debloquer(u)" [disabled]="busy() === u.id">Débloquer</button>
                  }
                </div>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    @if (totalPages() > 1) {
      <div class="pager">
        <span class="sub">Page {{ page() + 1 }} / {{ totalPages() }}</span>
        <div>
          <button class="btn btn-outline btn-sm" [disabled]="page() === 0" (click)="allerPage(page() - 1)">← Préc.</button>
          <button class="btn btn-outline btn-sm" [disabled]="page() >= totalPages() - 1" (click)="allerPage(page() + 1)">Suiv. →</button>
        </div>
      </div>
    }
  }
</div>`,
  styles: [`
    .adm-head { display:flex; justify-content:space-between; align-items:flex-end; gap:1rem; margin-bottom:1.25rem; flex-wrap:wrap; }
    .adm-head p { margin:.2rem 0 0; }
    .toolbar { display:flex; flex-direction:column; gap:.75rem; margin-bottom:1rem; }
    .search { max-width:480px; }
    .chips { display:flex; flex-wrap:wrap; gap:.4rem; align-items:center; }
    .chip { border:1px solid var(--color-border); background:#fff; border-radius:999px; padding:.35rem .8rem; font-size:.82rem; font-weight:600; cursor:pointer; color:var(--color-muted); }
    .chip.on { background:var(--color-primary); color:#fff; border-color:var(--color-primary); }
    .sep { width:1px; height:20px; background:var(--color-border); margin:0 .3rem; }
    .table-wrap { padding:0; overflow-x:auto; }
    .who { display:flex; align-items:center; gap:.7rem; }
    .avatar-sm { width:36px; height:36px; border-radius:50%; background:var(--color-bg); border:1px solid var(--color-border); display:grid; place-items:center; font-weight:700; font-size:.8rem; flex-shrink:0; }
    .who-txt { min-width:0; }
    .name { font-weight:600; }
    .sub { font-size:.78rem; color:var(--color-muted); }
    .star { color:#F59E0B; }
    .right { text-align:right; }
    .row-actions { display:flex; gap:.4rem; justify-content:flex-end; flex-wrap:wrap; }
    tr.blocked td { opacity:.7; }
    .pager { display:flex; justify-content:space-between; align-items:center; margin-top:1rem; }
    .pager div { display:flex; gap:.5rem; }
    .empty { text-align:center; padding:2.5rem; display:flex; flex-direction:column; align-items:center; gap:1rem; }
    .skel { height:260px; background:linear-gradient(90deg,#f3f4f6,#e5e7eb,#f3f4f6); background-size:200% 100%; animation:sh 1.2s infinite; }
    @keyframes sh { to { background-position:-200% 0; } }
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

  filtres = computed(() => {
    const q = this.recherche().trim().toLowerCase();
    const role = this.filtreRole();
    const st = this.filtreStatut();
    return this.utilisateurs().filter(u => {
      if (role === 'PASSAGER' && !(u.role === 'PASSAGER' || u.role === 'PASSAGER_ET_CHAUFFEUR')) return false;
      if (role === 'CHAUFFEUR' && !this.estChauffeur(u)) return false;
      if (st === 'ACTIF' && u.statut !== 'ACTIF') return false;
      if (st === 'BLOQUE' && u.statut !== 'BLOQUE') return false;
      if (st === 'KYC' && (u.kycValide || !this.estChauffeur(u))) return false;
      if (!q) return true;
      return [u.nom, u.prenom, u.email, u.telephone, String(u.id)].some(x => (x ?? '').toLowerCase().includes(q));
    });
  });

  ngOnInit() { this.charger(); }

  charger() {
    this.loading.set(true);
    this.userSvc.getAllAdmin(this.page(), 100).subscribe({
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
        if (bloquer && !compte) {
          this.toast.warning('Profil bloqué', "Le compte de connexion n'a pas pu être bloqué — réessayez.");
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
    return ({ ACTIF: 'badge badge-success', BLOQUE: 'badge badge-danger', SUSPENDU: 'badge badge-warning', EN_ATTENTE_KYC: 'badge badge-info' } as Record<string, string>)[s] ?? 'badge badge-muted';
  }
}
