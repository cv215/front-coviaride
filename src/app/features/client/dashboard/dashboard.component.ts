import { Component, OnInit, inject, signal } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';
import { environment } from '../../../../environments/environment';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ReservationService } from '../../../core/services/reservation.service';
import { PortefeuilleService } from '../../../core/services/portefeuille.service';
import { UtilisateurService } from '../../../core/services/utilisateur.service';
import { Reservation, Portefeuille, Utilisateur, Trajet } from '../../../core/models';
import { shareReplay } from 'rxjs';
import { TrajetService } from '../../../core/services/trajet.service';
import { HttpClient } from '@angular/common/http';

/**
 * Palier de fidélité "Gold" utilisé pour calculer la progression de la barre.
 * ⚠️ À adapter si votre back-end expose déjà ce seuil (ex: /fidelite/paliers).
 */
const SEUIL_PALIER_GOLD = 3000;

@Component({
  selector: 'app-client-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
<div class="dashboard-page">

  <!-- En-tête de page (salutation + date du jour) -->
  <div class="page-header">
    <h6 class="page-title">Bonjour, {{ prenomUtilisateur() }}</h6>
    <p class="page-date">{{ aujourdHui | date:'EEEE d MMMM yyyy':'':'fr-FR' }}</p>
  </div>

  <!-- Course en cours / confirmée (données réelles de la réservation) -->
  @if (courseEnCours(); as course) {
    <div class="card course-en-cours">
      <div class="course-header">
        <div class="course-status">
          <span class="pulse-dot"></span>
          {{ course.embarque ? 'Course en cours' : 'Course confirmée' }}
        </div>
        <div class="course-ref">{{ course.reference }}</div>
      </div>

      <div class="course-body">
        <div class="chauffeur-info">
          <div class="chauffeur-avatar">{{ course.chauffeurNom.charAt(0) }}</div>
          <div>
            <div class="chauffeur-nom">{{ course.chauffeurNom }}</div>
            @if (course.chauffeurNote) {
              <div class="chauffeur-meta"><span>★ {{ course.chauffeurNote }}</span></div>
            }
            <div class="chauffeur-vehicule">{{ course.places }} place(s) réservée(s)</div>
          </div>
        </div>

        <div class="course-trajet">
          <div class="trajet-point">
            <span class="dot dot-gold"></span>
            <span>{{ course.adresseDepart }}</span>
          </div>
          <div class="trajet-point">
            <span class="dot dot-red"></span>
            <span>{{ course.adresseArrivee }}</span>
          </div>
          <div class="trajet-prix">
            <span>{{ course.embarque ? 'À bord' : 'En attente du départ' }}</span>
            <span class="prix">{{ course.prix | number:'1.0-0':'fr' }} FCFA</span>
          </div>
        </div>
      </div>

      <div class="course-actions">
        <button class="btn-gold btn-full" (click)="appelerChauffeur(course)" [disabled]="appelEnCours()">
          {{ appelEnCours() ? 'Recherche du numéro…' : 'Appeler le chauffeur' }}
        </button>
        <button class="btn-ghost btn-full" [routerLink]="['/client/suivi', course.trajetId]">Suivre en direct</button>
        <button class="btn-ghost btn-full" routerLink="/client/historique">{{ course.embarque ? 'Confirmer mon arrivée' : 'Confirmer mon embarquement' }}</button>
      </div>
    </div>
  }

  <!-- Statistiques réelles de l'utilisateur -->
  <div class="stats-grid">
    <div class="stat-card">
      <div style="color:yellow;">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-ev-front" viewBox="0 0 16 16">
         <path d="M9.354 4.243a.19.19 0 0 0-.085-.218.186.186 0 0 0-.23.034L6.051 7.246a.188.188 0 0 0 .136.316h1.241l-.673 2.195a.19.19 0 0 0 .085.218c.075.043.17.03.23-.034l2.88-3.187a.188.188 0 0 0-.137-.316H8.572z"/>
         <path d="M4.819 2A2.5 2.5 0 0 0 2.52 3.515l-.792 1.848a.8.8 0 0 1-.38.404c-.5.25-.855.715-.965 1.262L.05 8.708a2.5 2.5 0 0 0-.049.49v.413c0 .814.39 1.543 1 1.997V13.5a.5.5 0 0 0 .5.5h2a.5.5 0 0 0 .5-.5v-1.338c1.292.048 2.745.088 4 .088s2.708-.04 4-.088V13.5a.5.5 0 0 0 .5.5h2a.5.5 0 0 0 .5-.5v-1.892c.61-.454 1-1.183 1-1.997v-.413q0-.248-.049-.49l-.335-1.68a1.8 1.8 0 0 0-.964-1.261.8.8 0 0 1-.381-.404l-.792-1.848A2.5 2.5 0 0 0 11.181 2H4.82ZM3.44 3.91A1.5 1.5 0 0 1 4.82 3h6.362a1.5 1.5 0 0 1 1.379.91l.792 1.847a1.8 1.8 0 0 0 .853.904c.222.112.381.32.43.564l.336 1.679q.03.146.029.294v.413a1.48 1.48 0 0 1-1.408 1.484c-1.555.07-3.786.155-5.592.155s-4.037-.084-5.592-.155A1.48 1.48 0 0 1 1 9.611v-.413q0-.148.03-.294l.335-1.68a.8.8 0 0 1 .43-.563c.383-.19.685-.511.853-.904z"/>
        </svg>
      </div>
      <div class="stat-info">
        <div class="value" style="color: white;">{{ statsClient().nombreCourses }}</div>
        <div class="label">courses • ce mois</div>
      </div>
    </div>
    <div class="stat-card">
      <div style="color:blue;">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-person-walking" viewBox="0 0 16 16">
         <path d="M9.5 1.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0M6.44 3.752A.75.75 0 0 1 7 3.5h1.445c.742 0 1.32.643 1.243 1.38l-.43 4.083a1.8 1.8 0 0 1-.088.395l-.318.906.213.242a.8.8 0 0 1 .114.175l2 4.25a.75.75 0 1 1-1.357.638l-1.956-4.154-1.68-1.921A.75.75 0 0 1 6 8.96l.138-2.613-.435.489-.464 2.786a.75.75 0 1 1-1.48-.246l.5-3a.75.75 0 0 1 .18-.375l2-2.25Z"/>
         <path d="M6.25 11.745v-1.418l1.204 1.375.261.524a.8.8 0 0 1-.12.231l-2.5 3.25a.75.75 0 1 1-1.19-.914zm4.22-4.215-.494-.494.205-1.843.006-.067 1.124 1.124h1.44a.75.75 0 0 1 0 1.5H11a.75.75 0 0 1-.531-.22Z"/>
        </svg>
      </div>
      <div class="stat-info">
        <div class="value" style="color: white;">{{ statsClient().kmParcourus | number:'1.0-0':'fr' }}</div>
        <div class="label">km • parcourus</div>
      </div>
    </div>
    <div class="stat-card">
      <div style="color:green;">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-wallet-fill" viewBox="0 0 16 16">
         <path d="M1.5 2A1.5 1.5 0 0 0 0 3.5v2h6a.5.5 0 0 1 .5.5c0 .253.08.644.306.958.207.288.557.542 1.194.542s.987-.254 1.194-.542C9.42 6.644 9.5 6.253 9.5 6a.5.5 0 0 1 .5-.5h6v-2A1.5 1.5 0 0 0 14.5 2z"/>
         <path d="M16 6.5h-5.551a2.7 2.7 0 0 1-.443 1.042C9.613 8.088 8.963 8.5 8 8.5s-1.613-.412-2.006-.958A2.7 2.7 0 0 1 5.551 6.5H0v6A1.5 1.5 0 0 0 1.5 14h13a1.5 1.5 0 0 0 1.5-1.5z"/>
        </svg>
      </div>
      <div class="stat-info">
        <div class="value" style="color: white;">{{ statsClient().solde | number:'1.0-0':'fr' }} FCFA</div>
        <div class="label">solde • disponible</div>
      </div>
    </div>
    <div class="stat-card">
      <div style="color:yellow;">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-person-add" viewBox="0 0 16 16">
         <path d="M12.5 16a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7m.5-5v1h1a.5.5 0 0 1 0 1h-1v1a.5.5 0 0 1-1 0v-1h-1a.5.5 0 0 1 0-1h1v-1a.5.5 0 0 1 1 0m-2-6a3 3 0 1 1-6 0 3 3 0 0 1 6 0M8 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4"/>
         <path d="M8.256 14a4.5 4.5 0 0 1-.229-1.004H3c.001-.246.154-.986.832-1.664C4.484 10.68 5.711 10 8 10q.39 0 .74.025c.226-.341.496-.65.804-.918Q8.844 9.002 8 9c-5 0-6 3-6 4s1 1 1 1z"/>
        </svg>
      </div>
      <div class="stat-info">
        <div class="value" style="color: white;">{{ statsClient().nombreParraines | number:'1.0-0':'fr' }}</div>
        <div class="label">personnes parrainées</div>
      </div>
    </div>
  </div>

  <!-- Nouvelle réservation + Fidélité (gauche) / Réservations à venir (droite) -->
  <div class="dashboard-layout">

    <div class="left-column">

      <div class="card programme-fidelite">
        <div class="fidelite-header">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z"/></svg>
          Programme fidélité
        </div>
        <div class="fidelite-points">{{ statsClient().pointsFidelite | number:'1.0-0':'fr' }} pts</div>
        <div class="fidelite-sub">{{ pointsRestantsPalierGold() | number:'1.0-0':'fr' }} pts jusqu'au statut Gold</div>
        <div class="fidelite-bar-track">
          <div class="fidelite-bar-fill" [style.width.%]="progressionPalier()"></div>
        </div>
        <div class="fidelite-paliers">
          <span>Silver</span>
          <span>Gold</span>
        </div>
      </div>

    </div>

    <div class="card reservations-a-venir">
      <div class="card-header-row">
        <h3 class="card-title">Réservations à venir</h3>
        <a routerLink="/client/historique" class="link-gold">Voir tout</a>
      </div>
      <div class="card-body">
        @for (rez of reservationsAVenir(); track rez.id) {
          <div class="reservation-item">
            <div class="reservation-left">
              <div class="reservation-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>
              </div>
              <div>
                <div class="reservation-date">{{ formaterDateReservation(rez) }}</div>
                <div class="reservation-meta">{{ rez.villeDepart || 'Trajet #' + rez.trajetId }}{{ rez.villeArrivee ? ' → ' + rez.villeArrivee : '' }} • {{ rez.nombrePlaces }} place(s) • <span [class]="'statut statut-' + rez.statut">{{ rez.statut === 'ACCEPTEE' ? 'Confirmée' : 'En attente' }}</span></div>
              </div>
            </div>
            <div class="reservation-prix">{{ montantReservation(rez) | number:'1.0-0':'fr' }} FCFA</div>
          </div>
        } @empty {
          <p class="empty-state">Aucune réservation à venir.</p>
        }
      </div>
    </div>
  </div>

  <!-- Historique des courses -->
  <div class="card historique">
    <div class="card-header-row">
      <h3 class="card-title">Historique des courses</h3>
      <a routerLink="/client/historique" class="link-gold">Tout voir</a>
    </div>
    <div class="card-body">
      @for (rez of historiqueRecent(); track rez.id) {
        <div class="reservation-item">
          <div class="reservation-left">
            <div class="reservation-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-ev-front" viewBox="0 0 16 16">
               <path d="M9.354 4.243a.19.19 0 0 0-.085-.218.186.186 0 0 0-.23.034L6.051 7.246a.188.188 0 0 0 .136.316h1.241l-.673 2.195a.19.19 0 0 0 .085.218c.075.043.17.03.23-.034l2.88-3.187a.188.188 0 0 0-.137-.316H8.572z"/>
               <path d="M4.819 2A2.5 2.5 0 0 0 2.52 3.515l-.792 1.848a.8.8 0 0 1-.38.404c-.5.25-.855.715-.965 1.262L.05 8.708a2.5 2.5 0 0 0-.049.49v.413c0 .814.39 1.543 1 1.997V13.5a.5.5 0 0 0 .5.5h2a.5.5 0 0 0 .5-.5v-1.338c1.292.048 2.745.088 4 .088s2.708-.04 4-.088V13.5a.5.5 0 0 0 .5.5h2a.5.5 0 0 0 .5-.5v-1.892c.61-.454 1-1.183 1-1.997v-.413q0-.248-.049-.49l-.335-1.68a1.8 1.8 0 0 0-.964-1.261.8.8 0 0 1-.381-.404l-.792-1.848A2.5 2.5 0 0 0 11.181 2H4.82ZM3.44 3.91A1.5 1.5 0 0 1 4.82 3h6.362a1.5 1.5 0 0 1 1.379.91l.792 1.847a1.8 1.8 0 0 0 .853.904c.222.112.381.32.43.564l.336 1.679q.03.146.029.294v.413a1.48 1.48 0 0 1-1.408 1.484c-1.555.07-3.786.155-5.592.155s-4.037-.084-5.592-.155A1.48 1.48 0 0 1 1 9.611v-.413q0-.148.03-.294l.335-1.68a.8.8 0 0 1 .43-.563c.383-.19.685-.511.853-.904z"/>
              </svg>
            </div>
            <div>
              <div class="reservation-date">{{ formaterDateReservation(rez) }}</div>
              <div class="reservation-meta">{{ rez.villeDepart }} → {{ rez.villeArrivee }} • <span [class]="'statut statut-' + rez.statut">{{ rez.statut === 'TERMINEE' ? 'Terminée' : rez.statut === 'REFUSEE' ? 'Refusée' : 'Annulée' }}</span></div>
            </div>
          </div>
          <div class="reservation-prix">{{ montantReservation(rez) | number:'1.0-0':'fr' }} FCFA</div>
        </div>
      } @empty {
        <p class="empty-state">Aucune course terminée pour le moment.</p>
      }
    </div>
  </div>

</div>
  `,
  styles: [`
    :host {
      --color-card: rgba(20, 24, 31, 0.82);
      --color-card-alt: rgba(23, 28, 36, 0.8);
      --color-border: rgba(212, 169, 76, 0.18);
      --color-border-strong: rgba(212, 169, 76, 0.45);
      --color-gold: #d7b15a;
      --color-gold-soft: #d9b76c;
      --color-red: #d85b56;
      --color-text: #eef1f8;
      --color-text-muted: #aeb6c2;
      display: block;
      color: var(--color-text);
    }

    .dashboard-page { max-width: 1400px; }

    .page-header { margin-bottom: 1.6rem; }
    .page-title { margin: 0; font-size: clamp(1rem, 2vw, 2rem); }
    .page-date { margin: 0.25rem 0 0; color: var(--color-text-muted); text-transform: capitalize; }
    .value{color: white;}

    .btn-gold {
      background: var(--color-gold); color: #101720; border: none; border-radius: 999px;
      font-weight: 700; padding: 0.8rem 1.4rem; display: flex; align-items: center; gap: 0.4rem;
      justify-content: center; cursor: pointer;
    }
    .btn-ghost {
      background: rgba(255,255,255,0.09); border: 1px solid rgba(255,255,255,0.11); color: var(--color-text);
      border-radius: 999px; padding: 0.8rem 1.4rem; cursor: pointer;
    }
    .btn-full { width: 100%; }

    .card {
      background: var(--color-card);
      border: 1px solid var(--color-border);
      border-radius: 16px;
    }

    /* Course en cours */
    .course-en-cours { padding: 1.5rem 1.5rem 1.75rem; border: 1px solid var(--color-border-strong); margin-bottom: 2rem; }
    .course-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .course-status { display: flex; align-items: center; gap: 0.7rem; color: var(--color-gold-soft); font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.8rem; }
    .pulse-dot { width: 11px; height: 11px; border-radius: 50%; background: var(--color-gold); display: inline-block; }
    .course-ref { font-weight: 500; color: #d8dce5; }
    .course-body { display: grid; grid-template-columns: 1.2fr 1fr; gap: 2rem; align-items: center; }
    .chauffeur-info { display: flex; align-items: center; gap: 1rem; }
    .chauffeur-avatar {
      width: 70px; height: 70px; border-radius: 50%;
      background: linear-gradient(135deg, #e5d1a7, #8c6b2a);
      display: flex; align-items: center; justify-content: center; color: #0e1728; font-weight: 800; font-size: 1.3rem;
    }
    .chauffeur-nom { font-size: 2rem; font-weight: 700; color: #f0eadf; margin-bottom: 0.35rem; }
    .chauffeur-meta { display: flex; align-items: center; gap: 0.5rem; color: var(--color-gold-soft); font-size: 1rem; }
    .chauffeur-meta .sep { color: var(--color-text-muted); }
    .chauffeur-vehicule { margin-top: 0.4rem; color: #d4d8df; font-size: 0.95rem; }
    .chauffeur-plaque { color: #b9c2cf; font-size: 0.92rem; }
    .course-trajet { display: grid; gap: 1rem; }
    .eta-row { display: flex; align-items: center; gap: 1rem; font-size: 1.1rem; }
    .eta-value { font-size: 2.5rem; font-weight: 800; color: #f3e7c8; line-height: 1; }
    .eta-label { color: #dfe5ee; }
    .trajet-point { display: flex; align-items: center; gap: 0.9rem; font-size: 1.1rem; }
    .dot { width: 11px; height: 11px; border-radius: 50%; display: inline-block; }
    .dot-gold { background: var(--color-gold); }
    .dot-red { background: var(--color-red); }
    .trajet-prix { display: flex; align-items: center; gap: 0.5rem; font-size: 1.2rem; }
    .trajet-prix .prix { color: var(--color-gold); font-weight: 700; }
    .course-actions { display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 1rem; margin-top: 2rem; }

    /* Stats grid */
    .stats-grid { display: grid; grid-template-columns: repeat(4, minmax(170px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .stat-card {
      background: var(--color-card); border: 1px solid var(--color-border); border-radius: 16px;
      padding: 1.2rem; display: flex; flex-direction: column; align-items: flex-start; justify-content: space-between; gap: 12px;
    }
    .stat-card .value { font-size: 1.7rem; font-weight: 700; }
    .stat-card .label { color: var(--color-text-muted); font-size: 0.85rem; }
    .stat-icon { color: yellow; }
    .stat-icon svg { width: 22px; height: 22px; }

    /* Layout gauche/droite */
    .dashboard-layout { display: grid; grid-template-columns: 1fr 1.2fr; gap: 1.5rem; margin-bottom: 2rem; align-items: start; }
    .left-column { display: grid; gap: 1.5rem; }

    .card-title { margin: 0; font-size: 1.4rem; }
    .card-header-row { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.3rem; border-bottom: 1px solid var(--color-border); }
    .card-body { padding: 1rem 1.3rem; }
    .link-gold { color: var(--color-gold); text-decoration: none; font-weight: 700; }

    /* Nouvelle réservation */
    .nouvelle-reservation { padding: 1.3rem; }
    .quick-tabs { display: flex; gap: 0.6rem; margin: 1rem 0; }
    .quick-tab {
      flex: 1; display: flex; align-items: center; justify-content: center; gap: 0.4rem;
      padding: 0.6rem; border-radius: 10px; background: rgba(255,255,255,0.05);
      border: 1px solid var(--color-border); color: var(--color-text-muted); cursor: pointer; font-weight: 600;
    }
    .quick-tab svg { width: 16px; height: 16px; }
    .quick-tab.active { background: rgba(212,169,76,0.15); color: var(--color-gold); border-color: var(--color-border-strong); }
    .input-pill {
      display: flex; align-items: center; gap: 0.7rem;
      background: rgba(255,255,255,0.05); border: 1px solid var(--color-border);
      border-radius: 12px; padding: 0.85rem 1rem; margin-bottom: 0.8rem;
    }
    .input-pill input {
      background: transparent; border: none; outline: none; color: var(--color-text);
      font-size: 0.95rem; width: 100%;
    }
    .input-pill input::placeholder { color: var(--color-text-muted); }

    /* Fidélité */
    .programme-fidelite { padding: 1.3rem; }
    .fidelite-header { display: flex; align-items: center; gap: 0.5rem; color: var(--color-gold); font-weight: 700; margin-bottom: 0.8rem; }
    .fidelite-points { font-size: 2.1rem; font-weight: 800; font-family: Georgia, serif; }
    .fidelite-sub { color: var(--color-text-muted); margin-bottom: 0.9rem; }
    .fidelite-bar-track { height: 8px; border-radius: 999px; background: rgba(255,255,255,0.08); overflow: hidden; }
    .fidelite-bar-fill { height: 100%; background: var(--color-gold); border-radius: 999px; }
    .fidelite-paliers { display: flex; justify-content: space-between; margin-top: 0.5rem; color: var(--color-text-muted); font-size: 0.9rem; }

    /* Listes réservations / historique */
    .reservations-a-venir, .historique { padding: 0; overflow: hidden; }
    .historique { margin-top: 0; }
    .reservation-item {
      display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap;
      background: var(--color-card-alt); border: 1px solid rgba(212,169,76,0.2);
      border-radius: 14px; padding: 1rem 1.2rem; margin-bottom: 0.8rem;
    }
    .reservation-left { display: flex; align-items: center; gap: 0.8rem; }
    .reservation-icon {
      width: 42px; height: 42px; border-radius: 12px; background: rgba(255,255,255,0.06);
      display: flex; align-items: center; justify-content: center; color: var(--color-gold);
    }
    .reservation-icon svg { width: 20px; height: 20px; }
    .reservation-date { font-weight: 700; font-size: 1.05rem; }
    .reservation-meta { color: var(--color-text-muted); font-size: 0.95rem; }
    .reservation-prix { font-weight: 700; font-size: 1.6rem; color: #e7edf5; }
    .empty-state { color: var(--color-text-muted); text-align: center; padding: 1rem 0; }
    .statut { font-weight: 700; }
    .statut-ACCEPTEE, .statut-TERMINEE { color: #6ee7b7; }
    .statut-EN_ATTENTE { color: #fcd34d; }
    .statut-ANNULEE, .statut-REFUSEE { color: #fca5a5; }
    .course-actions { display: grid; grid-template-columns: repeat(3, 1fr); gap: .6rem; }
    @media (max-width: 700px) { .course-actions { grid-template-columns: 1fr; } }

    @media (max-width: 960px) {
      .dashboard-layout { grid-template-columns: 1fr; }
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
      .course-body { grid-template-columns: 1fr; }
    }
  `]
})
export class ClientDashboardComponent implements OnInit {
  loading = signal(true);
  reservations = signal<Reservation[]>([]);
  portefeuille = signal<Portefeuille | null>(null);
  utilisateur = signal<Utilisateur | null>(null);
  searched          = signal(false);
  trajets           = signal<Trajet[]>([]);
  trajetSelectionne = signal<Trajet | null>(null);
  chauffeur         = signal<any>(null);
  chargementChauffeur = signal(false);
  avis              = signal<any[]>([]);
  aReserve          = signal(false);
  rezLoading        = signal(false);
  rezSuccess        = signal('');
  rezError          = signal('');
  showChat          = signal(false);
  chatMessages      = signal<any[]>([]);
  offreChauffeur    = signal<number | null>(null);
  messageChat       = '';
  prixNegocié       = signal<number | null>(null);
  selectedStop      = signal<string | null>(null);
  today             = new Date().toISOString().split('T')[0];

  searchForm = this.fb.group({
    villeDepart:  ['', Validators.required],
    villeArrivee: ['', Validators.required],
    date:         [this.today, Validators.required],
    nbPlaces:     ['1']
  });

  // Champs "Nouvelle réservation"
  adresseDepart = '';
  adresseDestination = '';

  // Course active affichée en haut (null si aucune course en cours)
  courseEnCours = signal<CourseEnCours | null>(null);
  appelEnCours = signal(false);
  private toast = inject(ToastService);

  aujourdHui: Date = new Date();
  

  constructor(
    private auth: AuthService,
    private rezSvc: ReservationService,
    private walletSvc: PortefeuilleService,
    private utilisateurSvc: UtilisateurService,
    private trajetSvc: TrajetService,
    private router: Router,
    private http: HttpClient,
    private fb: FormBuilder,
  ) {}

  ngOnInit() {
    const user = this.auth.currentUser();
    if (!user) return;
    
    this.utilisateurSvc.getProfil(user.compteId).subscribe({
      next: u => this.utilisateur.set(u),
      error: () => this.utilisateur.set(null)
    });

    // Portefeuille (solde, points de fidélité)
    const wallet$ = this.walletSvc.get(user.compteId).pipe(shareReplay(1));
    wallet$.subscribe({
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

    // Réservations de l'utilisateur (sert à calculer courses, km,
    // "réservations à venir" et "historique")
    this.rezSvc.getMesReservations(user.compteId).subscribe({
      next: p => {
        this.reservations.set(p.content);
        this.loading.set(false);

        // ⚠️ Si votre back-end expose un endpoint dédié pour la course
        // actuellement en cours (ex: GET /reservations/en-cours), remplacez
        // cette ligne par un appel à ce service. À défaut on la déduit ici
        // de la première réservation "ACCEPTEE".
        const actives = p.content.filter(r => r.statut === 'ACCEPTEE');
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

  // ---------- Identité / affichage ----------

  prenomUtilisateur(): string {
    const u = this.utilisateur();
    return u?.prenom ?? u?.nom ?? 'Client';
  }

  // ---------- Statistiques réelles ----------

  /**
   * Calcule les statistiques du client à partir de ses réservations réelles
   * et de son portefeuille. Toutes les valeurs sont dérivées des données
   * chargées depuis le back-end (aucune valeur figée en dur).
   */
  statsClient() {
    const toutes = this.reservations();
    const terminees = toutes.filter(r => r.statut === 'TERMINEE');
    const maintenant = new Date();
    const nombreCourses = terminees.filter(r => {
      const d = new Date(r.dateArrivee ?? r.dateReservation);
      return d.getMonth() === maintenant.getMonth() && d.getFullYear() === maintenant.getFullYear();
    }).length;

    // ⚠️ Le modèle Reservation fourni n'exposait pas la distance ni le prix
    // du trajet : on suppose ici un objet `trajet` imbriqué avec
    // `distanceKm` et `prix`. Adaptez ces accès selon votre API réelle.
    const kmParcourus = terminees.reduce(
      (total, r: any) => total + (r.trajet?.distanceKm ?? 0), 0
    );

    // Solde disponible du passager, tel que renvoyé par le portefeuille.
    const solde = this.portefeuille()?.soldeDisponible ?? 0;
    const devise = this.portefeuille()?.devise ?? 'XAF';

    // ⚠️ Nombre de personnes parrainées : suppose que UtilisateurService
    // renvoie ce champ sur le profil. À défaut, câblez un appel dédié
    // (ex: ParrainageService.compter(user.compteId)).
    const nombreParraines = (this.utilisateur() as any)?.nombreParraines ?? 0;

    const pointsFidelite = (this.portefeuille() as any)?.pointsFidelite ?? 0;

    return { nombreCourses, kmParcourus, solde, devise, nombreParraines, pointsFidelite };
  }

  pointsRestantsPalierGold(): number {
    const restants = SEUIL_PALIER_GOLD - this.statsClient().pointsFidelite;
    return restants > 0 ? restants : 0;
  }

  progressionPalier(): number {
    const pct = (this.statsClient().pointsFidelite / SEUIL_PALIER_GOLD) * 100;
    return Math.min(100, Math.max(0, pct));
  }

  // ---------- Réservations ----------

  reservationsAVenir(): Reservation[] {
    return this.reservations()
      .filter(r => ['EN_ATTENTE', 'ACCEPTEE'].includes(r.statut))
      .slice(0, 2);
  }

  historiqueRecent(): Reservation[] {
    return this.reservations()
      .filter(r => ['TERMINEE', 'ANNULEE', 'REFUSEE'].includes(r.statut))
      .slice(0, 3);
  }

  montantReservation(rez: any): number {
    return Number(rez.montantTotal ?? (rez.prixParPlace ? rez.prixParPlace * rez.nombrePlaces : 0));
  }

  formaterDateReservation(rez: any): string {
    if (rez.dateReservation) {
      return new Date(rez.dateReservation).toLocaleString('fr-FR', {
        weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
      });
    }
    return rez.statut === 'EN_ATTENTE' ? 'En attente de confirmation' : '—';
  }

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

  // ---------- Actions ----------

  chercherChauffeur() {
    if (this.searchForm.invalid) return;
    this.loading.set(true);
    this.searched.set(false);
    const v = this.searchForm.value;

    this.trajetSvc.rechercher(
      v.villeDepart!, v.villeArrivee!,
      v.date!, +v.nbPlaces!
    ).subscribe({
      next: p => {
        const triés = [...p.content].sort((a, b) => {
          if (a.placesDisponibles !== b.placesDisponibles) {
            return a.placesDisponibles - b.placesDisponibles;
          }
          return a.heureDepart.localeCompare(b.heureDepart);
        });
        this.trajets.set(triés);
        this.searched.set(true);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
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
          this.router.navigate(['/client/messages']);
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
