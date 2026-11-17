import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AdminService } from '../../../core/services/admin.service';
import { AuthService } from '../../../core/services/auth.service';
import { DashboardAdmin } from '../../../core/models';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
<div>
  <div style="margin-bottom:2rem">
    <h2>Dashboard Administration</h2>
    <p>Vue d'ensemble de la plateforme CoviaRide</p>
  </div>

  @if (loading()) {
    <div style="text-align:center;padding:3rem;color:var(--color-muted)">Chargement des statistiques...</div>
  } @else if (errorMessage()) {
    <div class="card" style="border-left:4px solid var(--color-danger)">
      <h3 style="margin-bottom:0.5rem">Tableau de bord indisponible</h3>
      <p style="margin:0;color:var(--color-muted)">{{ errorMessage() }}</p>
    </div>
  } @else if (stats()) {
    @if (isSuperAdmin()) {
      <!-- SUPER ADMIN SECTION -->
      <div class="super-admin-section" style="margin-bottom:2rem;padding:1.5rem;background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);border-radius:var(--radius-md);color:white">
        <h3 style="margin-bottom:1.5rem;font-size:1.25rem">Dashboard Super Admin</h3>
        
        <div class="stats-grid" style="margin-bottom:2rem">
          <!-- Chauffeurs -->
          <div class="stat-card super-admin-card">
            <div class="stat-info">
              <div class="value">{{ stats()?.totalChauffeurs ?? stats()?.totalConducteurs ?? 0 | number }}</div>
              <div class="label">Chauffeurs inscrits</div>
              <div class="sub-label">Conducteurs actifs</div>
            </div>
          </div>

          <!-- Passagers -->
          <div class="stat-card super-admin-card">
            <div class="stat-info">
              <div class="value">{{ stats()?.totalPassagers ?? 0 | number }}</div>
              <div class="label">Passagers inscrits</div>
              <div class="sub-label">Usagers actifs</div>
            </div>
          </div>

          <!-- Courses en cours -->
          <div class="stat-card super-admin-card">
            <div class="stat-info">
              <div class="value">{{ stats()?.trajetsEnCours ?? 0 | number }}</div>
              <div class="label">Courses en cours</div>
              <div class="sub-label">En route</div>
            </div>
          </div>

          <!-- Courses terminées -->
          <div class="stat-card super-admin-card">
            <div class="stat-info">
              <div class="value">{{ stats()?.trajetsTermines ?? 0 | number }}</div>
              <div class="label">Courses terminées</div>
              <div class="sub-label">Complétées</div>
            </div>
          </div>

          <!-- Actifs 30 jours -->
          <div class="stat-card super-admin-card">
            <div class="stat-info">
              <div class="value">{{ stats()?.utilisateursActifs30J ?? 0 | number }}</div>
              <div class="label">Personnes actives / 30j</div>
              <div class="sub-label">Utilisateurs engagés</div>
            </div>
          </div>

          <!-- Inactifs 30 jours -->
          <div class="stat-card super-admin-card">
            <div class="stat-info">
              <div class="value">{{ stats()?.utilisateursInactifs30J ?? 0 | number }}</div>
              <div class="label">Personnes inactives / 30j</div>
              <div class="sub-label">Sans activité</div>
            </div>
          </div>
        </div>

        <!-- Graphique hebdomadaire -->
        @if (weeklyStats()) {
          <div class="weekly-chart" style="background:rgba(255,255,255,0.1);padding:1.5rem;border-radius:var(--radius-md);backdrop-filter:blur(10px)">
            <h4 style="margin-bottom:1rem;color:white">Activité hebdomadaire (% de completion)</h4>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:1rem;align-items:flex-end">
              @for (item of getChartData(); track item.week) {
                <div style="text-align:center">
                  <div style="position:relative;height:150px;background:rgba(255,255,255,0.2);border-radius:4px;margin-bottom:0.5rem;display:flex;flex-direction:column;justify-content:flex-end;overflow:hidden">
                    <div [style.height.%]="item.percentage" style="background:linear-gradient(to top, #4ade80, #22c55e);border-radius:4px 4px 0 0;display:flex;align-items:center;justify-content:center;color:white;font-weight:600;transition:all 0.3s">
                      @if (item.percentage > 15) {
                        <span style="font-size:0.75rem">{{ item.percentage | number:'1.0-0' }}%</span>
                      }
                    </div>
                  </div>
                  <div style="font-size:0.8rem;color:rgba(255,255,255,0.9);font-weight:600">{{ item.week }}</div>
                  <div style="font-size:0.7rem;color:rgba(255,255,255,0.7)">{{ item.courses }} courses</div>
                </div>
              }
            </div>
          </div>
        }
      </div>
    }

    <!-- STATS COMMUNES -->
    <div class="stats-grid" style="margin-bottom:2rem">
      <div class="stat-card">
        <div class="stat-info">
          <div class="value">{{ stats()?.inscritsSemaine ?? 0 | number }}</div>
          <div class="label">Nouveaux inscrits / 7j</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-info">
          <div class="value">{{ stats()?.totalChauffeurs ?? stats()?.totalConducteurs ?? 0 | number }}</div>
          <div class="label">Total chauffeurs</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-info">
          <div class="value">{{ stats()?.totalPassagers ?? 0 | number }}</div>
          <div class="label">Total passagers</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-info">
          <div class="value">{{ stats()?.signalementsEnCours ?? stats()?.signalementsOuverts ?? stats()?.signalements ?? 0 | number }}</div>
          <div class="label">Cas en cours</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-info">
          <div class="value">{{ stats()!.signalementsSemaine ?? 0 | number }}</div>
          <div class="label">Cas traités / 7j</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-info">
          <div class="value">{{ stats()!.utilisateursActifs30J ?? 0 | number }}</div>
          <div class="label">Personnes actives / 30j</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-info">
          <div class="value">{{ stats()!.utilisateursInactifs30J ?? 0 | number }}</div>
          <div class="label">Personnes inactives / 30j</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-info">
          <div class="value">{{ stats()!.totalUtilisateurs | number }}</div>
          <div class="label">Utilisateurs total</div>
        </div>
      </div>
    </div>

    <div class="admin-summary-grid" style="margin-bottom:2rem">
      <div class="card" style="border-left:4px solid var(--color-warning)">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:1rem">
          <div>
            <div style="font-size:0.8rem;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:var(--color-warning);margin-bottom:0.25rem">Signalements</div>
            <div style="font-size:2rem;font-weight:800">{{ stats()?.signalementsOuverts ?? stats()?.signalementsEnCours ?? stats()?.signalements ?? 0 }}</div>
            <div style="font-size:0.85rem;color:var(--color-muted)">En attente de traitement</div>
          </div>
          <a routerLink="/admin/signalements" class="btn btn-outline btn-sm">Traiter →</a>
        </div>
      </div>

      <div class="card" style="border-left:4px solid var(--color-success)">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:1rem">
          <div>
            <div style="font-size:0.8rem;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:var(--color-success);margin-bottom:0.25rem">Revenus plateforme</div>
            <div style="font-size:2rem;font-weight:800">{{ stats()!.revenusPlateforme | number:'1.0-0' }} XAF</div>
            <div style="font-size:0.85rem;color:var(--color-muted)">Total transactions</div>
          </div>
          <a routerLink="/admin/commissions" class="btn btn-outline btn-sm">Détails →</a>
        </div>
      </div>
    </div>

    <div class="card" style="margin-bottom:2rem">
      <h3 style="margin-bottom:1rem">Récapitulatif d'activité du mois</h3>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-info">
            <div class="value">{{ stats()!.activiteMois?.trajetsCrees ?? 0 | number }}</div>
            <div class="label">Trajets créés</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-info">
            <div class="value">{{ stats()!.activiteMois?.trajetsTermines ?? 0 | number }}</div>
            <div class="label">Courses terminées</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-info">
            <div class="value">{{ stats()!.activiteMois?.nouveauxUtilisateurs ?? 0 | number }}</div>
            <div class="label">Nouveaux profils</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-info">
            <div class="value">{{ stats()!.activiteMois?.utilisateursActifs ?? 0 | number }}</div>
            <div class="label">Utilisateurs actifs</div>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <h3 style="margin-bottom:1.5rem">Actions rapides</h3>
      <div class="admin-quick-actions">
        <a routerLink="/admin/utilisateurs" class="quick-action">
          <div class="qa-icon" style="background:#EDE9FE">
            <svg viewBox="0 0 24 24" fill="none" stroke="#7C3AED" stroke-width="2" style="width:20px"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
          </div>
          <span>Gérer utilisateurs</span>
        </a>
        <a routerLink="/admin/kyc" class="quick-action">
          <div class="qa-icon" style="background:#D1FAE5">
            <svg viewBox="0 0 24 24" fill="none" stroke="#065F46" stroke-width="2" style="width:20px"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <span>Valider KYC</span>
        </a>
        <a routerLink="/admin/signalements" class="quick-action">
          <div class="qa-icon" style="background:#FEF3C7">
            <svg viewBox="0 0 24 24" fill="none" stroke="#92400E" stroke-width="2" style="width:20px"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <span>Signalements</span>
        </a>
        <a routerLink="/admin/commissions" class="quick-action">
          <div class="qa-icon" style="background:#DBEAFE">
            <svg viewBox="0 0 24 24" fill="none" stroke="#1E40AF" stroke-width="2" style="width:20px"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <span>Commissions</span>
        </a>
      </div>
    </div>
  }
