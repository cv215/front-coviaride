import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ToastService, fcfa } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';
import { ReservationService } from '../../../core/services/reservation.service';
import { TrajetService } from '../../../core/services/trajet.service';
import { PortefeuilleService } from '../../../core/services/portefeuille.service';
import { Reservation, Trajet, Portefeuille, DemandeVoyage } from '../../../core/models';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { DecisionReservationComponent } from '../../../shared/components/decision-reservation/decision-reservation.component';
import { ProfilsService } from '../../../core/services/profils.service';

const LIBELLES_TRAJET: Record<string, string> = { PLANIFIE: 'Planifié', EN_COURS: 'En cours', TERMINE: 'Terminé', ANNULE: 'Annulé' };

@Component({
  selector: 'app-chauffeur-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, IconComponent, DecisionReservationComponent],
  template: `
<div class="dash">

  <!-- ── Trajet en cours ─────────────────────────────────── -->
  @if (trajetEnCours(); as t) {
    <section class="lx-card lx-card-glow live lx-rise">
      <div class="live-bar"></div>
      <div class="live-inner">
        <div class="live-head">
          <div class="lx-row" style="gap:.5rem"><span class="lx-ping"></span><span class="live-label">Trajet en cours</span></div>
          <span class="lx-muted" style="font-size:.75rem">Trajet #{{ t.id }}</span>
        </div>
        <div class="live-grid">
          <div class="lx-route">
            <div class="lx-route-point"><span class="lx-route-mark is-start"></span><span>{{ t.villeDepart }}</span></div>
            <div class="lx-route-line"></div>
            <div class="lx-route-point"><span class="lx-route-mark is-end"><lx-icon name="map-pin" /></span><span>{{ t.villeArrivee }}</span></div>
          </div>
          <div class="live-figures">
            <div><span class="lx-display">{{ t.nombrePlaces - t.placesDisponibles }}</span><span class="lx-muted">passager(s) à bord</span></div>
            <div><span class="lx-display">{{ (t.nombrePlaces - t.placesDisponibles) * t.prixParPlace | number:'1.0-0' }}</span><span class="lx-muted">FCFA attendus</span></div>
          </div>
        </div>
        <div class="live-actions">
          <button class="lx-btn lx-btn-primary" style="flex:1 1 220px" (click)="terminer(t)" [disabled]="action() === t.id">
            <lx-icon name="check-circle" /> Terminer le trajet
          </button>
          <a class="lx-btn lx-btn-secondary" [routerLink]="['/chauffeur/suivi', t.id]"><lx-icon name="map-pin" /> Carte</a>
          <a class="lx-btn lx-btn-secondary" routerLink="/chauffeur/courses"><lx-icon name="users" /> Passagers</a>
          <a class="lx-btn lx-btn-secondary" routerLink="/chauffeur/messages"><lx-icon name="message" /> Messages</a>
        </div>
      </div>
    </section>
  }

  <!-- ── Statistiques ────────────────────────────────────── -->
  <section class="lx-stats lx-rise lx-rise-1">
    <div class="lx-stat">
      <lx-icon name="route" style="color:var(--lx-primary)" />
      <div class="lx-stat-value">{{ totalTrajets() }}</div>
      <div class="lx-stat-label">trajets · publiés</div>
    </div>
    <div class="lx-stat">
      <lx-icon name="clock" style="color:var(--lx-amber)" />
      <div class="lx-stat-value">{{ demandesEnAttente() }}</div>
      <div class="lx-stat-label">demandes · en attente</div>
    </div>
    <div class="lx-stat">
      <lx-icon name="calendar" style="color:var(--lx-blue)" />
      <div class="lx-stat-value">{{ trajetsAVenir().length }}</div>
      <div class="lx-stat-label">trajets · à venir</div>
    </div>
    <div class="lx-stat">
      <lx-icon name="wallet" style="color:var(--lx-emerald)" />
      <div class="lx-stat-value">{{ (portefeuille()?.soldeDisponible ?? 0) | number:'1.0-0' }} F</div>
      <div class="lx-stat-label">solde · disponible</div>
    </div>
  </section>

  <div class="cols">
    <!-- Demandes -->
    <section class="lx-rise lx-rise-2">
      <div class="lx-section-head">
        <h2>Demandes de réservation</h2>
        @if (demandesEnAttente() > 0) { <span class="lx-badge lx-badge-warning">{{ demandesEnAttente() }} en attente</span> }
      </div>
      @if (chargement()) {
        <div class="lx-stack-sm"><div class="lx-skeleton"></div><div class="lx-skeleton"></div></div>
      } @else {
        <div class="lx-stack-sm">
          @for (r of reservationsEnAttente(); track r.id) {
            <article class="lx-card request">
              <div class="request-top">
                <span class="lx-avatar is-ring">{{ profils.initiales(r.passagerId) }}</span>
                <div class="lx-list-body">
                  <span class="lx-list-title">{{ profils.nom(r.passagerId, 'Passager') }}</span>
                  <span class="lx-list-sub">{{ r.villeDepart ? r.villeDepart + ' → ' + r.villeArrivee : 'Trajet #' + r.trajetId }}</span>
                  <span class="lx-list-sub">{{ r.nombrePlaces }} place{{ r.nombrePlaces > 1 ? 's' : '' }}@if (r.pointArret) { · arrêt {{ r.pointArret }} }</span>
                </div>
                <span class="request-price">{{ fcfa(r.montantTotal) }}</span>
              </div>
              <lx-decision-reservation class="request-decision" [rez]="r" (traitee)="surDecision($event)" />
            </article>
          } @empty {
            <div class="lx-empty">
              <lx-icon name="clock" />
              <p>Aucune demande en attente.</p>
              <p class="lx-muted" style="font-size:.78rem">Les nouvelles demandes s'affichent ici automatiquement.</p>
            </div>
          }
        </div>
      }
    </section>

    <!-- Mes trajets -->
    <section class="lx-rise lx-rise-3">
      <div class="lx-section-head">
        <h2>Mes trajets</h2>
        <a routerLink="/chauffeur/courses" class="lx-link">Tout voir <lx-icon name="chevron-right" /></a>
      </div>
      <div class="lx-stack-sm">
        @for (t of trajetsAVenir().slice(0, 4); track t.id) {
          <article class="lx-ride trip">
            <span class="lx-icon-tile"><lx-icon name="car" /></span>
            <span class="lx-list-body">
              <span class="lx-list-title">{{ t.villeDepart }} → {{ t.villeArrivee }}</span>
              <span class="lx-list-sub cap">{{ t.dateDepart | date:'EEE d MMM' }} · {{ (t.heureDepart || '').slice(0,5) }}</span>
              <span class="lx-list-sub">{{ t.placesDisponibles }} / {{ t.nombrePlaces }} places libres</span>
            </span>
            <span class="trip-right">
              <span class="lx-ride-price">{{ t.prixParPlace | number:'1.0-0' }} F</span>
              <span class="lx-badge" [ngClass]="badgeTrajet(t.statut)">{{ libelleTrajet(t.statut) }}</span>
            </span>
            @if (t.statut === 'PLANIFIE') {
              <div class="trip-actions">
                <button class="lx-btn lx-btn-ghost lx-btn-sm" (click)="annuler(t)" [disabled]="action() === t.id">Annuler</button>
                <button class="lx-btn lx-btn-primary lx-btn-sm" (click)="demarrer(t)" [disabled]="action() === t.id"><lx-icon name="navigation" /> Démarrer</button>
              </div>
            }
          </article>
        } @empty {
          <div class="lx-empty">
            <lx-icon name="route" />
            <p>Aucun trajet planifié.</p>
            <a routerLink="/chauffeur/courses" class="lx-btn lx-btn-primary lx-btn-sm"><lx-icon name="plus" /> Publier un trajet</a>
          </div>
        }
      </div>
    </section>
  </div>

  <!-- Demandes de voyage publiées par les clients -->
  <section class="lx-rise lx-rise-3">
    <div class="lx-section-head">
      <h2>Demandes de passagers</h2>
      <span class="lx-muted" style="font-size:.8rem">Clients qui cherchent un trajet</span>
    </div>
    <div class="lx-stack-sm">
      @for (d of demandesVoyage(); track d.id) {
        <article class="lx-ride trip">
          <span class="lx-icon-tile is-gold"><lx-icon name="users" /></span>
          <span class="lx-list-body">
            <span class="lx-list-title">{{ profils.nom(d.passagerId, 'Un client') }} cherche {{ d.villeDepart }} → {{ d.villeArrivee }}</span>
            <span class="lx-list-sub cap">{{ d.dateSouhaitee ? (d.dateSouhaitee | date:'EEE d MMM') : 'Dès que possible' }} · {{ d.nombrePlaces }} place{{ d.nombrePlaces > 1 ? 's' : '' }}</span>
            @if (d.commentaire) { <span class="lx-list-sub">« {{ d.commentaire }} »</span> }
          </span>
          <a class="lx-btn lx-btn-primary lx-btn-sm" routerLink="/chauffeur/courses"
            [queryParams]="{ nouveau: 1, depart: d.villeDepart, arrivee: d.villeArrivee, date: d.dateSouhaitee || null }">
            <lx-icon name="plus" /> Proposer ce trajet
          </a>
        </article>
      } @empty {
        <div class="lx-empty"><lx-icon name="users" /><p>Aucune demande de voyage pour le moment.</p></div>
      }
    </div>
  </section>
</div>`,
  styles: [`
    :host { display: block; }
    .dash { display: flex; flex-direction: column; gap: 2rem; }
    .cap { text-transform: capitalize; }

    .live { padding: 0; }
    .live-bar { height: 4px; background: linear-gradient(90deg, var(--lx-primary), #fcd34d, var(--lx-primary)); background-size: 200% 100%; animation: lx-shimmer 2s linear infinite; }
    .live-inner { padding: 1.5rem; }
    .live-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; }
    .live-label { font-size: 0.8rem; font-weight: 500; color: var(--lx-primary); text-transform: uppercase; letter-spacing: 0.08em; }
    .live-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1.5rem; align-items: center; }
    .live-figures { display: flex; gap: 2rem;
      > div { display: flex; flex-direction: column; } .lx-display { font-size: 2rem; color: var(--lx-primary); line-height: 1.1; } .lx-muted { font-size: 0.75rem; } }
    .live-actions { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-top: 1.5rem; padding-top: 1.25rem; border-top: 1px solid var(--lx-border); }

    .cols { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 2rem; align-items: start; }
    .request { padding: 1.1rem 1.25rem; }
    .request-top { display: flex; align-items: center; gap: 0.9rem; }
    .request-price { font-family: var(--lx-font-display); font-size: 1.05rem; white-space: nowrap; }
    .request-decision { margin-top: 0.9rem; }

    .trip { flex-wrap: wrap; }
    .trip-right { display: flex; flex-direction: column; align-items: flex-end; gap: 0.3rem; flex-shrink: 0; }
    .trip-actions { flex-basis: 100%; display: flex; justify-content: flex-end; gap: 0.5rem; padding-top: 0.75rem; border-top: 1px solid var(--lx-border); }

    @media (max-width: 1099px) { .cols { grid-template-columns: 1fr; gap: 1.5rem; } }
    @media (max-width: 640px) {
      .live-grid { grid-template-columns: 1fr; }
      .live-inner { padding: 1.15rem; }
      .live-actions .lx-btn { flex: 1 1 auto; }
      .trip-actions .lx-btn { flex: 1; }
    }
  `]
})
export class ChauffeurDashboardComponent implements OnInit {
  private toast = inject(ToastService);
  private destroyRef = inject(DestroyRef);
  private confirm = inject(ConfirmService);
  profils = inject(ProfilsService);

