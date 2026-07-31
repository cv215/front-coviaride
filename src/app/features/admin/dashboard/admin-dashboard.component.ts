import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AdminService } from '../../../core/services/admin.service';
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
  } @else if (stats()) {
    <!-- STATS PRINCIPALES -->
    <div class="stats-grid" style="margin-bottom:2rem">
      <div class="stat-card">
        <div class="stat-info">
          <div class="value">{{ stats()!.totalUtilisateurs | number }}</div>
          <div class="label">Utilisateurs total</div>
        </div>
        <div class="stat-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-info">
          <div class="value">{{ stats()!.totalPassagers | number }}</div>
          <div class="label">Clients</div>
        </div>
        <div class="stat-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-info">
          <div class="value">{{ stats()!.totalConducteurs | number }}</div>
          <div class="label">Chauffeurs</div>
        </div>
        <div class="stat-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-info">
          <div class="value">{{ stats()!.totalTrajets | number }}</div>
          <div class="label">Trajets total</div>
        </div>
        <div class="stat-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        </div>
      </div>
      <div class="stat-card" style="border-color:var(--color-success)">
        <div class="stat-info">
          <div class="value" style="color:var(--color-success)">{{ stats()!.trajetsEnCours | number }}</div>
          <div class="label">Trajets en cours</div>
        </div>
        <div class="stat-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </div>
      </div>
      <div class="stat-card" style="border-color:var(--color-accent)">
        <div class="stat-info">
          <div class="value" style="color:var(--color-accent)">{{ stats()!.totalCommissions | number:'1.0-0' }} XAF</div>
          <div class="label">Commissions totales (5%)</div>
        </div>
        <div class="stat-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        </div>
      </div>
    </div>

    <!-- ALERTES + ACTIONS RAPIDES -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;margin-bottom:2rem">
      <!-- SIGNALEMENTS OUVERTS -->
      <div class="card" style="border-left:4px solid var(--color-warning)">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div>
            <div style="font-size:0.8rem;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:var(--color-warning);margin-bottom:0.25rem">Signalements</div>
            <div style="font-size:2rem;font-weight:800">{{ stats()!.signalementsOuverts }}</div>
            <div style="font-size:0.85rem;color:var(--color-muted)">En attente de traitement</div>
          </div>
          <a routerLink="/admin/signalements" class="btn btn-outline btn-sm">Traiter →</a>
        </div>
      </div>

      <!-- REVENUS PLATEFORME -->
      <div class="card" style="border-left:4px solid var(--color-success)">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div>
            <div style="font-size:0.8rem;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:var(--color-success);margin-bottom:0.25rem">Revenus plateforme</div>
            <div style="font-size:2rem;font-weight:800">{{ stats()!.revenusPlateforme | number:'1.0-0' }} XAF</div>
            <div style="font-size:0.85rem;color:var(--color-muted)">Total transactions</div>
          </div>
          <a routerLink="/admin/commissions" class="btn btn-outline btn-sm">Détails →</a>
        </div>
      </div>
    </div>

    <!-- ACTIONS RAPIDES -->
    <div class="card">
      <h3 style="margin-bottom:1.5rem">Actions rapides</h3>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:1rem">
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
  `]
})
export class AdminDashboardComponent implements OnInit {
  loading = signal(true);
  stats = signal<DashboardAdmin | null>(null);

  constructor(private adminSvc: AdminService) {}

  ngOnInit() {
    this.adminSvc.getDashboard().subscribe({
      next: s => { this.stats.set(s); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }
}
