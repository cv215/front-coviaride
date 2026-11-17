import { ToastService, fcfa, messageErreur } from '../../../core/services/toast.service';
import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { TrajetService } from '../../../core/services/trajet.service';
import { ReservationService } from '../../../core/services/reservation.service';
import { AuthService } from '../../../core/services/auth.service';
import { Trajet } from '../../../core/models';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-new-course',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule,
            FormsModule, RouterLink],
  template: `
<div class="page">
  <a routerLink="/client/dashboard" class="back-link">
    ← Retour
  </a>
  <h2 class="title">Nouvelle course</h2>
  <p class="subtitle">Trouvez un trajet disponible</p>

  <!-- FORMULAIRE RECHERCHE -->
  <div class="card search-card">
    <h3 class="card-title">Nouvelle course</h3>
    <form [formGroup]="searchForm" (ngSubmit)="rechercher()">

      <div class="input-pill">
        <span class="dot dot-gold"></span>
        <input type="text" formControlName="villeDepart"
          placeholder="Ville de départ"/>
      </div>

      <div class="input-pill">
        <span class="pin-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
            fill="currentColor" viewBox="0 0 16 16">
            <path d="M12.166 8.94c-.524 1.062-1.234 2.12-1.96 3.07A32 32 0 0 1 8 14.58a32 32 0 0 1-2.206-2.57c-.726-.95-1.436-2.008-1.96-3.07C3.304 7.867 3 6.862 3 6a5 5 0 0 1 10 0c0 .862-.305 1.867-.834 2.94M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10"/>
            <path d="M8 8a2 2 0 1 1 0-4 2 2 0 0 1 0 4m0 1a3 3 0 1 0 0-6 3 3 0 0 0 0 6"/>
          </svg>
        </span>
        <input type="text" formControlName="villeArrivee"
          placeholder="Ville de destination"/>
      </div>

      <div class="pill-row">
        <div class="input-pill" style="margin-bottom:0">
          <span style="opacity:.7">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-calendar" viewBox="0 0 16 16">
             <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5M1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4z"/>
            </svg>
          </span>
          <input type="date" formControlName="date" [min]="today"/>
        </div>
        <div class="input-pill" style="margin-bottom:0">
          <span style="opacity:.7"></span>
          <select formControlName="nbPlaces">
            <option value="1">1 place</option>
            <option value="2">2 places</option>
            <option value="3">3 places</option>
            <option value="4">4 places</option>
          </select>
        </div>
      </div>

      <button type="submit" class="btn-gold btn-full" style="margin-top:1rem"
        [disabled]="loading()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2" style="width:16px;height:16px;">
          <circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/>
        </svg>
        {{ loading() ? 'Recherche...' : 'Trouver un chauffeur' }}
      </button>
    </form>
  </div>

  <!-- RÉSULTATS -->
  @if (searched()) {
    <div>
      <h3 class="section-title">
        {{ trajets().length }} trajet(s) trouvé(s)
      </h3>

      @if (trajets().length === 0) {
        <div class="card empty-state">
          <div style="font-size:3rem;margin-bottom:1rem">🔍</div>
          <p>Aucun trajet disponible pour ces critères.</p>
        </div>
      } @else {
        <div style="display:flex;flex-direction:column;gap:1rem">
          @for (t of trajets(); track t.id) {
            <div class="card result-card">
              <!-- LIGNE PRINCIPALE -->
              <div class="trajet-header">
                <div>
                  <div class="trajet-route">
                    <span>{{ t.villeDepart }}</span>
                    <span style="color:var(--muted)">→</span>
                    <span>{{ t.villeArrivee }}</span>
                  </div>
                  <div class="trajet-meta">
                    <span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-calendar" viewBox="0 0 16 16">
                        <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5M1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4z"/>
                      </svg>
                      {{ t.dateDepart }}
                    </span>
                    <span> 
                      {{ t.heureDepart }}
                    </span>
                    <span> {{ t.placesDisponibles }} place(s)</span>
                  </div>
                </div>
                <div style="text-align:right">
                  <div class="price">
                    {{ t.prixParPlace | number:'1.0-0' }} XAF
                  </div>
                  <div class="price-label">par place</div>
                </div>
              </div>

              <!-- BOUTON VOIR PLUS -->
              @if (trajetSelectionne()?.id !== t.id) {
                <button class="btn-outline-gold" (click)="voirPlus(t)">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-eye-fill" viewBox="0 0 16 16">
                    <path d="M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0"/>
                    <path d="M0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8m8 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7"/>
                  </svg>
                   Voir le chauffeur →
                </button>
              }

              <!-- DÉTAIL CHAUFFEUR -->
              @if (trajetSelectionne()?.id === t.id) {
                <div class="driver-detail">

                  @if (chargementChauffeur()) {
                    <div style="text-align:center;padding:1.5rem;color:var(--muted)">
                      Chargement du profil chauffeur...
                    </div>
                  } @else if (chauffeur()) {

                    <div style="display:flex;gap:1.25rem;align-items:flex-start;margin-bottom:1.5rem">

                      <!-- AVATAR -->
                      <div class="avatar">
                        {{ chauffeur()!.prenom?.charAt(0) }}{{ chauffeur()!.nom?.charAt(0) }}
                      </div>

                      <!-- INFOS CHAUFFEUR -->
                      <div style="flex:1">
                        <div style="font-size:1.1rem;font-weight:700;margin-bottom:0.35rem">
                          {{ chauffeur()!.prenom }} {{ chauffeur()!.nom }}
                        </div>

                        <!-- ÉTOILES -->
                        <div style="display:flex;align-items:center;gap:0.35rem;margin-bottom:0.5rem">
                          @for (i of [1,2,3,4,5]; track i) {
                            <span style="font-size:1.1rem"
                              [style.opacity]="i <= (chauffeur()!.noteMoyenne || 0) ? '1' : '0.25'">
                              ⭐
                            </span>
                          }
                          <span style="font-size:0.85rem;color:var(--muted);margin-left:0.25rem">
                            {{ chauffeur()!.noteMoyenne | number:'1.1-1' }}/5
                          </span>
                        </div>

                        <!-- STATS -->
                        <div style="display:flex;gap:1.25rem;align-items:center;font-size:0.85rem;color:var(--muted)">
                          <span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-taxi-front-fill" viewBox="0 0 16 16">
                             <path d="M6 1a1 1 0 0 0-1 1v1h-.181A2.5 2.5 0 0 0 2.52 4.515l-.792 1.848a.8.8 0 0 1-.38.404c-.5.25-.855.715-.965 1.262L.05 9.708a2.5 2.5 0 0 0-.049.49v.413c0 .814.39 1.543 1 1.997V14.5a.5.5 0 0 0 .5.5h2a.5.5 0 0 0 .5-.5v-1.338c1.292.048 2.745.088 4 .088s2.708-.04 4-.088V14.5a.5.5 0 0 0 .5.5h2a.5.5 0 0 0 .5-.5v-1.892c.61-.454 1-1.183 1-1.997v-.413q0-.248-.049-.49l-.335-1.68a1.8 1.8 0 0 0-.964-1.261.8.8 0 0 1-.381-.404l-.792-1.848A2.5 2.5 0 0 0 11.181 3H11V2a1 1 0 0 0-1-1zM4.309 4h7.382a.5.5 0 0 1 .447.276l.956 1.913a.51.51 0 0 1-.497.731c-.91-.073-3.35-.17-4.597-.17s-3.688.097-4.597.17a.51.51 0 0 1-.497-.731l.956-1.913A.5.5 0 0 1 4.309 4M4 10a1 1 0 1 1-2 0 1 1 0 0 1 2 0m10 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0m-9 0a1 1 0 0 1 1-1h4a1 1 0 1 1 0 2H6a1 1 0 0 1-1-1"/>
                            </svg>
                             {{ chauffeur()!.nombreAvis || 0 }} courses
                            </span>
                          <span class="badge badge-verified">● Chauffeur vérifié</span>
                        </div>

                        <!-- TÉLÉPHONE -->
                        <div class="phone-box">
                          <div style="font-size:0.78rem;color:var(--muted);margin-bottom:0.25rem">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-telephone-inbound" viewBox="0 0 16 16">
                             <path d="M15.854.146a.5.5 0 0 1 0 .708L11.707 5H14.5a.5.5 0 0 1 0 1h-4a.5.5 0 0 1-.5-.5v-4a.5.5 0 0 1 1 0v2.793L15.146.146a.5.5 0 0 1 .708 0m-12.2 1.182a.678.678 0 0 0-1.015-.063L1.605 2.3c-.483.484-.661 1.169-.45 1.77a17.6 17.6 0 0 0 4.168 6.608 17.6 17.6 0 0 0 6.608 4.168c.601.211 1.286.033 1.77-.45l1.034-1.034a.678.678 0 0 0-.063-1.015l-2.307-1.794a.68.68 0 0 0-.58-.122l-2.19.547a1.75 1.75 0 0 1-1.657-.459L5.482 8.062a1.75 1.75 0 0 1-.46-1.657l.548-2.19a.68.68 0 0 0-.122-.58zM1.884.511a1.745 1.745 0 0 1 2.612.163L6.29 2.98c.329.423.445.974.315 1.494l-.547 2.19a.68.68 0 0 0 .178.643l2.457 2.457a.68.68 0 0 0 .644.178l2.189-.547a1.75 1.75 0 0 1 1.494.315l2.306 1.794c.829.645.905 1.87.163 2.611l-1.034 1.034c-.74.74-1.846 1.065-2.877.702a18.6 18.6 0 0 1-7.01-4.42 18.6 18.6 0 0 1-4.42-7.009c-.362-1.03-.037-2.137.703-2.877z"/>
                            </svg>
                                Numéro de téléphone
                          </div> 
                          @if (aReserve()) {
                            <div style="font-size:1rem;font-weight:700;color:var(--gold)">
                              {{ chauffeur()!.telephone }}
                            </div>
                            <div style="font-size:0.75rem;color:var(--success);margin-top:0.2rem">
                              ✓ Visible car vous avez réservé
                            </div>
                          } @else {
                            <div style="display:flex;align-items:center;gap:0.5rem;color:var(--muted)">
                              <span style="font-size:1rem;letter-spacing:0.15em">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-bag-plus-fill" viewBox="0 0 16 16">
                                  <path fill-rule="evenodd" d="M10.5 3.5a2.5 2.5 0 0 0-5 0V4h5zm1 0V4H15v10a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V4h3.5v-.5a3.5 3.5 0 1 1 7 0M8.5 8a.5.5 0 0 0-1 0v1.5H6a.5.5 0 0 0 0 1h1.5V12a.5.5 0 0 0 1 0v-1.5H10a.5.5 0 0 0 0-1H8.5z"/>
                                </svg>
                                 6XX XXX XXX</span>
                              <span style="font-size:0.75rem">(visible après réservation)</span>
                            </div>
                          }
                        </div>
                      </div>
                    </div>

                    @if (t.pointsArret) {
                      <div class="stops-box">
                        <div class="stops-label">Arrêts facultatifs</div>
                        <div style="display:flex;flex-wrap:wrap;gap:0.5rem;align-items:center">
                          @for (stop of getStops(t.pointsArret); track stop.nom) {
                            <button type="button"
                              [class]="selectedStop() === stop.nom ? 'btn-gold' : 'btn-outline-gold'"
                              style="padding:0.5rem 0.9rem;font-size:0.82rem"
                              (click)="selectedStop.set(stop.nom)">
                              {{ stop.nom }} — {{ stop.prix | number:'1.0-0' }} XAF
                            </button>
                          }
                        </div>
                        @if (selectedStop()) {
                          <div style="margin-top:0.6rem;font-size:0.8rem;color:var(--muted)">
                            Arrêt sélectionné : <strong style="color:var(--text)">{{ selectedStop() }}</strong>
                            @if (getStopPrice(t, selectedStop()) !== null) {
                              — prix segment : <strong style="color:var(--text)">{{ getStopPrice(t, selectedStop()) ?? 0 | number:'1.0-0' }} XAF</strong>
                            }
                          </div>
                        }
                      </div>
                    }

                    <!-- AVIS ANCIENS CLIENTS -->
                    @if (avis().length > 0) {
                      <div style="margin-bottom:1.5rem">
                        <div class="stops-label">Avis des clients</div>
                        <div style="display:flex;flex-direction:column;gap:0.5rem">
                          @for (a of avis().slice(0, 3); track a.id) {
                            <div class="review-item">
                              <div style="display:flex;justify-content:space-between;margin-bottom:0.3rem">
                                <span style="font-size:0.85rem;font-weight:600">Passager anonyme</span>
                                <span style="font-size:0.8rem;color:var(--gold)">
                                  @for (i of getEtoiles(a.note); track i) { ⭐ }
                                </span>
                              </div>
                              @if (a.commentaire) {
                                <div style="font-size:0.82rem;color:var(--muted);font-style:italic">
                                  "{{ a.commentaire }}"
                                </div>
                              }
                            </div>
                          }
                        </div>
                      </div>
                    } @else {
                      <div style="margin-bottom:1.5rem;font-size:0.85rem;color:var(--muted);font-style:italic">
                        Aucun avis pour ce chauffeur pour l'instant.
                      </div>
                    }

                    <!-- CHAT NÉGOCIATION -->
                    @if (showChat()) {
                      <div class="chat-box">
                        <div class="chat-header">
                          <span>💬 Négocier le prix avec le chauffeur</span>
                          <button (click)="showChat.set(false)" class="chat-close">✕</button>
                        </div>

                        <div class="chat-messages">
                          @for (msg of chatMessages(); track msg.id) {
                            <div [style.align-self]="msg.moi ? 'flex-end' : 'flex-start'" style="max-width:75%">
                              <div class="bubble" [class.bubble-mine]="msg.moi" [class.bubble-theirs]="!msg.moi">
                                {{ msg.contenu }}
                              </div>
                              <div class="bubble-time" [style.text-align]="msg.moi ? 'right' : 'left'">
                                {{ msg.heure }}
                              </div>
                            </div>
                          }

                          @if (offreChauffeur()) {
                            <div style="align-self:flex-start;max-width:85%">
                              <div class="offer-box">
                                <div class="offer-label">🏷️ Offre du chauffeur</div>
                                <div class="offer-amount">{{ offreChauffeur() | number:'1.0-0' }} XAF</div>
                                <div class="offer-original">(Prix original : {{ t.prixParPlace | number:'1.0-0' }} XAF)</div>
                                <div style="display:flex;gap:0.5rem;margin-top:0.75rem">
                                  <button class="btn-success-dark" (click)="accepterOffre(t)">
                                    ✓ Accepter et réserver
                                  </button>
                                  <button class="btn-outline-gold" style="padding:0.55rem 1rem;font-size:0.82rem"
                                    (click)="offreChauffeur.set(null)">
                                    Refuser
                                  </button>
                                </div>
                              </div>
                            </div>
                          }
                        </div>

                        <div class="chat-input-row">
                          <input type="text" class="chat-input"
                            [(ngModel)]="messageChat"
                            placeholder="Ex: Pouvez-vous faire 3 000 XAF ?"
                            (keyup.enter)="envoyerMessage(t)"/>
                          <button class="btn-gold" style="padding:0.6rem 1.2rem;font-size:0.85rem"
                            (click)="envoyerMessage(t)"
                            [disabled]="!messageChat.trim()">
                            Envoyer
                          </button>
                        </div>
                      </div>
                    }

                    <!-- BOUTONS ACTION -->
                    <div style="display:flex;gap:0.75rem;flex-wrap:wrap;align-items:center">
                      <button class="btn-gold" (click)="reserver(t)" [disabled]="rezLoading()">
                        @if (rezLoading()) { Réservation... }
                        @else { 🎫 Réserver — {{ getPrixReservation(t) | number:'1.0-0' }} XAF }
                      </button>

                      @if (!showChat()) {
                        <button class="btn-outline-gold" (click)="ouvrirChat(t)">
                          💬 Négocier le prix
                        </button>
                      }

                      <button class="btn-ghost-dark" (click)="trajetSelectionne.set(null)">
                        ← Retour
                      </button>
                    </div>

                    <!-- MESSAGES RETOUR -->
                    @if (rezSuccess()) {
                      <div class="alert-success-dark">
                        ✓ {{ rezSuccess() }}
                        @if (aReserve() && chauffeur()?.telephone) {
                          <div style="margin-top:0.5rem;font-weight:700">
                            📞 Chauffeur : {{ chauffeur()!.telephone }}
                          </div>
                        }
                      </div>
                    }
                    @if (rezError()) {
                      <div class="alert-error-dark">{{ rezError() }}</div>
                    }
                  }
                </div>
              }
            </div>
          }
        </div>
      }
    </div>
  }
</div>
  `,
  styles: [`
    :host {
      display: block;
      --bg: #0a0a0c;
      --surface: #131316;
      --surface-2: #1b1b1f;
      --border: #26262b;
      --gold: #d9a441;
      --text: #f2f2f0;
      --muted: #9a9ba6;
      --success: #34d399;
      --success-bg: rgba(52,211,153,0.12);
      --success-border: rgba(52,211,153,0.35);
      --danger: #f87171;
      --danger-bg: rgba(248,113,113,0.1);
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      color: var(--text);
    }

    .page { background: var(--bg); padding: 2rem 0; min-height: 100%; }

    .back-link {
      color: var(--muted); text-decoration: none; font-size: 0.9rem;
      display: block; margin-bottom: 1rem;
    }
    .back-link:hover { color: var(--gold); }

    .title {
      font-family: 'Playfair Display', Georgia, serif;
      font-weight: 700; font-size: 1.9rem;
      margin: 0 0 0.25rem 0; color: var(--text);
    }
    .subtitle { color: var(--muted); margin-bottom: 2rem; }
    .card-title { font-weight: 700; font-size: 1.05rem; margin-bottom: 1.1rem; color: var(--text); }
    .section-title { font-weight: 700; font-size: 1.05rem; margin-bottom: 1rem; color: var(--text); }

    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 1.5rem;
    }
    .search-card { max-width: 640px; margin-bottom: 2rem; }
    .empty-state { text-align: center; padding: 3rem; }

    .input-pill {
      display: flex; align-items: center; gap: 0.65rem;
      background: var(--surface-2); border: 1px solid var(--border);
      border-radius: 999px; padding: 0.75rem 1.1rem; margin-bottom: 0.75rem;
    }
    .input-pill input, .input-pill select {
      background: transparent; border: none; outline: none;
      color: var(--text); width: 100%; font-size: 0.92rem;
    }
    .input-pill input::placeholder { color: var(--muted); }
    .input-pill select option { background: var(--surface-2); color: var(--text); }

    .dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .dot-gold { background: var(--gold); }
    .pin-icon { color: #ef4444; display: flex; }

    .pill-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }

    .btn-gold {
      background: var(--gold); color: #0a0a0c; border: none;
      border-radius: 999px; padding: 0.85rem 1.5rem;
      font-weight: 700; font-size: 0.95rem; cursor: pointer;
      display: flex; align-items: center; justify-content: center; gap: 0.5rem;
      transition: opacity .15s;
    }
    .btn-gold:hover { opacity: 0.88; }
    .btn-gold:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-full { width: 100%; }

    .btn-outline-gold {
      background: transparent; border: 1px solid var(--gold); color: var(--gold);
      border-radius: 999px; padding: 0.6rem 1.15rem; font-size: 0.85rem;
      font-weight: 600; cursor: pointer; transition: background .15s;
    }
    .btn-outline-gold:hover { background: rgba(217,164,65,0.1); }

    .btn-ghost-dark {
      background: transparent; border: none; color: var(--muted);
      font-size: 0.85rem; cursor: pointer; padding: 0.6rem 0.9rem;
    }
    .btn-ghost-dark:hover { color: var(--text); }

    .btn-success-dark {
      background: var(--success); color: #06251a; border: none;
      border-radius: 999px; padding: 0.55rem 1rem; font-weight: 700;
      font-size: 0.82rem; cursor: pointer;
    }

    .badge {
      display: inline-flex; align-items: center; padding: 0.25rem 0.65rem;
      border-radius: 999px; font-size: 0.75rem; font-weight: 600;
    }
    .badge-verified { background: var(--success-bg); color: var(--success); border: 1px solid var(--success-border); }

    .result-card { margin-bottom: 0; }
    .trajet-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; }
    .trajet-route { display: flex; align-items: center; gap: 0.75rem; font-size: 1.05rem; font-weight: 700; margin-bottom: 0.5rem; }
    .trajet-meta { font-size: 0.85rem; color: var(--muted); display: flex; gap: 1.25rem; flex-wrap: wrap; }
    .price { font-size: 1.5rem; font-weight: 800; color: var(--text); }
    .price-label { font-size: 0.78rem; color: var(--muted); }

    .driver-detail { border-top: 1px solid var(--border); padding-top: 1.25rem; margin-top: 1rem; }

    .avatar {
      width: 72px; height: 72px; border-radius: 50%;
      background: linear-gradient(135deg, var(--gold), #8a6a1f);
      display: flex; align-items: center; justify-content: center;
      font-size: 1.4rem; font-weight: 800; color: #0a0a0c; flex-shrink: 0;
    }

    .phone-box {
      margin-top: 0.75rem; padding: 0.75rem;
      background: var(--surface-2); border-radius: 10px; border: 1px solid var(--border);
    }

    .stops-box {
      margin: 1rem 0; border: 1px solid var(--border);
      border-radius: 12px; background: var(--surface-2); padding: 0.9rem;
    }
    .stops-label {
      font-size: 0.75rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.05em; color: var(--muted); margin-bottom: 0.6rem;
    }

    .review-item {
      background: var(--surface-2); border-radius: 10px;
      padding: 0.75rem; border: 1px solid var(--border);
    }

    .chat-box { border: 1px solid var(--border); border-radius: 14px; margin-bottom: 1.25rem; overflow: hidden; }
    .chat-header {
      background: var(--gold); color: #0a0a0c; padding: 0.75rem 1rem;
      display: flex; justify-content: space-between; align-items: center;
      font-weight: 700; font-size: 0.9rem;
    }
    .chat-close { background: none; border: none; color: #0a0a0c; cursor: pointer; font-size: 1.1rem; }
    .chat-messages {
      height: 200px; overflow-y: auto; padding: 1rem;
      background: var(--bg); display: flex; flex-direction: column; gap: 0.5rem;
    }
    .bubble { padding: 0.5rem 0.75rem; border-radius: 12px; font-size: 0.875rem; }
    .bubble-mine { background: var(--gold); color: #0a0a0c; }
    .bubble-theirs { background: var(--surface-2); color: var(--text); border: 1px solid var(--border); }
    .bubble-time { font-size: 0.68rem; color: var(--muted); margin-top: 0.15rem; padding: 0 0.25rem; }

    .offer-box {
      background: var(--success-bg); border: 1px solid var(--success-border);
      border-radius: 12px; padding: 0.75rem 1rem;
    }
    .offer-label { font-size: 0.78rem; color: var(--success); font-weight: 600; margin-bottom: 0.4rem; }
    .offer-amount { font-size: 1rem; font-weight: 800; color: var(--text); }
    .offer-original { font-size: 0.75rem; color: var(--muted); }

    .chat-input-row {
      padding: 0.75rem; border-top: 1px solid var(--border);
      display: flex; gap: 0.5rem; background: var(--surface);
    }
    .chat-input {
      flex: 1; background: var(--surface-2); border: 1px solid var(--border);
      border-radius: 999px; padding: 0.6rem 1rem; color: var(--text);
      font-size: 0.875rem; outline: none;
    }

    .alert-success-dark {
      margin-top: 1rem; background: var(--success-bg); border: 1px solid var(--success-border);
      color: var(--success); padding: 0.85rem 1rem; border-radius: 10px; font-size: 0.88rem;
    }
    .alert-error-dark {
      margin-top: 1rem; background: var(--danger-bg); border: 1px solid rgba(248,113,113,0.35);
      color: var(--danger); padding: 0.85rem 1rem; border-radius: 10px; font-size: 0.88rem;
    }
  `]
})
export class NewCourseComponent implements OnInit {
  private toast = inject(ToastService);

