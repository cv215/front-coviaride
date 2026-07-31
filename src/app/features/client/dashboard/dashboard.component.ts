import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ReservationService } from '../../../core/services/reservation.service';
import { PortefeuilleService } from '../../../core/services/portefeuille.service';
import { Reservation, Portefeuille } from '../../../core/models';
import { shareReplay } from 'rxjs';

@Component({
  selector: 'app-client-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
<div>
  <div style="margin-bottom:2rem">
    <h2>Tableau de bord</h2>
    <p>Gérez vos courses en temps réel</p>
  </div>

  <!-- STATS -->
  <div class="stats-grid" style="margin-bottom:2rem">
    <div class="stat-card">
      <div class="stat-info">
        <div class="value">{{ totalCourses() }}</div>
        <div class="label">Courses totales</div>
      </div>
      <div class="stat-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="1" y="3" width="15" height="13"/>
          <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
          <circle cx="5.5" cy="18.5" r="2.5"/>
          <circle cx="18.5" cy="18.5" r="2.5"/>
        </svg>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-info">
        <div class="value">{{ portefeuille()?.soldeDisponible | number:'1.0-0' }} XAF</div>
        <div class="label">Solde disponible</div>
      </div>
      <div class="stat-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="1" x2="12" y2="23"/>
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
        </svg>
      </div>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 320px;gap:1.5rem;align-items:start">
    <!-- COURSES ACTIVES -->
    <div>
      <div style="display:flex;gap:1rem;margin-bottom:1.25rem">
        <button class="btn btn-sm" [class.btn-primary]="activeTab()==='actives'"
          [class.btn-outline]="activeTab()!=='actives'" (click)="activeTab.set('actives')">
          Courses actives
        </button>
        <button routerLink="/client/historique" class="btn btn-sm" [class.btn-primary]="activeTab()==='historique'"
          [class.btn-outline]="activeTab()!=='historique'" (click)="activeTab.set('historique')">
          Historique
        </button>
      </div>

      @if (loading()) {
        <div style="text-align:center;padding:3rem;color:var(--color-muted)">Chargement...</div>
      } @else if (reservations().length === 0) {
        <div class="card" style="text-align:center;padding:3rem">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
            style="width:48px;height:48px;color:var(--color-muted);margin:0 auto 1rem;display:block">
            <rect x="1" y="3" width="15" height="13"/>
            <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
            <circle cx="5.5" cy="18.5" r="2.5"/>
            <circle cx="18.5" cy="18.5" r="2.5"/>
          </svg>
          <p>Aucune course en cours</p>
          <a routerLink="/client/nouvelle-course" class="btn btn-primary btn-sm" style="margin-top:1rem">
            Nouvelle course
          </a>
        </div>
      } @else {
        @for (rez of filteredReservations(); track rez.id) {
          <div class="course-card" style="margin-bottom:1rem">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem">
              <div style="display:flex;align-items:center;gap:0.5rem">
                <span class="dot dot-green dot-pulse"></span>
                <strong>Course en cours</strong>
              </div>
              <span style="font-size:0.85rem;color:var(--color-muted)">Arrivée estimée: 12 min</span>
            </div>
            <div class="route">
              <div class="point">
                <div>
                  <div class="dot-label">Départ</div>
                  <div class="addr">Trajet #{{ rez.trajetId }}</div>
                </div>
              </div>
            </div>
            <div class="driver-row" style="margin-top:1rem">
              <div class="driver">
                <div class="d-avatar">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:20px">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                </div>
                <div class="d-info">
                  <div class="name">Chauffeur #{{ rez.chauffeurId }}</div>
                  <div class="vehicle">{{ rez.nombrePlaces }} place(s)</div>
                </div>
              </div>
              <span class="badge" [class]="getBadgeClass(rez.statut)">{{ rez.statut }}</span>
            </div>
            <div style="display:flex;gap:0.75rem;margin-top:1rem">
              @if (rez.statut === 'ACCEPTEE' && !rez.embarquementConfirme) {
                <button class="btn btn-success btn-sm" (click)="confirmerEmbarquement(rez)">
                  ✓ Confirmer embarquement
                </button>
              }
              @if (rez.embarquementConfirme && !rez.arriveeConfirmee) {
                <button class="btn btn-primary btn-sm" (click)="confirmerArrivee(rez)">
                  ✓ Confirmer arrivée
                </button>
              }
              <a [routerLink]="['/client/suivi', rez.trajetId]" class="btn btn-outline btn-sm">
                Suivre en direct →
              </a>
            </div>
          </div>
        }
      }
    </div>

    <!-- ACTIONS RAPIDES -->
    <div style="display:flex;flex-direction:column;gap:1rem">
      <div class="card">
        <h4 style="margin-bottom:1rem">Actions rapides</h4>
        <div style="display:flex;flex-direction:column;gap:0.5rem">
          <a routerLink="/client/nouvelle-course" class="btn btn-primary btn-full">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px">
              <rect x="1" y="3" width="15" height="13"/>
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
              <circle cx="5.5" cy="18.5" r="2.5"/>
              <circle cx="18.5" cy="18.5" r="2.5"/>
            </svg>
            Nouvelle course
          </a>
          <a routerLink="/client/chauffeurs" class="btn btn-outline btn-full">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
            </svg>
            Chauffeurs dispo
          </a>
          <button class="btn btn-outline btn-full" (click)="logout()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Déconnexion
          </button>
        </div>
      </div>

      <!-- PARRAINAGE -->
<div class="card"
  style="background:var(--color-primary);
  color:white;border-color:var(--color-primary)">
  <h4 style="color:white;margin-bottom:0.5rem">
    Parrainez un ami
  </h4>
  <p style="color:rgba(255,255,255,0.7);
    font-size:0.85rem;margin-bottom:0.5rem">
    Gagnez 100 XAF par personne inscrite
  </p>

  @if (codeParrainage()) {
    <!-- Afficher le code -->
    <div style="background:rgba(255,255,255,0.15);
      border-radius:8px;padding:0.75rem;
      margin-bottom:0.75rem;text-align:center">
      <div style="font-size:0.75rem;
        color:rgba(255,255,255,0.6);margin-bottom:0.25rem">
        Votre code
      </div>
      <div style="font-size:1.4rem;font-weight:800;
        letter-spacing:0.1em;color:white">
        {{ codeParrainage() }}
      </div>
    </div>
    <!-- Bouton copier -->
    <button class="btn btn-sm btn-full"
      style="background:rgba(255,255,255,0.2);
      color:white;border:1px solid rgba(255,255,255,0.3)"
      (click)="copierCode()">
      {{ codeCopie() ? '✓ Code copié !' : 'Copier le code' }}
    </button>
  } @else {
    <div style="text-align:center;
      color:rgba(255,255,255,0.5);font-size:0.85rem">
      Connectez-vous pour voir votre code
    </div>
  }
</div>
    </div>
  </div>
</div>
  `
})
export class ClientDashboardComponent implements OnInit {
  loading = signal(true);
  reservations = signal<Reservation[]>([]);
  portefeuille = signal<Portefeuille | null>(null);
  totalCourses = signal(0);
  activeTab = signal<'actives'|'historique'>('actives');
  codeParrainage = signal('');
  codeCopie = signal(false);

  constructor(
    private auth: AuthService,
    private rezSvc: ReservationService,
    private walletSvc: PortefeuilleService
  ) {}

  ngOnInit() {
    const userData = localStorage.getItem('ce_user');
    if (userData){
      const user = JSON.parse(userData);
      if (user.codeParrainage){
        this.codeParrainage.set(user.codeParrainage);
      }
    }
    const user = this.auth.currentUser();
    if (!user) return;

    const wallet$ = this.walletSvc.get(user.compteId).pipe(
      shareReplay(1)
    );
    wallet$.subscribe({
      next: w => this.portefeuille.set(w),
      error: () => {}
    });
    
    this.rezSvc.getMesReservations(user.compteId).subscribe({
      next: p => {
        this.reservations.set(p.content);
        this.totalCourses.set(p.totalElements);
        this.loading.set(false);
      },
      error: () => {
        this.reservations.set([]);
        this.loading.set(false);
      }
    });
    this.walletSvc.get(user.compteId).subscribe({
      next: w => this.portefeuille.set(w),
      error: () => {
        this.portefeuille.set({
          id: 0,
          utilisateurId: user.compteId,
          soldeDisponible: 0,
          soldeBloque: 0,
          devise: 'XAF',
          dateCreation: new Date().toISOString()
        });
      }
    });
  }

  filteredReservations(): Reservation[] {
    const all = this.reservations();
    if (this.activeTab() === 'actives') {
      return all.filter(r => ['EN_ATTENTE','ACCEPTEE'].includes(r.statut));
    }
    return all.filter(r => ['TERMINEE','ANNULEE','REFUSEE'].includes(r.statut));
  }

  getBadgeClass(statut: string): string {
    const map: Record<string,string> = {
      'EN_ATTENTE': 'badge badge-warning',
      'ACCEPTEE':   'badge badge-success',
      'REFUSEE':    'badge badge-danger',
      'ANNULEE':    'badge badge-muted',
      'TERMINEE':   'badge badge-info'
    };
    return map[statut] || 'badge badge-muted';
  }

  confirmerEmbarquement(rez: Reservation) {
    const user = this.auth.currentUser();
    if (!user) return;
    this.rezSvc.confirmerEmbarquement(rez.id, user.compteId, 5000).subscribe({
      next: updated => {
        const idx = this.reservations().findIndex(r => r.id === rez.id);
        if (idx !== -1) {
          const arr = [...this.reservations()];
          arr[idx] = updated;
          this.reservations.set(arr);
        }
      }
    });
  }

  confirmerArrivee(rez: Reservation) {
    const user = this.auth.currentUser();
    if (!user) return;
    this.rezSvc.confirmerArrivee(rez.id, user.compteId, 5000).subscribe({
      next: updated => {
        const idx = this.reservations().findIndex(r => r.id === rez.id);
        if (idx !== -1) {
          const arr = [...this.reservations()];
          arr[idx] = updated;
          this.reservations.set(arr);
        }
      }
    });
  }

  logout() { this.auth.deconnexion(); }

  copierCode(){
    const code = this.codeParrainage();
    if (!code) return;

    navigator.clipboard.writeText(code).then(() =>{
      this.codeCopie.set(true);
      setTimeout(() => this.codeCopie.set(false), 2500);
    }).catch(() => {
      const el = document.createElement('textarea');
      el.value = code;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      this.codeCopie.set(true);
      setTimeout(() => this.codeCopie.set(false), 2500);
    });
  }
}
