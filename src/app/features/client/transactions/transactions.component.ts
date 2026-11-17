import { Component, OnInit, signal  } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { PortefeuilleService } from '../../../core/services/portefeuille.service';
import { Portefeuille } from '../../../core/models';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './transactions.component.html',
  styleUrl: './transactions.component.scss'
})
export class TransactionsComponent implements OnInit{

  wallet = signal<Portefeuille | null>(null);
  montantRetrait = signal(0);
  fraisRetrait   = signal(0);
  netRetrait     = signal(0);
  operation = signal<'depot' | 'retrait'>('depot');

  depotLoading  = signal(false);
  depotError    = signal('');
  depotSuccess  = signal('');
  retraitLoading = signal(false);
  retraitError  = signal('');
  retraitSuccess = signal('');

  depotForm = this.fb.group({
    moyen:           ['MTN_MOMO', Validators.required],
    numeroTelephone: ['', [Validators.required,
      Validators.pattern(/^[6-9][0-9]{8}$/)]],
    montant:         [null as number|null,
      [Validators.required, Validators.min(500)]]  // minimum 500 XAF
  });

  retraitForm = this.fb.group({
    moyen:           ['MTN_MOMO', Validators.required],
    numeroTelephone: ['', [Validators.required,
      Validators.pattern(/^[6-9][0-9]{8}$/)]],
    montant:         [null as number|null,
      [Validators.required, Validators.min(1000)]]  // minimum 1000 XAF
  });

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private walletSvc: PortefeuilleService
  ) {}

  ngOnInit() {
    const u = this.auth.currentUser();
    if (u) this.walletSvc.get(u.compteId).subscribe({
      next: w => this.wallet.set(w), error: () => {}
    });
  }

  setOperation(mode: 'depot' | 'retrait') {
    this.operation.set(mode);
    this.depotError.set('');
    this.retraitError.set('');
    this.depotSuccess.set('');
    this.retraitSuccess.set('');
  }

  calculerFrais() {
    const m = this.retraitForm.get('montant')?.value || 0;
    this.montantRetrait.set(m);
    const frais = Math.round(m * 0.10);  // 10% de frais
    this.fraisRetrait.set(frais);
    this.netRetrait.set(m - frais);
  }

  deposer() {
    const u = this.auth.currentUser();
    if (!u || this.depotForm.invalid) return;
    this.depotLoading.set(true);
    this.depotError.set('');
    this.walletSvc.depot(u.compteId, this.depotForm.value as any).subscribe({
      next: () => {
        this.depotSuccess.set('Dépôt effectué avec succès ! solde mise à jour');
        this.depotLoading.set(false);
        // Réactualiser le solde
        this.walletSvc.get(u.compteId).subscribe({
          next: w => this.wallet.set(w)
        });
        this.depotForm.reset({ moyen: 'MTN_MOMO' });
      },
      error: err => {
        this.depotError.set(err.error?.message || 'Erreur lors du dépôt');
        this.depotLoading.set(false);
      }
    });
  }

  retirer() {
    const u = this.auth.currentUser();
    if (!u || this.retraitForm.invalid) return;
    this.retraitLoading.set(true);
    this.retraitError.set('');
    this.walletSvc.retrait(u.compteId, this.retraitForm.value as any).subscribe({
      next: () => {
        this.retraitSuccess.set('Retrait effectué ! ' +
          this.netRetrait() + ' XAF envoyés sur votre compte Mobile Money.');
        this.retraitLoading.set(false);
        // Réactualiser le solde
        this.walletSvc.get(u.compteId).subscribe({
          next: w => this.wallet.set(w)
        });
        this.retraitForm.reset({ moyen: 'MTN_MOMO' });
      },
      error: err => {
        this.retraitError.set(err.error?.message || 'Erreur lors du retrait');
        this.retraitLoading.set(false);
      }
    });
  }
}
