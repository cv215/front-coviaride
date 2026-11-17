import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ReservationService } from '../../../core/services/reservation.service';
import { Reservation } from '../../../core/models';
import { AbstractControl, ValidationErrors } from '@angular/forms';
import { ToastService } from '../../../core/services/toast.service';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { TrajetService } from '../../../core/services/trajet.service';
import { UtilisateurService } from '../../../core/services/utilisateur.service';
import { Trajet, Vehicule } from '../../../core/models';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { DecisionReservationComponent } from '../../../shared/components/decision-reservation/decision-reservation.component';
import { ProfilsService } from '../../../core/services/profils.service';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { GeoService } from '../../../core/services/geo.service';

type FiltreTrajet = 'actifs' | 'PLANIFIE' | 'EN_COURS' | 'TERMINE' | 'ANNULE';

/** La ville d'arrivée doit différer de la ville de départ ; les arrêts doivent suivre le format nom:prix. */
function trajetValide(g: AbstractControl): ValidationErrors | null {
  const dep = (g.get('villeDepart')?.value ?? '').trim().toLowerCase();
  const arr = (g.get('villeArrivee')?.value ?? '').trim().toLowerCase();
  const arrets = (g.get('pointsArret')?.value ?? '').trim();
  const errs: ValidationErrors = {};
  if (dep && arr && dep === arr) errs['memesVilles'] = true;
  if (arrets && !arrets.split(';').filter((x: string) => x.trim()).every((x: string) => /^[^:;]+:\s*\d+$/.test(x.trim()))) errs['arrets'] = true;
  return Object.keys(errs).length ? errs : null;
}

