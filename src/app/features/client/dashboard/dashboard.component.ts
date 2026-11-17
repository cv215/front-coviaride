import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { shareReplay } from 'rxjs';
import { ToastService } from '../../../core/services/toast.service';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';
import { ReservationService } from '../../../core/services/reservation.service';
import { PortefeuilleService } from '../../../core/services/portefeuille.service';
import { UtilisateurService } from '../../../core/services/utilisateur.service';
import { Reservation, Portefeuille, Utilisateur } from '../../../core/models';
import { IconComponent } from '../../../shared/components/icon/icon.component';

/**
 * Palier de fidélité "Gold" utilisé pour calculer la progression de la barre.
 * À adapter si le back-end expose ce seuil (ex: /fidelite/paliers).
 */
const SEUIL_PALIER_GOLD = 3000;

@Component({
  selector: 'app-client-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, IconComponent],
  template: `
<div class="dash">

  <!-- ── Course en cours / confirmée ─────────────────────── -->
  @if (courseEnCours(); as course) {
    <section class="live lx-card lx-card-glow lx-rise">
      <div class="live-bar"></div>
      <div class="live-inner">
        <div class="live-head">
          <div class="lx-row" style="gap:.5rem">
            <span class="lx-ping"></span>
            <span class="live-label">{{ course.embarque ? 'Course en cours' : 'Course confirmée' }}</span>
          </div>
          <span class="lx-muted live-ref">{{ course.reference }}</span>
        </div>

        <div class="live-grid">
          <div class="driver">
            <div class="driver-avatar">
              <span class="lx-avatar is-lg is-ring">{{ course.chauffeurNom.charAt(0) }}</span>
              <span class="driver-badge"><lx-icon name="car" [size]="12" /></span>
            </div>
            <div class="min-w-0">
              <div class="driver-name lx-display">{{ course.chauffeurNom }}</div>
              @if (course.chauffeurNote) {
                <div class="driver-rating">
                  <lx-icon name="star" [fill]="true" [size]="14" />
                  <span>{{ course.chauffeurNote }}</span>
                </div>
              }
              <div class="lx-muted driver-meta">{{ course.places }} place{{ course.places > 1 ? 's' : '' }} réservée{{ course.places > 1 ? 's' : '' }}</div>
              <span class="plate lx-mono">{{ course.embarque ? 'À BORD' : 'EN ATTENTE DU DÉPART' }}</span>
            </div>
          </div>

          <div class="lx-stack" style="gap:.9rem">
            <div class="lx-route">
              <div class="lx-route-point"><span class="lx-route-mark is-start"></span><span>{{ course.adresseDepart }}</span></div>
              <div class="lx-route-line"></div>
              <div class="lx-route-point"><span class="lx-route-mark is-end"><lx-icon name="map-pin" /></span><span>{{ course.adresseArrivee }}</span></div>
            </div>
            <div class="live-price">
              <span class="lx-muted">Montant</span>
              <strong>{{ course.prix | number:'1.0-0' }} FCFA</strong>
            </div>
          </div>
        </div>

        <div class="live-actions">
          <button class="lx-btn lx-btn-primary call" (click)="appelerChauffeur(course)" [disabled]="appelEnCours()">
            <lx-icon name="phone" />
            {{ appelEnCours() ? 'Recherche du numéro…' : 'Appeler le chauffeur' }}
          </button>
          <a class="lx-btn lx-btn-secondary" routerLink="/client/messages" [queryParams]="{ avec: course.chauffeurId }">
            <lx-icon name="message" /> Message
          </a>
          <a class="lx-btn lx-btn-secondary" [routerLink]="['/client/suivi', course.trajetId]">
            <lx-icon name="navigation" /> Suivre
          </a>
          <a class="lx-btn lx-btn-ghost" routerLink="/client/historique">
            {{ course.embarque ? 'Confirmer mon arrivée' : 'Confirmer mon embarquement' }}
            <lx-icon name="chevron-right" />
          </a>
        </div>
      </div>
    </section>
  }

  <!-- ── Statistiques ────────────────────────────────────── -->
  <section class="lx-stats lx-rise lx-rise-1">
    @for (s of stats(); track s.label) {
      <div class="lx-stat">
        <lx-icon [name]="s.icon" [style.color]="s.color" />
        <div class="lx-stat-value">{{ s.value }}</div>
        <div class="lx-stat-label">{{ s.sub }} · {{ s.label }}</div>
      </div>
    }
  </section>

  <!-- ── Colonnes ────────────────────────────────────────── -->
  <div class="cols">
    <div class="col-left">

      <!-- Nouvelle réservation -->
      <form class="lx-card lx-rise lx-rise-2" (ngSubmit)="lancerRecherche()">
        <h3 class="lx-card-title">Nouvelle réservation</h3>
        @if (villesRecentes().length) {
          <div class="chips">
            @for (v of villesRecentes(); track v) {
              <button type="button" class="lx-chip" (click)="choisirVille(v)">
                <lx-icon name="history" /> {{ v }}
              </button>
            }
          </div>
        }
        <div class="lx-stack-sm">
          <label class="lx-field">
            <span class="lx-dot-start"></span>
            <input class="lx-input" style="padding-left:2rem" name="depart" [(ngModel)]="adresseDepart"
              placeholder="Ville de départ" autocomplete="off" aria-label="Ville de départ" />
          </label>
          <label class="lx-field has-icon">
            <span class="lx-field-icon" style="color:var(--lx-red)"><lx-icon name="map-pin" /></span>
            <input class="lx-input" name="destination" [(ngModel)]="adresseDestination"
              placeholder="Destination" autocomplete="off" aria-label="Destination" />
          </label>
          <button type="submit" class="lx-btn lx-btn-primary lx-btn-block" [disabled]="!adresseDepart.trim() || !adresseDestination.trim()">
            <lx-icon name="search" /> Trouver un chauffeur
          </button>
        </div>
      </form>

      <!-- Programme fidélité -->
      <section class="lx-card lx-card-glow loyalty lx-rise lx-rise-3">
        <div class="loyalty-head"><lx-icon name="award" [size]="16" /> Programme fidélité</div>
        <div class="loyalty-points lx-display">{{ statsClient().pointsFidelite | number:'1.0-0' }} pts</div>
        <div class="lx-muted loyalty-sub">
          @if (pointsRestantsPalierGold() > 0) {
            {{ pointsRestantsPalierGold() | number:'1.0-0' }} pts jusqu'au statut Gold
          } @else {
            Statut Gold atteint
          }
        </div>
        <div class="lx-progress"><span [style.width.%]="progressionPalier()"></span></div>
        <div class="loyalty-tiers"><span>Silver</span><span>Gold</span></div>
      </section>
    </div>

    <!-- Réservations à venir -->
    <section class="col-right lx-rise lx-rise-2">
      <div class="lx-section-head">
        <h2>Réservations à venir</h2>
        <a routerLink="/client/historique" class="lx-link">Voir tout <lx-icon name="chevron-right" /></a>
      </div>

      @if (loading()) {
        <div class="lx-stack-sm"><div class="lx-skeleton" style="min-height:84px"></div><div class="lx-skeleton" style="min-height:84px"></div></div>
      } @else {
        <div class="lx-stack-sm">
          @for (rez of reservationsAVenir(); track rez.id) {
            <a class="lx-ride" routerLink="/client/historique">
              <span class="lx-icon-tile" [class.is-gold]="rez.statut === 'ACCEPTEE'"><lx-icon name="calendar" /></span>
              <span class="lx-list-body">
                <span class="lx-row" style="gap:.5rem;flex-wrap:nowrap">
                  <span class="lx-list-title lx-truncate">{{ formaterDateReservation(rez) }}</span>
                  <span class="lx-badge" [class.lx-badge-success]="rez.statut === 'ACCEPTEE'">
                    {{ rez.statut === 'ACCEPTEE' ? 'Confirmé' : 'En attente' }}
                  </span>
                </span>
                <span class="lx-list-sub">{{ rez.villeDepart || 'Départ' }} → {{ rez.villeArrivee || 'Arrivée' }}</span>
                <span class="lx-list-sub">{{ rez.nombrePlaces }} place{{ rez.nombrePlaces > 1 ? 's' : '' }} · Réf. CR-{{ rez.id }}</span>
              </span>
              <span class="lx-ride-price">{{ montantReservation(rez) | number:'1.0-0' }} FCFA</span>
            </a>
          } @empty {
            <div class="lx-empty">
              <lx-icon name="calendar" />
              <p>Aucune réservation à venir.</p>
              <a routerLink="/client/nouvelle-course" class="lx-btn lx-btn-primary lx-btn-sm"><lx-icon name="plus" /> Réserver un trajet</a>
            </div>
          }
        </div>
      }
    </section>
  </div>

  <!-- ── Historique ──────────────────────────────────────── -->
  <section class="lx-rise lx-rise-4">
    <div class="lx-section-head">
      <h2>Historique des courses</h2>
      <a routerLink="/client/historique" class="lx-link">Tout voir <lx-icon name="chevron-right" /></a>
    </div>

    @if (historiqueRecent().length === 0) {
      <div class="lx-empty">
        <lx-icon name="car" />
        <p>Aucune course terminée pour le moment.</p>
      </div>
    } @else {
      <div class="lx-list">
        @for (rez of historiqueRecent(); track rez.id) {
          <div class="hist">
            <button class="lx-list-item" (click)="basculer(rez.id)" [attr.aria-expanded]="ouvert() === rez.id">
              <span class="lx-icon-tile"><lx-icon name="car" /></span>
              <span class="lx-list-body">
                <span class="lx-list-title">{{ formaterDateReservation(rez) }}</span>
                <span class="lx-list-sub">{{ rez.villeDepart }} → {{ rez.villeArrivee }}</span>
              </span>
              <span class="hist-right">
                <span class="hist-price">{{ montantReservation(rez) | number:'1.0-0' }} FCFA</span>
                <span class="lx-badge" [ngClass]="badgeStatut(rez.statut)">{{ libelleStatut(rez.statut) }}</span>
              </span>
              <lx-icon name="chevron-down" class="hist-chevron" [class.is-open]="ouvert() === rez.id" [size]="16" />
            </button>
            @if (ouvert() === rez.id) {
              <div class="hist-details">
                <div><span class="lx-muted">Référence</span><span>CR-{{ rez.id }}</span></div>
                <div><span class="lx-muted">Places</span><span>{{ rez.nombrePlaces }}</span></div>
                <div><span class="lx-muted">Statut</span><span>{{ libelleStatut(rez.statut) }}</span></div>
                <div><span class="lx-muted">Montant</span><span>{{ montantReservation(rez) | number:'1.0-0' }} FCFA</span></div>
                <div class="hist-actions">
                  <button class="lx-link" (click)="reserverANouveau(rez)"><lx-icon name="arrow-right" /> Réserver à nouveau</button>
                  @if (rez.statut === 'TERMINEE') {
                    <a class="lx-link lx-muted-link" routerLink="/client/remboursement">Un problème ? Remboursement</a>
                  }
                </div>
              </div>
            }
          </div>
        }
      </div>
    }
  </section>
</div>
  `,
  styles: [`
    :host { display: block; }
    .dash { display: flex; flex-direction: column; gap: 2rem; }
    .min-w-0 { min-width: 0; }

    /* Course en cours */
    .live { padding: 0; }
    .live-bar {
      height: 4px; background: linear-gradient(90deg, var(--lx-primary), #fcd34d, var(--lx-primary));
      background-size: 200% 100%; animation: lx-shimmer 2s linear infinite;
    }
    .live-inner { padding: 1.5rem; }
    .live-head { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1.25rem; }
    .live-label { font-size: 0.8rem; font-weight: 500; color: var(--lx-primary); text-transform: uppercase; letter-spacing: 0.08em; }
    .live-ref { font-size: 0.75rem; }
    .live-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1.5rem; align-items: center; }
    .driver { display: flex; align-items: center; gap: 1rem; min-width: 0; }
    .driver-avatar { position: relative; flex-shrink: 0; }
    .driver-badge {
      position: absolute; right: -4px; bottom: -4px; background: var(--lx-primary); color: var(--lx-primary-fg);
      border-radius: 50%; padding: 4px; display: flex;
    }
    .driver-name { font-size: 1.125rem; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .driver-rating { display: flex; align-items: center; gap: 0.35rem; color: var(--lx-amber); font-size: 0.875rem; font-weight: 500; margin: 0.1rem 0 0.2rem; }
    .driver-meta { font-size: 0.75rem; }
    .plate {
      display: inline-block; margin-top: 0.35rem; background: var(--lx-secondary); color: var(--lx-fg);
      font-size: 0.7rem; letter-spacing: 0.08em; padding: 0.15rem 0.5rem; border-radius: 4px;
    }
    .live-price { display: flex; align-items: center; gap: 1rem; font-size: 0.875rem; strong { font-weight: 600; } }
    .live-actions {
      display: flex; gap: 0.75rem; flex-wrap: wrap; margin-top: 1.5rem; padding-top: 1.25rem; border-top: 1px solid var(--lx-border);
      .call { flex: 1 1 220px; }
    }

    /* Colonnes */
    .cols { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 3fr); gap: 2rem; align-items: start; }
    .col-left { display: flex; flex-direction: column; gap: 1.5rem; min-width: 0; }
    .col-right { min-width: 0; }
    .chips { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1rem; }

    .loyalty { padding: 1.25rem; }
    .loyalty-head { display: flex; align-items: center; gap: 0.5rem; color: var(--lx-primary); font-size: 0.875rem; font-weight: 500; margin-bottom: 0.75rem; }
    .loyalty-points { font-size: 1.5rem; margin-bottom: 0.15rem; }
    .loyalty-sub { font-size: 0.75rem; margin-bottom: 0.75rem; }
    .loyalty-tiers { display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--lx-muted-fg); margin-top: 0.35rem; }

    a.lx-ride { text-decoration: none; color: inherit; }

    /* Historique */
    .hist-right { display: flex; flex-direction: column; align-items: flex-end; gap: 0.3rem; flex-shrink: 0; margin-left: auto; }
    .hist-price { font-weight: 500; white-space: nowrap; }
    .hist-chevron { color: var(--lx-muted-fg); transition: transform 0.2s; &.is-open { transform: rotate(180deg); } }
    .hist-details {
      display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 1rem;
      padding: 0 1.5rem 1.25rem; background: rgba(26, 29, 40, 0.2); border-bottom: 1px solid var(--lx-border);
      animation: lx-fade 0.2s;
      > div:not(.hist-actions) { display: flex; flex-direction: column; gap: 0.2rem; font-size: 0.875rem; padding-top: 1rem;
        .lx-muted { font-size: 0.75rem; } }
    }
    .hist:last-child .hist-details { border-bottom: 0; }
    .hist-actions { grid-column: 1 / -1; display: flex; gap: 1.25rem; flex-wrap: wrap; padding-top: 0.75rem; border-top: 1px solid var(--lx-border); }
    .lx-muted-link { color: var(--lx-muted-fg); }

    /* La barre latérale occupe 256px : sous 1100px de large, on empile les colonnes. */
    @media (max-width: 1099px) {
      .cols { grid-template-columns: 1fr; gap: 1.5rem; }
    }
    @media (max-width: 767px) {
      .live-grid { grid-template-columns: 1fr; }
      .hist-details { grid-template-columns: repeat(2, minmax(0, 1fr)); padding: 0 1rem 1rem; }
      .live-inner { padding: 1.15rem; }
      .live-actions .lx-btn { flex: 1 1 auto; }
    }
  `]
})
export class ClientDashboardComponent implements OnInit {
  private toast = inject(ToastService);

