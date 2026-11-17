import { Component, OnInit, inject, signal } from '@angular/core';
import { ToastService, fcfa, messageErreur } from '../../../core/services/toast.service';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { PortefeuilleService } from '../../../core/services/portefeuille.service';
import { Portefeuille, Transaction } from '../../../core/models';

@Component({
  selector: 'app-earnings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
<div>
  <h2 style="margin-bottom:0.5rem">Mes revenus</h2>
  <p style="margin-bottom:2rem">Gérez votre portefeuille et vos retraits</p>

  @if (wallet()) {
    <div class="stats-grid" style="margin-bottom:2rem">
      <div class="stat-card" style="background:var(--color-primary);border-color:var(--color-primary)">
        <div class="stat-info">
          <div class="value" style="color:white">{{ wallet()!.soldeDisponible | number:'1.0-0':'fr' }}</div>
          <div class="label" style="color:rgba(255,255,255,0.7)">Solde disponible (XAF)</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-info">
          <div class="value">{{ wallet()!.soldeBloque | number:'1.0-0':'fr' }}</div>
          <div class="label">Fonds bloqués (XAF)</div>
        </div>
      </div>
    </div>
  }

  <div class="two-col-grid" style="gap:1.5rem">
    <!-- RETRAIT -->
    <div class="card">
      <h3 style="margin-bottom:1.5rem">Retirer des fonds</h3>
      <form [formGroup]="retraitForm" (ngSubmit)="retirer()">
        <div class="form-group" style="margin-bottom:1rem">
          <label>Méthode de retrait</label>
          <select class="field" formControlName="moyen">
            <option value="MTN_MOMO">MTN Mobile Money</option>
            <option value="ORANGE_MONEY">Orange Money</option>
          </select>
        </div>
        <div class="form-group" style="margin-bottom:1rem">
          <label>Numéro de téléphone</label>
          <input type="tel" class="field" formControlName="numeroTelephone" placeholder="6XXXXXXXX"/>
        </div>
        <div class="form-group" style="margin-bottom:1.5rem">
          <label>Montant (XAF)</label>
          <input type="number" class="field" formControlName="montant" placeholder="minimum 1 000" min="1000"/>
        </div>
        @if (retraitForm.value.montant && wallet() && retraitForm.value.montant > wallet()!.soldeDisponible) {
          <div class="alert alert-error" style="margin-bottom:1rem">Montant supérieur à votre solde disponible.</div>
        }
        @if (retraitError()) { <div class="alert alert-error" style="margin-bottom:1rem">{{ retraitError() }}</div> }
        @if (retraitSuccess()) { <div class="alert alert-success" style="margin-bottom:1rem">{{ retraitSuccess() }}</div> }

        @if (!retraitCodeRecu()) {
          <button type="button" class="btn btn-primary btn-full" (click)="demanderCodeValidation()"
                  [disabled]="retraitCodeLoading() || retraitForm.invalid || depasseSolde()">
            {{ retraitCodeLoading() ? 'Envoi du code…' : '1. Recevoir un code par email' }}
          </button>
        } @else {
          <div class="form-group" [formGroup]="retraitValidationForm" style="margin-bottom:1rem">
            <label>Code reçu par email</label>
            <input type="text" class="field" formControlName="codeValidation" inputmode="numeric" maxlength="6" placeholder="6 chiffres" autocomplete="one-time-code"/>
          </div>
          <div style="display:flex;gap:.5rem">
            <button type="button" class="btn btn-outline" (click)="retraitCodeRecu.set(false)">Retour</button>
            <button type="submit" class="btn btn-primary" style="flex:1" [disabled]="retraitLoading() || retraitForm.invalid || retraitValidationForm.invalid">
              {{ retraitLoading() ? 'Traitement…' : '2. Confirmer le retrait' }}
            </button>
          </div>
        }
      </form>
    </div>

    <!-- DÉPÔT -->
    <div class="card">
      <h3 style="margin-bottom:1.5rem">Déposer des fonds</h3>
      <form [formGroup]="depotForm" (ngSubmit)="deposer()">
        <div class="form-group" style="margin-bottom:1rem">
          <label>Méthode de dépôt</label>
          <select class="field" formControlName="moyen">
            <option value="MTN_MOMO">MTN Mobile Money</option>
            <option value="ORANGE_MONEY">Orange Money</option>
          </select>
        </div>
        <div class="form-group" style="margin-bottom:1rem">
          <label>Numéro de téléphone</label>
          <input type="tel" class="field" formControlName="numeroTelephone" placeholder="6XXXXXXXX"/>
        </div>
        <div class="form-group" style="margin-bottom:1.5rem">
          <label>Montant (XAF)</label>
          <input type="number" class="field" formControlName="montant" placeholder="minimum 500" min="500"/>
        </div>
        @if (depotError()) { <div class="alert alert-error" style="margin-bottom:1rem">{{ depotError() }}</div> }
        @if (depotSuccess()) { <div class="alert alert-success" style="margin-bottom:1rem">{{ depotSuccess() }}</div> }
        <button type="submit" class="btn btn-success btn-full" [disabled]="depotLoading() || depotForm.invalid">
          {{ depotLoading() ? 'Traitement...' : 'Déposer les fonds' }}
        </button>
      </form>
    </div>
  </div>

  <div class="card" style="margin-top:1.5rem;padding:0;overflow:hidden">
    <div style="display:flex;justify-content:space-between;align-items:center;padding:1rem 1.25rem;border-bottom:1px solid var(--color-border)">
      <h3 style="margin:0">Derniers mouvements</h3>
      <button class="btn btn-outline btn-sm" (click)="charger()">⟳ Actualiser</button>
    </div>
    @if (transactions().length === 0) {
      <p style="padding:1.5rem;text-align:center;margin:0">Aucun mouvement pour le moment.</p>
    } @else {
      <table class="data-table">
        <thead><tr><th>Date</th><th>Opération</th><th>Statut</th><th style="text-align:right">Montant</th></tr></thead>
        <tbody>
          @for (t of transactions(); track t.id) {
            <tr>
              <td style="white-space:nowrap">{{ t.timestamp | date:'dd/MM HH:mm' }}</td>
              <td>
                <div style="font-weight:600">{{ libelleType(t.type) }}</div>
                <div style="font-size:.78rem;color:var(--color-muted)">{{ t.description }}</div>
              </td>
              <td><span class="badge" [class]="t.statut === 'EFFECTUEE' ? 'badge badge-success' : t.statut === 'EN_ATTENTE' ? 'badge badge-warning' : 'badge badge-danger'">{{ t.statut === 'EFFECTUEE' ? 'Effectuée' : t.statut === 'EN_ATTENTE' ? 'En attente' : t.statut }}</span></td>
              <td style="text-align:right;font-weight:700;white-space:nowrap" [style.color]="estCredit(t.type) ? 'var(--color-success)' : 'var(--color-primary)'">
                {{ estCredit(t.type) ? '+' : '−' }}{{ t.montant | number:'1.0-0':'fr' }} FCFA
              </td>
            </tr>
          }
        </tbody>
      </table>
    }
  </div>
</div>`
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
    return ['DEPOT', 'RECEPTION_PAIEMENT', 'REMBOURSEMENT', 'COMMISSION_PLATEFORME'].includes(type);
  }

  libelleType(type: string) {
    return ({
      DEPOT: 'Dépôt', RETRAIT: 'Retrait', RECEPTION_PAIEMENT: 'Paiement reçu', PAIEMENT_TRAJET: 'Paiement trajet',
      BLOCAGE_FONDS: 'Fonds bloqués', DEBLOCAGE_50_DEPART: 'Versement départ', DEBLOCAGE_50_ARRIVEE: 'Versement arrivée',
      COMMISSION_PLATEFORME: 'Commission', REMBOURSEMENT: 'Remboursement'
    } as Record<string, string>)[type] ?? type;
  }

  demanderCodeValidation() {
    const u = this.auth.currentUser(); if (!u || this.retraitForm.invalid) return;
    this.retraitCodeLoading.set(true); this.retraitError.set('');
    this.auth.demanderResetPassword({ email: u.email }).subscribe({
      next: () => {
        this.retraitCodeRecu.set(true);
        this.retraitValidationForm.patchValue({ email: u.email });
        this.retraitSuccess.set('Un code de validation a été envoyé à votre email.');
        this.retraitCodeLoading.set(false);
      },
      error: () => {
        this.retraitError.set('Impossible d’envoyer le code de validation.');
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
