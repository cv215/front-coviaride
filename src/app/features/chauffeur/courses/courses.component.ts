import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
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
  imports: [CommonModule, ReactiveFormsModule],
  template: `
<div>
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:2rem">
    <div><h2>Mes trajets</h2><p>Publiez et gérez vos trajets</p></div>
    <button class="btn btn-primary" (click)="showForm.set(!showForm())">
      {{ showForm() ? '✕ Annuler' : '+ Nouveau trajet' }}
    </button>
  </div>

  @if (showForm()) {
    <div class="card" style="margin-bottom:2rem">
      <h3 style="margin-bottom:1.5rem">Publier un nouveau trajet</h3>
      <form [formGroup]="form" (ngSubmit)="publier()">
        <div class="course-form-grid">
          <div class="form-group">
            <label>Ville de départ *</label>
            <input type="text" class="field" formControlName="villeDepart" placeholder="ex: Yaoundé"/>
          </div>
          <div class="form-group">
            <label>Ville d'arrivée *</label>
            <input type="text" class="field" formControlName="villeArrivee" placeholder="ex: Douala"/>
          </div>
          <div class="form-group">
            <label>Date *</label>
            <input type="date" class="field" formControlName="dateDepart" [min]="today"/>
          </div>
          <div class="form-group">
            <label>Heure de départ *</label>
            <input type="time" class="field" formControlName="heureDepart"/>
          </div>
          <div class="form-group">
            <label>Prix par place (XAF) *</label>
            <input type="number" class="field" formControlName="prixParPlace" placeholder="ex: 3000" min="100"/>
          </div>
          <div class="form-group">
            <label>Nombre de places *</label>
            <input type="number" class="field" formControlName="nombrePlaces" min="1" max="20"/>
          </div>
          <div class="form-group" style="grid-column:1/-1">
            <label>Véhicule *</label>
            <select class="field" formControlName="vehiculeId">
              <option value="">Sélectionner un véhicule</option>
              @for (v of vehicules(); track v.id) {
                <option [value]="v.id">{{ v.marque }} {{ v.modele }} - {{ v.immatriculation }}</option>
              }
            </select>
          </div>
          <div class="form-group" style="grid-column:1/-1">
            <label>Points d'arrêt facultatifs</label>
            <textarea class="field" formControlName="pointsArret" rows="2" placeholder="Edea:2500;Bafoussam:4200;Bertoua:5500"></textarea>
            <small style="color:var(--color-muted);display:block;margin-top:0.35rem">Format: nom:prix;nom:prix. Exemple: Edea:2500;Bafoussam:4200</small>
          </div>
          <div class="form-group" style="grid-column:1/-1">
            <label>Description (optionnel)</label>
            <textarea class="field" formControlName="description" rows="2" placeholder="nous nous rencontrerons à tradex éléveur à 10h pour le départ..."></textarea>
          </div>
        </div>
        @if (form.hasError('memesVilles')) { <div class="alert alert-error" style="margin-bottom:1rem">La ville d'arrivée doit être différente de la ville de départ.</div> }
        @if (form.hasError('arrets')) { <div class="alert alert-error" style="margin-bottom:1rem">Points d'arrêt : utilisez le format Ville:prix;Ville:prix (ex : Edea:2500).</div> }
        @if (error()) { <div class="alert alert-error" style="margin-bottom:1rem">{{ error() }}</div> }
        @if (success()) { <div class="alert alert-success" style="margin-bottom:1rem">{{ success() }}</div> }
        <div style="display:flex;gap:0.75rem">
          <button type="submit" class="btn btn-primary" [disabled]="loading() || form.invalid">
            {{ loading() ? 'Publication...' : 'Publier le trajet' }}
          </button>
          <button type="button" class="btn btn-outline" (click)="showForm.set(false)">Annuler</button>
        </div>
      </form>
    </div>
  }

  <!-- ALERTE SI PAS DE VÉHICULE -->
@if (vehicules().length === 0 && !loadingTrajets()) {
  <div style="background:#FEF3C7;border:1px solid #FDE68A;
    border-radius:var(--radius-md);padding:1.25rem;
    margin-bottom:1.5rem">
    <div style="font-weight:600;color:#92400E;margin-bottom:0.5rem">
      ⚠️ Aucun véhicule enregistré
    </div>
    <p style="font-size:0.875rem;color:#92400E;margin-bottom:1rem">
      Vous devez d'abord enregistrer un véhicule pour publier un trajet.
    </p>
    <button class="btn btn-sm btn-primary"
      (click)="showVehiculeForm.set(true)">
      + Ajouter un véhicule
    </button>
  </div>
}

<!-- FORMULAIRE AJOUT VÉHICULE -->
@if (showVehiculeForm()) {
  <div class="card" style="margin-bottom:1.5rem">
    <h3 style="margin-bottom:1.5rem">Ajouter un véhicule</h3>
    <form [formGroup]="vehiculeForm" (ngSubmit)="ajouterVehicule()">
      <div class="vehicle-form-grid">
        <div class="form-group">
          <label>Marque *</label>
          <input type="text" class="field"
            formControlName="marque" placeholder="ex: Toyota"/>
        </div>
        <div class="form-group">
          <label>Modèle *</label>
          <input type="text" class="field"
            formControlName="modele" placeholder="ex: Corolla"/>
        </div>
        <div class="form-group">
          <label>Immatriculation *</label>
          <input type="text" class="field"
            formControlName="immatriculation"
            placeholder="ex: LT-1234-A"/>
        </div>
        <div class="form-group">
          <label>Couleur *</label>
          <input type="text" class="field"
            formControlName="couleur" placeholder="ex: Blanc"/>
        </div>
        <div class="form-group">
          <label>Nombre de places *</label>
          <input type="number" class="field"
            formControlName="nombrePlaces"
            min="1" max="20"/>
        </div>
        <div class="form-group">
          <label>Année</label>
          <input type="text" class="field"
            formControlName="annee"
            placeholder="ex: 2020"/>
        </div>
      </div>

      @if (vehiculeMsg()) {
        <div class="alert alert-success"
          style="margin-bottom:1rem">
          ✓ {{ vehiculeMsg() }}
        </div>
      }
      @if (vehiculeErreur()) {
        <div class="alert alert-error"
          style="margin-bottom:1rem">
          {{ vehiculeErreur() }}
        </div>
      }

      <div style="display:flex;gap:0.75rem">
        <button type="submit" class="btn btn-primary"
          [disabled]="vehiculeForm.invalid || vehiculeLoading()">
          {{ vehiculeLoading() ? 'Ajout...' : 'Ajouter le véhicule' }}
        </button>
        <button type="button" class="btn btn-outline"
          (click)="showVehiculeForm.set(false)">
          Annuler
        </button>
      </div>
    </form>
  </div>
}

  <div class="trip-tabs">
    @for (f of filtresTrajet; track f.id) {
      <button class="trip-tab" [class.on]="filtre() === f.id" (click)="filtre.set(f.id)">
        {{ f.label }} <span>{{ compter(f.id) }}</span>
      </button>
    }
  </div>

  @if (loadingTrajets()) {
    <div class="card" style="text-align:center;padding:2rem;color:var(--color-muted)">Chargement de vos trajets…</div>
  } @else if (trajetsFiltres().length === 0) {
    <div class="card" style="text-align:center;padding:3rem">
      <p>{{ trajets().length === 0 ? "Vous n'avez pas encore publié de trajet." : 'Aucun trajet dans cette catégorie.' }}</p>
      @if (vehicules().length > 0) {
        <button class="btn btn-primary btn-sm" style="margin-top:1rem" (click)="showForm.set(true)">+ Publier un trajet</button>
      }
    </div>
  } @else {
    <div style="display:flex;flex-direction:column;gap:1rem">
      @for (t of trajetsFiltres(); track t.id) {
        <div class="card trip" [class.trip-live]="t.statut === 'EN_COURS'">
          <div class="trip-top">
            <div>
              <div class="trip-route">{{ t.villeDepart }} → {{ t.villeArrivee }}</div>
              <div class="trip-meta">
                <span>📅 {{ t.dateDepart | date:'EEE d MMM':'':'fr' }}</span>
                <span>🕐 {{ (t.heureDepart || '').slice(0,5) }}</span>
                <span>💺 {{ t.nombrePlaces - t.placesDisponibles }}/{{ t.nombrePlaces }} réservées</span>
              </div>
              <div class="seats" aria-hidden="true">
                @for (i of places(t); track $index) { <span class="seat" [class.taken]="i"></span> }
              </div>
              @if (t.pointsArret) { <div class="trip-desc">Arrêts : {{ t.pointsArret.split(';').join(' · ') }}</div> }
              @if (t.description) { <div class="trip-desc">{{ t.description }}</div> }
            </div>
            <div style="text-align:right">
              <div class="trip-price">{{ t.prixParPlace | number:'1.0-0':'fr' }} FCFA</div>
              <span class="badge" [class]="getBadge(t.statut)">{{ libelleStatut(t.statut) }}</span>
            </div>
          </div>

          <div class="trip-actions">
            @if (t.statut === 'PLANIFIE' || t.statut === 'EN_COURS') {
              <button class="btn btn-outline btn-sm" (click)="togglePassagers(t)">
                👥 Passagers {{ passagersOuverts() === t.id ? '▲' : '▼' }}
              </button>
            }
            @if (t.statut === 'PLANIFIE') {
              <button class="btn btn-success btn-sm" (click)="demarrer(t)" [disabled]="actionEnCours() === t.id">▶ Démarrer</button>
              <button class="btn btn-danger btn-sm" (click)="annuler(t)" [disabled]="actionEnCours() === t.id">✕ Annuler</button>
            }
            @if (t.statut === 'EN_COURS') {
              @if (enPartage().has(t.id)) {
                <span class="live"><span class="live-dot"></span> Position partagée</span>
                <button class="btn btn-outline btn-sm" (click)="stopLiveTracking(t)">⏸ Arrêter le partage</button>
              } @else {
                <button class="btn btn-outline btn-sm" (click)="startLiveTracking(t)">📍 Partager ma position</button>
              }
              <button class="btn btn-success btn-sm" (click)="terminer(t)" [disabled]="actionEnCours() === t.id">✓ Terminer le trajet</button>
            }
          </div>

          @if (passagersOuverts() === t.id) {
            <div class="pax">
              @if (chargementPassagers()) {
                <div class="pax-empty">Chargement des passagers…</div>
              } @else if (!passagers()[t.id]?.length) {
                <div class="pax-empty">Aucune réservation pour ce trajet pour l'instant.</div>
              } @else {
                @for (r of passagers()[t.id]; track r.id) {
                  <div class="pax-row">
                    <div>
                      <strong>Passager #{{ r.passagerId }}</strong>
                      <span class="pax-sub"> · {{ r.nombrePlaces }} place(s){{ r.pointArret ? ' · arrêt ' + r.pointArret : '' }} · {{ (r.montantTotal ?? 0) | number:'1.0-0':'fr' }} FCFA</span>
                    </div>
                    <div class="pax-right">
                      <span class="badge" [class]="badgeReservation(r)">{{ libelleReservation(r) }}</span>
                      @if (r.statut === 'EN_ATTENTE') {
                        <button class="btn btn-success btn-sm" (click)="accepterReservation(t, r)" [disabled]="actionEnCours() === r.id">Accepter</button>
                        <button class="btn btn-outline btn-sm" (click)="refuserReservation(t, r)" [disabled]="actionEnCours() === r.id">Refuser</button>
                      }
                    </div>
                  </div>
                }
              }
            </div>
          }
        </div>
      }
    </div>
  }
</div>`,
  styles: [`
    .trip-tabs { display:flex; gap:.4rem; flex-wrap:wrap; margin-bottom:1rem; }
    .trip-tab { border:1px solid var(--color-border); background:#fff; border-radius:999px; padding:.4rem .9rem; font-weight:600; font-size:.85rem; cursor:pointer; color:var(--color-muted); }
    .trip-tab span { opacity:.7; margin-left:.2rem; }
    .trip-tab.on { background:var(--color-primary); color:#fff; border-color:var(--color-primary); }
    .trip { transition: box-shadow .2s, border-color .2s; }
    .trip:hover { box-shadow: var(--shadow-md); }
    .trip-live { border-left: 4px solid var(--color-success); }
    .trip-top { display:flex; justify-content:space-between; gap:1rem; flex-wrap:wrap; }
    .trip-route { font-weight:700; font-size:1.05rem; margin-bottom:.4rem; }
    .trip-meta { display:flex; gap:1.2rem; flex-wrap:wrap; font-size:.85rem; color:var(--color-muted); }
    .trip-desc { font-size:.85rem; color:var(--color-muted); margin-top:.4rem; }
    .trip-price { font-size:1.2rem; font-weight:800; margin-bottom:.4rem; }
    .seats { display:flex; gap:4px; margin-top:.5rem; flex-wrap:wrap; }
    .seat { width:14px; height:14px; border-radius:4px; background:#E5E7EB; }
    .seat.taken { background:var(--color-accent); }
    .trip-actions { display:flex; gap:.5rem; flex-wrap:wrap; align-items:center; margin-top:1rem; padding-top:1rem; border-top:1px solid var(--color-border); }
    .trip-actions:empty { display:none; }
    .live { display:inline-flex; align-items:center; gap:.4rem; font-size:.82rem; font-weight:600; color:var(--color-success); }
    .live-dot { width:8px; height:8px; border-radius:50%; background:var(--color-success); animation:pulse 1.5s infinite; }
    .pax { margin-top:1rem; border:1px solid var(--color-border); border-radius:var(--radius-md); overflow:hidden; }
    .pax-row { display:flex; justify-content:space-between; align-items:center; gap:.75rem; flex-wrap:wrap; padding:.75rem 1rem; border-bottom:1px solid var(--color-border); font-size:.9rem; }
    .pax-row:last-child { border-bottom:none; }
    .pax-sub { color:var(--color-muted); }
    .pax-right { display:flex; gap:.4rem; align-items:center; flex-wrap:wrap; }
    .pax-empty { padding:1rem; color:var(--color-muted); font-size:.9rem; text-align:center; }
  `]
})
export class CoursesComponent implements OnInit, OnDestroy {
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);
  private rezSvc = inject(ReservationService);

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
  today = new Date().toISOString().split('T')[0];
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
  ) {}

  ngOnInit() {
    const u = this.auth.currentUser();
    if (!u) return;
    this.trajetSvc.getMesTrajets(u.compteId).subscribe({
      next: p => { 
        this.trajets.set(p.content); 
        this.loadingTrajets.set(false); },
        error: () => this.loadingTrajets.set(false)
    });
    this.userSvc.getVehicules(u.compteId).subscribe({
      next: v =>{
        console.log('[DEBUG] Véhicules recus :', v);
        this.vehicules.set(v);

        if (!v || v.length ===0){
          this.error.set(
            'Aucun véhicule enregistré. Ajoutez-en un ci-dessous.'
          );
        }
      },
        error: err => {
          console.error('[DEBUG] Erreur véhicules :', err);
          this.vehicules.set([]);
        }
    });
  }

  publier() {
    if (this.form.invalid) return;
    const u = this.auth.currentUser();
    if (!u) return;
    this.loading.set(true); this.error.set('');
    const v = this.form.value;
    this.trajetSvc.creer(u.compteId, {
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
        this.toast.success('Trajet publié', `${t.villeDepart} → ${t.villeArrivee}`);
        this.filtre.set('actifs');
        setTimeout(() => this.success.set(''), 3000);
        this.showForm.set(false); this.loading.set(false);
        this.form.reset({ dateDepart: this.today, heureDepart: '08:00', nombrePlaces: 4, vehiculeId: '' });
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
        this.chargementPassagers.set(false);
      },
      error: err => { this.chargementPassagers.set(false); this.toast.error('Passagers indisponibles', err); }
    });
  }

  accepterReservation(t: Trajet, r: Reservation) {
    const u = this.auth.currentUser(); if (!u) return;
    this.actionEnCours.set(r.id);
    this.rezSvc.accepter(r.id, u.compteId, Number(r.prixParPlace ?? 0)).subscribe({
      next: maj => {
        this.actionEnCours.set(null);
        this.passagers.update(m => ({ ...m, [t.id]: (m[t.id] ?? []).map(x => x.id === r.id ? { ...x, ...maj } : x) }));
        this.trajets.update(arr => arr.map(x => x.id === t.id ? { ...x, placesDisponibles: Math.max(0, x.placesDisponibles - r.nombrePlaces) } : x));
        this.toast.success('Réservation acceptée', `Passager #${r.passagerId} · ${r.nombrePlaces} place(s)`);
      },
      error: err => { this.actionEnCours.set(null); this.toast.error("Impossible d'accepter", err); }
    });
  }

  refuserReservation(t: Trajet, r: Reservation) {
    const u = this.auth.currentUser(); if (!u) return;
    this.actionEnCours.set(r.id);
    this.rezSvc.refuser(r.id, u.compteId).subscribe({
      next: () => {
        this.actionEnCours.set(null);
        this.passagers.update(m => ({ ...m, [t.id]: (m[t.id] ?? []).filter(x => x.id !== r.id) }));
        this.toast.info('Réservation refusée');
      },
      error: err => { this.actionEnCours.set(null); this.toast.error('Impossible de refuser', err); }
    });
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
    return ({ EN_ATTENTE: 'badge badge-warning', ACCEPTEE: 'badge badge-info', TERMINEE: 'badge badge-success' } as Record<string, string>)[r.statut] ?? 'badge badge-muted';
  }

  getBadge(s: string) {
    return { 'PLANIFIE': 'badge badge-info', 'EN_COURS': 'badge badge-success',
      'TERMINE': 'badge badge-muted', 'ANNULE': 'badge badge-danger' }[s] || 'badge badge-muted';
  }
}
