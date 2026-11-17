import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AdminService } from '../../../core/services/admin.service';
import { DashboardAdmin } from '../../../core/models';
import { IconComponent } from '../../../shared/components/icon/icon.component';

interface Barre { semaine: string; courses: number; pourcentage: number; }

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, IconComponent],
  template: `
<div class="dash">
  <div class="lx-page-head" style="margin-bottom:0">
    <div>
      <span class="lx-eyebrow">Administration</span>
      <h2>Activité de la plateforme</h2>
      <p>@if (derniereMaj()) { Mis à jour à {{ derniereMaj() | date:'HH:mm:ss' }} · actualisation automatique chaque minute } @else { Chargement… }</p>
    </div>
    <button class="lx-btn lx-btn-secondary" (click)="charger(true)" [disabled]="rafraichissement()">
      <lx-icon name="refresh" [class.lx-spin]="rafraichissement()" /> Actualiser
    </button>
  </div>

  @if (loading()) {
    <div class="lx-stats">@for (i of [1,2,3,4]; track i) { <div class="lx-skeleton" style="min-height:110px"></div> }</div>
    <div class="lx-skeleton" style="min-height:260px"></div>
  } @else if (errorMessage() && !stats()) {
    <div class="lx-empty">
      <lx-icon name="alert" />
      <p>{{ errorMessage() }}</p>
      <button class="lx-btn lx-btn-primary lx-btn-sm" (click)="charger(true)">Réessayer</button>
    </div>
  } @else if (stats(); as s) {
    @if (errorMessage()) { <div class="lx-alert lx-alert-error"><lx-icon name="alert" /> {{ errorMessage() }}</div> }

    <!-- Indicateurs principaux -->
    <section class="lx-stats lx-rise">
      <div class="lx-stat">
        <lx-icon name="users" style="color:var(--lx-primary)" />
        <div class="lx-stat-value">{{ s.totalUtilisateurs | number }}</div>
        <div class="lx-stat-label">utilisateurs · {{ s.inscritsSemaine ?? 0 }} cette semaine</div>
      </div>
      <div class="lx-stat">
        <lx-icon name="car" style="color:var(--lx-blue)" />
        <div class="lx-stat-value">{{ chauffeurs(s) | number }}</div>
        <div class="lx-stat-label">chauffeurs · inscrits</div>
      </div>
      <div class="lx-stat">
        <lx-icon name="user" style="color:var(--lx-emerald)" />
        <div class="lx-stat-value">{{ s.totalPassagers | number }}</div>
        <div class="lx-stat-label">passagers · inscrits</div>
      </div>
      <div class="lx-stat">
        <lx-icon name="wallet" style="color:var(--lx-amber)" />
        <div class="lx-stat-value">{{ s.revenusPlateforme | number:'1.0-0' }} F</div>
        <div class="lx-stat-label">revenus · plateforme</div>
      </div>
    </section>

    <div class="cols">
      <!-- Activité hebdomadaire -->
      <section class="lx-card lx-rise lx-rise-1">
        <div class="lx-section-head">
          <h3>Courses des 4 dernières semaines</h3>
          <span class="lx-muted" style="font-size:.75rem">% terminées</span>
        </div>
        @if (barres().length) {
          <div class="chart" role="img" [attr.aria-label]="resumeGraphique()">
            @for (b of barres(); track b.semaine) {
              <div class="bar-col">
                <span class="bar-value lx-mono">{{ b.courses }}</span>
                <div class="bar-track"><div class="bar-fill" [style.height.%]="hauteur(b.courses)"></div></div>
                <span class="bar-pct" [class.good]="b.pourcentage >= 70">{{ b.pourcentage }} %</span>
                <span class="bar-label">{{ b.semaine }}</span>
              </div>
            }
          </div>
        } @else {
          <div class="lx-empty" style="border:0;padding:2rem 0"><lx-icon name="gauge" /><p>Pas encore de données hebdomadaires.</p></div>
        }
        <div class="chart-foot">
          <div><span class="lx-display">{{ s.trajetsEnCours | number }}</span><span class="lx-muted">courses en cours</span></div>
          <div><span class="lx-display">{{ s.trajetsTermines | number }}</span><span class="lx-muted">courses terminées</span></div>
          <div><span class="lx-display">{{ s.totalTrajets | number }}</span><span class="lx-muted">trajets publiés</span></div>
        </div>
      </section>

      <!-- À traiter -->
      <section class="lx-stack-sm lx-rise lx-rise-2">
        <a routerLink="/admin/signalements" class="todo">
          <span class="lx-icon-tile is-warn"><lx-icon name="alert" /></span>
          <span class="lx-list-body">
            <span class="todo-value lx-display">{{ signalements(s) }}</span>
            <span class="lx-list-sub">signalement(s) à traiter</span>
          </span>
          <lx-icon name="chevron-right" class="lx-chevron" />
        </a>
        <a routerLink="/admin/kyc" class="todo">
          <span class="lx-icon-tile is-gold"><lx-icon name="shield-check" /></span>
          <span class="lx-list-body">
            <span class="todo-value lx-display">KYC</span>
            <span class="lx-list-sub">vérifier les chauffeurs</span>
          </span>
          <lx-icon name="chevron-right" class="lx-chevron" />
        </a>
        <a routerLink="/admin/remboursements" class="todo">
          <span class="lx-icon-tile"><lx-icon name="rotate-ccw" /></span>
          <span class="lx-list-body">
            <span class="todo-value lx-display">Remboursements</span>
            <span class="lx-list-sub">demandes des passagers</span>
          </span>
          <lx-icon name="chevron-right" class="lx-chevron" />
        </a>
        <a routerLink="/admin/commissions" class="todo">
          <span class="lx-icon-tile is-ok"><lx-icon name="tag" /></span>
          <span class="lx-list-body">
            <span class="todo-value lx-display">{{ s.totalCommissions | number:'1.0-0' }} F</span>
            <span class="lx-list-sub">commissions perçues</span>
          </span>
          <lx-icon name="chevron-right" class="lx-chevron" />
        </a>
      </section>
    </div>

    <!-- Mois en cours -->
    <section class="lx-rise lx-rise-3">
      <div class="lx-section-head"><h3>Ce mois-ci</h3></div>
      <div class="month">
        <div><span class="lx-display">{{ s.activiteMois?.trajetsCrees ?? 0 | number }}</span><span>trajets créés</span></div>
        <div><span class="lx-display">{{ s.activiteMois?.trajetsTermines ?? 0 | number }}</span><span>courses terminées</span></div>
        <div><span class="lx-display">{{ s.activiteMois?.nouveauxUtilisateurs ?? 0 | number }}</span><span>nouveaux profils</span></div>
        <div><span class="lx-display">{{ s.utilisateursActifs30J ?? s.activiteMois?.utilisateursActifs ?? 0 | number }}</span><span>actifs sur 30 j</span></div>
        <div><span class="lx-display">{{ s.utilisateursInactifs30J ?? s.activiteMois?.utilisateursInactifs ?? 0 | number }}</span><span>inactifs sur 30 j</span></div>
        <div><span class="lx-display">{{ s.signalementsSemaine ?? 0 | number }}</span><span>cas traités sur 7 j</span></div>
      </div>
    </section>
  }
</div>`,
  styles: [`
    :host { display: block; }
    .dash { display: flex; flex-direction: column; gap: 1.75rem; }
    .cols { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr); gap: 1.5rem; align-items: start; }

    .chart { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 1rem; align-items: end; height: 230px; padding-top: 0.5rem; }
    .bar-col { display: flex; flex-direction: column; align-items: center; gap: 0.35rem; height: 100%; min-width: 0; }
    .bar-track { flex: 1; width: 100%; max-width: 56px; background: var(--lx-secondary); border-radius: 8px; display: flex; align-items: flex-end; overflow: hidden; }
    .bar-fill { width: 100%; background: linear-gradient(to top, rgba(200, 146, 42, 0.55), var(--lx-primary)); border-radius: 8px 8px 0 0; transition: height 0.5s; min-height: 4px; }
    .bar-value { font-size: 0.8rem; }
    .bar-pct { font-size: 0.72rem; color: var(--lx-muted-fg); &.good { color: var(--lx-emerald); } }
    .bar-label { font-size: 0.72rem; color: var(--lx-muted-fg); text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
    .chart-foot { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; margin-top: 1.25rem; padding-top: 1.1rem; border-top: 1px solid var(--lx-border);
      > div { display: flex; flex-direction: column; } .lx-display { font-size: 1.4rem; } .lx-muted { font-size: 0.72rem; } }

    .todo { display: flex; align-items: center; gap: 0.9rem; padding: 1rem 1.15rem; text-decoration: none; color: inherit;
      background: var(--lx-card); border: 1px solid var(--lx-border); border-radius: var(--lx-r-lg); transition: border-color 0.2s;
      &:hover { border-color: rgba(200, 146, 42, 0.35); } }
    .todo-value { font-size: 1.2rem; line-height: 1.2; }
    .lx-icon-tile.is-warn { background: rgba(251, 191, 36, 0.12); color: var(--lx-amber); }
    .lx-icon-tile.is-ok { background: rgba(52, 211, 153, 0.12); color: var(--lx-emerald); }

    .month { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 1rem;
      > div { background: var(--lx-card); border: 1px solid var(--lx-border); border-radius: var(--lx-r-lg); padding: 1rem 1.1rem; display: flex; flex-direction: column; gap: 0.2rem; min-width: 0; }
      .lx-display { font-size: 1.4rem; } span:last-child { font-size: 0.72rem; color: var(--lx-muted-fg); } }

    @media (max-width: 1100px) { .cols { grid-template-columns: 1fr; } .month { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
    @media (max-width: 560px) { .month { grid-template-columns: repeat(2, minmax(0, 1fr)); } .chart { height: 190px; gap: 0.6rem; } }
  `]
})
export class AdminDashboardComponent implements OnInit {
  private adminSvc = inject(AdminService);
  private destroyRef = inject(DestroyRef);

