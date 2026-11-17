import { ToastService, fcfa, messageErreur } from '../../../core/services/toast.service';
import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { TrajetService } from '../../../core/services/trajet.service';
import { ReservationService } from '../../../core/services/reservation.service';
import { AuthService } from '../../../core/services/auth.service';
import { Trajet } from '../../../core/models';
import { environment } from '../../../../environments/environment';
import { IconComponent } from '../../../shared/components/icon/icon.component';

/** Date du jour au format AAAA-MM-JJ dans le fuseau local (toISOString est en UTC). */
function dateLocale(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

@Component({
  selector: 'app-new-course',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink, IconComponent],
  template: `
<div class="lx-page">
  <div class="lx-page-head">
    <div>
      <span class="lx-eyebrow">Réservation</span>
      <h2>Où souhaitez-vous aller ?</h2>
      <p>Indiquez votre trajet, choisissez votre chauffeur et réservez en un clic.</p>
    </div>
  </div>

  <!-- ── Formulaire de recherche ─────────────────────────── -->
  <form class="lx-card search lx-rise" [formGroup]="searchForm" (ngSubmit)="rechercher()">
    <div class="lx-form-grid">
      <div>
        <label class="lx-label" for="nc-depart">Départ</label>
        <div class="lx-field">
          <span class="lx-dot-start"></span>
          <input id="nc-depart" class="lx-input" style="padding-left:2rem" type="text" formControlName="villeDepart"
            placeholder="Ville de départ" autocomplete="off" />
        </div>
      </div>
      <div>
        <label class="lx-label" for="nc-arrivee">Destination</label>
        <div class="lx-field has-icon">
          <span class="lx-field-icon" style="color:var(--lx-red)"><lx-icon name="map-pin" /></span>
          <input id="nc-arrivee" class="lx-input" type="text" formControlName="villeArrivee"
            placeholder="Où souhaitez-vous aller ?" autocomplete="off" />
        </div>
      </div>
      <div>
        <label class="lx-label" for="nc-date">Date</label>
        <div class="lx-field has-icon">
          <span class="lx-field-icon"><lx-icon name="calendar" /></span>
          <input id="nc-date" class="lx-input" type="date" formControlName="date" [min]="today" />
        </div>
      </div>
      <div>
        <label class="lx-label" for="nc-places">Places</label>
        <div class="lx-field has-icon">
          <span class="lx-field-icon"><lx-icon name="users" /></span>
          <select id="nc-places" class="lx-select" formControlName="nbPlaces">
            <option value="1">1 place</option>
            <option value="2">2 places</option>
            <option value="3">3 places</option>
            <option value="4">4 places</option>
          </select>
        </div>
      </div>
    </div>

    <button type="submit" class="lx-btn lx-btn-primary lx-btn-block lx-btn-lg" style="margin-top:1.25rem"
      [disabled]="loading() || searchForm.invalid">
      @if (loading()) { <lx-icon name="refresh" class="lx-spin" /> Recherche… }
      @else { <lx-icon name="search" /> Rechercher un chauffeur disponible }
    </button>

    <div class="trust">
      <span><lx-icon name="check-circle" [size]="14" /> Confirmation par le chauffeur</span>
      <span><lx-icon name="check-circle" [size]="14" /> Paiement sécurisé</span>
      <span><lx-icon name="check-circle" [size]="14" /> Annulation gratuite avant acceptation</span>
    </div>
  </form>

  @if (erreurRecherche()) {
    <div class="lx-alert lx-alert-error" style="margin-top:1.5rem"><lx-icon name="alert" /> {{ erreurRecherche() }}</div>
  }

  <!-- ── Résultats ───────────────────────────────────────── -->
  @if (searched()) {
    <section class="results">
      <div class="lx-section-head">
        <h3>{{ trajets().length }} trajet{{ trajets().length > 1 ? 's' : '' }} trouvé{{ trajets().length > 1 ? 's' : '' }}</h3>
        <span class="lx-muted" style="font-size:.8rem">{{ searchForm.value.villeDepart }} → {{ searchForm.value.villeArrivee }}</span>
      </div>

      @if (trajets().length === 0) {
        <div class="lx-empty">
          <lx-icon name="search" />
          <p>Aucun trajet disponible pour ces critères.</p>
          <p class="lx-muted" style="font-size:.8rem">Essayez une autre date ou moins de places.</p>
        </div>
      } @else {
        <div class="lx-stack">
          @for (t of trajets(); track t.id) {
            <article class="lx-card lx-card-hover trip" [class.is-open]="trajetSelectionne()?.id === t.id">
              <div class="trip-top">
                <div class="min-w-0">
                  <div class="trip-route">
                    <span>{{ t.villeDepart }}</span>
                    <lx-icon name="arrow-right" [size]="16" class="lx-gold" />
                    <span>{{ t.villeArrivee }}</span>
                  </div>
                  <div class="trip-meta">
                    <span class="cap"><lx-icon name="calendar" [size]="14" /> {{ t.dateDepart | date:'EEE d MMM' }}</span>
                    <span><lx-icon name="clock" [size]="14" /> {{ t.heureDepart | slice:0:5 }}</span>
                    <span><lx-icon name="users" [size]="14" /> {{ t.placesDisponibles }} place{{ t.placesDisponibles > 1 ? 's' : '' }} libre{{ t.placesDisponibles > 1 ? 's' : '' }}</span>
                  </div>
                </div>
                <div class="trip-price">
                  <span class="lx-display">{{ t.prixParPlace | number:'1.0-0' }}</span>
                  <span class="lx-muted">FCFA / place</span>
                </div>
              </div>

              @if (trajetSelectionne()?.id !== t.id) {
                <div class="trip-foot">
                  <button class="lx-btn lx-btn-primary lx-btn-sm" (click)="voirPlus(t)">
                    Voir le chauffeur <lx-icon name="arrow-right" />
                  </button>
                </div>
              } @else {
                <!-- Détail chauffeur -->
                <div class="detail">
                  @if (chargementChauffeur()) {
                    <div class="lx-skeleton" style="min-height:120px"></div>
                  } @else if (chauffeur()) {
                    <div class="driver">
                      <span class="lx-avatar is-lg is-ring">{{ chauffeur()!.prenom?.charAt(0) }}{{ chauffeur()!.nom?.charAt(0) }}</span>
                      <div class="min-w-0" style="flex:1">
                        <div class="driver-name lx-display">{{ chauffeur()!.prenom }} {{ chauffeur()!.nom }}</div>
                        <div class="lx-row" style="gap:.5rem;margin:.25rem 0 .4rem">
                          <span class="lx-stars">
                            @for (i of [1,2,3,4,5]; track i) {
                              <lx-icon name="star" [fill]="true" [class.on]="i <= (chauffeur()!.noteMoyenne || 0) + 0.5" />
                            }
                          </span>
                          <span class="lx-muted" style="font-size:.8rem">{{ (chauffeur()!.noteMoyenne || 0) | number:'1.1-1' }}/5 · {{ chauffeur()!.nombreAvis || 0 }} avis</span>
                        </div>
                        <span class="lx-badge lx-badge-success"><lx-icon name="shield-check" [size]="12" /> Chauffeur vérifié</span>
                      </div>
                    </div>

                    <div class="phone">
                      <span class="lx-icon-tile is-soft"><lx-icon name="phone" [size]="18" /></span>
                      <div>
                        <div class="lx-muted" style="font-size:.75rem">Numéro du chauffeur</div>
                        @if (aReserve() && chauffeur()!.telephone) {
                          <div class="lx-gold" style="font-weight:600">{{ chauffeur()!.telephone }}</div>
                        } @else {
                          <div class="lx-muted">Visible après réservation</div>
                        }
                      </div>
                    </div>

                    @if (t.pointsArret) {
                      <div class="block">
                        <div class="lx-label">Arrêts facultatifs</div>
                        <div class="chips">
                          <button type="button" class="lx-chip" [class.is-active]="!selectedStop()" (click)="selectedStop.set(null)">
                            Trajet complet
                          </button>
                          @for (stop of getStops(t.pointsArret); track stop.nom) {
                            <button type="button" class="lx-chip" [class.is-active]="selectedStop() === stop.nom"
                              (click)="selectedStop.set(stop.nom)">
                              <lx-icon name="map-pin" /> {{ stop.nom }} — {{ stop.prix | number:'1.0-0' }} FCFA
                            </button>
                          }
                        </div>
                      </div>
                    }

                    <div class="block">
                      <div class="lx-label">Avis des passagers</div>
                      @if (avis().length > 0) {
                        <div class="lx-stack-sm">
                          @for (a of avis().slice(0, 3); track a.id) {
                            <div class="review">
                              <div class="lx-row" style="justify-content:space-between">
                                <span style="font-size:.85rem;font-weight:500">Passager</span>
                                <span class="lx-stars">
                                  @for (i of [1,2,3,4,5]; track i) {
                                    <lx-icon name="star" [fill]="true" [class.on]="i <= a.note" />
                                  }
                                </span>
                              </div>
                              @if (a.commentaire) {
                                <p class="review-text">« {{ a.commentaire }} »</p>
                              }
                            </div>
                          }
                        </div>
                      } @else {
                        <p class="lx-muted" style="font-size:.85rem;margin:0">Aucun avis pour ce chauffeur pour l'instant.</p>
                      }
                    </div>

                    <!-- Négociation -->
                    @if (showChat()) {
                      <div class="chat">
                        <div class="chat-head">
                          <span class="lx-row" style="gap:.5rem"><lx-icon name="message" [size]="16" /> Négocier le prix</span>
                          <button class="lx-btn lx-btn-ghost lx-btn-sm" (click)="showChat.set(false)" aria-label="Fermer"><lx-icon name="x" /></button>
                        </div>
                        <div class="chat-body">
                          @for (msg of chatMessages(); track msg.id) {
                            <div class="bubble-wrap" [class.mine]="msg.moi">
                              <div class="bubble">{{ msg.contenu }}</div>
                              <div class="bubble-time">{{ msg.heure }}</div>
                            </div>
                          }
                          @if (offreChauffeur()) {
                            <div class="offer">
                              <div class="lx-row" style="gap:.4rem;color:var(--lx-emerald);font-size:.75rem"><lx-icon name="tag" [size]="14" /> Offre du chauffeur</div>
                              <div class="offer-amount lx-display">{{ offreChauffeur() | number:'1.0-0' }} FCFA</div>
                              <div class="lx-muted" style="font-size:.75rem">Prix initial : {{ t.prixParPlace | number:'1.0-0' }} FCFA</div>
                              <div class="lx-row" style="margin-top:.75rem;gap:.5rem">
                                <button class="lx-btn lx-btn-success lx-btn-sm" (click)="accepterOffre(t)"><lx-icon name="check" /> Accepter et réserver</button>
                                <button class="lx-btn lx-btn-ghost lx-btn-sm" (click)="refuserOffre()">Refuser</button>
                              </div>
                            </div>
                          }
                        </div>
                        <form class="chat-input" (ngSubmit)="envoyerMessage(t)">
                          <input class="lx-input" name="msg" [(ngModel)]="messageChat" placeholder="Ex : Pouvez-vous faire 3 000 FCFA ?" autocomplete="off" />
                          <button type="submit" class="lx-btn lx-btn-primary" [disabled]="!messageChat.trim()" aria-label="Envoyer"><lx-icon name="send" /></button>
                        </form>
                      </div>
                    }

                    @if (rezSuccess()) {
                      <div class="lx-alert lx-alert-success">
                        <lx-icon name="check-circle" />
                        <div>
                          {{ rezSuccess() }}
                          @if (aReserve() && chauffeur()?.telephone) {
                            <div style="margin-top:.35rem;font-weight:600">Chauffeur : {{ chauffeur()!.telephone }}</div>
                          }
                          <a routerLink="/client/historique" class="lx-link" style="margin-top:.4rem">Suivre ma réservation <lx-icon name="arrow-right" /></a>
                        </div>
                      </div>
                    }
                    @if (rezError()) {
                      <div class="lx-alert lx-alert-error"><lx-icon name="alert" /> {{ rezError() }}</div>
                    }

                    <div class="actions">
                      @if (!aReserve()) {
                        <button class="lx-btn lx-btn-primary" (click)="reserver(t)" [disabled]="rezLoading()">
                          @if (rezLoading()) { <lx-icon name="refresh" class="lx-spin" /> Réservation… }
                          @else { Réserver — {{ getPrixReservation(t) * nbPlaces() | number:'1.0-0' }} FCFA }
                        </button>
                        @if (!showChat()) {
                          <button class="lx-btn lx-btn-outline" (click)="ouvrirChat(t)"><lx-icon name="message" /> Négocier le prix</button>
                        }
                      }
                      <button class="lx-btn lx-btn-ghost" (click)="trajetSelectionne.set(null)">Fermer</button>
                    </div>
                  } @else {
                    <div class="lx-alert lx-alert-error"><lx-icon name="alert" /> Impossible de charger le profil du chauffeur.</div>
                  }
                </div>
              }
            </article>
          }
        </div>
      }
    </section>
  }
</div>
  `,
  styles: [`
    :host { display: block; }
    .min-w-0 { min-width: 0; }
    .search { padding: 1.5rem; box-shadow: 0 24px 48px rgba(0, 0, 0, 0.35); }
    .trust {
      display: flex; flex-wrap: wrap; gap: 0.5rem 1.25rem; margin-top: 1rem;
      font-size: 0.75rem; color: rgba(240, 236, 227, 0.5);
      span { display: inline-flex; align-items: center; gap: 0.35rem; }
      lx-icon { color: var(--lx-emerald); }
    }
    .results { margin-top: 2rem; }

    .trip { padding: 1.25rem 1.5rem; &.is-open { border-color: rgba(200, 146, 42, 0.35); } }
    .trip-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; }
    .trip-route { display: flex; align-items: center; gap: 0.6rem; font-weight: 500; font-size: 1.05rem; flex-wrap: wrap; }
    .trip-meta {
      display: flex; flex-wrap: wrap; gap: 0.4rem 1rem; margin-top: 0.45rem; font-size: 0.8rem; color: var(--lx-muted-fg);
      span { display: inline-flex; align-items: center; gap: 0.35rem; }
      .cap { text-transform: capitalize; }
    }
    .trip-price { text-align: right; flex-shrink: 0; display: flex; flex-direction: column;
      .lx-display { font-size: 1.5rem; line-height: 1.1; } .lx-muted { font-size: 0.72rem; } }
    .trip-foot { display: flex; justify-content: flex-end; margin-top: 1rem; }

    .detail { border-top: 1px solid var(--lx-border); margin-top: 1.25rem; padding-top: 1.25rem; display: flex; flex-direction: column; gap: 1.25rem; }
    .driver { display: flex; align-items: center; gap: 1rem; }
    .driver-name { font-size: 1.15rem; font-weight: 600; }
    .phone { display: flex; align-items: center; gap: 0.85rem; background: var(--lx-secondary); border-radius: var(--lx-r-md); padding: 0.85rem 1rem; font-size: 0.9rem; }
    .chips { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .review { background: var(--lx-secondary); border-radius: var(--lx-r-md); padding: 0.75rem 0.9rem; }
    .review-text { margin: 0.35rem 0 0; font-size: 0.82rem; font-style: italic; }

    .chat { border: 1px solid var(--lx-border); border-radius: var(--lx-r-lg); overflow: hidden; }
    .chat-head { display: flex; justify-content: space-between; align-items: center; padding: 0.6rem 0.6rem 0.6rem 1rem;
      background: rgba(200, 146, 42, 0.1); color: var(--lx-primary); font-size: 0.875rem; font-weight: 500; }
    .chat-body { max-height: 260px; min-height: 140px; overflow-y: auto; padding: 1rem; display: flex; flex-direction: column; gap: 0.6rem; background: var(--lx-bg); }
    .bubble-wrap { align-self: flex-start; max-width: 80%;
      &.mine { align-self: flex-end; .bubble { background: var(--lx-primary); color: var(--lx-primary-fg); } .bubble-time { text-align: right; } } }
    .bubble { background: var(--lx-secondary); padding: 0.55rem 0.8rem; border-radius: 12px; font-size: 0.85rem; line-height: 1.45; }
    .bubble-time { font-size: 0.68rem; color: var(--lx-muted-fg); margin-top: 0.2rem; }
    .offer { align-self: flex-start; background: rgba(52, 211, 153, 0.08); border: 1px solid rgba(52, 211, 153, 0.25); border-radius: var(--lx-r-md); padding: 0.8rem 1rem; }
    .offer-amount { font-size: 1.25rem; margin: 0.2rem 0; }
    .chat-input { display: flex; gap: 0.5rem; padding: 0.75rem; border-top: 1px solid var(--lx-border); background: var(--lx-card);
      .lx-input { padding: 0.65rem 0.9rem; } }

    .actions { display: flex; flex-wrap: wrap; gap: 0.6rem; align-items: center; }

    @media (max-width: 640px) {
      .search { padding: 1.15rem; }
      .trip { padding: 1.1rem; }
      .trip-top { flex-direction: column; }
      .trip-price { text-align: left; flex-direction: row; align-items: baseline; gap: 0.4rem; }
      .actions .lx-btn { flex: 1 1 100%; }
    }
  `]
})
export class NewCourseComponent implements OnInit {
  private toast = inject(ToastService);
  private route = inject(ActivatedRoute);

