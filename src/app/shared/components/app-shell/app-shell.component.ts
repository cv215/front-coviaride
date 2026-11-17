import { Component, DestroyRef, HostListener, OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, interval } from 'rxjs';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { IconComponent } from '../icon/icon.component';

export interface ShellNavItem {
  path: string;
  icon: string;
  label: string;
  /** Titre affiché dans l'en-tête quand la page est active. */
  titre: string;
  /** Pastille de compteur (ex : dossiers en attente). */
  count?: number;
}

export interface ShellAction { path: string; icon: string; label: string; query?: Record<string, string>; }

/**
 * Coque commune des espaces connectés (client, chauffeur, admin) — thème Luxe.
 * Barre latérale sur ordinateur, tiroir + navigation basse sur mobile,
 * en-tête avec titre de page, notifications et action principale.
 */
@Component({
  selector: 'lx-app-shell',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, IconComponent],
  host: { class: 'lx' },
  template: `
<div class="shell">

  <aside class="side" aria-label="Navigation principale">
    <ng-container *ngTemplateOutlet="sideContent"></ng-container>
  </aside>

  @if (menuOuvert()) {
    <div class="drawer-backdrop" (click)="menuOuvert.set(false)"></div>
    <aside class="side drawer" aria-label="Navigation principale">
      <button class="drawer-close" (click)="menuOuvert.set(false)" aria-label="Fermer le menu">
        <lx-icon name="x" />
      </button>
      <ng-container *ngTemplateOutlet="sideContent"></ng-container>
    </aside>
  }

  <ng-template #sideContent>
    <a [routerLink]="homePath()" class="brand">
      <span class="brand-mark"><lx-icon name="car" [size]="16" /></span>
      <span class="brand-name">Coviaride</span>
      @if (espace()) { <span class="brand-tag">{{ espace() }}</span> }
    </a>

    <nav class="side-nav">
      @for (item of navPrincipale(); track item.path) {
        <a [routerLink]="item.path" routerLinkActive="is-active" class="side-link">
          <lx-icon [name]="item.icon" />
          <span class="side-label">{{ item.label }}</span>
          @if (item.count) { <span class="side-count">{{ item.count > 99 ? '99+' : item.count }}</span> }
        </a>
      }
      @if (navSecondaire().length) {
        <div class="side-section">{{ titreSecondaire() }}</div>
        @for (item of navSecondaire(); track item.path) {
          <a [routerLink]="item.path" routerLinkActive="is-active" class="side-link">
            <lx-icon [name]="item.icon" />
            <span class="side-label">{{ item.label }}</span>
            @if (item.count) { <span class="side-count">{{ item.count > 99 ? '99+' : item.count }}</span> }
          </a>
        }
      }
    </nav>

    <div class="side-foot">
      @if (profilePath()) {
        <a [routerLink]="profilePath()" class="me">
          <span class="lx-avatar me-avatar">{{ initiales() }}</span>
          <span class="me-text">
            <span class="me-name">{{ nomAffiche() }}</span>
            <span class="me-role">{{ roleLabel() }}</span>
          </span>
          <lx-icon name="chevron-right" class="me-chevron" [size]="16" />
        </a>
      } @else {
        <div class="me">
          <span class="lx-avatar me-avatar">{{ initiales() }}</span>
          <span class="me-text">
            <span class="me-name">{{ nomAffiche() }}</span>
            <span class="me-role">{{ roleLabel() }}</span>
          </span>
        </div>
      }
      <button class="side-link logout" (click)="logout()">
        <lx-icon name="log-out" />
        <span>Se déconnecter</span>
      </button>
    </div>
  </ng-template>

  <div class="main">
    <header class="bar">
      <div class="bar-inner" [class.is-wide]="large()">
        <div class="bar-left">
          <button class="lx-btn lx-btn-icon menu-btn" (click)="menuOuvert.set(true)" aria-label="Ouvrir le menu">
            <lx-icon name="menu" [size]="16" />
          </button>
          <div class="min-w-0">
            <h1 class="page-title">{{ titrePage() }}</h1>
            @if (estAccueil()) {
              <p class="page-date">{{ aujourdHui | date:'EEEE d MMMM' }}</p>
            }
          </div>
        </div>
        <div class="bar-right">
          @if (messagesPath()) {
            <a [routerLink]="messagesPath()" class="lx-btn lx-btn-icon" aria-label="Messages" title="Messages">
              <lx-icon name="message" [size]="16" />
            </a>
          }
          @if (notifications()) {
            <button class="lx-btn lx-btn-icon" (click)="toggleNotifs()" aria-label="Notifications" title="Notifications"
              [attr.aria-expanded]="showNotifs()">
              <lx-icon name="bell" [size]="16" />
              @if (nonLues() > 0) {
                <span class="notif-dot" [class.has-count]="nonLues() > 1">{{ nonLues() > 1 ? (nonLues() > 99 ? '99+' : nonLues()) : '' }}</span>
              }
            </button>
          }
          @if (action(); as a) {
            <a [routerLink]="a.path" [queryParams]="a.query" class="lx-btn lx-btn-primary cta-btn">
              <lx-icon [name]="a.icon" />
              <span>{{ a.label }}</span>
            </a>
          }
        </div>
      </div>
    </header>

    <main class="page-content" [class.is-wide]="large()">
      <ng-content />
    </main>
  </div>

  <nav class="bottom-nav" aria-label="Navigation rapide">
    @for (item of navBasse(); track item.path) {
      <a [routerLink]="item.path" routerLinkActive="is-active" class="bottom-item">
        <span class="bottom-icon">
          <lx-icon [name]="item.icon" />
          @if (item.count) { <span class="bottom-count"></span> }
        </span>
        <span>{{ item.label }}</span>
      </a>
    }
  </nav>

  @if (showNotifs()) {
    <div class="notif-backdrop" (click)="showNotifs.set(false)"></div>
    <section class="notif-panel" role="dialog" aria-label="Notifications">
      <header class="notif-head">
        <div class="lx-row" style="gap:.6rem">
          <strong>Notifications</strong>
          @if (nonLues() > 0) {
            <span class="lx-badge lx-badge-gold">{{ nonLues() }} non lue{{ nonLues() > 1 ? 's' : '' }}</span>
          }
        </div>
        <div class="lx-row" style="gap:.25rem">
          @if (nonLues() > 0) {
            <button class="lx-link" (click)="marquerToutesLues()">Tout marquer lu</button>
          }
          <button class="lx-btn lx-btn-ghost lx-btn-sm" (click)="showNotifs.set(false)" aria-label="Fermer">
            <lx-icon name="x" [size]="16" />
          </button>
        </div>
      </header>
      <div class="notif-list">
        @if (chargementNotifs()) {
          <div class="notif-empty"><lx-icon name="refresh" class="lx-spin" [size]="22" /><span>Chargement…</span></div>
        } @else if (listeNotifs().length === 0) {
          <div class="notif-empty">
            <span class="lx-icon-tile is-lg"><lx-icon name="bell" /></span>
            <strong>Aucune notification</strong>
            <span class="lx-muted">Vous êtes à jour.</span>
          </div>
        } @else {
          @for (n of listeNotifs(); track n.id) {
            <button class="notif-item" [class.is-unread]="!n.lue" (click)="marquerLue(n)">
              <span class="lx-icon-tile" [class.is-gold]="!n.lue"><lx-icon [name]="iconeNotif(n.type)" [size]="18" /></span>
              <span class="notif-body">
                <span class="notif-title">{{ n.titre }}</span>
                <span class="notif-msg">{{ n.message }}</span>
                <span class="notif-date">{{ n.dateEnvoi | date:'dd/MM/yyyy HH:mm' }}</span>
              </span>
              @if (!n.lue) { <span class="unread-dot"></span> }
            </button>
          }
        }
      </div>
    </section>
  }
</div>
  `,
  styles: [`
  :host { display: block; min-height: 100vh; background: var(--lx-bg); }
  .shell { min-height: 100vh; display: flex; }
  .min-w-0 { min-width: 0; }

  .side {
    position: fixed; inset: 0 auto 0 0; width: 256px; z-index: 30;
    display: flex; flex-direction: column;
    background: var(--lx-sidebar); border-right: 1px solid var(--lx-border);
  }
  .brand { display: flex; align-items: center; gap: 0.6rem; padding: 1.5rem; border-bottom: 1px solid var(--lx-border); text-decoration: none; }
  .brand-mark { width: 32px; height: 32px; border-radius: 8px; background: var(--lx-primary); color: var(--lx-primary-fg);
    display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .brand-name { font-family: var(--lx-font-display); font-style: italic; font-weight: 600; font-size: 1.125rem; }
  .brand-tag { margin-left: auto; font-size: 0.62rem; letter-spacing: 0.12em; text-transform: uppercase;
    color: var(--lx-primary); border: 1px solid rgba(200, 146, 42, 0.35); border-radius: 999px; padding: 0.15rem 0.5rem; }

  .side-nav { flex: 1; padding: 1.5rem 1rem; display: flex; flex-direction: column; gap: 0.25rem; overflow-y: auto; }
  .side-section { margin: 1.25rem 0.75rem 0.5rem; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.12em; color: var(--lx-muted-fg); }
  .side-link {
    display: flex; align-items: center; gap: 0.75rem; width: 100%;
    padding: 0.75rem 1rem; border-radius: var(--lx-r-md); border: 0; background: transparent;
    color: var(--lx-muted-fg); font-size: 0.875rem; font-weight: 500; text-decoration: none; text-align: left;
    cursor: pointer; transition: background 0.15s, color 0.15s;
    &:hover { background: var(--lx-secondary); color: var(--lx-fg); }
    &.is-active { background: rgba(200, 146, 42, 0.15); color: var(--lx-primary); }
  }
  .side-label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .side-count { background: var(--lx-destructive); color: #fff; font-size: 0.68rem; font-weight: 700;
    border-radius: 999px; min-width: 20px; padding: 0.05rem 0.4rem; text-align: center; }
  .side-foot { padding: 1rem; border-top: 1px solid var(--lx-border); display: flex; flex-direction: column; gap: 0.25rem; }
  .me { display: flex; align-items: center; gap: 0.75rem; padding: 0.6rem 0.75rem; border-radius: var(--lx-r-md);
    text-decoration: none; transition: background 0.15s; }
  a.me:hover { background: var(--lx-secondary); }
  .me-avatar { width: 36px; height: 36px; font-size: 0.8rem; }
  .me-text { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .me-name { font-size: 0.875rem; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .me-role { font-size: 0.75rem; color: var(--lx-muted-fg); }
  .me-chevron { color: var(--lx-muted-fg); }
  .logout { &:hover { background: rgba(224, 83, 74, 0.1); color: var(--lx-destructive); } }

  .drawer { z-index: 60; animation: slide-in 0.25s ease-out; }
  .drawer-backdrop { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.6); z-index: 55; animation: lx-fade 0.2s; }
  .drawer-close { position: absolute; top: 1.4rem; right: 1rem; z-index: 2; background: none; border: 0; cursor: pointer;
    color: var(--lx-muted-fg); padding: 0.25rem; &:hover { color: var(--lx-fg); } }
  .drawer .brand-tag { margin-right: 2rem; }
  @keyframes slide-in { from { transform: translateX(-100%); } to { transform: none; } }

  .main { flex: 1; min-width: 0; margin-left: 256px; display: flex; flex-direction: column; min-height: 100vh; }
  .bar { position: sticky; top: 0; z-index: 20; background: rgba(9, 10, 11, 0.8);
    backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); border-bottom: 1px solid var(--lx-border); }
  .bar-inner { max-width: 896px; margin: 0 auto; padding: 1rem 2rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem;
    &.is-wide { max-width: 1200px; } }
  .bar-left { display: flex; align-items: center; gap: 0.75rem; min-width: 0; }
  .bar-right { display: flex; align-items: center; gap: 0.6rem; flex-shrink: 0; }
  .page-title { font-size: 1.5rem; margin: 0; line-height: 1.2; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .page-date { margin: 0.1rem 0 0; font-size: 0.75rem; color: var(--lx-muted-fg); text-transform: capitalize; }
  .menu-btn { display: none; }
  .cta-btn { padding: 0.55rem 1rem; }
  .notif-dot { position: absolute; top: 6px; right: 6px; width: 8px; height: 8px; border-radius: 50%; background: var(--lx-primary);
    &.has-count { top: -6px; right: -6px; width: auto; height: 18px; min-width: 18px; padding: 0 5px; font-size: 0.65rem; font-weight: 700;
      color: var(--lx-primary-fg); line-height: 18px; text-align: center; border: 2px solid var(--lx-bg); box-sizing: content-box; } }
  .page-content { flex: 1; width: 100%; max-width: 896px; margin: 0 auto; padding: 2rem; &.is-wide { max-width: 1200px; } }

  .bottom-nav { display: none; position: fixed; left: 0; right: 0; bottom: 0; z-index: 25;
    background: var(--lx-sidebar); border-top: 1px solid var(--lx-border); padding-bottom: env(safe-area-inset-bottom); }
  .bottom-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 0.25rem; padding: 0.7rem 0.25rem;
    font-size: 0.68rem; color: var(--lx-muted-fg); text-decoration: none; transition: color 0.15s; min-width: 0;
    span { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    &.is-active { color: var(--lx-primary); } }
  .bottom-icon { position: relative; display: inline-flex; overflow: visible !important; }
  .bottom-count { position: absolute; top: -2px; right: -4px; width: 8px; height: 8px; border-radius: 50%; background: var(--lx-destructive); }

  .notif-backdrop { position: fixed; inset: 0; z-index: 70; }
  .notif-panel { position: fixed; top: 72px; right: 1.5rem; z-index: 71; width: 380px; max-width: calc(100vw - 2rem);
    max-height: min(540px, calc(100vh - 96px)); display: flex; flex-direction: column;
    background: var(--lx-popover); border: 1px solid var(--lx-border); border-radius: var(--lx-r-lg);
    box-shadow: 0 24px 50px rgba(0, 0, 0, 0.55); animation: lx-rise 0.18s ease-out; overflow: hidden; }
  .notif-head { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;
    padding: 0.9rem 1rem 0.9rem 1.25rem; border-bottom: 1px solid var(--lx-border); font-size: 0.9rem; }
  .notif-list { overflow-y: auto; flex: 1; }
  .notif-empty { display: flex; flex-direction: column; align-items: center; gap: 0.6rem; padding: 2.5rem 1.5rem;
    text-align: center; font-size: 0.875rem; color: var(--lx-muted-fg); strong { color: var(--lx-fg); } }
  .notif-item { display: flex; gap: 0.85rem; width: 100%; text-align: left; padding: 1rem 1.25rem;
    background: transparent; border: 0; border-bottom: 1px solid var(--lx-border); color: inherit; cursor: pointer; transition: background 0.15s;
    &:hover { background: rgba(26, 29, 40, 0.4); } &.is-unread { background: rgba(200, 146, 42, 0.06); } }
  .notif-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.15rem; }
  .notif-title { font-size: 0.875rem; font-weight: 500; }
  .notif-msg { font-size: 0.8rem; color: var(--lx-muted-fg); line-height: 1.45; }
  .notif-date { font-size: 0.7rem; color: var(--lx-muted-fg); margin-top: 0.15rem; }
  .unread-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--lx-primary); margin-top: 6px; flex-shrink: 0; }

  @media (max-width: 767px) {
    .side:not(.drawer) { display: none; }
    .main { margin-left: 0; }
    .menu-btn { display: inline-flex; }
    .cta-btn { display: none; }
    .bar-inner { padding: 0.85rem 1rem; }
    .page-title { font-size: 1.25rem; }
    .page-content { padding: 1.5rem 1rem calc(5.5rem + env(safe-area-inset-bottom)); }
    .bottom-nav { display: flex; }
    .notif-panel { top: 64px; right: 1rem; }
  }
  `]
})
export class AppShellComponent implements OnInit {
  private auth = inject(AuthService);
  private notifSvc = inject(NotificationService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  /** Libellé court affiché à côté du logo (ex : « Chauffeur », « Admin »). */
  espace = input<string>('');
  homePath = input.required<string>();
  navPrincipale = input.required<ShellNavItem[]>();
  navSecondaire = input<ShellNavItem[]>([]);
  titreSecondaire = input<string>('Plus');
  /** Éléments de la navigation basse sur mobile (5 max) ; par défaut la navigation principale. */
  navMobile = input<ShellNavItem[] | null>(null);
  /** Titres pour des routes hors menu, ex : { '/client/suivi': 'Suivi en direct' }. */
  titresSupplementaires = input<Record<string, string>>({});
  profilePath = input<string>('');
  messagesPath = input<string>('');
  action = input<ShellAction | null>(null);
  notifications = input<boolean>(true);
  roleLabel = input<string>('');
  /** Nom complet connu par le layout (sinon l'email est utilisé). */
  nom = input<string>('');
  /** Accroche de la page d'accueil, ex : « Bonjour, Marie ». */
  salutation = input<string>('');
  /** Contenu plus large (tableaux d'administration). */
  large = input<boolean>(false);

  nonLues = signal(0);
  showNotifs = signal(false);
  menuOuvert = signal(false);
  listeNotifs = signal<any[]>([]);
  chargementNotifs = signal(false);
  url = signal('');
  aujourdHui = new Date();

  navBasse = computed(() => (this.navMobile() ?? this.navPrincipale()).slice(0, 5));
  estAccueil = computed(() => this.url().split('?')[0] === this.homePath());
  titrePage = computed(() => {
    const url = this.url().split('?')[0];
    if (this.estAccueil() && this.salutation()) return this.salutation();
    const item = [...this.navPrincipale(), ...this.navSecondaire()].find(i => url === i.path || url.startsWith(i.path + '/'));
    if (item) return item.titre || item.label;
    const extra = Object.entries(this.titresSupplementaires()).find(([p]) => url.startsWith(p));
    return extra?.[1] ?? 'Coviaride';
  });

  constructor() {
    this.url.set(this.router.url);
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      takeUntilDestroyed()
    ).subscribe(e => {
      this.url.set(e.urlAfterRedirects);
      this.menuOuvert.set(false);
      this.showNotifs.set(false);
    });
  }