  loading           = signal(false);
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

  constructor(
    private fb: FormBuilder,
    private trajetSvc: TrajetService,
    private rezSvc: ReservationService,
    private auth: AuthService,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit() {}

  rechercher() {
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

  voirPlus(t: Trajet) {
    this.trajetSelectionne.set(t);
    this.selectedStop.set(null);
    this.aReserve.set(false);
    this.rezSuccess.set('');
    this.rezError.set('');
    this.showChat.set(false);
    this.chatMessages.set([]);
    this.offreChauffeur.set(null);
    this.chargerChauffeur(t.chauffeurId);
  }

  chargerChauffeur(chauffeurId: number) {
    this.chargementChauffeur.set(true);
    this.http.get<any>(
      `${environment.apiUrl}/utilisateurs/profil/${chauffeurId}`
    ).subscribe({
      next: c => {
        this.chauffeur.set(c);
        this.chargementChauffeur.set(false);
        this.chargerAvis(chauffeurId);
      },
      error: () => this.chargementChauffeur.set(false)
    });
  }

  chargerAvis(chauffeurId: number) {
    this.http.get<any>(
      `${environment.apiUrl}/avis/utilisateur/${chauffeurId}`
    ).subscribe({
      next: p => this.avis.set(p?.avis?.content || p?.content || []),
      error: () => this.avis.set([])
    });
  }

  ouvrirChat(t: Trajet) {
    this.showChat.set(true);
    // Message d'accueil automatique
    if (this.chatMessages().length === 0) {
      this.chatMessages.set([{
        id: 1,
        contenu: `Bonjour ! Je suis intéressé par votre trajet `
          + `${t.villeDepart} → ${t.villeArrivee}. `
          + `Pouvez-vous faire une réduction sur les `
          + `${t.prixParPlace} XAF ?`,
        moi: true,
        heure: new Date().toLocaleTimeString('fr', {
          hour:'2-digit', minute:'2-digit'
        })
      }]);
      // Simuler réponse chauffeur après 2s
      setTimeout(() => this.simulerReponseChauffeur(t), 2000);
    }
  }

  envoyerMessage(t: Trajet) {
    if (!this.messageChat.trim()) return;
    const contenu = this.messageChat.trim();
    const msg = {
      id: Date.now(),
      contenu,
      moi: true,
      heure: new Date().toLocaleTimeString('fr', {
        hour:'2-digit', minute:'2-digit'
      })
    };
    this.chatMessages.update(arr => [...arr, msg]);
    this.messageChat = '';

    const u = this.auth.currentUser();
    if (u) {
      this.http.post(`${environment.apiUrl}/chat/envoyer`, {
        expediteurId:   u.compteId,
        destinataireId: t.chauffeurId,
        contenu,
        trajetId:       t.id
      }).subscribe({
        next: () => {
          setTimeout(() => this.simulerReponseChauffeur(t), 1200);
        },
        error: () => {
          setTimeout(() => this.simulerReponseChauffeur(t), 1200);
        }
      });
      return;
    }

    setTimeout(() => this.simulerReponseChauffeur(t), 1200);
  }

  private simulerReponseChauffeur(t: Trajet) {
    // Calcul réduction aléatoire 5-15%
    const reduction = Math.floor(Math.random() * 10) + 5;
    const prixReduit = Math.round(
      t.prixParPlace * (1 - reduction / 100));

    const reponseChauffeur = {
      id: Date.now() + 1,
      contenu: `Bonjour ! Je peux vous proposer `
        + `${prixReduit} XAF par place, `
        + `soit ${reduction}% de réduction. `
        + `C'est mon meilleur prix !`,
      moi: false,
      heure: new Date().toLocaleTimeString('fr', {
        hour:'2-digit', minute:'2-digit'
      })
    };

    this.chatMessages.update(arr => [...arr, reponseChauffeur]);
    this.offreChauffeur.set(prixReduit);
    this.prixNegocié.set(prixReduit);
  }

  accepterOffre(t: Trajet) {
    const prix = this.offreChauffeur();
    if (!prix) return;
    // Mettre à jour le prix affiché
    this.offreChauffeur.set(null);
    this.showChat.set(false);
    this.chatMessages.update(arr => [...arr, {
      id: Date.now(),
      contenu: `✓ J'accepte votre offre à ${prix} XAF !`,
      moi: true,
      heure: new Date().toLocaleTimeString('fr', {
        hour:'2-digit', minute:'2-digit'
      })
    }]);
    // Réserver avec le prix négocié
    this.reserver(t, prix);
  }

  reserver(t: Trajet, prixOverride?: number) {
    const u = this.auth.currentUser();
    if (!u) return;
    this.rezLoading.set(true);
    this.rezError.set('');

    const pointArret = this.selectedStop();
    const prixSegment = this.getStopPrice(t, pointArret ?? undefined);
    const prix = prixOverride ?? prixSegment ?? t.prixParPlace;

    this.rezSvc.reserver(
      u.compteId,
      t.id,
      t.chauffeurId,
      +this.searchForm.value.nbPlaces!,
      pointArret ?? undefined,
      prix
    ).subscribe({
      next: (rez) => {
        this.aReserve.set(true);
        const montant = rez?.montantTotal ?? prix * (+this.searchForm.value.nbPlaces! || 1);
        this.rezSuccess.set(
          `Demande envoyée ! Montant : ${fcfa(montant)}. `
          + `Le chauffeur doit maintenant accepter votre place — suivez-la dans « Mes courses ».`
        );
        this.toast.success('Réservation envoyée', `${t.villeDepart} → ${t.villeArrivee} · ${fcfa(montant)}`);
        this.rezLoading.set(false);
      },
      error: err => {
        const msg = messageErreur(err, 'Erreur lors de la réservation');
        this.rezError.set(msg);
        if (err.status === 402) {
          this.toast.warning('Solde insuffisant', 'Rechargez votre portefeuille pour réserver ce trajet.');
        }
        this.rezLoading.set(false);
      }
    });
  }

  getStops(pointsArret?: string): { nom: string; prix: number }[] {
    if (!pointsArret) return [];
    return pointsArret
      .split(';')
      .map(item => item.trim())
      .filter(Boolean)
      .map(item => {
        const [nom, prix] = item.split(':');
        return { nom: nom?.trim() || 'Arrêt', prix: Number(prix ?? 0) || 0 };
      });
  }

  getStopPrice(t: Trajet, stopName?: string | null): number | null {
    const stops = this.getStops(t.pointsArret);
    if (!stopName) return null;
    const stop = stops.find(s => s.nom.toLowerCase() === stopName.toLowerCase());
    return stop ? stop.prix : null;
  }

  getPrixReservation(t: Trajet): number {
    const stop = this.selectedStop();
    return this.getStopPrice(t, stop) ?? this.offreChauffeur() ?? t.prixParPlace;
  }

  getEtoiles(note: number): number[] {
    return Array.from({ length: Math.round(note || 0) });
  }
}