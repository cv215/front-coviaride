import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-client-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  template: `
<div class="app-shell">
    <!-- TOPBAR -->
<header class="topbar">
  <span class="logo">Coviaride</span>

  <div class="nav-actions">

    <!-- Icône Messages -->
    <a routerLink="/client/messages" class="icon-btn" title="Messages"
      style="text-decoration:none">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="2" style="width:20px;height:20px">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14
                 a2 2 0 0 1 2 2z"/>
      </svg>
    </a>

    <!-- Icône Notifications -->
    <button class="icon-btn" (click)="toggleNotifs()" title="Notifications">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="2" style="width:20px;height:20px">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
      <!-- Badge nombre non lus -->
      @if (nonLues() > 0) {
        <span class="notif-count">
          {{ nonLues() > 99 ? '99+' : nonLues() }}
        </span>
      }
    </button>

    <!-- Avatar utilisateur -->
    <a routerLink="/client/profil" class="user-pill"
      style="text-decoration:none">
      <div class="avatar">{{ initiales() }}</div>
      <span>{{ nomAffiche() }}</span>
    </a>

    <!-- Déconnexion -->
    <button class="btn btn-ghost btn-sm" (click)="logout()">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="2" style="width:16px;height:16px">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
        <polyline points="16 17 21 12 16 7"/>
        <line x1="21" y1="12" x2="9" y2="12"/>
      </svg>
    </button>

  </div>
</header>

<!-- PANNEAU NOTIFICATIONS (s'ouvre sous l'icône cloche) -->
@if (showNotifs()) {

  <!-- Overlay pour fermer en cliquant ailleurs -->
  <div style="position:fixed;inset:0;z-index:299"
    (click)="showNotifs.set(false)">
  </div>

  <!-- Panneau -->
  <div style="position:fixed;top:64px;right:1rem;width:380px;
    background:white;border:1px solid var(--color-border);
    border-radius:var(--radius-lg);box-shadow:var(--shadow-xl);
    z-index:300;display:flex;flex-direction:column;
    max-height:520px;overflow:hidden">

    <!-- En-tête -->
    <div style="padding:1rem 1.25rem;
      border-bottom:1px solid var(--color-border);
      display:flex;align-items:center;justify-content:space-between;
      flex-shrink:0">
      <div style="display:flex;align-items:center;gap:0.625rem">
        <strong style="font-size:0.95rem">Notifications</strong>
        @if (nonLues() > 0) {
          <span style="background:var(--color-accent);color:white;
            border-radius:9999px;padding:1px 7px;font-size:0.72rem;
            font-weight:700">
            {{ nonLues() }} non lue{{ nonLues() > 1 ? 's' : '' }}
          </span>
        }
      </div>
      @if (nonLues() > 0) {
        <button (click)="marquerToutesLues()"
          style="background:none;border:none;cursor:pointer;
            font-size:0.78rem;color:var(--color-primary);
            font-weight:600;padding:0">
          Toute marquer lue
        </button>
      }
    </div>

    <!-- Liste des notifications -->
    <div style="overflow-y:auto;flex:1">

      @if (chargementNotifs()) {
        <div style="text-align:center;padding:2.5rem;
          color:var(--color-muted)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2" style="width:24px;height:24px;
            animation:spin 1s linear infinite;display:block;
            margin:0 auto 0.75rem">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
          Chargement...
        </div>
      } @else if (notifications().length === 0) {
        <!-- Aucune notification -->
        <div style="text-align:center;padding:3rem 1.5rem">
          <div style="width:56px;height:56px;border-radius:50%;
            background:var(--color-bg);display:flex;
            align-items:center;justify-content:center;
            margin:0 auto 1rem">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="1.5" style="width:26px;height:26px;
              color:var(--color-muted)">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </div>
          <p style="font-weight:600;color:var(--color-primary);
            margin-bottom:0.35rem;font-size:0.9rem">
            Aucune notification
          </p>
          <p style="color:var(--color-muted);font-size:0.82rem">
            Vous êtes à jour !
          </p>
        </div>
      } @else {
        <!-- Notifications existantes -->
        @for (n of notifications(); track n.id) {
          <div style="display:flex;gap:0.875rem;padding:1rem 1.25rem;
            border-bottom:1px solid var(--color-border);
            transition:background 0.1s;cursor:pointer"
            [style.background]="n.lue
              ? 'transparent' : '#F0F9FF'"
            (click)="marquerLue(n)">

            <!-- Icône type -->
            <div style="width:38px;height:38px;border-radius:50%;
              display:flex;align-items:center;justify-content:center;
              flex-shrink:0;font-size:1rem"
              [style.background]="getNotifBg(n.type)">
              {{ getNotifIcon(n.type) }}
            </div>

            <!-- Contenu -->
            <div style="flex:1;min-width:0">
              <div style="font-size:0.875rem;font-weight:600;
                margin-bottom:0.2rem;display:flex;
                align-items:flex-start;justify-content:space-between;
                gap:0.5rem">
                <span>{{ n.titre }}</span>
                <!-- Point bleu si non lue -->
                @if (!n.lue) {
                  <div style="width:8px;height:8px;border-radius:50%;
                    background:var(--color-accent);flex-shrink:0;
                    margin-top:4px">
                  </div>
                }
              </div>
              <div style="font-size:0.8rem;color:var(--color-muted);
                line-height:1.5;margin-bottom:0.3rem">
                {{ n.message }}
              </div>
              <div style="font-size:0.7rem;color:var(--color-muted)">
                {{ n.dateEnvoi | date:'dd/MM/yyyy HH:mm' }}
              </div>
            </div>
          </div>
        }
      }
    </div>

    <!-- Pied du panneau -->
    <div style="padding:0.75rem 1.25rem;
      border-top:1px solid var(--color-border);
      text-align:center;flex-shrink:0">
      <button (click)="showNotifs.set(false)"
        style="background:none;border:none;cursor:pointer;
          font-size:0.82rem;color:var(--color-muted)">
        Fermer
      </button>
    </div>

  </div>
}
  <div class="main-layout">
    <!-- SIDEBAR -->
    <aside class="sidebar">
      <span class="nav-section">Menu</span>
      <a routerLink="/client/dashboard" routerLinkActive="active" class="nav-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
          <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
        </svg>
        Tableau de bord
      </a>
      <a routerLink="/client/nouvelle-course" routerLinkActive="active" class="nav-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
          <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
        </svg>
        Nouvelle course
      </a>
      <a routerLink="/client/chauffeurs" routerLinkActive="active" class="nav-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
        Chauffeurs
      </a>
      <a routerLink="/client/historique" routerLinkActive="active" class="nav-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
        Historique
      </a>
      <a routerLink="/client/transactions" routerLinkActive="active" class="nav-item">
       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
         <line x1="12" y1="1" x2="12" y2="23"/>
         <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
       </svg>
        Transactions
      </a>
      <a routerLink="/client/profil" routerLinkActive="active" class="nav-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
         <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
         <circle cx="12" cy="7" r="4"/>
        </svg>
          Mon Profil
      </a>
      <a routerLink="/client/remboursement" routerLinkActive="active" class="nav-item">
       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
         <polyline points="1 4 1 10 7 10"/>
         <path d="M3.51 15a9 9 0 1 0 .49-3.51"/>
       </svg>
         Remboursement
      </a>
      <div style="flex:1"></div>
      <span class="nav-section">Compte</span>
      <button class="nav-item" (click)="logout()" style="width:100%;border:none;background:none;cursor:pointer;text-align:left;color:var(--color-danger)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        Déconnexion
      </button>
    </aside>

    <!-- CONTENT -->
    <main class="content">
      <router-outlet/>
    </main>
  </div>
</div>
  `,
  styles: [`
  .icon-btn {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    border: none;
    background: var(--color-bg);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    transition: background 0.15s;
    color: var(--color-primary);
  }
  .icon-btn:hover {
    background: var(--color-border);
  }

  /* Badge nombre non lus */
  .notif-count {
    position: absolute;
    top: -2px;
    right: -2px;
    min-width: 18px;
    height: 18px;
    background: #EF4444;
    color: white;
    border-radius: 9999px;
    font-size: 0.65rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 4px;
    border: 2px solid white;
    line-height: 1;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
`]

})
export class ClientLayoutComponent implements OnInit {

