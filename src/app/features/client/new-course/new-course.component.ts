import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { TrajetService } from '../../../core/services/trajet.service';
import { ReservationService } from '../../../core/services/reservation.service';
import { AuthService } from '../../../core/services/auth.service';
import { Trajet } from '../../../core/models';

@Component({
  selector: 'app-new-course',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
<div>
  <div style="margin-bottom:2rem">
    <a routerLink="/client/dashboard" style="color:var(--color-muted);text-decoration:none;font-size:0.9rem">
      ← Retour au tableau de bord
    </a>
    <h2 style="margin-top:0.5rem">Nouvelle course</h2>
    <p>Recherchez un trajet disponible</p>
  </div>

  <!-- SEARCH FORM -->
  <div class="card" style="max-width:600px;margin-bottom:2rem">
    <form [formGroup]="searchForm" (ngSubmit)="rechercher()">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem">
        <div class="form-group">
          <label>Adresse de départ</label>
          <div class="input">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            <input type="text" placeholder="Ville de départ" formControlName="villeDepart"/>
          </div>
        </div>
        <div class="form-group">
          <label>Destination</label>
          <div class="input">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            <input type="text" placeholder="Destination" formControlName="villeArrivee"/>
          </div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem">
        <div class="form-group">
          <label>Date</label>
          <input type="date" class="field" formControlName="date" [min]="today"/>
        </div>
        <div class="form-group">
          <label>Nombre de places</label>
          <select class="field" formControlName="nbPlaces">
            <option value="1">1 place</option>
            <option value="2">2 places</option>
            <option value="3">3 places</option>
            <option value="4">4 places</option>
          </select>
        </div>
      </div>
      <button type="submit" class="btn btn-primary btn-full" [disabled]="loading()">
        {{ loading() ? 'Recherche...' : 'Trouver un chauffeur →' }}
      </button>
    </form>
  </div>

  <!-- RESULTS -->
  @if (searched()) {
    <div>
      <h3 style="margin-bottom:1rem">
        {{ trajets().length }} trajet(s) disponible(s)
      </h3>

      @if (trajets().length === 0) {
        <div class="card" style="text-align:center;padding:3rem">
          <p>Aucun trajet trouvé pour ces critères. Essayez d'autres dates ou villes.</p>
        </div>
      } @else {
        <div style="display:flex;flex-direction:column;gap:1rem">
          @for (t of trajets(); track t.id) {
            <div class="card card-elevated" style="cursor:pointer"
              [style.border-color]="selectedTrajet()?.id===t.id ? 'var(--color-primary)' : ''"
              (click)="selectedTrajet.set(t)">
              <div style="display:flex;justify-content:space-between;align-items:flex-start">
                <div>
                  <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.75rem">
                    <div style="display:flex;align-items:center;gap:0.5rem">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;color:var(--color-accent)">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                      </svg>
                      <span style="font-weight:600">{{ t.villeDepart }}</span>
                    </div>
                    <span style="color:var(--color-muted)">→</span>
                    <div style="display:flex;align-items:center;gap:0.5rem">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;color:var(--color-primary)">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                      </svg>
                      <span style="font-weight:600">{{ t.villeArrivee }}</span>
                    </div>
                  </div>
                  <div style="display:flex;gap:1.5rem;font-size:0.85rem;color:var(--color-muted)">
                    <span> {{ t.dateDepart }}</span>
                    <span> {{ t.heureDepart }}</span>
                    <span> {{ t.placesDisponibles }} place(s) dispo</span>
                  </div>
                </div>
                <div style="text-align:right">
                  <div style="font-size:1.5rem;font-weight:800">{{ t.prixParPlace | number:'1.0-0' }} XAF</div>
                  <div style="font-size:0.8rem;color:var(--color-muted)">par place</div>
                </div>
              </div>
              @if (selectedTrajet()?.id === t.id) {
                <div style="margin-top:1rem;padding-top:1rem;border-top:1px solid var(--color-border)">
                  <button class="btn btn-primary" (click)="reserver(t)">
                    Réserver ce trajet →
                  </button>
                </div>
              }
            </div>
          }
        </div>
      }
    </div>
  }

  @if (success()) {
    <div class="alert alert-success" style="margin-top:1rem">{{ success() }}</div>
  }
  @if (error()) {
    <div class="alert alert-error" style="margin-top:1rem">{{ error() }}</div>
  }
</div>
  `
})
export class NewCourseComponent {
  loading = signal(false);
  searched = signal(false);
  trajets = signal<Trajet[]>([]);
  selectedTrajet = signal<Trajet | null>(null);
  success = signal('');
  error = signal('');
  today = new Date().toISOString().split('T')[0];

  searchForm = this.fb.group({
    villeDepart: ['', Validators.required],
    villeArrivee: ['', Validators.required],
    date: [this.today, Validators.required],
    nbPlaces: ['1']
  });

  constructor(
    private fb: FormBuilder,
    private trajetSvc: TrajetService,
    private rezSvc: ReservationService,
    private auth: AuthService,
    private router: Router
  ) {}

  rechercher() {
    if (this.searchForm.invalid) return;
    this.loading.set(true);
    const v = this.searchForm.value;
    this.trajetSvc.rechercher(v.villeDepart!, v.villeArrivee!, v.date!, +v.nbPlaces!).subscribe({
      next: p => {
        this.trajets.set(p.content);
        this.searched.set(true);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  reserver(t: Trajet) {
    const user = this.auth.currentUser();
    if (!user) return;
    this.rezSvc.reserver(user.compteId, t.id, t.chauffeurId, +this.searchForm.value.nbPlaces!).subscribe({
      next: () => {
        this.success.set('Réservation créée ! En attente de confirmation du chauffeur.');
        setTimeout(() => this.router.navigate(['/client/dashboard']), 2000);
      },
      error: err => this.error.set(err.error?.message || 'Erreur lors de la réservation')
    });
  }
}