  loading       = signal(true);
  reservations  = signal<Reservation[]>([]);
  portefeuille  = signal<Portefeuille | null>(null);
  utilisateur   = signal<Utilisateur | null>(null);
  courseEnCours = signal<CourseEnCours | null>(null);
  appelEnCours  = signal(false);
  ouvert        = signal<number | null>(null);

  // Champs "Nouvelle réservation"
  adresseDepart = '';
  adresseDestination = '';

  stats = computed(() => {
    const s = this.statsClient();
    return [
      { icon: 'car',         color: 'var(--lx-primary)', value: String(s.nombreCourses), sub: 'courses', label: 'Ce mois' },
      { icon: 'calendar',    color: 'var(--lx-blue)',    value: String(s.aVenir), sub: 'trajets', label: 'À venir' },
      { icon: 'credit-card', color: 'var(--lx-emerald)', value: this.fcfaCourt(s.solde), sub: 'solde', label: 'Disponible' },
      { icon: 'award',       color: 'var(--lx-amber)',   value: new Intl.NumberFormat('fr-FR').format(s.pointsFidelite), sub: 'fidélité', label: 'Points' },
    ];
  });

  villesRecentes = computed(() => {
    const vues = new Set<string>();
    for (const r of this.reservations()) {
      for (const v of [r.villeDepart, r.villeArrivee]) {
        const ville = (v ?? '').trim();
        if (ville) vues.add(ville);
        if (vues.size >= 3) break;
      }
      if (vues.size >= 3) break;
    }
    return [...vues];
  });

