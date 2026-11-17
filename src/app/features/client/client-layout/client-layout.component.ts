import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { UtilisateurService } from '../../../core/services/utilisateur.service';
import { Utilisateur } from '../../../core/models';

@Component({
  selector: 'app-client-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  template: `
<div class="app-shell">
    <!-- TOPBAR -->
 <header class="topbar">
  <span class="logo">
    <span class="logo-badge">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-taxi-front" viewBox="0 0 16 16">
        <path d="M4.862 5.276 3.906 7.19a.51.51 0 0 0 .497.731c.91-.073 2.35-.17 3.597-.17s2.688.097 3.597.17a.51.51 0 0 0 .497-.731l-.956-1.913A.5.5 0 0 0 10.691 5H5.309a.5.5 0 0 0-.447.276M4 10a1 1 0 1 1-2 0 1 1 0 0 1 2 0m10 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0m-9 0a1 1 0 0 1 1-1h4a1 1 0 1 1 0 2H6a1 1 0 0 1-1-1"/>
        <path d="M6 1a1 1 0 0 0-1 1v1h-.181A2.5 2.5 0 0 0 2.52 4.515l-.792 1.848a.8.8 0 0 1-.38.404c-.5.25-.855.715-.965 1.262L.05 9.708a2.5 2.5 0 0 0-.049.49v.413c0 .814.39 1.543 1 1.997V14.5a.5.5 0 0 0 .5.5h2a.5.5 0 0 0 .5-.5v-1.338c1.292.048 2.745.088 4 .088s2.708-.04 4-.088V14.5a.5.5 0 0 0 .5.5h2a.5.5 0 0 0 .5-.5v-1.892c.61-.454 1-1.183 1-1.997v-.413q0-.248-.049-.49l-.335-1.68a1.8 1.8 0 0 0-.964-1.261.8.8 0 0 1-.381-.404l-.792-1.848A2.5 2.5 0 0 0 11.181 3H11V2a1 1 0 0 0-1-1zM4.819 4h6.362a1.5 1.5 0 0 1 1.379.91l.792 1.847a1.8 1.8 0 0 0 .853.904c.222.112.381.32.43.564l.336 1.679q.03.146.029.294v.413a1.48 1.48 0 0 1-1.408 1.484c-1.555.07-3.786.155-5.592.155s-4.037-.084-5.592-.155A1.48 1.48 0 0 1 1 10.611v-.413q0-.148.03-.294l.335-1.68a.8.8 0 0 1 .43-.563c.383-.19.685-.511.853-.904l.792-1.848A1.5 1.5 0 0 1 4.82 4Z"/>
      </svg>
    </span>
    <span class="logo-text">Coviaride</span>
  </span>

  <div class="nav-actions">

    <a routerLink="/client/messages" class="icon-btn" title="Messages"
      style="text-decoration:none">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="2" style="width:20px;height:20px">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    </a>

    <button class="icon-btn" (click)="toggleNotifs()" title="Notifications">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="2" style="width:20px;height:20px">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
      @if (nonLues() > 0) {
        <span class="notif-count">{{ nonLues() > 99 ? '99+' : nonLues() }}</span>
      }
    </button>

    <a routerLink="/client/remboursement" class="btn-ghost-pill" style="text-decoration:none;">
      + Remboursement
    </a>
  </div>
 </header>

 @if (showNotifs()) {

  <!-- Overlay pour fermer en cliquant ailleurs -->
  <div style="position:fixed;inset:0;z-index:299"
    (click)="showNotifs.set(false)">
  </div>

  <!-- Panneau -->
  <div style="position:fixed;top:72px;right:1.5rem;width:380px;
    background:#141920;border:1px solid var(--color-border);
    border-radius:16px;box-shadow:0 20px 45px rgba(0,0,0,0.55);
    z-index:300;display:flex;flex-direction:column;
    max-height:520px;overflow:hidden;color:var(--color-text)">

    <!-- En-tête -->
    <div style="padding:1rem 1.25rem;
      border-bottom:1px solid var(--color-border);
      display:flex;align-items:center;justify-content:space-between;
      flex-shrink:0">
      <div style="display:flex;align-items:center;gap:0.625rem">
        <strong style="font-size:0.95rem">Notifications</strong>
        @if (nonLues() > 0) {
          <span style="background:var(--color-gold);color:#101720;
            border-radius:9999px;padding:1px 7px;font-size:0.72rem;
            font-weight:700">
            {{ nonLues() }} non lue{{ nonLues() > 1 ? 's' : '' }}
          </span>
        }
      </div>
      @if (nonLues() > 0) {
        <button (click)="marquerToutesLues()"
          style="background:none;border:none;cursor:pointer;
            font-size:0.78rem;color:var(--color-gold);
            font-weight:600;padding:0">
          Toute marquer lue
        </button>
      }
    </div>

    <!-- Liste des notifications -->
    <div style="overflow-y:auto;flex:1">

      @if (chargementNotifs()) {
        <div style="text-align:center;padding:2.5rem;
          color:var(--color-text-muted)">
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
            background:rgba(255,255,255,0.06);display:flex;
            align-items:center;justify-content:center;
            margin:0 auto 1rem">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="1.5" style="width:26px;height:26px;
              color:var(--color-text-muted)">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </div>
          <p style="font-weight:600;color:var(--color-text);
            margin-bottom:0.35rem;font-size:0.9rem">
            Aucune notification
          </p>
          <p style="color:var(--color-text-muted);font-size:0.82rem">
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
              ? 'transparent' : 'rgba(212,169,76,0.08)'"
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
                gap:0.5rem;color:var(--color-text)">
                <span>{{ n.titre }}</span>
                <!-- Point doré si non lue -->
                @if (!n.lue) {
                  <div style="width:8px;height:8px;border-radius:50%;
                    background:var(--color-gold);flex-shrink:0;
                    margin-top:4px">
                  </div>
                }
              </div>
              <div style="font-size:0.8rem;color:var(--color-text-muted);
                line-height:1.5;margin-bottom:0.3rem">
                {{ n.message }}
              </div>
              <div style="font-size:0.7rem;color:var(--color-text-muted)">
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
          font-size:0.82rem;color:var(--color-text-muted)">
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
          <path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>
        </svg>
        Accueil
      </a>
      <a routerLink="/client/nouvelle-course" routerLinkActive="active" class="nav-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="5" width="18" height="16" rx="2"/>
          <path d="M8 3v4M16 3v4M3 10h18"/>
        </svg>
        Réservations
      </a>
      <a routerLink="/client/historique" routerLinkActive="active" class="nav-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>
        </svg>
        Historique
      </a>
      <a routerLink="/client/profil" routerLinkActive="active" class="nav-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
         <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
         <circle cx="12" cy="7" r="4"/>
        </svg>
          Profil
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
  :host {
    --color-bg-page: #0a0d12;
    --color-card: rgba(20, 24, 31, 0.82);
    --color-border: rgba(212, 169, 76, 0.18);
    --color-border-strong: rgba(212, 169, 76, 0.45);
    --color-gold: #d7b15a;
    --color-gold-soft: #d9b76c;
    --color-text: #eef1f8;
    --color-text-muted: #aeb6c2;
    display: block;
    background: var(--color-bg-page);
    color: var(--color-text);
    min-height: 100vh;
  }

  .app-shell { min-height: 100vh; background: var(--color-bg-page); }

  /* ---------- Topbar ---------- */
  .topbar {
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 1.5rem; height: 72px;
    background: var(--color-bg-page);
    border-bottom: 1px solid var(--color-border);
  }
  .logo { display: flex; align-items: center; gap: 0.6rem; }
  .logo-badge {
    width: 34px; height: 34px; border-radius: 10px;
    background: var(--color-gold); color: #101720;
    display: flex; align-items: center; justify-content: center;
  }
  .logo-badge svg { width: 18px; height: 18px; }
  .logo-text { font-family: Georgia, 'Times New Roman', serif; font-style: italic; font-size: 1.25rem; font-weight: 700; color: var(--color-text); }

  .nav-actions { display: flex; align-items: center; gap: 0.8rem; }

  .btn-gold-pill {
    background: var(--color-gold); color: #101720; border: none; border-radius: 999px;
    font-weight: 700; padding: 0.7rem 1.2rem; cursor: pointer;
  }
  .btn-ghost-pill {
    background: rgba(255,255,255,0.06); border: 1px solid var(--color-border); color: var(--color-text);
    border-radius: 999px; font-weight: 600; padding: 0.7rem 1.2rem; cursor: pointer;
  }

  .user-pill {
    display: flex; align-items: center; gap: 0.6rem;
    padding: 0.4rem 0.7rem 0.4rem 0.4rem; border-radius: 999px;
    background: rgba(255,255,255,0.05); border: 1px solid var(--color-border);
    color: var(--color-text); font-weight: 600; font-size: 0.9rem;
  }
  .avatar {
    width: 32px; height: 32px; border-radius: 50%;
    background: linear-gradient(135deg, #e5d1a7, #8c6b2a);
    color: #0e1728; font-weight: 800; font-size: 0.8rem;
    display: flex; align-items: center; justify-content: center;
  }

  /* ---------- Layout principal ---------- */
  .main-layout { display: flex; align-items: stretch; }

  .sidebar {
    width: 240px; flex-shrink: 0; min-height: calc(100vh - 72px);
    background: var(--color-bg-page);
    border-right: 1px solid var(--color-border);
    display: flex; flex-direction: column;
    padding: 1.5rem 1rem;
  }
  .nav-section {
    font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.08em;
    color: var(--color-text-muted); font-weight: 700; padding: 0 0.9rem; margin-bottom: 0.4rem;
  }
  .nav-item {
    display: flex; align-items: center; gap: 0.8rem;
    padding: 0.75rem 0.9rem; border-radius: 12px; margin-bottom: 0.2rem;
    color: var(--color-text-muted); text-decoration: none; font-weight: 500; font-size: 0.95rem;
  }
  .nav-item svg { width: 18px; height: 18px; flex-shrink: 0; }
  .nav-item.active { background: rgba(212, 169, 76, 0.12); color: var(--color-gold); font-weight: 700; }
  .nav-item:hover { background: rgba(255,255,255,0.05); }

  .content { flex: 1; padding: 2rem 2.5rem; background: var(--color-bg-page); }

  .icon-btn {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    border: 1px solid var(--color-border);
    background: rgba(255,255,255,0.05);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    transition: background 0.15s;
    color: var(--color-text);
  }
  .icon-btn:hover {
    background: rgba(255,255,255,0.1);
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
    border: 2px solid var(--color-bg-page);
    line-height: 1;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }

  @media (max-width: 900px) {
    .main-layout { flex-direction: column; }
    .sidebar {
      width: 100%;
      min-height: auto;
      border-right: none;
      border-bottom: 1px solid var(--color-border);
      padding: 1rem 0.75rem;
    }
    .content { padding: 1rem; }
    .topbar {
      padding: 0 0.75rem;
      height: auto;
      gap: 0.5rem;
      flex-wrap: wrap;
      padding-top: 0.8rem;
      padding-bottom: 0.8rem;
    }
    .nav-actions {
      width: 100%;
      justify-content: flex-end;
      flex-wrap: wrap;
    }
  }
`]

})
export class ClientLayoutComponent implements OnInit {
  private destroyRef = inject(DestroyRef);

  nonLues          = signal(0);
  showNotifs       = signal(false);
  notifications    = signal<any[]>([]);
  chargementNotifs = signal(false);
  utilisateur      = signal<Utilisateur | null>(null);

  constructor(
    private auth: AuthService,
    private notifSvc: NotificationService,
    private utilisateurSvc: UtilisateurService,
    private router: Router
  ) {}

  ngOnInit() {
    const user = this.auth.currentUser();
    if (!user) return;

    // Profil complet (nom, prénom) récupéré via le service utilisateur,
    // affiché dans le pill en haut à droite du topbar.
    this.utilisateurSvc.getProfil(user.compteId).subscribe({
      next: u => this.utilisateur.set(u),
      error: () => this.utilisateur.set(null)
    });

    this.rafraichirNonLues(user.compteId);

    // Rafraîchir le compteur toutes les 30 secondes
    interval(30000).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      const u = this.auth.currentUser();
      if (u && !document.hidden) this.rafraichirNonLues(u.compteId);
    });
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

  // ── Helpers (identité) ──────────────────────────────────────────────────
  initiales(): string {
    const u = this.utilisateur();
    if (u?.prenom || u?.nom) {
      const p = (u.prenom ?? '').charAt(0);
      const n = (u.nom ?? '').charAt(0);
      return (p + n).toUpperCase() || 'U';
    }
    // Repli tant que le profil n'est pas encore chargé
    const email = this.auth.currentUser()?.email;
    return email ? email.substring(0, 2).toUpperCase() : 'U';
  }

  nomAffiche(): string {
    const u = this.utilisateur();
    if (u?.prenom) return u.prenom;
    if (u?.nom) return u.nom;
    // Repli tant que le profil n'est pas encore chargé
    return this.auth.currentUser()?.email?.split('@')[0] || 'Moi';
  }

  logout() { this.auth.deconnexion(); }
}