  loading           = signal(false);
  searched          = signal(false);
  erreurRecherche   = signal('');
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
  today             = dateLocale();

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

  ngOnInit() {
    // Pré-remplissage depuis le tableau de bord ou « Réserver à nouveau »
    const q = this.route.snapshot.queryParamMap;
    const depart = q.get('depart');
    const arrivee = q.get('arrivee');
    const places = Number(q.get('places'));
    if (depart) this.searchForm.patchValue({ villeDepart: depart });
    if (arrivee) this.searchForm.patchValue({ villeArrivee: arrivee });
    if (places >= 1 && places <= 4) this.searchForm.patchValue({ nbPlaces: String(places) });
    if (depart && arrivee) this.rechercher();
  }

  nbPlaces(): number {
    return Math.max(1, +(this.searchForm.value.nbPlaces ?? 1) || 1);
  }

  rechercher() {
    if (this.searchForm.invalid) { this.searchForm.markAllAsTouched(); return; }
    this.loading.set(true);
    this.searched.set(false);
    this.erreurRecherche.set('');
    this.trajetSelectionne.set(null);
    const v = this.searchForm.value;

    this.trajetSvc.rechercher(
      v.villeDepart!.trim(), v.villeArrivee!.trim(),
      v.date!, +v.nbPlaces!
    ).subscribe({
      next: p => {
        const tries = [...(p.content ?? [])].sort((a, b) => {
          if (a.placesDisponibles !== b.placesDisponibles) {
            return a.placesDisponibles - b.placesDisponibles;
          }
          return (a.heureDepart ?? '').localeCompare(b.heureDepart ?? '');
        });
        this.trajets.set(tries);
        this.searched.set(true);
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.erreurRecherche.set(messageErreur(err, 'La recherche a échoué. Réessayez.'));
      }
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
    this.prixNegocié.set(null);
    this.chauffeur.set(null);
    this.avis.set([]);
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

  private heure(): string {
    return new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  ouvrirChat(t: Trajet) {
    this.showChat.set(true);
    if (this.chatMessages().length === 0) {
      this.chatMessages.set([{
        id: 1,
        contenu: `Bonjour ! Je suis intéressé par votre trajet ${t.villeDepart} → ${t.villeArrivee}. `
          + `Pouvez-vous faire une réduction sur les ${t.prixParPlace} FCFA ?`,
        moi: true,
        heure: this.heure()
      }]);
      setTimeout(() => this.simulerReponseChauffeur(t), 2000);
    }
  }

  envoyerMessage(t: Trajet) {
    if (!this.messageChat.trim()) return;
    const contenu = this.messageChat.trim();
    this.chatMessages.update(arr => [...arr, { id: Date.now(), contenu, moi: true, heure: this.heure() }]);
    this.messageChat = '';

    const u = this.auth.currentUser();
    if (u) {
      this.http.post(`${environment.apiUrl}/chat/envoyer`, {
        expediteurId:   u.compteId,
        destinataireId: t.chauffeurId,
        contenu,
        trajetId:       t.id
      }).subscribe({
        next: () => setTimeout(() => this.simulerReponseChauffeur(t), 1200),
        error: () => setTimeout(() => this.simulerReponseChauffeur(t), 1200)
      });
      return;
    }
    setTimeout(() => this.simulerReponseChauffeur(t), 1200);
  }

  private simulerReponseChauffeur(t: Trajet) {
    // Le panneau a pu être fermé ou un autre trajet ouvert entre-temps.
    if (!this.showChat() || this.trajetSelectionne()?.id !== t.id) return;
    const reduction = Math.floor(Math.random() * 10) + 5;
    const prixReduit = Math.round(t.prixParPlace * (1 - reduction / 100));
    this.chatMessages.update(arr => [...arr, {
      id: Date.now() + 1,
      contenu: `Bonjour ! Je peux vous proposer ${prixReduit} FCFA par place, soit ${reduction}% de réduction. C'est mon meilleur prix !`,
      moi: false,
      heure: this.heure()
    }]);
    this.offreChauffeur.set(prixReduit);
  }

  accepterOffre(t: Trajet) {
    const prix = this.offreChauffeur();
    if (!prix) return;
    this.offreChauffeur.set(null);
    this.prixNegocié.set(prix);
    this.showChat.set(false);
    this.chatMessages.update(arr => [...arr, { id: Date.now(), contenu: `J'accepte votre offre à ${prix} FCFA !`, moi: true, heure: this.heure() }]);
    this.reserver(t, prix);
  }

  refuserOffre() {
    this.offreChauffeur.set(null);
    this.prixNegocié.set(null);
  }

  reserver(t: Trajet, prixOverride?: number) {
    const u = this.auth.currentUser();
    if (!u || this.rezLoading()) return;
    this.rezLoading.set(true);
    this.rezError.set('');

    const pointArret = this.selectedStop();
    const prix = prixOverride ?? this.getPrixReservation(t);
    const places = this.nbPlaces();

    this.rezSvc.reserver(u.compteId, t.id, t.chauffeurId, places, pointArret ?? undefined, prix).subscribe({
      next: (rez) => {
        this.aReserve.set(true);
        const montant = rez?.montantTotal ?? prix * places;
        this.rezSuccess.set(
          `Demande envoyée ! Montant : ${fcfa(montant)}. Le chauffeur doit maintenant accepter votre place.`
        );
        this.toast.success('Réservation envoyée', `${t.villeDepart} → ${t.villeArrivee} · ${fcfa(montant)}`);
        this.rezLoading.set(false);
      },
      error: err => {
        this.rezError.set(messageErreur(err, 'Erreur lors de la réservation'));
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
    if (!stopName) return null;
    const stop = this.getStops(t.pointsArret).find(s => s.nom.toLowerCase() === stopName.toLowerCase());
    return stop ? stop.prix : null;
  }

  /** Prix par place : segment choisi, sinon prix négocié accepté, sinon prix du trajet. */
  getPrixReservation(t: Trajet): number {
    return this.getStopPrice(t, this.selectedStop()) ?? this.prixNegocié() ?? t.prixParPlace;
  }
}