  loading = signal(true);
  stats = signal<DashboardAdmin | null>(null);
  hebdo = signal<any>(null);
  errorMessage = signal<string | null>(null);
  derniereMaj = signal<Date | null>(null);
  rafraichissement = signal(false);

  /** Semaines de la plus ancienne (à gauche) à la plus récente (à droite). */
  barres = computed<Barre[]>(() => {
    const h = this.hebdo();
    if (!h?.coursesParSemaine) return [];
    const libelles = ['Il y a 3 sem.', 'Il y a 2 sem.', 'Sem. dernière', 'Cette semaine'];
    // Côté serveur, l'indice 0 = semaine en cours, 3 = il y a trois semaines.
    return [3, 2, 1, 0].map((i, pos) => ({
      semaine: libelles[pos],
      courses: Number(h.coursesParSemaine[i] ?? 0),
      pourcentage: Math.min(100, Math.round(Number(h.pourcentageTermines?.[i] ?? 0)))
    }));
  });
  private maxCourses = computed(() => Math.max(1, ...this.barres().map(b => b.courses)));

  ngOnInit() {
    this.charger(false);
    interval(60000).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (!document.hidden) this.charger(false);
    });
  }

  charger(manuel: boolean) {
    this.rafraichissement.set(true);
    this.adminSvc.getDashboard().subscribe({
      next: data => {
        this.stats.set(data);
        this.errorMessage.set(null);
        this.loading.set(false);
        this.rafraichissement.set(false);
        this.derniereMaj.set(new Date());
      },
      error: () => {
        this.rafraichissement.set(false);
        this.loading.set(false);
        if (!this.stats() || manuel) {
          this.errorMessage.set("Impossible de charger les statistiques. Vérifiez que le service d'administration est démarré.");
        }
      }
    });
    this.adminSvc.getWeeklyStats().subscribe({ next: w => this.hebdo.set(w), error: () => {} });
  }

  hauteur(courses: number): number {
    return Math.round((courses / this.maxCourses()) * 100);
  }

  chauffeurs(s: DashboardAdmin): number {
    return s.totalChauffeurs ?? s.totalConducteurs ?? 0;
  }

  signalements(s: DashboardAdmin): number {
    return s.signalementsOuverts ?? s.signalementsEnCours ?? s.signalements ?? 0;
  }

  resumeGraphique(): string {
    return this.barres().map(b => `${b.semaine} : ${b.courses} courses, ${b.pourcentage} % terminées`).join(' ; ');
  }
}
