import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ToastService, fcfa } from '../../../core/services/toast.service';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ReservationService } from '../../../core/services/reservation.service';
import { TrajetService } from '../../../core/services/trajet.service';
import { PortefeuilleService } from '../../../core/services/portefeuille.service';
import { Reservation, Trajet, Portefeuille } from '../../../core/models';
import { shareReplay } from 'rxjs';

@Component({
  selector: 'app-chauffeur-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
<div>
  <h2 style="margin-bottom:0.5rem">Tableau de bord</h2>
  <p style="margin-bottom:2rem">Gérez vos courses et réservations</p>

  <div class="stats-grid" style="margin-bottom:2rem">
    <div class="stat-card">
      <div class="stat-info">
        <div class="value">{{ totalTrajets() }}</div>
        <div class="label">Trajets publiés</div>
      </div>
      <div class="stat-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-info">
        <div class="value">{{ demandesEnAttente() }}</div>
        <div class="label">Demandes en attente</div>
      </div>
      <div class="stat-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-info">
        <div class="value">{{ portefeuille()?.soldeDisponible ?? 0 | number:'1.0-0' }} FCFA</div>
        <div class="label">Solde disponible</div>
      </div>
      <div class="stat-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
      </div>
    </div>
  </div>

  <!-- DEMANDES EN ATTENTE -->
  <div class="chauffeur-dashboard-main">
    <div>
      <h3 style="margin-bottom:1rem">Demandes de réservation</h3>
      @if (reservationsEnAttente().length === 0) {
        <div class="card" style="text-align:center;padding:2rem">
          <p>Aucune demande en attente</p>
        </div>
      } @else {
        @for (r of reservationsEnAttente(); track r.id) {
          <div class="card" style="margin-bottom:1rem">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem">
              <div>
                <strong>Passager #{{ r.passagerId }}</strong>
                <div style="font-size:0.85rem;color:var(--color-muted)">
                  {{ r.villeDepart ? r.villeDepart + ' → ' + r.villeArrivee : 'Trajet #' + r.trajetId }}
                  · {{ r.nombrePlaces }} place(s){{ r.pointArret ? ' · arrêt ' + r.pointArret : '' }}
                </div>
                <div style="font-weight:700;margin-top:.2rem">{{ fcfa(r.montantTotal) }}</div>
              </div>
              <span class="badge badge-warning">En attente</span>
            </div>
            <div style="display:flex;gap:0.75rem">
              <button class="btn btn-success btn-sm" (click)="accepter(r)" [disabled]="traitement() === r.id">✓ Accepter</button>
              <button class="btn btn-danger btn-sm" (click)="refuser(r)" [disabled]="traitement() === r.id">✕ Refuser</button>
            </div>
          </div>
        }
      }
    </div>

    <!-- MES TRAJETS -->
    <div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem">
        <h3>Mes trajets</h3>
        <a routerLink="/chauffeur/courses" class="btn btn-outline btn-sm">Voir tout</a>
      </div>
      @for (t of mesTrajets(); track t.id) {
        <div class="card" style="margin-bottom:1rem">
          <div style="display:flex;justify-content:space-between;align-items:flex-start">
            <div>
              <div style="font-weight:600">{{ t.villeDepart }} → {{ t.villeArrivee }}</div>
              <div style="font-size:0.85rem;color:var(--color-muted)">{{ t.dateDepart | date:'EEE d MMM' }} · {{ (t.heureDepart || '').slice(0,5) }}</div>
              <div style="font-size:0.85rem;color:var(--color-muted)">{{ t.placesDisponibles }} place(s) libre(s) sur {{ t.nombrePlaces }}</div>
            </div>
            <div style="text-align:right">
              <div style="font-weight:700">{{ t.prixParPlace | number:'1.0-0' }} FCFA</div>
              <span class="badge" [class]="getBadgeTrajet(t.statut)">{{ ({ PLANIFIE: 'Planifié', EN_COURS: 'En cours', TERMINE: 'Terminé', ANNULE: 'Annulé' })[t.statut] ?? t.statut }}</span>
            </div>
          </div>
          @if (t.statut === 'PLANIFIE') {
            <div style="display:flex;gap:0.5rem;margin-top:0.75rem">
              <button class="btn btn-primary btn-sm" (click)="demarrer(t)">▶ Démarrer</button>
              <button class="btn btn-danger btn-sm" (click)="annuler(t)">✕ Annuler</button>
            </div>
          }
          @if (t.statut === 'EN_COURS') {
            <button class="btn btn-success btn-sm" style="margin-top:0.75rem" (click)="terminer(t)">
              ✓ Terminer le trajet
            </button>
          }
        </div>
      }
    </div>
  </div>
</div>`
})
export class ChauffeurDashboardComponent implements OnInit {
  private toast = inject(ToastService);
  private destroyRef = inject(DestroyRef);
  private confirm = inject(ConfirmService);
  traitement = signal<number | null>(null);
  fcfa = fcfa;
  reservationsEnAttente = signal<Reservation[]>([]);
  mesTrajets = signal<Trajet[]>([]);
  portefeuille = signal<Portefeuille | null>(null);
  totalTrajets = signal(0);
  demandesEnAttente = signal(0);

  constructor(
    private auth: AuthService,
    private rezSvc: ReservationService,
    private trajetSvc: TrajetService,
    private walletSvc: PortefeuilleService
  ) {}

  ngOnInit() {
    const u = this.auth.currentUser();
    if (!u) return;

    const wallet$ = this.walletSvc.get(u.compteId).pipe(
          shareReplay(1)
        );
        wallet$.subscribe({
          next: w => this.portefeuille.set(w),
          error: () => {}
        });

    this.chargerDemandes(false);
    // Nouvelles demandes de réservation détectées toutes les 20 s, avec notification.
    interval(20000).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (!document.hidden && !this.traitement()) this.chargerDemandes(true);
    });
    this.trajetSvc.getMesTrajets(u.compteId).subscribe({
      next: p => { this.mesTrajets.set(p.content); this.totalTrajets.set(p.totalElements); }
    });
    this.walletSvc.get(u.compteId).subscribe({ next: w => this.portefeuille.set(w), error: () => {} });
  }

  private chargerDemandes(signaler: boolean) {
    const u = this.auth.currentUser();
    if (!u) return;
    this.rezSvc.getEnAttente(u.compteId).subscribe({
      next: p => {
        const connues = new Set(this.reservationsEnAttente().map(r => r.id));
        const nouvelles = (p.content ?? []).filter(r => !connues.has(r.id));
        this.reservationsEnAttente.set(p.content ?? []);
        this.demandesEnAttente.set(p.totalElements ?? 0);
        if (signaler && nouvelles.length) {
          const r = nouvelles[0];
          this.toast.info(nouvelles.length > 1 ? `${nouvelles.length} nouvelles demandes de réservation` : 'Nouvelle demande de réservation',
            `${r.villeDepart ?? 'Trajet #' + r.trajetId}${r.villeArrivee ? ' → ' + r.villeArrivee : ''} · ${r.nombrePlaces} place(s)`);
        }
      },
      error: () => {}
    });
  }

  accepter(r: Reservation) {
    const u = this.auth.currentUser();
    if (!u || this.traitement()) return;
    this.traitement.set(r.id);
    // Le prix de la réservation (prix du trajet / du segment / négocié) fait foi.
    this.rezSvc.accepter(r.id, u.compteId, Number(r.prixParPlace ?? 0)).subscribe({
      next: maj => {
        this.traitement.set(null);
        this.retirerDemande(r.id);
        this.toast.success('Réservation acceptée', `${maj.nombrePlaces} place(s) · ${fcfa(maj.montantTotal)} bloqués sur le compte du passager.`);
      },
      error: err => { this.traitement.set(null); this.toast.error("Impossible d'accepter", err); }
    });
  }

  refuser(r: Reservation) {
    const u = this.auth.currentUser();
    if (!u || this.traitement()) return;
    this.traitement.set(r.id);
    this.rezSvc.refuser(r.id, u.compteId).subscribe({
      next: () => {
        this.traitement.set(null);
        this.retirerDemande(r.id);
        this.toast.info('Réservation refusée', 'Le passager a été prévenu.');
      },
      error: err => { this.traitement.set(null); this.toast.error('Impossible de refuser', err); }
    });
  }

  private retirerDemande(id: number) {
    this.reservationsEnAttente.update(arr => arr.filter(x => x.id !== id));
    this.demandesEnAttente.update(n => Math.max(0, n - 1));
  }

  demarrer(t: Trajet) {
    const u = this.auth.currentUser();
    if (!u) return;
    this.trajetSvc.demarrer(t.id, u.compteId).subscribe({
      next: updated => { this.mesTrajets.update(arr => arr.map(x => x.id === t.id ? updated : x)); this.toast.success('Trajet démarré'); },
      error: err => this.toast.error('Impossible de démarrer', err)
    });
  }

  terminer(t: Trajet) {
    const u = this.auth.currentUser();
    if (!u) return;
    this.trajetSvc.terminer(t.id, u.compteId).subscribe({
      next: updated => { this.mesTrajets.update(arr => arr.map(x => x.id === t.id ? updated : x)); this.toast.success('Trajet terminé'); },
      error: err => this.toast.error('Impossible de terminer', err)
    });
  }

  async annuler(t: Trajet) {
    const u = this.auth.currentUser();
    if (!u) return;
    const ok = await this.confirm.ask({ title: `Annuler ${t.villeDepart} → ${t.villeArrivee} ?`,
      message: 'Les passagers seront prévenus et intégralement remboursés.', confirmLabel: 'Annuler le trajet', cancelLabel: 'Retour', danger: true });
    if (!ok) return;
    this.trajetSvc.annuler(t.id, u.compteId).subscribe({
      next: () => { this.mesTrajets.update(arr => arr.map(x => x.id === t.id ? {...x, statut: 'ANNULE' as any} : x)); this.toast.success('Trajet annulé'); },
      error: err => this.toast.error("Impossible d'annuler", err)
    });
  }

  getBadgeTrajet(s: string) {
    return { 'PLANIFIE': 'badge badge-info', 'EN_COURS': 'badge badge-success',
      'TERMINE': 'badge badge-muted', 'ANNULE': 'badge badge-danger' }[s] || 'badge badge-muted';
  }
}
