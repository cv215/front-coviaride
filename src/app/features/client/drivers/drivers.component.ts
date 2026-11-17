import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { UtilisateurService } from '../../../core/services/utilisateur.service';
import { Utilisateur } from '../../../core/models';

@Component({
  selector: 'app-drivers',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
<div>
  <div style="margin-bottom:2rem">
    <h2>Chauffeurs disponibles</h2>
    <p>Professionnels vérifiés et évalués</p>
  </div>

  @if (loading()) {
    <div class="driver-loading-grid">
      @for (_ of [1,2,3,4,5,6]; track $index) {
        <div class="driver-card">
          <div class="driver-photo" style="background:var(--color-bg);animation:pulse 1.5s infinite"></div>
          <div class="driver-info">
            <div style="height:1rem;background:var(--color-bg);border-radius:4px;margin-bottom:0.5rem"></div>
            <div style="height:0.75rem;background:var(--color-bg);border-radius:4px;width:60%"></div>
          </div>
        </div>
      }
    </div>
  } @else {
    <div class="driver-list-grid">
      @for (d of chauffeurs(); track d.id) {
        <div class="driver-card" (click)="selectedDriver.set(d)">
          <div class="driver-photo">
            @if (d.photo) {
              <img [src]="d.photo" [alt]="d.nom"/>
            } @else {
              <div style="height:100%;display:flex;align-items:center;justify-content:center;background:var(--color-bg)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="width:48px;height:48px;color:var(--color-muted)">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
            }
            <span class="avail-badge badge badge-success">Disponible</span>
          </div>
          <div class="driver-info">
            <div class="driver-name">
              <span>{{ d.prenom }} {{ d.nom }}</span>
              <span style="display:flex;align-items:center;gap:0.25rem">
                <span style="color:#F59E0B">★</span>
                {{ d.noteMoyenne | number:'1.1-1' }}
              </span>
            </div>
            <div class="driver-vehicle">
              @if (d.vehicules && d.vehicules.length > 0) {
                {{ d.vehicules[0].marque }} {{ d.vehicules[0].modele }}
              } @else { Véhicule non renseigné }
            </div>
            <div class="driver-stats">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px">
                <rect x="1" y="3" width="15" height="13"/>
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
                <circle cx="5.5" cy="18.5" r="2.5"/>
                <circle cx="18.5" cy="18.5" r="2.5"/>
              </svg>
              {{ d.nombreAvis }} courses
            </div>
          </div>
        </div>
      }
    </div>
  }

  <!-- DRIVER DETAIL MODAL -->
  @if (selectedDriver()) {
    <div style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:200;display:flex;align-items:center;justify-content:center;padding:1rem"
      (click)="selectedDriver.set(null)">
      <div class="card" style="max-width:420px;width:100%;max-height:80vh;overflow-y:auto" (click)="$event.stopPropagation()">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem">
          <h3>Profil chauffeur</h3>
          <button class="btn btn-ghost btn-sm" (click)="selectedDriver.set(null)">✕</button>
        </div>
        <div style="text-align:center;margin-bottom:1.5rem">
          <div style="width:80px;height:80px;border-radius:50%;background:var(--color-bg);margin:0 auto 1rem;display:flex;align-items:center;justify-content:center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:36px;color:var(--color-muted)">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <h3>{{ selectedDriver()?.prenom }} {{ selectedDriver()?.nom }}</h3>
          <div style="display:flex;align-items:center;justify-content:center;gap:0.25rem;color:#F59E0B;font-size:1.1rem;font-weight:700">
            ★ {{ selectedDriver()?.noteMoyenne | number:'1.1-1' }}
            <span style="color:var(--color-muted);font-size:0.85rem;font-weight:400">({{ selectedDriver()?.nombreAvis }} avis)</span>
          </div>
        </div>
        <div class="operator-grid" style="margin-bottom:1.5rem">
          <div class="stat-card" style="padding:1rem">
            <div class="stat-info"><div class="value" style="font-size:1.25rem">{{ selectedDriver()?.nombreAvis }}</div><div class="label">Courses</div></div>
          </div>
          <div class="stat-card" style="padding:1rem">
            <div class="stat-info"><div class="value" style="font-size:1.25rem">{{ selectedDriver()?.noteMoyenne | number:'1.1-1' }}</div><div class="label">Note</div></div>
          </div>
        </div>
        @if (selectedDriver()?.vehicules?.length) {
          <div style="margin-bottom:1rem">
            <p style="font-size:0.8rem;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:var(--color-muted);margin-bottom:0.5rem">Véhicule</p>
            <div class="card" style="padding:0.75rem;background:var(--color-bg)">
              <strong>{{ selectedDriver()?.vehicules![0].marque }} {{ selectedDriver()?.vehicules![0].modele }}</strong>
              <div style="font-size:0.85rem;color:var(--color-muted)">{{ selectedDriver()?.vehicules![0].couleur }} · {{ selectedDriver()?.vehicules![0].nombrePlaces }} places</div>
            </div>
          </div>
        }
        <a routerLink="/client/nouvelle-course" class="btn btn-primary btn-full" (click)="selectedDriver.set(null)">
          Réserver avec ce chauffeur →
        </a>
      </div>
    </div>
  }
</div>
  `
})
export class DriversComponent implements OnInit {
  loading = signal(true);
  chauffeurs = signal<Utilisateur[]>([]);
  selectedDriver = signal<Utilisateur | null>(null);

  constructor(private userSvc: UtilisateurService) {}

  ngOnInit() {
    this.userSvc.getChauffeursDisponibles(0).subscribe({
      next: (p: any) => {
        this.chauffeurs.set(p.content || p);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }
}
