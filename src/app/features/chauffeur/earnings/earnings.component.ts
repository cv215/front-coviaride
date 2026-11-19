import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ToastService, fcfa, messageErreur } from '../../../core/services/toast.service';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { PortefeuilleService } from '../../../core/services/portefeuille.service';
import { Portefeuille, Transaction } from '../../../core/models';
import { IconComponent } from '../../../shared/components/icon/icon.component';

@Component({
  selector: 'app-earnings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IconComponent],
  template: `
<div class="lx-page">
  <div class="lx-page-head">
    <div>
      <span class="lx-eyebrow">Revenus</span>
      <h2>Votre portefeuille</h2>
      <p>Les paiements des passagers sont versés à l'embarquement puis à l'arrivée.</p>
    </div>
    <button class="lx-btn lx-btn-secondary" (click)="charger()"><lx-icon name="refresh" /> Actualiser</button>
  </div>

  <div class="balances">
    <section class="lx-card lx-card-glow balance">
      <div class="lx-row" style="justify-content:space-between">
        <span class="lx-mono brand">COVIARIDE · CHAUFFEUR</span>
        <span class="lx-icon-tile is-gold"><lx-icon name="wallet" /></span>
      </div>
      <div class="lx-muted" style="font-size:.8rem;margin-top:1.25rem">Compte disponible · seul solde retirable</div>
      <div class="amount lx-display">{{ (wallet()?.soldeDisponible ?? 0) | number:'1.0-0' }} <span>FCFA</span></div>
    </section>
    <section class="lx-stat">
      <lx-icon name="lock" style="color:var(--lx-amber)" />
      <div class="lx-stat-value">{{ (wallet()?.soldeBloque ?? 0) | number:'1.0-0' }} F</div>
      <div class="lx-stat-label">compte bloqué · visible, non retirable</div>
      <div class="lx-muted" style="font-size:.72rem;margin-top:.35rem;line-height:1.4">
        50 % passent au disponible au départ confirmé par le client, 40 % à l'arrivée (ou 4 h après sans plainte). 10 % de commission plateforme.
      </div>
    </section>
    <section class="lx-stat">
      <lx-icon name="arrow-down-left" style="color:var(--lx-emerald)" />
      <div class="lx-stat-value">{{ totalRecu() | number:'1.0-0' }} F</div>
      <div class="lx-stat-label">paiements reçus · total</div>
    </section>
  </div>

  <nav class="lx-tabs" role="tablist" style="margin-top:1.5rem">
    <button role="tab" class="lx-tab" [class.is-active]="mode() === 'retrait'" (click)="mode.set('retrait')">Retirer</button>
    <button role="tab" class="lx-tab" [class.is-active]="mode() === 'depot'" (click)="mode.set('depot')">Déposer</button>
  </nav>

  @if (mode() === 'retrait') {
    <form class="lx-card lx-stack" [formGroup]="retraitForm" (ngSubmit)="retirer()">
      <div>
        <h3 class="lx-card-title" style="margin-bottom:.25rem">Retirer mes gains</h3>
        <p style="margin:0;font-size:.8rem">Minimum 1 000 FCFA · validation par code envoyé par email.</p>
      </div>
      <div>
        <span class="lx-label">Opérateur</span>
        <div class="operators">
          <button type="button" class="op" [class.is-active]="retraitForm.value.moyen === 'MTN_MOMO'" (click)="retraitForm.patchValue({ moyen: 'MTN_MOMO' })"><span class="op-logo mtn">MTN</span>MTN MoMo</button>
          <button type="button" class="op" [class.is-active]="retraitForm.value.moyen === 'ORANGE_MONEY'" (click)="retraitForm.patchValue({ moyen: 'ORANGE_MONEY' })"><span class="op-logo orange">OM</span>Orange Money</button>
        </div>
      </div>
      <div class="lx-form-grid">
        <div>
          <label class="lx-label" for="e-tel">Numéro de téléphone</label>
          <div class="lx-field has-icon"><span class="lx-field-icon"><lx-icon name="smartphone" /></span>
            <input id="e-tel" class="lx-input lx-mono" type="tel" inputmode="numeric" formControlName="numeroTelephone" placeholder="650000000" /></div>
        </div>
        <div>
          <label class="lx-label" for="e-montant">Montant (FCFA)</label>
          <input id="e-montant" class="lx-input lx-mono" type="number" min="1000" formControlName="montant" placeholder="10 000" />
        </div>
      </div>
      @if (depasseSolde()) { <div class="lx-alert lx-alert-error"><lx-icon name="alert" /> Montant supérieur à votre solde disponible.</div> }

      @if (retraitCodeRecu()) {
        <div [formGroup]="retraitValidationForm">
          <label class="lx-label" for="e-code">Code reçu par email</label>
          <input id="e-code" class="lx-input lx-mono" formControlName="codeValidation" inputmode="numeric" maxlength="6" placeholder="6 chiffres" autocomplete="one-time-code" />
        </div>
      }
      @if (retraitError()) { <div class="lx-alert lx-alert-error"><lx-icon name="alert" /> {{ retraitError() }}</div> }
      @if (retraitSuccess()) { <div class="lx-alert lx-alert-success"><lx-icon name="mail" /> {{ retraitSuccess() }}</div> }

      @if (!retraitCodeRecu()) {
        <button type="button" class="lx-btn lx-btn-primary lx-btn-block" (click)="demanderCodeValidation()"
          [disabled]="retraitCodeLoading() || retraitForm.invalid || depasseSolde()">
          <lx-icon name="mail" /> {{ retraitCodeLoading() ? 'Envoi du code…' : 'Recevoir le code de validation' }}
        </button>
      } @else {
        <div class="form-actions">
          <button type="button" class="lx-btn lx-btn-ghost" (click)="retraitCodeRecu.set(false); retraitSuccess.set('')">Retour</button>
          <button type="submit" class="lx-btn lx-btn-primary" [disabled]="retraitLoading() || retraitForm.invalid || retraitValidationForm.invalid || depasseSolde()">
            {{ retraitLoading() ? 'Traitement…' : 'Confirmer le retrait' }}
          </button>
        </div>
      }
    </form>
  } @else {
    <form class="lx-card lx-stack" [formGroup]="depotForm" (ngSubmit)="deposer()">
      <div>
        <h3 class="lx-card-title" style="margin-bottom:.25rem">Déposer des fonds</h3>
        <p style="margin:0;font-size:.8rem">Minimum 500 FCFA · aucune commission.</p>
      </div>
      <div>
        <span class="lx-label">Opérateur</span>
        <div class="operators">
          <button type="button" class="op" [class.is-active]="depotForm.value.moyen === 'MTN_MOMO'" (click)="depotForm.patchValue({ moyen: 'MTN_MOMO' })"><span class="op-logo mtn">MTN</span>MTN MoMo</button>
          <button type="button" class="op" [class.is-active]="depotForm.value.moyen === 'ORANGE_MONEY'" (click)="depotForm.patchValue({ moyen: 'ORANGE_MONEY' })"><span class="op-logo orange">OM</span>Orange Money</button>
        </div>
      </div>
      <div class="lx-form-grid">
        <div>
          <label class="lx-label" for="d-tel">Numéro de téléphone</label>
          <div class="lx-field has-icon"><span class="lx-field-icon"><lx-icon name="smartphone" /></span>
            <input id="d-tel" class="lx-input lx-mono" type="tel" inputmode="numeric" formControlName="numeroTelephone" placeholder="650000000" /></div>
        </div>
        <div>
          <label class="lx-label" for="d-montant">Montant (FCFA)</label>
          <input id="d-montant" class="lx-input lx-mono" type="number" min="500" formControlName="montant" placeholder="5 000" />
        </div>
      </div>
      @if (depotError()) { <div class="lx-alert lx-alert-error"><lx-icon name="alert" /> {{ depotError() }}</div> }
      <button type="submit" class="lx-btn lx-btn-primary lx-btn-block" [disabled]="depotLoading() || depotForm.invalid">
        {{ depotLoading() ? 'Traitement…' : 'Confirmer le dépôt' }}
      </button>
    </form>
  }

  <section style="margin-top:2rem">
    <div class="lx-section-head"><h3>Derniers mouvements</h3></div>
    @if (transactions().length === 0) {
      <div class="lx-empty"><lx-icon name="receipt" /><p>Aucun mouvement pour le moment.</p></div>
    } @else {
      <div class="lx-list">
        @for (t of transactions(); track t.id) {
          <div class="lx-list-item" style="cursor:default">
            <span class="lx-icon-tile" [class.is-in]="estCredit(t.type)" [class.is-out]="!estCredit(t.type)">
              <lx-icon [name]="estCredit(t.type) ? 'arrow-down-left' : 'arrow-up-right'" [size]="18" />
            </span>
            <span class="lx-list-body">
              <span class="lx-list-title">{{ libelleType(t.type) }}</span>
              <span class="lx-list-sub">{{ t.timestamp | date:'dd/MM/yyyy HH:mm' }}@if (t.description) { · {{ t.description }} }</span>
            </span>
            <span class="tx-right">
              <span class="tx-amount" [class.in]="estCredit(t.type)">{{ estCredit(t.type) ? '+' : '−' }} {{ t.montant | number:'1.0-0' }} FCFA</span>
              <span class="lx-badge" [ngClass]="t.statut === 'EFFECTUEE' ? 'lx-badge-success' : t.statut === 'EN_ATTENTE' ? 'lx-badge-warning' : 'lx-badge-danger'">
                {{ t.statut === 'EFFECTUEE' ? 'Effectuée' : t.statut === 'EN_ATTENTE' ? 'En attente' : t.statut }}
              </span>
            </span>
          </div>
        }
      </div>
    }
  </section>
</div>`,
  styles: [`
    :host { display: block; }
    .balances { display: grid; grid-template-columns: minmax(0, 1.4fr) repeat(2, minmax(0, 1fr)); gap: 1rem; }
    .balance { padding: 1.4rem; }
    .brand { font-size: 0.68rem; letter-spacing: 0.18em; color: var(--lx-primary); }
    .amount { font-size: clamp(1.9rem, 5vw, 2.5rem); line-height: 1.1; span { font-family: var(--lx-font-body); font-size: 0.9rem; color: var(--lx-muted-fg); } }
    .lx-stat .lx-stat-value { font-size: 1.3rem; }
    .operators { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.75rem; }
    .op { display: flex; align-items: center; gap: 0.75rem; padding: 0.85rem 1rem; cursor: pointer; background: var(--lx-secondary); color: var(--lx-fg);
      border: 1px solid transparent; border-radius: var(--lx-r-md); font-size: 0.85rem; font-weight: 500; text-align: left;
      &:hover { background: #232736; } &.is-active { border-color: rgba(200, 146, 42, 0.55); background: rgba(200, 146, 42, 0.08); } }
    .op-logo { width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.68rem; flex-shrink: 0;
      &.mtn { background: #ffc300; color: #111; } &.orange { background: #ff6b00; color: #fff; } }
    .form-actions { display: flex; justify-content: flex-end; gap: 0.6rem; }
    .lx-icon-tile.is-in { background: rgba(52, 211, 153, 0.12); color: var(--lx-emerald); }
    .lx-icon-tile.is-out { background: rgba(224, 83, 74, 0.12); color: var(--lx-red); }
    .tx-right { display: flex; flex-direction: column; align-items: flex-end; gap: 0.3rem; flex-shrink: 0; }
    .tx-amount { font-family: var(--lx-font-mono); font-size: 0.85rem; white-space: nowrap; &.in { color: var(--lx-emerald); } }
    @media (max-width: 900px) { .balances { grid-template-columns: repeat(2, minmax(0, 1fr)); } .balance { grid-column: 1 / -1; } }
    @media (max-width: 480px) { .operators { grid-template-columns: 1fr; } .form-actions .lx-btn { flex: 1; } }
  `]
})
export class EarningsComponent implements OnInit {
  wallet = signal<Portefeuille | null>(null);
  retraitLoading = signal(false); retraitError = signal(''); retraitSuccess = signal('');
  retraitCodeLoading = signal(false);
  retraitCodeRecu = signal(false);
  depotLoading = signal(false); depotError = signal(''); depotSuccess = signal('');

  retraitValidationForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    codeValidation: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]]
  });

  retraitForm = this.fb.group({
    moyen: ['MTN_MOMO', Validators.required],
    numeroTelephone: ['', [Validators.required, Validators.pattern(/^[6-9][0-9]{8}$/)]],
    montant: [null as number|null, [Validators.required, Validators.min(1000)]]
  });
  depotForm = this.fb.group({
    moyen: ['MTN_MOMO', Validators.required],
    numeroTelephone: ['', [Validators.required, Validators.pattern(/^[6-9][0-9]{8}$/)]],
    montant: [null as number|null, [Validators.required, Validators.min(500)]]
  });

  constructor(private fb: FormBuilder, private auth: AuthService, private walletSvc: PortefeuilleService) {}

  transactions = signal<Transaction[]>([]);
  mode = signal<'retrait' | 'depot'>('retrait');
  totalRecu = computed(() => this.transactions()
    .filter(t => t.statut === 'EFFECTUEE' && ['RECEPTION_PAIEMENT', 'DEBLOCAGE_50_DEPART', 'DEBLOCAGE_50_ARRIVEE', 'DEBLOCAGE_40_ARRIVEE', 'INDEMNITE_ANNULATION'].includes(t.type))
    .reduce((s, t) => s + Number(t.montant ?? 0), 0));
  private toast = inject(ToastService);

  ngOnInit() {
    const u = this.auth.currentUser(); if (!u) return;
    this.retraitValidationForm.patchValue({ email: u.email });
    this.charger();
  }

  charger() {
    const u = this.auth.currentUser(); if (!u) return;
    this.walletSvc.get(u.compteId).subscribe({ next: w => this.wallet.set(w), error: err => this.toast.error('Portefeuille indisponible', err) });
    this.walletSvc.historique(u.compteId).subscribe({ next: p => this.transactions.set(p.content ?? []), error: () => {} });
  }

  depasseSolde(): boolean {
    const m = Number(this.retraitForm.value.montant ?? 0);
    return !!this.wallet() && m > this.wallet()!.soldeDisponible;
  }

  estCredit(type: string) {
    // La commission est prélevée sur le chauffeur : c'est un débit, pas un crédit.
    return ['DEPOT', 'RECEPTION_PAIEMENT', 'REMBOURSEMENT', 'BLOCAGE_FONDS', 'DEBLOCAGE_50_DEPART', 'DEBLOCAGE_50_ARRIVEE',
            'DEBLOCAGE_40_ARRIVEE', 'INDEMNITE_ANNULATION'].includes(type);
  }

  libelleType(type: string) {
    return ({
      DEPOT: 'Dépôt', RETRAIT: 'Retrait', RECEPTION_PAIEMENT: 'Paiement reçu', PAIEMENT_TRAJET: 'Paiement trajet',
      BLOCAGE_FONDS: 'Reçu sur le compte bloqué', DEBLOCAGE_50_DEPART: 'Départ · 50 % débloqués', DEBLOCAGE_50_ARRIVEE: 'Versement arrivée',
      DEBLOCAGE_40_ARRIVEE: 'Arrivée · 40 % débloqués', PRELEVEMENT_COMMISSION: 'Commission 10 %',
      RESTITUTION_PASSAGER: 'Rendu au passager', INDEMNITE_ANNULATION: "Indemnité d'annulation",
      COMMISSION_PLATEFORME: 'Commission', REMBOURSEMENT: 'Remboursement'
    } as Record<string, string>)[type] ?? type;
  }

  demanderCodeValidation() {
    const u = this.auth.currentUser(); if (!u || this.retraitForm.invalid) return;
    this.retraitCodeLoading.set(true); this.retraitError.set('');
    this.walletSvc.demanderCodeRetrait(u.compteId, {
      moyen: this.retraitForm.value.moyen as 'MTN_MOMO' | 'ORANGE_MONEY',
      numeroTelephone: this.retraitForm.value.numeroTelephone!,
      montant: this.retraitForm.value.montant!
    }).subscribe({
      next: r => {
        this.retraitCodeRecu.set(true);
        this.retraitValidationForm.patchValue({ email: u.email });
        this.retraitSuccess.set(r?.message || 'Un code de validation a été envoyé à votre email.');
        this.retraitCodeLoading.set(false);
      },
      error: err => {
        this.retraitError.set(messageErreur(err, 'Impossible d’envoyer le code de validation.'));
        this.retraitCodeLoading.set(false);
      }
    });
  }

  retirer() {
    const u = this.auth.currentUser();
    if (!u || this.retraitForm.invalid || this.retraitValidationForm.invalid) return;
    const moyen = this.retraitForm.value.moyen as 'MTN_MOMO' | 'ORANGE_MONEY';
    this.retraitLoading.set(true); this.retraitError.set('');
    this.walletSvc.retraitAvecCodeValidation(u.compteId, {
      moyen,
      numeroTelephone: this.retraitForm.value.numeroTelephone!,
      montant: this.retraitForm.value.montant!,
      email: this.retraitValidationForm.value.email!,
      codeValidation: this.retraitValidationForm.value.codeValidation!
    }).subscribe({
      next: () => {
        this.retraitSuccess.set('');
        this.toast.success('Retrait effectué', `${fcfa(this.retraitForm.value.montant)} envoyés vers ${this.retraitForm.value.numeroTelephone}`);
        this.retraitLoading.set(false); this.retraitCodeRecu.set(false);
        this.retraitValidationForm.reset({ email: u.email }); this.retraitForm.reset({ moyen: 'MTN_MOMO' });
        this.charger();
      },
      error: err => { this.retraitError.set(messageErreur(err, 'Code invalide ou retrait refusé')); this.retraitLoading.set(false); }
    });
  }

  deposer() {
    const u = this.auth.currentUser(); if (!u || this.depotForm.invalid) return;
    this.depotLoading.set(true); this.depotError.set('');
    this.walletSvc.depot(u.compteId, this.depotForm.value as any).subscribe({
      next: () => {
        this.toast.success('Dépôt effectué', `${fcfa(this.depotForm.value.montant)} ajoutés à votre portefeuille`);
        this.depotLoading.set(false); this.depotForm.reset({ moyen: 'MTN_MOMO' }); this.charger();
      },
      error: err => { this.depotError.set(messageErreur(err, 'Dépôt impossible')); this.depotLoading.set(false); }
    });
  }
}
