import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';

/**
 * Taux appliqué par service-portefeuille (PortefeuilleService.TAUX_COMMISSION),
 * prélevé sur la seconde moitié du paiement, au moment de l'arrivée.
 */
const TAUX_COMMISSION = 0.10;

@Component({
  selector: 'app-commissions',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
<div class="lx-page">
  <div class="lx-page-head">
    <div>
      <span class="lx-eyebrow">Finances</span>
      <h2>Commissions</h2>
      <p>La plateforme prélève {{ tauxPct }} % sur la seconde moitié de chaque course, au moment de l'arrivée.</p>
    </div>
    <button class="lx-btn lx-btn-secondary" (click)="charger()" [disabled]="chargement()"><lx-icon name="refresh" [class.lx-spin]="chargement()" /> Actualiser</button>
  </div>

  <section class="lx-card lx-card-glow total lx-rise">
    <div class="lx-row" style="justify-content:space-between">
      <span class="lx-mono brand">COVIARIDE · PLATEFORME</span>
      <span class="lx-icon-tile is-gold"><lx-icon name="tag" /></span>
    </div>
    <div class="lx-muted" style="font-size:.8rem;margin-top:1.25rem">Commissions perçues au total</div>
    <div class="amount lx-display">{{ totalCommissions() | number:'1.0-0' }} <span>FCFA</span></div>
  </section>

  <section style="margin-top:2rem">
    <div class="lx-section-head"><h3>Comment l'argent circule</h3></div>
    <div class="steps">
      @for (e of etapes; track e.titre; let i = $index) {
        <div class="lx-card step">
          <span class="step-n lx-display">0{{ i + 1 }}</span>
          <span class="lx-icon-tile is-soft"><lx-icon [name]="e.icon" /></span>
          <h4>{{ e.titre }}</h4>
          <p>{{ e.texte }}</p>
        </div>
      }
    </div>
  </section>

  <section style="margin-top:2rem">
    <div class="lx-section-head"><h3>Exemple pour une course de {{ exempleMontant | number }} FCFA</h3></div>
    <div class="lx-list">
      @for (l of exemple; track l.label) {
        <div class="lx-list-item" style="cursor:default">
          <span class="lx-list-body">
            <span class="lx-list-title">{{ l.label }}</span>
            <span class="lx-list-sub">{{ l.desc }}</span>
          </span>
          <span class="lx-mono value" [style.color]="l.couleur">{{ l.montant | number:'1.0-0' }} FCFA</span>
        </div>
      }
    </div>
  </section>
</div>`,
  styles: [`
    :host { display: block; }
    .total { padding: 1.5rem; }
    .brand { font-size: 0.68rem; letter-spacing: 0.18em; color: var(--lx-primary); }
    .amount { font-size: clamp(2rem, 6vw, 2.75rem); line-height: 1.1; span { font-family: var(--lx-font-body); font-size: 1rem; color: var(--lx-muted-fg); } }
    .steps { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; }
    .step { position: relative; padding: 1.25rem; h4 { font-size: 1.05rem; margin: 0.9rem 0 0.4rem; } p { margin: 0; font-size: 0.82rem; line-height: 1.55; } }
    .step-n { position: absolute; top: 1rem; right: 1.15rem; font-size: 2rem; color: rgba(200, 146, 42, 0.18); line-height: 1; }
    .value { font-size: 0.9rem; white-space: nowrap; }
    @media (max-width: 760px) { .steps { grid-template-columns: 1fr; } }
  `]
})
export class CommissionsComponent implements OnInit {
  private adminSvc = inject(AdminService);
  private toast = inject(ToastService);

  totalCommissions = signal(0);
  chargement = signal(false);

  readonly tauxPct = TAUX_COMMISSION * 100;
  readonly exempleMontant = 10000;

  readonly etapes = [
    { icon: 'lock', titre: 'Blocage', texte: "À l'acceptation du chauffeur, le montant total est bloqué sur le portefeuille du passager." },
    { icon: 'navigation', titre: 'Embarquement', texte: 'Le passager confirme être monté : 50 % sont versés immédiatement au chauffeur.' },
    { icon: 'check-circle', titre: 'Arrivée', texte: `Le passager confirme son arrivée : le reste est versé, moins ${TAUX_COMMISSION * 100} % de commission.` },
  ];

  readonly exemple = (() => {
    const total = this.exempleMontant;
    const moitie = total / 2;
    const commission = moitie * TAUX_COMMISSION;
    return [
      { label: 'Montant bloqué', desc: 'Payé par le passager', montant: total, couleur: 'var(--lx-fg)' },
      { label: 'Versement à l’embarquement (50 %)', desc: 'Versé au chauffeur au départ', montant: moitie, couleur: 'var(--lx-emerald)' },
      { label: `Versement à l’arrivée (50 % − ${TAUX_COMMISSION * 100} %)`, desc: 'Seconde moitié moins la commission', montant: moitie - commission, couleur: 'var(--lx-emerald)' },
      { label: `Commission plateforme (${TAUX_COMMISSION * 100} % de la 2ᵉ moitié)`, desc: 'Revenu de Coviaride', montant: commission, couleur: 'var(--lx-primary)' },
      { label: 'Total perçu par le chauffeur', desc: `${moitie} + ${moitie - commission}`, montant: total - commission, couleur: 'var(--lx-fg)' },
    ];
  })();

  ngOnInit() { this.charger(); }

  charger() {
    this.chargement.set(true);
    this.adminSvc.getCommissions().subscribe({
      next: r => { this.totalCommissions.set(r?.totalCommissions || 0); this.chargement.set(false); },
      error: err => { this.chargement.set(false); this.toast.error('Commissions indisponibles', err); }
    });
  }
}
