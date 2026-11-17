import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { AdminService } from '../../../core/services/admin.service';
import { RemboursementService } from '../../../core/services/remboursement.service';
import { UtilisateurService } from '../../../core/services/utilisateur.service';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  template: `
<div class="app-shell">
  <header class="topbar">
    <button class="menu-toggle" (click)="menuOuvert.set(!menuOuvert())" aria-label="Menu">☰</button>
    <span class="logo">CoviaRide <span style="font-size:0.7rem;background:var(--color-primary);color:white;padding:2px 8px;border-radius:4px;margin-left:4px;font-weight:600">ADMIN</span></span>
    <div class="nav-actions">
      <div class="user-pill">
        <div class="avatar" style="background:#7C3AED">{{ (email().charAt(0) || 'A').toUpperCase() }}</div>
        <span class="who">{{ email() || 'Super Admin' }}</span>
      </div>
      <button class="btn btn-ghost btn-sm" (click)="logout()">Déconnexion</button>
    </div>
  </header>
  <div class="main-layout">
    <aside class="sidebar" [class.open]="menuOuvert()" (click)="menuOuvert.set(false)">
      <span class="nav-section">Vue d'ensemble</span>
      <a routerLink="/admin/dashboard" routerLinkActive="active" class="nav-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
        Dashboard
      </a>
      <span class="nav-section">Gestion</span>
      <a routerLink="/admin/utilisateurs" routerLinkActive="active" class="nav-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        Utilisateurs
      </a>
      <a routerLink="/admin/kyc" routerLinkActive="active" class="nav-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        KYC Chauffeurs
        @if (compteurs().kyc > 0) { <span class="count">{{ compteurs().kyc }}</span> }
      </a>
      <a routerLink="/admin/signalements" routerLinkActive="active" class="nav-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        Signalements
        @if (compteurs().signalements > 0) { <span class="count">{{ compteurs().signalements }}</span> }
      </a>
      <a routerLink="/admin/commissions" routerLinkActive="active" class="nav-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        Commissions
      </a>
      <a routerLink="/admin/admins" routerLinkActive="active" class="nav-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        Admins
      </a>
      <a routerLink="/admin/remboursements" routerLinkActive="active" class="nav-item">
         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="1 4 1 10 7 10"/>
            <path d="M3.51 15a9 9 0 1 0 .49-3.51"/>
          </svg>
           Remboursements
        @if (compteurs().remboursements > 0) { <span class="count">{{ compteurs().remboursements }}</span> }
      </a>
      <div style="flex:1"></div>
      <button class="nav-item" (click)="logout()" style="width:100%;border:none;background:none;cursor:pointer;text-align:left;color:var(--color-danger)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        Déconnexion
      </button>
    </aside>
    <main class="content"><router-outlet/></main>
  </div>
</div>`,
  styles: [`
    .count { margin-left:auto; background:#EF4444; color:#fff; border-radius:999px; font-size:.7rem; font-weight:700; padding:.05rem .45rem; min-width:20px; text-align:center; }
    .menu-toggle { display:none; background:none; border:none; font-size:1.4rem; cursor:pointer; margin-right:.5rem; }
    .who { max-width:220px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    @media (max-width: 900px) {
      .menu-toggle { display:inline-block; }
      .sidebar { position:fixed; top:64px; left:0; bottom:0; z-index:90; transform:translateX(-100%); transition:transform .2s ease; box-shadow:0 10px 30px rgba(0,0,0,.15); }
      .sidebar.open { transform:none; }
      .who { display:none; }
    }
  `]
})
export class AdminLayoutComponent implements OnInit {
  private adminSvc = inject(AdminService);
  private rembSvc = inject(RemboursementService);
  private userSvc = inject(UtilisateurService);
  private destroyRef = inject(DestroyRef);

  menuOuvert = signal(false);
  compteurs = signal({ signalements: 0, remboursements: 0, kyc: 0 });
  email = computed(() => this.auth.currentUser()?.email ?? '');

  constructor(private auth: AuthService) {}

  ngOnInit() {
    this.rafraichir();
    // Les compteurs du menu se mettent à jour seuls toutes les minutes.
    interval(60000).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (!document.hidden) this.rafraichir();
    });
  }

  private rafraichir() {
    this.adminSvc.getSignalements('OUVERT', 0).subscribe({
      next: p => this.compteurs.update(c => ({ ...c, signalements: p.totalElements ?? 0 })), error: () => {}
    });
    this.rembSvc.getStats().subscribe({
      next: st => this.compteurs.update(c => ({ ...c, remboursements: st['enAttente'] ?? 0 })), error: () => {}
    });
    this.userSvc.getAllAdmin(0, 500).subscribe({
      next: p => this.compteurs.update(c => ({ ...c, kyc: (p.content ?? []).filter(u =>
        (u.role === 'CHAUFFEUR' || u.role === 'PASSAGER_ET_CHAUFFEUR') && !u.kycValide && u.statut !== 'BLOQUE').length })),
      error: () => {}
    });
  }

  logout() { this.auth.deconnexion(); }
}
