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
                          <div class="lx-muted">Visible une fois votre réservation acceptée</div>
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

                    <!-- Offre de prix : envoyée au chauffeur avec la réservation -->
                    @if (!aReserve()) {
                      <div class="offer-box" [class.is-open]="offreActive()">
                        <label class="lx-check">
                          <input type="checkbox" [checked]="offreActive()" (change)="basculerOffre(t)" />
                          <span>Proposer un autre prix au chauffeur</span>
                        </label>
                        @if (offreActive()) {
                          <div class="offer-row">
                            <input class="lx-input lx-mono" type="number" name="offre" [(ngModel)]="prixPropose"
                              [min]="prixMinimum(t)" [max]="prixAffiche(t)" step="50" aria-label="Prix proposé par place" />
                            <span class="lx-muted">FCFA / place</span>
                          </div>
                          <div [class]="offreValide(t) ? 'lx-help' : 'lx-error'">
                            Entre {{ prixMinimum(t) | number:'1.0-0' }} et {{ prixAffiche(t) | number:'1.0-0' }} FCFA. Le chauffeur accepte, refuse
                            ou vous répond par une contre-offre ; rien n'est prélevé avant son accord.
                          </div>
                        }
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
                        <button class="lx-btn lx-btn-primary" (click)="reserver(t)" [disabled]="rezLoading() || (offreActive() && !offreValide(t))">
                          @if (rezLoading()) { <lx-icon name="refresh" class="lx-spin" /> Réservation… }
                          @else if (offreActive()) { Envoyer mon offre — {{ (prixPropose || 0) * nbPlaces() | number:'1.0-0' }} FCFA }
                          @else { Réserver — {{ getPrixReservation(t) * nbPlaces() | number:'1.0-0' }} FCFA }
                        </button>
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

    .offer-box { background: var(--lx-secondary); border-radius: var(--lx-r-md); padding: 0.85rem 1rem; display: flex; flex-direction: column; gap: 0.6rem;
      &.is-open { border: 1px solid rgba(200, 146, 42, 0.3); } }
    .offer-row { display: flex; align-items: center; gap: 0.6rem; .lx-input { max-width: 180px; background: var(--lx-bg); } }

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
  /** Le passager propose un prix inférieur au prix affiché (offre transmise avec la réservation). */
  offreActive       = signal(false);
  prixPropose: number | null = null;
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
    this.offreActive.set(false);
    this.prixPropose = null;
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

  /** Prix affiché pour la sélection courante (trajet complet ou segment). */
  prixAffiche(t: Trajet): number {
    return this.getStopPrice(t, this.selectedStop()) ?? t.prixParPlace;
  }

  /** Le serveur refuse les offres inférieures à la moitié du prix affiché. */
  prixMinimum(t: Trajet): number {
    return Math.ceil(this.prixAffiche(t) * 0.5);
  }

  offreValide(t: Trajet): boolean {
    const p = Number(this.prixPropose);
    return Number.isFinite(p) && p >= this.prixMinimum(t) && p < this.prixAffiche(t);
  }

  basculerOffre(t: Trajet) {
    const actif = !this.offreActive();
    this.offreActive.set(actif);
    // Proposition de départ : 10 % de moins, arrondi à 50 F.
    if (actif) this.prixPropose = Math.max(this.prixMinimum(t), Math.round((this.prixAffiche(t) * 0.9) / 50) * 50);
  }

  reserver(t: Trajet, prixOverride?: number) {
    const u = this.auth.currentUser();
    if (!u || this.rezLoading()) return;
    this.rezLoading.set(true);
    this.rezError.set('');

    const pointArret = this.selectedStop();
    if (this.offreActive() && !this.offreValide(t)) { this.rezLoading.set(false); return; }
    const prix = prixOverride ?? (this.offreActive() ? Number(this.prixPropose) : this.getPrixReservation(t));
    const places = this.nbPlaces();

    this.rezSvc.reserver(u.compteId, t.id, t.chauffeurId, places, pointArret ?? undefined, prix).subscribe({
      next: (rez) => {
        this.aReserve.set(true);
        const montant = rez?.montantTotal ?? prix * places;
        const offre = this.offreActive();
        this.rezSuccess.set(offre
          ? `Offre envoyée : ${fcfa(montant)}. Le chauffeur peut l'accepter, la refuser ou vous faire une contre-offre.`
          : `Demande envoyée ! Montant : ${fcfa(montant)}. Le chauffeur doit maintenant accepter votre place.`);
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

  /** Prix par place affiché : segment choisi, sinon prix du trajet. */
  getPrixReservation(t: Trajet): number {
    return this.prixAffiche(t);
  }
}