  nonLues          = signal(0);
  showNotifs       = signal(false);
  notifications    = signal<any[]>([]);
  chargementNotifs = signal(false);

  constructor(
    private auth: AuthService,
    private notifSvc: NotificationService,
    private router: Router
  ) {}

  ngOnInit() {
    const user = this.auth.currentUser();
    if (!user) return;
    this.rafraichirNonLues(user.compteId);

    // Rafraîchir le compteur toutes les 30 secondes
    setInterval(() => {
      const u = this.auth.currentUser();
      if (u) this.rafraichirNonLues(u.compteId);
    }, 30000);
  }

  // ── Compteur non lues ────────────────────────────────────────────────────
  private rafraichirNonLues(userId: number) {
    this.notifSvc.getNonLues(userId).subscribe({
      next: r => this.nonLues.set(r.nonLues),
      error: () => {}
    });
  }

  // ── Ouvrir / fermer le panneau ───────────────────────────────────────────
  toggleNotifs() {
    const ouvert = !this.showNotifs();
    this.showNotifs.set(ouvert);

    if (ouvert) {
      this.chargerNotifications();
    }
  }

  // ── Charger les notifications ────────────────────────────────────────────
  chargerNotifications() {
    const user = this.auth.currentUser();
    if (!user) return;

    this.chargementNotifs.set(true);

    this.notifSvc.getNotifications(user.compteId).subscribe({
      next: p => {
        this.notifications.set(p.content || []);
        this.chargementNotifs.set(false);
      },
      error: () => {
        this.notifications.set([]);
        this.chargementNotifs.set(false);
      }
    });
  }

