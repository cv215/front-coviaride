import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { PortefeuilleService } from '../../../core/services/portefeuille.service';
import { Portefeuille } from '../../../core/models';

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
          <div class="value" style="color:white">{{ wallet()!.soldeDisponible | number:'1.0-0' }}</div>
          <div class="label" style="color:rgba(255,255,255,0.7)">Solde disponible (XAF)</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-info">
          <div class="value">{{ wallet()!.soldeBloque | number:'1.0-0' }}</div>
          <div class="label">Fonds bloqués (XAF)</div>
        </div>
      </div>
    </div>
  }

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem">
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
          <input type="number" class="field" formControlName="montant" placeholder="ex: 10000" min="100"/>
        </div>
        @if (retraitError()) { <div class="alert alert-error" style="margin-bottom:1rem">{{ retraitError() }}</div> }
        @if (retraitSuccess()) { <div class="alert alert-success" style="margin-bottom:1rem">{{ retraitSuccess() }}</div> }
        <button type="submit" class="btn btn-primary btn-full" [disabled]="retraitLoading() || retraitForm.invalid">
          {{ retraitLoading() ? 'Traitement...' : 'Demander le retrait' }}
        </button>
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
          <input type="number" class="field" formControlName="montant" placeholder="ex: 5000" min="100"/>
        </div>
        @if (depotError()) { <div class="alert alert-error" style="margin-bottom:1rem">{{ depotError() }}</div> }
        @if (depotSuccess()) { <div class="alert alert-success" style="margin-bottom:1rem">{{ depotSuccess() }}</div> }
        <button type="submit" class="btn btn-success btn-full" [disabled]="depotLoading() || depotForm.invalid">
          {{ depotLoading() ? 'Traitement...' : 'Déposer les fonds' }}
        </button>
      </form>
    </div>
  </div>
</div>`
})
export class EarningsComponent implements OnInit {
  wallet = signal<Portefeuille | null>(null);
  retraitLoading = signal(false); retraitError = signal(''); retraitSuccess = signal('');
  depotLoading = signal(false); depotError = signal(''); depotSuccess = signal('');

  retraitForm = this.fb.group({
    moyen: ['MTN_MOMO', Validators.required],
    numeroTelephone: ['', [Validators.required, Validators.pattern(/^[6-9][0-9]{8}$/)]],
    montant: [null as number|null, [Validators.required, Validators.min(100)]]
  });
  depotForm = this.fb.group({
    moyen: ['MTN_MOMO', Validators.required],
    numeroTelephone: ['', [Validators.required, Validators.pattern(/^[6-9][0-9]{8}$/)]],
    montant: [null as number|null, [Validators.required, Validators.min(100)]]
  });

  constructor(private fb: FormBuilder, private auth: AuthService, private walletSvc: PortefeuilleService) {}

  ngOnInit() {
    const u = this.auth.currentUser(); if (!u) return;
    this.walletSvc.get(u.compteId).subscribe({ next: w => this.wallet.set(w), error: () => {} });
  }

  retirer() {
    const u = this.auth.currentUser(); if (!u || this.retraitForm.invalid) return;
    this.retraitLoading.set(true); this.retraitError.set('');
    this.walletSvc.retrait(u.compteId, this.retraitForm.value as any).subscribe({
      next: () => { this.retraitSuccess.set('Retrait effectué !'); this.retraitLoading.set(false); this.ngOnInit(); },
      error: err => { this.retraitError.set(err.error?.message || 'Erreur'); this.retraitLoading.set(false); }
    });
  }

  deposer() {
    const u = this.auth.currentUser(); if (!u || this.depotForm.invalid) return;
    this.depotLoading.set(true); this.depotError.set('');
    this.walletSvc.depot(u.compteId, this.depotForm.value as any).subscribe({
      next: () => { this.depotSuccess.set('Dépôt effectué !'); this.depotLoading.set(false); this.ngOnInit(); },
      error: err => { this.depotError.set(err.error?.message || 'Erreur'); this.depotLoading.set(false); }
    });
  }
}
