import { Component, OnInit, signal } from '@angular/core';
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
        <div class="value">{{ portefeuille()?.soldeDisponible | number:'1.0-0' }} XAF</div>
        <div class="label">Solde disponible</div>
      </div>
      <div class="stat-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
      </div>
    </div>
  </div>

  <!-- DEMANDES EN ATTENTE -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem">
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
                <div style="font-size:0.85rem;color:var(--color-muted)">{{ r.nombrePlaces }} place(s) · Trajet #{{ r.trajetId }}</div>
              </div>
              <span class="badge badge-warning">En attente</span>
            </div>
            <div style="display:flex;gap:0.75rem">
              <button class="btn btn-success btn-sm" (click)="accepter(r)">✓ Accepter</button>
              <button class="btn btn-danger btn-sm" (click)="refuser(r)">✕ Refuser</button>
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
              <div style="font-size:0.85rem;color:var(--color-muted)">{{ t.dateDepart }} · {{ t.heureDepart }}</div>
              <div style="font-size:0.85rem;color:var(--color-muted)">{{ t.placesDisponibles }}/{{ t.nombrePlaces }} places</div>
            </div>
            <div style="text-align:right">
              <div style="font-weight:700">{{ t.prixParPlace | number:'1.0-0' }} XAF</div>
              <span class="badge" [class]="getBadgeTrajet(t.statut)">{{ t.statut }}</span>
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

    this.rezSvc.getEnAttente(u.compteId).subscribe({
      next: p => { this.reservationsEnAttente.set(p.content); this.demandesEnAttente.set(p.totalElements); }
    });
    this.trajetSvc.getMesTrajets(u.compteId).subscribe({
      next: p => { this.mesTrajets.set(p.content); this.totalTrajets.set(p.totalElements); }
    });
    this.walletSvc.get(u.compteId).subscribe({ next: w => this.portefeuille.set(w), error: () => {} });
  }

  accepter(r: Reservation) {
    const u = this.auth.currentUser();
    if (!u) return;
    this.rezSvc.accepter(r.id, u.compteId, 5000).subscribe({
      next: () => this.reservationsEnAttente.update(arr => arr.filter(x => x.id !== r.id)),
      error: err => {
        console.error('Erreur lors de l\'acceptation de la réservation', err);     
      }
    });
  }

  refuser(r: Reservation) {
    const u = this.auth.currentUser();
    if (!u) return;
    this.rezSvc.refuser(r.id, u.compteId).subscribe({
      next: () => this.reservationsEnAttente.update(arr => arr.filter(x => x.id !== r.id)),
      error: err => {
        console.error('Erreur lors du refus de la réservation', err);     
      }
    });
  }

  demarrer(t: Trajet) {
    const u = this.auth.currentUser();
    if (!u) return;
    this.trajetSvc.demarrer(t.id, u.compteId).subscribe({
      next: updated => this.mesTrajets.update(arr => arr.map(x => x.id === t.id ? updated : x))
    });
  }

  terminer(t: Trajet) {
    const u = this.auth.currentUser();
    if (!u) return;
    this.trajetSvc.terminer(t.id, u.compteId).subscribe({
      next: updated => this.mesTrajets.update(arr => arr.map(x => x.id === t.id ? updated : x))
    });
  }

  annuler(t: Trajet) {
    const u = this.auth.currentUser();
    if (!u) return;
    this.trajetSvc.annuler(t.id, u.compteId).subscribe({
      next: () => this.mesTrajets.update(arr => arr.map(x => x.id === t.id ? {...x, statut: 'ANNULE' as any} : x))
    });
  }

  getBadgeTrajet(s: string) {
    return { 'PLANIFIE': 'badge badge-info', 'EN_COURS': 'badge badge-success',
      'TERMINE': 'badge badge-muted', 'ANNULE': 'badge badge-danger' }[s] || 'badge badge-muted';
  }
}
