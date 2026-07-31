import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { ReservationService } from '../../../core/services/reservation.service';
import { Reservation } from '../../../core/models';
import { environment } from '../../../../environments/environment.prod';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule],
  template: `
<div>
  <h2 style="margin-bottom:0.5rem">Historique des courses</h2>
  <p style="margin-bottom:2rem">Toutes vos courses passées</p>

  @if (loading()) {
    <div style="text-align:center;padding:3rem;color:var(--color-muted)">Chargement...</div>
  } @else if (reservations().length === 0) {
    <div class="card" style="text-align:center;padding:3rem">
      <p>Aucune course dans votre historique</p>
    </div>
  } @else {
    <div class="card" style="padding:0;overflow:hidden">
      <table class="data-table">
        <thead><tr>
          <th>Course</th><th>Date</th><th>Statut</th><th>Places</th><th>Actions</th>
        </tr></thead>
        <tbody>
          @for (r of reservations(); track r.id) {
            <tr>
              <td>Trajet #{{ r.trajetId }}</td>
              <td>{{ r.dateReservation | date:'dd/MM/yyyy HH:mm' }}</td>
              <td><span class="badge" [class]="getBadge(r.statut)">{{ r.statut }}</span></td>
              <td>{{ r.nombrePlaces }}</td>
              <td>
                @if (r.statut === 'TERMINEE') {
                  <button class="btn btn-outline btn-sm" (click)="demanderRemboursement(r)">
                    Remboursement
                  </button>
                }
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  }
</div>`
})
export class HistoryComponent implements OnInit {
  loading = signal(true);
  reservations = signal<Reservation[]>([]);

  constructor(private auth: AuthService, 
    private rezSvc: ReservationService,
    private http: HttpClient) {}

  ngOnInit() {
    const u = this.auth.currentUser();
    if (!u) return;
    this.rezSvc.getMesReservations(u.compteId).subscribe({
      next: p => { this.reservations.set(p.content); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  getBadge(s: string) {
    return { 'TERMINEE': 'badge badge-success', 'ANNULEE': 'badge badge-muted',
      'REFUSEE': 'badge badge-danger', 'EN_ATTENTE': 'badge badge-warning',
      'ACCEPTEE': 'badge badge-info' }[s] || 'badge badge-muted';
  }

  demanderRemboursement(r: Reservation) {
    const motif = prompt('Motif du remboursement :');
    if (!motif) return;
    
    this.http.post(`${environment.apiUrl}/paiements/${r.paiementId}/remboursement`,
      { motif }).subscribe({
      next: () => alert('Demande envoyée. La plateforme traitera votre requête sous 48h.'),
      error: () => alert('Erreur lors de la demande')
    });
  }
}