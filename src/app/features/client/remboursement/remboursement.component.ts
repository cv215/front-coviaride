import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { espaceDe } from '../../../core/services/espace';
import { AuthService } from '../../../core/services/auth.service';
import { ReservationService } from '../../../core/services/reservation.service';
import {
  RemboursementService,
  DemandeRemboursement
} from '../../../core/services/remboursement.service';
import { Reservation } from '../../../core/models';
import { IconComponent } from '../../../shared/components/icon/icon.component';

@Component({
  selector: 'app-remboursement',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, IconComponent],
  templateUrl: './remboursement.component.html',
  styleUrl: './remboursement.component.scss'
})
export class RemboursementComponent implements OnInit{

  chargementRez = signal(true);
  chargement    = signal(false);
  reservations  = signal<Reservation[]>([]);
  mesDemandes   = signal<DemandeRemboursement[]>([]);
  rezChoisie    = signal<Reservation | null>(null);
  msgSuccess    = signal('');
  msgError      = signal('');

  motifs = [
    { value: 'TRAJET_ANNULE',    label: 'Trajet annulé par le chauffeur' },
    { value: 'CHAUFFEUR_ABSENT', label: 'Chauffeur absent au rendez-vous' },
    { value: 'QUALITE_SERVICE',  label: 'Problème de qualité de service' },
    { value: 'DOUBLE_PAIEMENT',  label: 'Double paiement par erreur' },
    { value: 'TRAJET_INCOMPLET', label: 'Trajet non effectué en totalité' },
    { value: 'AUTRE',            label: 'Autre raison' }
  ];

  form = this.fb.group({
    motif:   ['', Validators.required],
    details: ['', [Validators.required,
                   Validators.minLength(20),
                   Validators.maxLength(1000)]]
  });

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private rezSvc: ReservationService,
    private rembSvc: RemboursementService,
    private route: ActivatedRoute,
    router: Router
  ) {
    this.base = espaceDe(router.url);
  }

  readonly base: string;

  ngOnInit() {
    const u = this.auth.currentUser();
    if (!u) return;

    this.rezSvc.getMesReservations(u.compteId).subscribe({
      next: p => {
        // Plainte possible dès que le trajet est payé (acceptée), pendant ou après la course.
        const eligibles = p.content.filter(r => r.statut === 'TERMINEE' || r.statut === 'ACCEPTEE');
        this.reservations.set(eligibles);
        const id = Number(this.route.snapshot.queryParamMap.get('reservation'));
        if (id) this.rezChoisie.set(eligibles.find(r => r.id === id) ?? null);
        this.chargementRez.set(false);
      },
      error: () => this.chargementRez.set(false)
    });

    this.rembSvc.getMesDemandes(u.compteId).subscribe({
      next: p => this.mesDemandes.set(p.content),
      error: () => {}
    });
  }

  soumettre() {
    if (this.form.invalid || !this.rezChoisie()) {
      this.form.markAllAsTouched();
      return;
    }
    const u = this.auth.currentUser();
    if (!u) return;

    this.chargement.set(true);
    this.msgSuccess.set('');
    this.msgError.set('');

    this.rembSvc.soumettreDemande(u.compteId, {
      reservationId: this.rezChoisie()!.id,
      motif:         this.form.value.motif!,
      details:       this.form.value.details!
    }).subscribe({
      next: d => {
        this.mesDemandes.update(arr => [d, ...arr]);
        this.msgSuccess.set(
          'Demande #' + d.id + ' soumise ! Réponse sous 48h ouvrées.');
        this.chargement.set(false);
        this.form.reset();
        this.rezChoisie.set(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setTimeout(() => this.msgSuccess.set(''), 5000);
      },
      error: err => {
        this.msgError.set(
          err.error?.message || 'Erreur. Veuillez réessayer.');
        this.chargement.set(false);
      }
    });
  }

  f(name: string) { return this.form.get(name); }

  getStatutBadge(s: string) {
    return ({
      EN_ATTENTE: 'lx-badge-warning',
      EN_COURS:   'lx-badge-info',
      ACCEPTE:    'lx-badge-success',
      REFUSE:     'lx-badge-danger'
    } as Record<string,string>)[s] || '';
  }

  getStatutLabel(s: string) {
    return ({
      EN_ATTENTE: 'En attente',
      EN_COURS:   'En cours',
      ACCEPTE:    'Acceptée',
      REFUSE:     'Refusée'
    } as Record<string,string>)[s] || s;
  }

  getMotifLabel(m: string) {
    return this.motifs.find(x => x.value === m)?.label || m;
  }

  getEtapeCouleur(statut: string, etape: number): string {
    const niveaux: Record<string,number> = {
      EN_ATTENTE: 0, EN_COURS: 1, ACCEPTE: 2, REFUSE: 2
    };
    const n = niveaux[statut] ?? 0;
    if (etape > n) return '#2b2f3d';
    if (statut === 'REFUSE' && etape === 2) return '#e0534a';
    return '#c8922a';
  }
}
