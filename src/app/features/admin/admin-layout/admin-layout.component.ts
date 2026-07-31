import { Component } from '@angular/core';
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
    <span class="logo">CoviaRide <span style="font-size:0.7rem;background:var(--color-primary);color:white;padding:2px 8px;border-radius:4px;margin-left:4px;font-weight:600">ADMIN</span></span>
    <div class="nav-actions">
      <div class="user-pill">
        <div class="avatar" style="background:#7C3AED">A</div>
        <span>Super Admin</span>
      </div>
      <button class="btn btn-ghost btn-sm" (click)="logout()">Déconnexion</button>
    </div>
  </header>
  <div class="main-layout">
    <aside class="sidebar">
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
      </a>
      <a routerLink="/admin/signalements" routerLinkActive="active" class="nav-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        Signalements
      </a>
      <a routerLink="/admin/commissions" routerLinkActive="active" class="nav-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        Commissions
      </a>
      <a routerLink="/admin/remboursements" routerLinkActive="active" class="nav-item">
         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="1 4 1 10 7 10"/>
            <path d="M3.51 15a9 9 0 1 0 .49-3.51"/>
          </svg>
           Remboursements
      </a>
      <div style="flex:1"></div>
      <button class="nav-item" (click)="logout()" style="width:100%;border:none;background:none;cursor:pointer;text-align:left;color:var(--color-danger)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        Déconnexion
      </button>
    </aside>
    <main class="content"><router-outlet/></main>
  </div>
</div>`
})
export class AdminLayoutComponent {
  constructor(private auth: AuthService) {}
  logout() { this.auth.deconnexion(); }
}