@Component({
  selector: 'app-courses',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, IconComponent, DecisionReservationComponent],
  template: `
<div class="lx-page">
  <div class="lx-page-head">
    <div>
      <span class="lx-eyebrow">Mes trajets</span>
      <h2>Publiez et gérez vos trajets</h2>
      <p>Suivez les réservations, démarrez le trajet et partagez votre position avec vos passagers.</p>
    </div>
    <div class="lx-row">
      @if (vehicules().length > 0) {
        <button class="lx-btn" [class.lx-btn-primary]="!showForm()" [class.lx-btn-secondary]="showForm()" (click)="basculerFormulaire()">
          <lx-icon [name]="showForm() ? 'x' : 'plus'" /> {{ showForm() ? 'Fermer' : 'Nouveau trajet' }}
        </button>
      }
      <button class="lx-btn lx-btn-secondary" (click)="showVehiculeForm.set(!showVehiculeForm())">
        <lx-icon name="car" /> {{ showVehiculeForm() ? 'Fermer' : 'Ajouter un véhicule' }}
      </button>
    </div>
  </div>

  <!-- Aucun véhicule -->
  @if (vehiculesCharges() && vehicules().length === 0 && !showVehiculeForm()) {
    <div class="lx-alert lx-alert-info" style="margin-bottom:1.5rem">
      <lx-icon name="info" />
      <div>
        <strong>Aucun véhicule enregistré.</strong> Ajoutez votre véhicule pour pouvoir publier un trajet.
        <div style="margin-top:.6rem"><button class="lx-btn lx-btn-primary lx-btn-sm" (click)="showVehiculeForm.set(true)"><lx-icon name="plus" /> Ajouter un véhicule</button></div>
      </div>
    </div>
  }
  @if (vehiculeMsg()) { <div class="lx-alert lx-alert-success" style="margin-bottom:1.5rem"><lx-icon name="check-circle" /> {{ vehiculeMsg() }}</div> }

  <!-- Formulaire véhicule -->
  @if (showVehiculeForm()) {
    <form class="lx-card lx-stack form-card" [formGroup]="vehiculeForm" (ngSubmit)="ajouterVehicule()">
      <h3 class="lx-card-title" style="margin:0">Ajouter un véhicule</h3>
      <div class="lx-form-grid">
        <div><label class="lx-label" for="v-marque">Marque</label><input id="v-marque" class="lx-input" formControlName="marque" placeholder="Toyota" /></div>
        <div><label class="lx-label" for="v-modele">Modèle</label><input id="v-modele" class="lx-input" formControlName="modele" placeholder="Corolla" /></div>
        <div><label class="lx-label" for="v-immat">Immatriculation</label><input id="v-immat" class="lx-input lx-mono" formControlName="immatriculation" placeholder="LT-1234-A" /></div>
        <div><label class="lx-label" for="v-couleur">Couleur</label><input id="v-couleur" class="lx-input" formControlName="couleur" placeholder="Blanc" /></div>
        <div><label class="lx-label" for="v-places">Nombre de places</label><input id="v-places" class="lx-input" type="number" min="1" max="20" formControlName="nombrePlaces" /></div>
        <div><label class="lx-label" for="v-annee">Année <span class="lx-muted">(facultatif)</span></label><input id="v-annee" class="lx-input" inputmode="numeric" formControlName="annee" placeholder="2020" /></div>
      </div>
      @if (vehiculeErreur()) { <div class="lx-alert lx-alert-error"><lx-icon name="alert" /> {{ vehiculeErreur() }}</div> }
      <div class="form-actions">
        <button type="button" class="lx-btn lx-btn-ghost" (click)="showVehiculeForm.set(false)">Annuler</button>
        <button type="submit" class="lx-btn lx-btn-primary" [disabled]="vehiculeForm.invalid || vehiculeLoading()">
          {{ vehiculeLoading() ? 'Ajout…' : 'Ajouter le véhicule' }}
        </button>
      </div>
    </form>
  }

  <!-- Formulaire trajet -->
  @if (showForm()) {
    <form class="lx-card lx-stack form-card" [formGroup]="form" (ngSubmit)="publier()">
      <h3 class="lx-card-title" style="margin:0">Publier un nouveau trajet</h3>
      <div class="lx-form-grid">
        <div>
          <label class="lx-label" for="t-dep">Départ</label>
          <div class="lx-field"><span class="lx-dot-start"></span>
            <input id="t-dep" class="lx-input" style="padding-left:2rem" formControlName="villeDepart" placeholder="Yaoundé" /></div>
        </div>
        <div>
          <label class="lx-label" for="t-arr">Destination</label>
          <div class="lx-field has-icon"><span class="lx-field-icon" style="color:var(--lx-red)"><lx-icon name="map-pin" /></span>
            <input id="t-arr" class="lx-input" formControlName="villeArrivee" placeholder="Douala" /></div>
        </div>
        <div>
          <label class="lx-label" for="t-date">Date</label>
          <div class="lx-field has-icon"><span class="lx-field-icon"><lx-icon name="calendar" /></span>
            <input id="t-date" class="lx-input" type="date" formControlName="dateDepart" [min]="today" /></div>
        </div>
        <div>
          <label class="lx-label" for="t-heure">Heure de départ</label>
          <div class="lx-field has-icon"><span class="lx-field-icon"><lx-icon name="clock" /></span>
            <input id="t-heure" class="lx-input" type="time" formControlName="heureDepart" /></div>
        </div>
        <div>
          <label class="lx-label" for="t-veh">Véhicule</label>
          <select id="t-veh" class="lx-select" formControlName="vehiculeId">
            <option value="" disabled>Sélectionner un véhicule</option>
            @for (v of vehicules(); track v.id) {
              <option [value]="v.id">{{ v.marque }} {{ v.modele }} · {{ v.immatriculation }}</option>
            }
          </select>
        </div>
        <div class="lx-form-grid" style="gap:.75rem">
          <div>
            <label class="lx-label" for="t-prix">Prix / place</label>
            <input id="t-prix" class="lx-input lx-mono" type="number" min="100" formControlName="prixParPlace" placeholder="3000" />
          </div>
          <div>
            <label class="lx-label" for="t-places">Places</label>
            <input id="t-places" class="lx-input" type="number" min="1" [max]="placesMax()" formControlName="nombrePlaces" />
          </div>
        </div>
      </div>
      <div>
        <label class="lx-label" for="t-arrets">Points d'arrêt <span class="lx-muted">(facultatif)</span></label>
        <input id="t-arrets" class="lx-input" formControlName="pointsArret" placeholder="Edéa:2500;Pouma:3000" />
        <div class="lx-help">Format : ville:prix séparés par « ; ». Le passager paie le prix de son arrêt.</div>
      </div>
      <div>
        <label class="lx-label" for="t-desc">Description <span class="lx-muted">(facultatif)</span></label>
        <textarea id="t-desc" class="lx-textarea" rows="2" style="min-height:72px" formControlName="description" placeholder="Point de rendez-vous, bagages acceptés…"></textarea>
      </div>
      @if (form.hasError('memesVilles')) { <div class="lx-alert lx-alert-error"><lx-icon name="alert" /> La ville d'arrivée doit être différente de la ville de départ.</div> }
      @if (form.hasError('arrets')) { <div class="lx-alert lx-alert-error"><lx-icon name="alert" /> Points d'arrêt : utilisez le format Ville:prix;Ville:prix (ex : Edéa:2500).</div> }
      @if (form.get('nombrePlaces')?.hasError('max')) { <div class="lx-alert lx-alert-error"><lx-icon name="alert" /> Ce véhicule n'a que {{ placesMax() }} places.</div> }
      @if (error()) { <div class="lx-alert lx-alert-error"><lx-icon name="alert" /> {{ error() }}</div> }
      <div class="form-actions">
        <button type="button" class="lx-btn lx-btn-ghost" (click)="showForm.set(false)">Annuler</button>
        <button type="submit" class="lx-btn lx-btn-primary" [disabled]="loading() || form.invalid">
          {{ loading() ? 'Publication…' : 'Publier le trajet' }}
        </button>
      </div>
    </form>
  }

  <nav class="lx-tabs" role="tablist">
    @for (f of filtresTrajet; track f.id) {
      <button role="tab" class="lx-tab" [class.is-active]="filtre() === f.id" [attr.aria-selected]="filtre() === f.id" (click)="filtre.set(f.id)">
        {{ f.label }} <span class="lx-tab-count">{{ compter(f.id) }}</span>
      </button>
    }
  </nav>

  @if (loadingTrajets()) {
    <div class="lx-stack-sm"><div class="lx-skeleton" style="min-height:140px"></div><div class="lx-skeleton" style="min-height:140px"></div></div>
  } @else if (trajetsFiltres().length === 0) {
    <div class="lx-empty">
      <lx-icon name="route" />
      <p>{{ trajets().length === 0 ? "Vous n'avez pas encore publié de trajet." : 'Aucun trajet dans cette catégorie.' }}</p>
      @if (vehicules().length > 0 && !showForm()) {
        <button class="lx-btn lx-btn-primary lx-btn-sm" (click)="basculerFormulaire()"><lx-icon name="plus" /> Publier un trajet</button>
      }
    </div>
  } @else {
    <div class="lx-stack-sm">
      @for (t of trajetsFiltres(); track t.id) {
        <article class="lx-card trip" [class.is-live]="t.statut === 'EN_COURS'">
          <div class="trip-top">
            <div class="min-w-0">
              <div class="trip-route">
                <span>{{ t.villeDepart }}</span><lx-icon name="arrow-right" [size]="16" class="lx-gold" /><span>{{ t.villeArrivee }}</span>
              </div>
              <div class="trip-meta">
                <span class="cap"><lx-icon name="calendar" [size]="14" /> {{ t.dateDepart | date:'EEE d MMM' }}</span>
                <span><lx-icon name="clock" [size]="14" /> {{ (t.heureDepart || '').slice(0,5) }}</span>
                <span><lx-icon name="users" [size]="14" /> {{ t.nombrePlaces - t.placesDisponibles }}/{{ t.nombrePlaces }} réservées</span>
              </div>
              <div class="seats" aria-hidden="true">
                @for (i of places(t); track $index) { <span class="seat" [class.taken]="i"></span> }
              </div>
              @if (t.pointsArret) { <div class="trip-desc"><lx-icon name="map-pin" [size]="13" /> {{ t.pointsArret.split(';').join(' · ') }}</div> }
              @if (t.description) { <div class="trip-desc">{{ t.description }}</div> }
            </div>
            <div class="trip-right">
              <div class="trip-price lx-display">{{ t.prixParPlace | number:'1.0-0' }} <span>FCFA</span></div>
              <span class="lx-badge" [ngClass]="getBadge(t.statut)">{{ libelleStatut(t.statut) }}</span>
            </div>
          </div>

          @if (t.statut === 'PLANIFIE' || t.statut === 'EN_COURS') {
            <div class="trip-actions">
              <button class="lx-btn lx-btn-secondary lx-btn-sm" (click)="togglePassagers(t)" [attr.aria-expanded]="passagersOuverts() === t.id">
                <lx-icon name="users" /> Passagers <lx-icon name="chevron-down" class="chev" [class.is-open]="passagersOuverts() === t.id" />
              </button>
              <span class="spacer"></span>
              @if (t.statut === 'PLANIFIE') {
                <button class="lx-btn lx-btn-danger lx-btn-sm" (click)="annuler(t)" [disabled]="actionEnCours() === t.id">Annuler</button>
                <button class="lx-btn lx-btn-primary lx-btn-sm" (click)="demarrer(t)" [disabled]="actionEnCours() === t.id"><lx-icon name="navigation" /> Démarrer</button>
              } @else {
                @if (enPartage().has(t.id)) {
                  <span class="sharing"><span class="lx-ping is-green" style="width:8px;height:8px"></span> Position partagée</span>
                  <button class="lx-btn lx-btn-ghost lx-btn-sm" (click)="stopLiveTracking(t)">Arrêter</button>
                } @else {
                  <button class="lx-btn lx-btn-secondary lx-btn-sm" (click)="startLiveTracking(t)"><lx-icon name="map-pin" /> Partager ma position</button>
                }
                <a class="lx-btn lx-btn-secondary lx-btn-sm" [routerLink]="['/chauffeur/suivi', t.id]"><lx-icon name="map-pin" /> Carte</a>
                <button class="lx-btn lx-btn-primary lx-btn-sm" (click)="terminer(t)" [disabled]="actionEnCours() === t.id"><lx-icon name="check-circle" /> Terminer</button>
              }
            </div>
          }

          @if (passagersOuverts() === t.id) {
            <div class="pax">
              @if (chargementPassagers()) {
                <div class="pax-empty">Chargement des passagers…</div>
              } @else if (!passagers()[t.id]?.length) {
                <div class="pax-empty">Aucune réservation pour ce trajet pour l'instant.</div>
              } @else {
                @for (r of passagers()[t.id]; track r.id) {
                  <div class="pax-row">
                    <span class="lx-avatar" style="width:34px;height:34px;font-size:.75rem">{{ profils.initiales(r.passagerId) }}</span>
                    <div class="lx-list-body">
                      <span class="lx-list-title">{{ profils.nom(r.passagerId, 'Passager') }}</span>
                      <span class="lx-list-sub">{{ r.nombrePlaces }} place{{ r.nombrePlaces > 1 ? 's' : '' }}@if (r.pointArret) { · arrêt {{ r.pointArret }} } · {{ (r.montantTotal ?? 0) | number:'1.0-0' }} FCFA</span>
                    </div>
                    <div class="pax-right">
                      <span class="lx-badge" [ngClass]="badgeReservation(r)">{{ libelleReservation(r) }}</span>
                    </div>
                    @if (r.statut === 'EN_ATTENTE') {
                      <lx-decision-reservation class="pax-decision" [rez]="r" (traitee)="surDecision(t, $event)" />
                    }
                  </div>
                }
              }
            </div>
          }
        </article>
      }
    </div>
  }
</div>`,
  styles: [`
    :host { display: block; }
    .min-w-0 { min-width: 0; }
    .cap { text-transform: capitalize; }
    .form-card { margin-bottom: 1.5rem; border-color: rgba(200, 146, 42, 0.25); animation: lx-rise 0.3s ease-out; }
    .form-actions { display: flex; justify-content: flex-end; gap: 0.6rem; flex-wrap: wrap; }

    .trip { padding: 1.25rem 1.4rem; transition: border-color 0.2s;
      &:hover { border-color: rgba(200, 146, 42, 0.3); }
      &.is-live { border-color: rgba(52, 211, 153, 0.45); box-shadow: inset 3px 0 0 var(--lx-emerald); } }
    .trip-top { display: flex; justify-content: space-between; gap: 1rem; }
    .trip-route { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; font-weight: 500; font-size: 1.05rem; }
    .trip-meta { display: flex; flex-wrap: wrap; gap: 0.4rem 1rem; margin-top: 0.45rem; font-size: 0.8rem; color: var(--lx-muted-fg);
      span { display: inline-flex; align-items: center; gap: 0.35rem; } }
    .seats { display: flex; gap: 4px; margin-top: 0.65rem; flex-wrap: wrap; }
    .seat { width: 14px; height: 14px; border-radius: 4px; background: var(--lx-secondary); border: 1px solid var(--lx-border-strong);
      &.taken { background: var(--lx-primary); border-color: var(--lx-primary); } }
    .trip-desc { display: flex; align-items: center; gap: 0.35rem; font-size: 0.8rem; color: var(--lx-muted-fg); margin-top: 0.45rem; }
    .trip-right { display: flex; flex-direction: column; align-items: flex-end; gap: 0.4rem; flex-shrink: 0; }
    .trip-price { font-size: 1.35rem; line-height: 1.1; white-space: nowrap; span { font-family: var(--lx-font-body); font-size: 0.72rem; color: var(--lx-muted-fg); } }
    .trip-actions { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; margin-top: 1rem; padding-top: 0.9rem; border-top: 1px solid var(--lx-border); }
    .spacer { flex: 1; }
    .chev { transition: transform 0.2s; &.is-open { transform: rotate(180deg); } }
    .sharing { display: inline-flex; align-items: center; gap: 0.45rem; font-size: 0.8rem; color: var(--lx-emerald); }

    .pax { margin-top: 1rem; border-radius: var(--lx-r-md); background: var(--lx-bg); border: 1px solid var(--lx-border); overflow: hidden; animation: lx-fade 0.2s; }
    .pax-row { display: flex; align-items: center; gap: 0.8rem; flex-wrap: wrap; padding: 0.8rem 1rem; border-bottom: 1px solid var(--lx-border); &:last-child { border-bottom: 0; } }
    .pax-right { display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; margin-left: auto; }
    .pax-decision { flex-basis: 100%; }
    .pax-empty { padding: 1.1rem; text-align: center; color: var(--lx-muted-fg); font-size: 0.85rem; }

    @media (max-width: 640px) {
      .trip { padding: 1.1rem; }
      .trip-top { flex-direction: column; }
      .trip-right { flex-direction: row; align-items: center; justify-content: space-between; }
      .spacer { display: none; }
      .trip-actions .lx-btn { flex: 1 1 auto; }
      .form-actions .lx-btn { flex: 1; }
    }
  `]
})
export class CoursesComponent implements OnInit, OnDestroy {
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);
  private rezSvc = inject(ReservationService);
  profils = inject(ProfilsService);

  filtre = signal<FiltreTrajet>('actifs');
  readonly filtresTrajet: { id: FiltreTrajet; label: string }[] = [
    { id: 'actifs', label: 'Actifs' }, { id: 'PLANIFIE', label: 'Planifiés' }, { id: 'EN_COURS', label: 'En cours' },
    { id: 'TERMINE', label: 'Terminés' }, { id: 'ANNULE', label: 'Annulés' }
  ];
  trajetsFiltres = computed(() => this.trajets().filter(t => this.correspond(t, this.filtre())));
  passagersOuverts = signal<number | null>(null);
  passagers = signal<Record<number, Reservation[]>>({});
  chargementPassagers = signal(false);
  enPartage = signal<Set<number>>(new Set());
  private dernierEnvoi = new Map<number, number>();
  actionEnCours = signal<number | null>(null);
  showForm = signal(false);
  loading = signal(false);
  loadingTrajets = signal(true);
  trajets = signal<Trajet[]>([]);
  vehicules = signal<Vehicule[]>([]);
  error = signal('');
  success = signal('');
  today = (() => { const d = new Date(), p = (n: number) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; })();
  vehiculesCharges = signal(false);
  placesMax = signal(20);
  private route = inject(ActivatedRoute);
  private geo = inject(GeoService);
  trackingByTrajet = new Map<number, number>();

  form = this.fb.group({
    villeDepart: ['', Validators.required],
    villeArrivee: ['', Validators.required],
    dateDepart: [this.today, Validators.required],
    heureDepart: ['08:00', Validators.required],
    prixParPlace: [null as number|null, [Validators.required, Validators.min(100)]],
    nombrePlaces: [4, [Validators.required, Validators.min(1), Validators.max(20)]],
    vehiculeId: ['', Validators.required],
    pointsArret: [''],
    description: ['']
  }, { validators: trajetValide });

