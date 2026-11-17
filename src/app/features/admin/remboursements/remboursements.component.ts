import { Component, OnInit, signal, inject } from '@angular/core';
import { ToastService, fcfa, messageErreur } from '../../../core/services/toast.service';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import {
  RemboursementService,
  DemandeRemboursement
} from '../../../core/services/remboursement.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';

@Component({
  selector: 'app-remboursements',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IconComponent],
  templateUrl: './remboursements.component.html',
  styleUrl: './remboursements.component.scss'
})
export class RemboursementsComponent implements OnInit {

  chargement        = signal(true);
  demandes          = signal<DemandeRemboursement[]>([]);
  stats             = signal<Record<string, number>>({});
  filtreActif       = signal('EN_ATTENTE');
  demandeOuverte    = signal<number | null>(null);
  traitementLoading = signal(false);
  erreurTraitement  = signal('');

  filtres = [
    { value: 'EN_ATTENTE', label: 'En attente' },
    { value: 'ACCEPTE',    label: 'Acceptées'  },
    { value: 'REFUSE',     label: 'Refusées'   },
    { value: '',           label: 'Toutes'     }
  ];

  formTraitement = this.fb.group({
    accepte:     [null as boolean | null, Validators.required],
    commentaire: ['', [Validators.required, Validators.minLength(5)]]
  });

  private toast = inject(ToastService);

  constructor(
    private fb: FormBuilder,
    private rembSvc: RemboursementService
  ) {}

  ngOnInit() {
    this.charger();
    this.chargerStats();
  }

  chargerStats() {
    this.rembSvc.getStats().subscribe({ next: s => this.stats.set(s ?? {}), error: () => {} });
  }

  charger() {
    this.chargement.set(true);
    this.rembSvc.getAllDemandes(this.filtreActif()).subscribe({
      next: p => {
        this.demandes.set(p?.content ?? []);
        this.chargement.set(false);
      },
      error: err => { this.chargement.set(false); this.toast.error('Chargement impossible', err); }
    });
  }

  ouvrirForm(d: DemandeRemboursement) {
    this.demandeOuverte.set(d.id);
    this.formTraitement.reset();
    this.erreurTraitement.set('');
  }

  traiter(d: DemandeRemboursement) {
    if (this.formTraitement.invalid) {
      this.formTraitement.markAllAsTouched();
      return;
    }
    this.traitementLoading.set(true);
    this.erreurTraitement.set('');

    const v = this.formTraitement.value;
    this.rembSvc.traiterDemande(d.id, v.accepte!, v.commentaire!).subscribe({
      next: updated => {
        this.demandes.update(arr =>
          arr.map(x => x.id === d.id ? updated : x));
        if (this.filtreActif() === 'EN_ATTENTE') {
          this.demandes.update(arr => arr.filter(x => x.id !== d.id));
        }
        this.demandeOuverte.set(null);
        this.traitementLoading.set(false);
        this.toast.success(v.accepte ? 'Remboursement accepté' : 'Demande refusée',
          v.accepte ? `${fcfa(updated?.montant ?? d.montant)} crédités au passager #${updated?.passagerId ?? d.passagerId}` : `Demande #${d.id}`);
        this.chargerStats();
      },
      error: err => {
        this.erreurTraitement.set(messageErreur(err, 'Erreur lors du traitement'));
        this.traitementLoading.set(false);
      }
    });
  }

  getBadge(s: string) {
    return ({
      EN_ATTENTE: 'lx-badge-warning',
      EN_COURS:   'lx-badge-info',
      ACCEPTE:    'lx-badge-success',
      REFUSE:     'lx-badge-danger'
    } as Record<string,string>)[s] || '';
  }

  getLabel(s: string) {
    return ({
      EN_ATTENTE: 'En attente',
      EN_COURS:   'En cours',
      ACCEPTE:    'Acceptée',
      REFUSE:     'Refusée'
    } as Record<string,string>)[s] || s;
  }

  getMotifLabel(m: string) {
    const labels: Record<string,string> = {
      TRAJET_ANNULE:    'Trajet annulé',
      CHAUFFEUR_ABSENT: 'Chauffeur absent',
      QUALITE_SERVICE:  'Qualité de service',
      DOUBLE_PAIEMENT:  'Double paiement',
      TRAJET_INCOMPLET: 'Trajet incomplet',
      AUTRE:            'Autre'
    };
    return labels[m] || m;
  }
}