  constructor(
    private auth: AuthService,
    private rezSvc: ReservationService,
    private walletSvc: PortefeuilleService,
    private utilisateurSvc: UtilisateurService,
    private router: Router,
    private http: HttpClient,
  ) {}

  ngOnInit() {
    const user = this.auth.currentUser();
    if (!user) { this.loading.set(false); return; }

    this.utilisateurSvc.getProfil(user.compteId).subscribe({
      next: u => this.utilisateur.set(u),
      error: () => this.utilisateur.set(null)
    });

    const wallet$ = this.walletSvc.get(user.compteId).pipe(shareReplay(1));
    wallet$.subscribe({
      next: w => this.portefeuille.set(w),
      error: () => this.portefeuille.set(null)
    });

    this.rezSvc.getMesReservations(user.compteId).subscribe({
      next: p => {
        const liste = [...(p.content ?? [])].sort((a, b) =>
          new Date(b.dateReservation).getTime() - new Date(a.dateReservation).getTime());
        this.reservations.set(liste);
        this.loading.set(false);

        // Course mise en avant : celle où le passager est à bord, sinon la première confirmée.
        const actives = liste.filter(r => r.statut === 'ACCEPTEE');
        const enCours = actives.find(r => r.embarquementConfirme) ?? actives[0];
        const course = enCours ? this.mapCourseEnCours(enCours) : null;
        this.courseEnCours.set(course);
        if (course) this.enrichirChauffeur(course);
      },
      error: () => {
        this.reservations.set([]);
        this.loading.set(false);
      }
    });
  }