showVehiculeForm = signal(false);
vehiculeLoading  = signal(false);
vehiculeMsg      = signal('');
vehiculeErreur   = signal('');

vehiculeForm = this.fb.group({
  marque:         ['', Validators.required],
  modele:         ['', Validators.required],
  immatriculation:['', Validators.required],
  couleur:        ['', Validators.required],
  nombrePlaces:   [4, [Validators.required, Validators.min(1), Validators.max(20)]],
  annee:          ['']
});

ajouterVehicule() {
  if (this.vehiculeForm.invalid) return;
  const u = this.auth.currentUser();
  if (!u) return;

  this.vehiculeLoading.set(true);
  this.vehiculeErreur.set('');

  this.userSvc.ajouterVehicule(
    u.compteId,
    this.vehiculeForm.value
  ).subscribe({
    next: v => {
      this.vehicules.update(arr => [...arr, v]);
      this.form.patchValue({ vehiculeId: String(v.id) });
      this.vehiculeMsg.set(
        'Véhicule ajouté ! Vous pouvez maintenant publier un trajet.');
      this.vehiculeLoading.set(false);
      this.showVehiculeForm.set(false);
      this.vehiculeForm.reset({ nombrePlaces: 4 });
      setTimeout(() => this.vehiculeMsg.set(''), 3000);
    },
    error: err => {
      this.vehiculeErreur.set(
        err.error?.message || 'Erreur lors de l\'ajout');
      this.vehiculeLoading.set(false);
    }
  });
}

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private trajetSvc: TrajetService,
    private userSvc: UtilisateurService
  ) {
    // Bouton « Publier un trajet » de l'en-tête, y compris quand on est déjà sur cette page.
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe(q => {
      if (q.get('nouveau') && this.vehicules().length) this.showForm.set(true);
    });
    // Le nombre de places proposées ne peut pas dépasser la capacité du véhicule choisi.
    this.form.get('vehiculeId')!.valueChanges.pipe(takeUntilDestroyed()).subscribe(id => {
      const v = this.vehicules().find(x => String(x.id) === String(id));
      const max = v?.nombrePlaces ? Math.max(1, Math.min(20, v.nombrePlaces)) : 20;
      this.placesMax.set(max);
      const places = this.form.get('nombrePlaces')!;
      places.setValidators([Validators.required, Validators.min(1), Validators.max(max)]);
      if ((places.value ?? 0) > max) places.setValue(max);
      places.updateValueAndValidity();
    });
  }

  ngOnInit() {
    const u = this.auth.currentUser();
    if (!u) return;
    this.trajetSvc.getMesTrajets(u.compteId).subscribe({
      next: p => {
        this.trajets.set(p?.content ?? []);
        this.loadingTrajets.set(false);
      },
      error: err => { this.loadingTrajets.set(false); this.toast.error('Impossible de charger vos trajets', err); }
    });
    this.userSvc.getVehicules(u.compteId).subscribe({
      next: v => {
        this.vehicules.set(v ?? []);
        this.vehiculesCharges.set(true);
        if (v?.length === 1) this.form.patchValue({ vehiculeId: String(v[0].id) });
        // Bouton « Publier un trajet » de l'en-tête : /chauffeur/courses?nouveau=1
        if (v?.length && this.route.snapshot.queryParamMap.get('nouveau')) this.showForm.set(true);
      },
      error: () => { this.vehicules.set([]); this.vehiculesCharges.set(true); }
    });
  }

  basculerFormulaire() {
    this.showForm.update(v => !v);
    this.error.set('');
  }

  async publier() {
    if (this.form.invalid || this.loading()) return;
    const u = this.auth.currentUser();
    if (!u) return;
    this.loading.set(true); this.error.set('');
    const v = this.form.value;
    // Coordonnées des villes : la carte de suivi des passagers trace l'itinéraire réel.
    // Un échec de géocodage ne bloque pas la publication (la carte géocodera plus tard).
    const [dep, arr] = await Promise.all([this.geo.geocoder(v.villeDepart), this.geo.geocoder(v.villeArrivee)]);
    this.trajetSvc.creer(u.compteId, {
      latDepart: dep?.lat, lngDepart: dep?.lng,
      latArrivee: arr?.lat, lngArrivee: arr?.lng,
      vehiculeId: +v.vehiculeId!,
      villeDepart: v.villeDepart!,
      villeArrivee: v.villeArrivee!,
      dateDepart: v.dateDepart!,
      heureDepart: v.heureDepart!,
      prixParPlace: v.prixParPlace!,
      nombrePlaces: v.nombrePlaces!,
      pointsArret: v.pointsArret || undefined,
      description: v.description || undefined
    }).subscribe({
      next: t => {
        this.trajets.update(arr => [t, ...arr]);
        this.success.set('Trajet publié avec succès !');
        this.error.set('');
        this.toast.success('Trajet publié', `${t.villeDepart} → ${t.villeArrivee}`);
        this.filtre.set('actifs');
        setTimeout(() => this.success.set(''), 3000);
        this.showForm.set(false); this.loading.set(false);
        this.form.reset({ dateDepart: this.today, heureDepart: '08:00', nombrePlaces: Math.min(4, this.placesMax()), vehiculeId: this.vehicules().length === 1 ? String(this.vehicules()[0].id) : '' });
      },
      error: err => {
        const details = err.error?.details ? Object.values(err.error.details).join(' · ') : '';
        this.error.set(details || err.error?.message || 'Erreur lors de la publication');
        this.loading.set(false);
      }
    });
  }

  demarrer(t: Trajet) {
    const u = this.auth.currentUser(); if (!u || this.actionEnCours()) return;
    this.actionEnCours.set(t.id);
    this.trajetSvc.demarrer(t.id, u.compteId).subscribe({
      next: up => {
        this.actionEnCours.set(null);
        this.trajets.update(arr => arr.map(x => x.id === t.id ? up : x));
        this.toast.success('Trajet démarré', 'Bonne route ! Votre position est partagée avec vos passagers.');
        this.startLiveTracking(up);
      },
      error: err => { this.actionEnCours.set(null); this.toast.error('Impossible de démarrer', err); }
    });
  }

  terminer(t: Trajet) {
    const u = this.auth.currentUser(); if (!u || this.actionEnCours()) return;
    this.actionEnCours.set(t.id);
    this.trajetSvc.terminer(t.id, u.compteId).subscribe({
      next: up => {
        this.actionEnCours.set(null);
        this.trajets.update(arr => arr.map(x => x.id === t.id ? up : x));
        this.stopLiveTracking(t);
        this.toast.success('Trajet terminé', 'Le solde vous est versé dès que chaque passager confirme son arrivée (ou automatiquement après 2 h).');
      },
      error: err => { this.actionEnCours.set(null); this.toast.error('Impossible de terminer', err); }
    });
  }

  async annuler(t: Trajet) {
    const u = this.auth.currentUser(); if (!u || this.actionEnCours()) return;
    const ok = await this.confirm.ask({
      title: `Annuler ${t.villeDepart} → ${t.villeArrivee} ?`,
      message: 'Toutes les réservations de ce trajet seront annulées et les passagers intégralement remboursés.',
      confirmLabel: 'Annuler le trajet', cancelLabel: 'Retour', danger: true
    });
    if (!ok) return;
    this.actionEnCours.set(t.id);
    this.trajetSvc.annuler(t.id, u.compteId).subscribe({
      next: () => {
        this.actionEnCours.set(null);
        this.trajets.update(arr => arr.map(x => x.id === t.id ? {...x, statut: 'ANNULE' as any} : x));
        this.toast.success('Trajet annulé', 'Les réservations associées ont été annulées et remboursées.');
      },
      error: err => { this.actionEnCours.set(null); this.toast.error("Impossible d'annuler", err); }
    });
  }

  startLiveTracking(t: Trajet) {
    if (this.trackingByTrajet.has(t.id)) return;
    if (!('geolocation' in navigator)) {
      this.toast.warning('Géolocalisation indisponible', "Votre navigateur ne permet pas de partager la position.");
      return;
    }
    const watcherId = navigator.geolocation.watchPosition(
      pos => {
        // Au plus une position toutes les 10 s pour ne pas saturer le serveur.
        const now = Date.now();
        if (now - (this.dernierEnvoi.get(t.id) ?? 0) < 10000) return;
        this.dernierEnvoi.set(t.id, now);
        this.trajetSvc.updatePosition(t.id, {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          vitesse: pos.coords.speed ?? 0,
          positionActuelle: 'Trajet en cours'
        }).subscribe({ error: () => {} });
      },
      () => {
        this.toast.warning('Position non partagée', 'Autorisez la localisation dans votre navigateur pour que vos passagers vous suivent.');
        this.stopLiveTracking(t);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
    this.trackingByTrajet.set(t.id, watcherId);
    this.enPartage.update(s => new Set(s).add(t.id));
  }

  stopLiveTracking(t: Trajet) {
    const watcherId = this.trackingByTrajet.get(t.id);
    if (watcherId !== undefined && 'geolocation' in navigator) navigator.geolocation.clearWatch(watcherId);
    this.trackingByTrajet.delete(t.id);
    this.dernierEnvoi.delete(t.id);
    this.enPartage.update(s => { const n = new Set(s); n.delete(t.id); return n; });
  }

  ngOnDestroy() {
    if ('geolocation' in navigator) this.trackingByTrajet.forEach(id => navigator.geolocation.clearWatch(id));
    this.trackingByTrajet.clear();
  }

  // ─── Passagers d'un trajet ─────────────────────────────────────────────
  togglePassagers(t: Trajet) {
    if (this.passagersOuverts() === t.id) { this.passagersOuverts.set(null); return; }
    this.passagersOuverts.set(t.id);
    this.chargerPassagers(t);
  }

  private chargerPassagers(t: Trajet) {
    this.chargementPassagers.set(true);
    this.rezSvc.getPassagersTrajet(t.id).subscribe({
      next: p => {
        const list = (p.content ?? []).filter(r => r.statut !== 'ANNULEE' && r.statut !== 'REFUSEE');
        this.passagers.update(m => ({ ...m, [t.id]: list }));
        this.profils.charger(list.map(r => r.passagerId));
        this.chargementPassagers.set(false);
      },
      error: err => { this.chargementPassagers.set(false); this.toast.error('Passagers indisponibles', err); }
    });
  }

  surDecision(t: Trajet, e: { avant: Reservation; apres: Reservation | null }) {
    const { avant, apres } = e;
    this.passagers.update(m => ({
      ...m,
      [t.id]: apres ? (m[t.id] ?? []).map(x => x.id === avant.id ? apres : x) : (m[t.id] ?? []).filter(x => x.id !== avant.id)
    }));
    if (apres?.statut === 'ACCEPTEE') {
      this.trajets.update(arr => arr.map(x => x.id === t.id ? { ...x, placesDisponibles: Math.max(0, x.placesDisponibles - avant.nombrePlaces) } : x));
    }
  }

  // ─── Affichage ─────────────────────────────────────────────────────────
  private correspond(t: Trajet, f: FiltreTrajet) {
    return f === 'actifs' ? (t.statut === 'PLANIFIE' || t.statut === 'EN_COURS') : t.statut === f;
  }
  compter(f: FiltreTrajet) { return this.trajets().filter(t => this.correspond(t, f)).length; }
  places(t: Trajet): boolean[] {
    const pris = Math.max(0, t.nombrePlaces - t.placesDisponibles);
    return Array.from({ length: Math.min(t.nombrePlaces, 20) }, (_, i) => i < pris);
  }
  libelleStatut(s: string) {
    return ({ PLANIFIE: 'Planifié', EN_COURS: 'En cours', TERMINE: 'Terminé', ANNULE: 'Annulé' } as Record<string, string>)[s] ?? s;
  }
  libelleReservation(r: Reservation) {
    if (r.statut === 'ACCEPTEE' && r.embarquementConfirme) return 'À bord';
    return ({ EN_ATTENTE: 'En attente', ACCEPTEE: 'Confirmée', TERMINEE: 'Arrivé', REFUSEE: 'Refusée', ANNULEE: 'Annulée' } as Record<string, string>)[r.statut] ?? r.statut;
  }
  badgeReservation(r: Reservation) {
    return ({ EN_ATTENTE: 'lx-badge-warning', ACCEPTEE: r.embarquementConfirme ? 'lx-badge-gold' : 'lx-badge-info', TERMINEE: 'lx-badge-success' } as Record<string, string>)[r.statut] ?? 'lx-badge-danger';
  }

  getBadge(s: string) {
    return ({ PLANIFIE: 'lx-badge-info', EN_COURS: 'lx-badge-gold', TERMINE: 'lx-badge-success', ANNULE: 'lx-badge-danger' } as Record<string, string>)[s] ?? '';
  }
}
