import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { TrajetService } from '../../../core/services/trajet.service';
import { UtilisateurService } from '../../../core/services/utilisateur.service';
import { Trajet, Vehicule } from '../../../core/models';

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
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem">
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
            <label>Description (optionnel)</label>
            <textarea class="field" formControlName="description" rows="2" placeholder="Infos complémentaires..."></textarea>
          </div>
        </div>
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
      <div style="display:grid;grid-template-columns:1fr 1fr;
        gap:1rem;margin-bottom:1rem">
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

  @if (trajets().length === 0 && !loadingTrajets()) {
    <div class="card" style="text-align:center;padding:3rem">
      <p>Vous n'avez pas encore publié de trajet.</p>
    </div>
  } @else {
    <div style="display:flex;flex-direction:column;gap:1rem">
      @for (t of trajets(); track t.id) {
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:flex-start">
            <div>
              <div style="font-weight:700;font-size:1.05rem;margin-bottom:0.5rem">
                {{ t.villeDepart }} → {{ t.villeArrivee }}
              </div>
              <div style="display:flex;gap:1.5rem;font-size:0.85rem;color:var(--color-muted)">
                <span> {{ t.dateDepart }}</span>
                <span> {{ t.heureDepart }}</span>
                <span> {{ t.placesDisponibles }}/{{ t.nombrePlaces }} places</span>
              </div>
              @if (t.description) {
                <div style="font-size:0.85rem;color:var(--color-muted);margin-top:0.5rem">{{ t.description }}</div>
              }
            </div>
            <div style="text-align:right">
              <div style="font-size:1.25rem;font-weight:800;margin-bottom:0.5rem">{{ t.prixParPlace | number:'1.0-0' }} XAF</div>
              <span class="badge" [class]="getBadge(t.statut)">{{ t.statut }}</span>
            </div>
          </div>
          @if (t.statut === 'PLANIFIE') {
            <div style="display:flex;gap:0.5rem;margin-top:1rem;padding-top:1rem;border-top:1px solid var(--color-border)">
              <button class="btn btn-success btn-sm" (click)="demarrer(t)">▶ Démarrer</button>
              <button class="btn btn-danger btn-sm" (click)="annuler(t)">✕ Annuler</button>
            </div>
          }
          @if (t.statut === 'EN_COURS') {
            <div style="margin-top:1rem;padding-top:1rem;border-top:1px solid var(--color-border)">
              <button class="btn btn-success btn-sm" (click)="terminer(t)">✓ Terminer le trajet</button>
            </div>
          }
        </div>
      }
    </div>
  }
</div>`
})
export class CoursesComponent implements OnInit {
  showForm = signal(false);
  loading = signal(false);
  loadingTrajets = signal(true);
  trajets = signal<Trajet[]>([]);
  vehicules = signal<Vehicule[]>([]);
  error = signal('');
  success = signal('');
  today = new Date().toISOString().split('T')[0];

  form = this.fb.group({
    villeDepart: ['', Validators.required],
    villeArrivee: ['', Validators.required],
    dateDepart: [this.today, Validators.required],
    heureDepart: ['08:00', Validators.required],
    prixParPlace: [null as number|null, [Validators.required, Validators.min(100)]],
    nombrePlaces: [4, [Validators.required, Validators.min(1), Validators.max(20)]],
    vehiculeId: ['', Validators.required],
    description: ['']
  });

  // Signals à ajouter
showVehiculeForm = signal(false);
vehiculeLoading  = signal(false);
vehiculeMsg      = signal('');
vehiculeErreur   = signal('');

// Formulaire véhicule à ajouter dans le constructeur
vehiculeForm = this.fb.group({
  marque:         ['', Validators.required],
  modele:         ['', Validators.required],
  immatriculation:['', Validators.required],
  couleur:        ['', Validators.required],
  nombrePlaces:   [4, [Validators.required,
                  Validators.min(1), Validators.max(20)]],
  annee:          ['']
});

// Méthode à ajouter
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
      description: v.description || undefined
    }).subscribe({
      next: t => {
        this.trajets.update(arr => [t, ...arr]);
        this.success.set('Trajet publié avec succès !');
        this.showForm.set(false); this.loading.set(false); this.form.reset();
      },
      error: err => { this.error.set(err.error?.message || 'Erreur'); this.loading.set(false); }
    });
  }

  demarrer(t: Trajet) {
    const u = this.auth.currentUser(); if (!u) return;
    this.trajetSvc.demarrer(t.id, u.compteId).subscribe({
      next: up => this.trajets.update(arr => arr.map(x => x.id === t.id ? up : x))
    });
  }

  terminer(t: Trajet) {
    const u = this.auth.currentUser(); if (!u) return;
    this.trajetSvc.terminer(t.id, u.compteId).subscribe({
      next: up => this.trajets.update(arr => arr.map(x => x.id === t.id ? up : x))
    });
  }

  annuler(t: Trajet) {
    const u = this.auth.currentUser(); if (!u) return;
    this.trajetSvc.annuler(t.id, u.compteId).subscribe({
      next: () => this.trajets.update(arr => arr.map(x => x.id === t.id ? {...x, statut: 'ANNULE' as any} : x))
    });
  }

  getBadge(s: string) {
    return { 'PLANIFIE': 'badge badge-info', 'EN_COURS': 'badge badge-success',
      'TERMINE': 'badge badge-muted', 'ANNULE': 'badge badge-danger' }[s] || 'badge badge-muted';
  }
}