  // ── Marquer une notification comme lue ──────────────────────────────────
  marquerLue(notif: any) {
    if (notif.lue) return;
    // Optimistic update
    this.notifications.update(arr =>
      arr.map(n => n.id === notif.id ? { ...n, lue: true } : n));
    this.nonLues.update(n => Math.max(0, n - 1));
  }

  // ── Marquer toutes comme lues ────────────────────────────────────────────
  marquerToutesLues() {
    const user = this.auth.currentUser();
    if (!user) return;

    this.notifSvc.marquerLues(user.compteId).subscribe({
      next: () => {
        this.nonLues.set(0);
        this.notifications.update(arr =>
          arr.map(n => ({ ...n, lue: true })));
      },
      error: () => {}
    });
  }

  // ── Icônes et couleurs par type ──────────────────────────────────────────
  getNotifIcon(type: string): string {
    const icons: Record<string, string> = {
      'RESERVATION':    '',
      'PAIEMENT':       '',
      'TRAJET':         '',
      'REMBOURSEMENT':  '',
      'URGENCE':        '',
      'SYSTEME':        '',
    };
    return icons[type] || '🔔';
  }

  getNotifBg(type: string): string {
    const colors: Record<string, string> = {
      'RESERVATION':    '#DBEAFE',
      'PAIEMENT':       '#D1FAE5',
      'TRAJET':         '#FEF3C7',
      'REMBOURSEMENT':  '#EDE9FE',
      'URGENCE':        '#FEE2E2',
      'SYSTEME':        '#F3F4F6',
    };
    return colors[type] || '#F3F4F6';
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  initiales(): string {
    const u = this.auth.currentUser();
    return u ? u.email.substring(0, 2).toUpperCase() : 'U';
  }

  nomAffiche(): string {
    return this.auth.currentUser()?.email?.split('@')[0] || 'Moi';
  }

  logout() { this.auth.deconnexion(); }
}