  fcfa = fcfa;
  action = signal<number | null>(null);
  chargement = signal(true);
  reservationsEnAttente = signal<Reservation[]>([]);
  mesTrajets = signal<Trajet[]>([]);
  portefeuille = signal<Portefeuille | null>(null);
  totalTrajets = signal(0);
  demandesEnAttente = signal(0);
  demandesVoyage = signal<DemandeVoyage[]>([]);

  trajetEnCours = computed(() => this.mesTrajets().find(t => t.statut === 'EN_COURS') ?? null);
  trajetsAVenir = computed(() => this.mesTrajets()
    .filter(t => t.statut === 'PLANIFIE' || t.statut === 'EN_COURS')
    .sort((a, b) => `${a.dateDepart}T${a.heureDepart}`.localeCompare(`${b.dateDepart}T${b.heureDepart}`)));

  constructor(
    private auth: AuthService,
    private rezSvc: ReservationService,
    private trajetSvc: TrajetService,
    private walletSvc: PortefeuilleService
  ) {}

  ngOnInit() {
    const u = this.auth.currentUser();
    if (!u) { this.chargement.set(false); return; }

    this.walletSvc.get(u.compteId).subscribe({ next: w => this.portefeuille.set(w), error: () => {} });
    this.chargerDemandes(false);
    this.chargerDemandesVoyage();
    // Nouvelles demandes détectées toutes les 20 s, avec notification.
    interval(20000).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (!document.hidden) { this.chargerDemandes(true); this.chargerDemandesVoyage(); }
    });
    this.trajetSvc.getMesTrajets(u.compteId).subscribe({
      next: p => { this.mesTrajets.set(p?.content ?? []); this.totalTrajets.set(p?.totalElements ?? 0); },
      error: () => this.toast.error('Impossible de charger vos trajets')
    });
  }

  private chargerDemandesVoyage() {
    const moi = this.auth.currentUser()?.compteId;
    this.trajetSvc.demandesOuvertes().subscribe({
      next: p => {
        const liste = (p?.content ?? []).filter(d => d.passagerId !== moi).slice(0, 6);
        this.demandesVoyage.set(liste);
        this.profils.charger(liste.map(d => d.passagerId));
      },
      error: () => {}
    });
  }

  private chargerDemandes(signaler: boolean) {
    const u = this.auth.currentUser();
    if (!u) return;
    this.rezSvc.getEnAttente(u.compteId).subscribe({
      next: p => {
        const connues = new Set(this.reservationsEnAttente().map(r => r.id));
        const nouvelles = (p?.content ?? []).filter(r => !connues.has(r.id));
        this.reservationsEnAttente.set(p?.content ?? []);
        this.profils.charger((p?.content ?? []).map(r => r.passagerId));
        this.demandesEnAttente.set(p?.totalElements ?? 0);
        this.chargement.set(false);
        if (signaler && nouvelles.length) {
          const r = nouvelles[0];
          this.toast.info(nouvelles.length > 1 ? `${nouvelles.length} nouvelles demandes de réservation` : 'Nouvelle demande de réservation',
            `${r.villeDepart ?? 'Trajet #' + r.trajetId}${r.villeArrivee ? ' → ' + r.villeArrivee : ''} · ${r.nombrePlaces} place(s)`);
        }
      },
      error: () => this.chargement.set(false)
    });
  }

  /** Résultat d'une décision : acceptée, refusée ou contre-offre envoyée. */
  surDecision(e: { avant: Reservation; apres: Reservation | null }) {
    const { avant, apres } = e;
    if (apres && apres.statut === 'EN_ATTENTE') {
      // Contre-offre : la demande reste en attente de la réponse du passager.
      this.reservationsEnAttente.update(arr => arr.map(x => x.id === avant.id ? apres : x));
      return;
    }
    this.retirerDemande(avant.id);
    if (apres?.statut === 'ACCEPTEE') {
      // Les places libres du trajet ont changé.
      this.mesTrajets.update(arr => arr.map(t => t.id === avant.trajetId
        ? { ...t, placesDisponibles: Math.max(0, t.placesDisponibles - avant.nombrePlaces) } : t));
    }
  }

  private retirerDemande(id: number) {
    this.reservationsEnAttente.update(arr => arr.filter(x => x.id !== id));
    this.demandesEnAttente.update(n => Math.max(0, n - 1));
  }

  demarrer(t: Trajet) {
    const u = this.auth.currentUser();
    if (!u || this.action()) return;
    this.action.set(t.id);
    this.trajetSvc.demarrer(t.id, u.compteId).subscribe({
      next: updated => { this.action.set(null); this.remplacer(t.id, updated ?? { ...t, statut: 'EN_COURS' }); this.toast.success('Trajet démarré'); },
      error: err => { this.action.set(null); this.toast.error('Impossible de démarrer', err); }
    });
  }

  async terminer(t: Trajet) {
    const u = this.auth.currentUser();
    if (!u || this.action()) return;
    const ok = await this.confirm.ask({ title: 'Terminer ce trajet ?', message: `${t.villeDepart} → ${t.villeArrivee} sera marqué comme terminé.`,
      confirmLabel: 'Terminer', cancelLabel: 'Retour' });
    if (!ok) return;
    this.action.set(t.id);
    this.trajetSvc.terminer(t.id, u.compteId).subscribe({
      next: updated => { this.action.set(null); this.remplacer(t.id, updated ?? { ...t, statut: 'TERMINE' }); this.toast.success('Trajet terminé'); },
      error: err => { this.action.set(null); this.toast.error('Impossible de terminer', err); }
    });
  }

  async annuler(t: Trajet) {
    const u = this.auth.currentUser();
    if (!u || this.action()) return;
    const ok = await this.confirm.ask({ title: `Annuler ${t.villeDepart} → ${t.villeArrivee} ?`,
      message: 'Les passagers seront prévenus et intégralement remboursés.', confirmLabel: 'Annuler le trajet', cancelLabel: 'Retour', danger: true });
    if (!ok) return;
    this.action.set(t.id);
    this.trajetSvc.annuler(t.id, u.compteId).subscribe({
      next: () => { this.action.set(null); this.remplacer(t.id, { ...t, statut: 'ANNULE' }); this.toast.success('Trajet annulé'); },
      error: err => { this.action.set(null); this.toast.error("Impossible d'annuler", err); }
    });
  }

  private remplacer(id: number, t: Trajet) {
    this.mesTrajets.update(arr => arr.map(x => x.id === id ? t : x));
  }

  libelleTrajet(s: string) { return LIBELLES_TRAJET[s] ?? s; }

  badgeTrajet(s: string) {
    return ({ PLANIFIE: 'lx-badge-info', EN_COURS: 'lx-badge-gold', TERMINE: 'lx-badge-success', ANNULE: 'lx-badge-danger' } as Record<string, string>)[s] ?? '';
  }
}