</div>`,
  styles: [`
    .quick-action { display:flex;flex-direction:column;align-items:center;gap:0.75rem;
      padding:1.25rem;border:1px solid var(--color-border);border-radius:var(--radius-md);
      text-decoration:none;color:var(--color-primary);font-weight:500;font-size:0.875rem;
      transition:all 0.15s;text-align:center;
      &:hover { background:var(--color-bg);transform:translateY(-2px);box-shadow:var(--shadow-md); }
    }
    .qa-icon { width:44px;height:44px;border-radius:var(--radius-md);display:flex;align-items:center;justify-content:center; }
    .super-admin-card { background:rgba(255,255,255,0.15) !important;border:1px solid rgba(255,255,255,0.3) !important; }
    .super-admin-card .value { color:white !important;font-weight:800; }
    .super-admin-card .label { color:rgba(255,255,255,0.95) !important; }
    .super-admin-card .sub-label { color:rgba(255,255,255,0.7) !important;font-size:0.7rem;margin-top:0.25rem; }
  `]
})
export class AdminDashboardComponent implements OnInit {
  loading = signal(true);
  stats = signal<DashboardAdmin | null>(null);
  weeklyStats = signal<any>(null);
  errorMessage = signal<string | null>(null);

  constructor(private adminSvc: AdminService, private auth: AuthService) {}

  isSuperAdmin(): boolean {
    const user = this.auth.currentUser();
    return user?.role === 'SUPER_ADMIN';
  }

  ngOnInit() {
    this.adminSvc.getDashboard().subscribe({
      next: data => {
        this.stats.set(data);
        this.loading.set(false);
        
        if (this.isSuperAdmin()) {
          this.adminSvc.getWeeklyStats().subscribe({
            next: weekly => this.weeklyStats.set(weekly),
            error: () => {}
          });
        }
      },
      error: () => {
        this.errorMessage.set('Impossible de charger les statistiques. Vérifiez votre connexion.');
        this.loading.set(false);
      }
    });
  }

  getChartData() {
    const stats = this.weeklyStats();
    if (!stats || !stats.coursesParSemaine) return [];
    
    const semaines = ['Semaine 4', 'Semaine 3', 'Semaine 2', 'Semaine actuelle'];
    const coursesParSemaine = stats.coursesParSemaine;
    const pourcentages = stats.pourcentageTermines;
    
    return [
      { week: semaines[3], courses: coursesParSemaine[3] || 0, percentage: Math.min(100, (pourcentages[3] || 0)) },
      { week: semaines[2], courses: coursesParSemaine[2] || 0, percentage: Math.min(100, (pourcentages[2] || 0)) },
      { week: semaines[1], courses: coursesParSemaine[1] || 0, percentage: Math.min(100, (pourcentages[1] || 0)) },
      { week: semaines[0], courses: coursesParSemaine[0] || 0, percentage: Math.min(100, (pourcentages[0] || 0)) }
    ];
  }
}