  ngOnInit() {
    const user = this.auth.currentUser();
    if (!user || !this.notifications()) return;
    this.rafraichirNonLues(user.compteId);
    interval(30000).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      const u = this.auth.currentUser();
      if (u && !document.hidden) this.rafraichirNonLues(u.compteId);
    });
  }

  @HostListener('document:keydown.escape')
  fermerPanneaux() {
    this.menuOuvert.set(false);
    this.showNotifs.set(false);
  }

  private rafraichirNonLues(userId: number) {
    this.notifSvc.getNonLues(userId).subscribe({ next: r => this.nonLues.set(r?.nonLues ?? 0), error: () => {} });
  }

  toggleNotifs() {
    const ouvert = !this.showNotifs();
    this.showNotifs.set(ouvert);
    if (ouvert) this.chargerNotifications();
  }

  private chargerNotifications() {
    const user = this.auth.currentUser();
    if (!user) return;
    this.chargementNotifs.set(true);
    this.notifSvc.getNotifications(user.compteId).subscribe({
      next: p => { this.listeNotifs.set(p?.content || []); this.chargementNotifs.set(false); },
      error: () => { this.listeNotifs.set([]); this.chargementNotifs.set(false); }
    });
  }

  marquerLue(notif: any) {
    if (notif.lue) return;
    this.listeNotifs.update(arr => arr.map(n => n.id === notif.id ? { ...n, lue: true } : n));
    this.nonLues.update(n => Math.max(0, n - 1));
  }

  marquerToutesLues() {
    const user = this.auth.currentUser();
    if (!user) return;
    this.notifSvc.marquerLues(user.compteId).subscribe({
      next: () => {
        this.nonLues.set(0);
        this.listeNotifs.update(arr => arr.map(n => ({ ...n, lue: true })));
      },
      error: () => {}
    });
  }

  iconeNotif(type: string): string {
    return ({ RESERVATION: 'calendar', PAIEMENT: 'credit-card', TRAJET: 'car', REMBOURSEMENT: 'rotate-ccw', URGENCE: 'alert', SYSTEME: 'info' } as Record<string, string>)[type] || 'bell';
  }

  nomAffiche(): string {
    return this.nom() || this.auth.currentUser()?.email || 'Mon compte';
  }

  initiales(): string {
    const nom = this.nom().trim();
    if (nom) return nom.split(/\s+/).slice(0, 2).map(p => p.charAt(0)).join('').toUpperCase();
    const email = this.auth.currentUser()?.email;
    return email ? email.substring(0, 2).toUpperCase() : 'U';
  }

  logout() { this.auth.deconnexion(); }
}