  // ---------- Statistiques ----------

  statsClient() {
    const toutes = this.reservations();
    const maintenant = new Date();
    const nombreCourses = toutes.filter(r => {
      if (r.statut !== 'TERMINEE') return false;
      const d = new Date(r.dateArrivee ?? r.dateReservation);
      return d.getMonth() === maintenant.getMonth() && d.getFullYear() === maintenant.getFullYear();
    }).length;
    const aVenir = toutes.filter(r => r.statut === 'EN_ATTENTE' || r.statut === 'ACCEPTEE').length;
    const solde = Number(this.portefeuille()?.soldeDisponible ?? 0);
    const pointsFidelite = Number((this.portefeuille() as any)?.pointsFidelite ?? 0);
    return { nombreCourses, aVenir, solde, pointsFidelite };
  }

  pointsRestantsPalierGold(): number {
    return Math.max(0, SEUIL_PALIER_GOLD - this.statsClient().pointsFidelite);
  }

  progressionPalier(): number {
    const pct = (this.statsClient().pointsFidelite / SEUIL_PALIER_GOLD) * 100;
    return Math.min(100, Math.max(0, pct));
  }

  private fcfaCourt(n: number): string {
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n) + ' F';
  }

  // ---------- Réservations ----------

  reservationsAVenir(): Reservation[] {
    return this.reservations().filter(r => r.statut === 'EN_ATTENTE' || r.statut === 'ACCEPTEE').slice(0, 3);
  }

  historiqueRecent(): Reservation[] {
    return this.reservations().filter(r => ['TERMINEE', 'ANNULEE', 'REFUSEE'].includes(r.statut)).slice(0, 4);
  }

  montantReservation(rez: Reservation): number {
    return Number(rez.montantTotal ?? (rez.prixParPlace ? rez.prixParPlace * rez.nombrePlaces : 0));
  }

  libelleStatut(s: Reservation['statut']): string {
    return ({ TERMINEE: 'Terminée', ANNULEE: 'Annulée', REFUSEE: 'Refusée', ACCEPTEE: 'Confirmée', EN_ATTENTE: 'En attente' } as const)[s] ?? s;
  }

  badgeStatut(s: Reservation['statut']): string {
    return s === 'TERMINEE' ? 'lx-badge-success' : (s === 'ANNULEE' || s === 'REFUSEE') ? 'lx-badge-danger' : '';
  }

  formaterDateReservation(rez: Reservation): string {
    if (!rez.dateReservation) return rez.statut === 'EN_ATTENTE' ? 'En attente de confirmation' : '—';
    const d = new Date(rez.dateReservation);
    const today = new Date();
    const hier = new Date(); hier.setDate(today.getDate() - 1);
    const heure = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    if (d.toDateString() === today.toDateString()) return `Aujourd'hui, ${heure}`;
    if (d.toDateString() === hier.toDateString()) return `Hier, ${heure}`;
    const j = d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
    return `${j.charAt(0).toUpperCase()}${j.slice(1)}, ${heure}`;
  }

  basculer(id: number) {
    this.ouvert.update(cur => cur === id ? null : id);
  }

  // ---------- Nouvelle réservation ----------

  choisirVille(v: string) {
    if (!this.adresseDepart.trim()) this.adresseDepart = v;
    else if (this.adresseDepart.trim() !== v) this.adresseDestination = v;
  }

  lancerRecherche() {
    const depart = this.adresseDepart.trim();
    const arrivee = this.adresseDestination.trim();
    if (!depart || !arrivee) return;
    this.router.navigate(['/client/nouvelle-course'], { queryParams: { depart, arrivee } });
  }

  reserverANouveau(rez: Reservation) {
    this.router.navigate(['/client/nouvelle-course'], {
      queryParams: { depart: rez.villeDepart, arrivee: rez.villeArrivee, places: rez.nombrePlaces }
    });
  }

  // ---------- Course en cours ----------

  private mapCourseEnCours(rez: Reservation): CourseEnCours {
    return {
      reservationId: rez.id,
      trajetId: rez.trajetId,
      chauffeurId: rez.chauffeurId,
      reference: `CR-${rez.id}`,
      chauffeurNom: 'Votre chauffeur',
      chauffeurNote: '',
      places: rez.nombrePlaces,
      embarque: !!rez.embarquementConfirme,
      adresseDepart: rez.villeDepart || 'Départ',
      adresseArrivee: rez.villeArrivee || 'Arrivée',
      prix: this.montantReservation(rez)
    };
  }

  /** Complète la carte "course en cours" avec le nom et la note réels du chauffeur. */
  private enrichirChauffeur(course: CourseEnCours) {
    this.utilisateurSvc.getProfil(course.chauffeurId).subscribe({
      next: (c: any) => {
        const nom = [c?.prenom, c?.nom].filter(Boolean).join(' ').trim();
        this.courseEnCours.update(cur => cur && cur.reservationId === course.reservationId
          ? { ...cur, chauffeurNom: nom || cur.chauffeurNom, chauffeurNote: c?.noteMoyenne ? Number(c.noteMoyenne).toFixed(1) : '' }
          : cur);
      },
      error: () => {}
    });
  }

  appelerChauffeur(course: CourseEnCours) {
    const user = this.auth.currentUser();
    if (!user) return;
    this.appelEnCours.set(true);
    this.http.get<{ telephone?: string }>(
      `${environment.apiUrl}/utilisateurs/profil/${course.chauffeurId}/telephone`,
      { params: { passagerId: user.compteId } }
    ).subscribe({
      next: res => {
        this.appelEnCours.set(false);
        if (res?.telephone) {
          window.location.href = `tel:${res.telephone}`;
        } else {
          this.toast.info('Numéro indisponible', 'Contactez le chauffeur par message.');
          this.router.navigate(['/client/messages'], { queryParams: { avec: course.chauffeurId } });
        }
      },
      error: err => {
        this.appelEnCours.set(false);
        this.toast.error('Numéro indisponible', err);
      }
    });
  }
}

interface CourseEnCours {
  reservationId: number;
  trajetId: number;
  chauffeurId: number;
  reference: string;
  chauffeurNom: string;
  chauffeurNote: string | number;
  places: number;
  embarque: boolean;
  adresseDepart: string;
  adresseArrivee: string;
  prix: number;
}
