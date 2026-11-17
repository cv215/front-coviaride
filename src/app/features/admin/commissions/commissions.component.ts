import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../../core/services/admin.service';

@Component({
  selector: 'app-commissions',
  standalone: true,
  imports: [CommonModule],
  template: `
<div>
  <h2 style="margin-bottom:0.5rem">Commissions & Finances</h2>
  <p style="margin-bottom:2rem">Suivi des revenus de la plateforme (5% par trajet finalisé)</p>

  <div class="stats-grid" style="margin-bottom:2rem">
    <div class="stat-card" style="background:linear-gradient(135deg,#0D0D0D,#1f1f2e);border-color:#0D0D0D">
      <div class="stat-info">
        <div class="value" style="color:white;font-size:2rem">{{ totalCommissions() | number:'1.0-0' }} XAF</div>
        <div class="label" style="color:rgba(255,255,255,0.6)">Commissions totales (5%)</div>
      </div>
    </div>
  </div>

  <!-- EXPLICATION DU MÉCANISME -->
  <div class="card" style="margin-bottom:2rem">
    <h3 style="margin-bottom:1rem"> Mécanisme de paiement sécurisé</h3>
    <div class="three-col-grid">
      <div style="text-align:center;padding:1.5rem;background:var(--color-bg);border-radius:var(--radius-md)">
        <div style="font-size:2rem;margin-bottom:0.5rem"></div>
        <div style="font-weight:700;margin-bottom:0.5rem">Étape 1 — Blocage</div>
        <p style="font-size:0.85rem">Lors de l'acceptation, le montant total est bloqué sur la plateforme</p>
      </div>
      <div style="text-align:center;padding:1.5rem;background:var(--color-bg);border-radius:var(--radius-md)">
        <div style="font-size:2rem;margin-bottom:0.5rem"></div>
        <div style="font-weight:700;margin-bottom:0.5rem">Étape 2 — Départ</div>
        <p style="font-size:0.85rem">Embarquement confirmé → 50% versés immédiatement au chauffeur</p>
      </div>
      <div style="text-align:center;padding:1.5rem;background:var(--color-bg);border-radius:var(--radius-md)">
        <div style="font-size:2rem;margin-bottom:0.5rem"></div>
        <div style="font-weight:700;margin-bottom:0.5rem">Étape 3 — Arrivée</div>
        <p style="font-size:0.85rem">Arrivée confirmée → 50% restants versés au chauffeur, <strong>5% déduits</strong> pour la plateforme</p>
      </div>
    </div>
  </div>

  <!-- EXEMPLE CHIFFRÉ -->
  <div class="card">
    <h3 style="margin-bottom:1.5rem"> Exemple de calcul (trajet 10 000 XAF)</h3>
    <div style="display:flex;flex-direction:column;gap:0.75rem">
      @for (step of exemple; track step.label) {
        <div style="display:flex;align-items:center;justify-content:space-between;padding:1rem;border-radius:var(--radius-md);"
          [style.background]="step.bg">
          <div>
            <div style="font-weight:600">{{ step.label }}</div>
            <div style="font-size:0.85rem;color:var(--color-muted)">{{ step.desc }}</div>
          </div>
          <div style="font-weight:800;font-size:1.1rem" [style.color]="step.color">{{ step.montant }}</div>
        </div>
      }
    </div>
  </div>
</div>`
})
export class CommissionsComponent implements OnInit {
  totalCommissions = signal(0);

  exemple = [
    { label: 'Montant total bloqué', desc: 'Payé par le passager', montant: '10 000 XAF', bg: '#F3F4F6', color: 'var(--color-primary)' },
    { label: 'Versement au départ (50%)', desc: 'Embarquement confirmé par le passager', montant: '5 000 XAF', bg: '#D1FAE5', color: 'var(--color-success)' },
    { label: 'Versement à l\'arrivée (50% − 5%)', desc: '50% restants moins la commission plateforme', montant: '4 750 XAF', bg: '#DBEAFE', color: 'var(--color-info)' },
    { label: 'Commission plateforme (5%)', desc: 'Prélevée sur la seconde moitié uniquement', montant: '250 XAF', bg: '#FEF3C7', color: 'var(--color-warning)' },
    { label: 'Total perçu par le chauffeur', desc: '5 000 + 4 750', montant: '9 750 XAF', bg: '#F0FDF4', color: 'var(--color-success)' }
  ];

  constructor(private adminSvc: AdminService) {}

  ngOnInit() {
    this.adminSvc.getCommissions().subscribe({
      next: r => this.totalCommissions.set(r.totalCommissions || 0),
      error: () => {}
    });
  }
}
