import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UtilisateurService } from '../../../core/services/utilisateur.service';
import { Utilisateur } from '../../../core/models';

@Component({
  selector: 'app-drivers-kyc',
  standalone: true,
  imports: [CommonModule],
  template: `
<div>
  <div style="margin-bottom:2rem">
    <h2>Validation KYC Chauffeurs</h2>
    <p>Vérification des permis, CNI, assurance et carte grise</p>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:2rem">
    <div class="card" style="border-left:4px solid var(--color-warning)">
      <div style="font-size:0.8rem;font-weight:600;color:var(--color-warning);margin-bottom:0.25rem">EN ATTENTE</div>
      <div style="font-size:2rem;font-weight:800">{{ enAttente().length }}</div>
    </div>
    <div class="card" style="border-left:4px solid var(--color-success)">
      <div style="font-size:0.8rem;font-weight:600;color:var(--color-success);margin-bottom:0.25rem">VALIDÉS</div>
      <div style="font-size:2rem;font-weight:800">{{ valides().length }}</div>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem">
    <!-- EN ATTENTE -->
    <div>
      <h3 style="margin-bottom:1rem"> En attente de validation</h3>
      @if (enAttente().length === 0) {
        <div class="card" style="text-align:center;padding:2rem">
          <p style="color:var(--color-success)">✓ Tous les chauffeurs sont validés</p>
        </div>
      }
      @for (c of enAttente(); track c.id) {
        <div class="card" style="margin-bottom:1rem">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:1rem">
            <div>
              <div style="font-weight:700">{{ c.prenom }} {{ c.nom }}</div>
              <div style="font-size:0.85rem;color:var(--color-muted)">{{ c.email }}</div>
            </div>
            <span class="badge badge-warning">Non validé</span>
          </div>
          <div style="display:flex;flex-direction:column;gap:0.4rem;margin-bottom:1rem;font-size:0.85rem">
            <div style="display:flex;align-items:center;gap:0.5rem">
              <span [style.color]="c.permisValide ? 'var(--color-success)' : 'var(--color-danger)'">
                {{ c.permisValide ? '✓' : '✕' }}
              </span>
              Permis de conduire
            </div>
            <div style="display:flex;align-items:center;gap:0.5rem">
              <span [style.color]="c.kycValide ? 'var(--color-success)' : 'var(--color-danger)'">
                {{ c.kycValide ? '✓' : '✕' }}
              </span>
              CNI / Pièce d'identité
            </div>
            @if (c.vehicules?.length) {
              <div style="display:flex;align-items:center;gap:0.5rem">
                <span style="color:var(--color-success)">✓</span>
                Véhicule : {{ c.vehicules![0].marque }} {{ c.vehicules![0].modele }}
              </div>
            } @else {
              <div style="display:flex;align-items:center;gap:0.5rem">
                <span style="color:var(--color-warning)">⚠</span>
                Aucun véhicule enregistré
              </div>
            }
          </div>
          <div style="display:flex;gap:0.5rem">
            <button class="btn btn-success btn-sm" (click)="validerKyc(c)">✓ Valider KYC</button>
            <button class="btn btn-danger btn-sm" (click)="bloquer(c)">✕ Refuser</button>
          </div>
        </div>
      }
    </div>

    <!-- VALIDÉS -->
    <div>
      <h3 style="margin-bottom:1rem">✅ Chauffeurs validés</h3>
      @for (c of valides(); track c.id) {
        <div class="card" style="margin-bottom:1rem">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <div>
              <div style="font-weight:600">{{ c.prenom }} {{ c.nom }}</div>
              <div style="font-size:0.85rem;color:var(--color-muted)">{{ c.email }}</div>
              @if (c.vehicules?.length) {
                <div style="font-size:0.8rem;color:var(--color-muted);margin-top:0.25rem">
                  {{ c.vehicules![0].marque }} {{ c.vehicules![0].modele }}
                </div>
              }
            </div>
            <div style="text-align:right">
              <span class="badge badge-success">KYC ✓</span>
              <div style="font-size:0.8rem;color:var(--color-muted);margin-top:0.25rem">
                ★ {{ c.noteMoyenne | number:'1.1-1' }}
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  </div>
</div>`
})
export class DriversKycComponent implements OnInit {
  loading = signal(true);
  chauffeurs = signal<Utilisateur[]>([]);

  enAttente() { return this.chauffeurs().filter(c => !c.kycValide); }
  valides()   { return this.chauffeurs().filter(c => c.kycValide); }

  constructor(private userSvc: UtilisateurService) {}

  ngOnInit() {
    this.userSvc.getAllAdmin(0).subscribe({
      next: p => {
        this.chauffeurs.set(p.content.filter(u => u.role === 'CHAUFFEUR' || u.role === 'PASSAGER_ET_CHAUFFEUR'));
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  validerKyc(c: Utilisateur) {
    this.userSvc.validerKyc(c.id).subscribe({
      next: updated => this.chauffeurs.update(arr => arr.map(x => x.id === c.id ? updated : x))
    });
  }

  bloquer(c: Utilisateur) {
    this.userSvc.changerStatut(c.id, 'BLOQUE').subscribe({
      next: updated => this.chauffeurs.update(arr => arr.map(x => x.id === c.id ? updated : x))
    });
  }
}
