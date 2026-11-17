import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { PortefeuilleService } from '../../../core/services/portefeuille.service';
import { Portefeuille } from '../../../core/models';

@Component({
  selector: 'app-portefeuille',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './portefeuille.component.html',
  styleUrl: './portefeuille.component.scss'
})
export class PortefeuilleClientComponent implements OnInit {

  wallet       = signal<Portefeuille | null>(null);
  transactions = signal<any[]>([]);
  operateurDepot   = signal<'MTN_MOMO'|'ORANGE_MONEY'>('MTN_MOMO');
  operateurRetrait = signal<'MTN_MOMO'|'ORANGE_MONEY'>('MTN_MOMO');
  depotLoading   = signal(false);
  depotError     = signal('');
  depotSuccess   = signal('');
  retraitLoading = signal(false);
  retraitError   = signal('');
  retraitSuccess = signal('');
  retraitCodeRecu = signal(false);
  retraitCodeLoading = signal(false);
  montantNet  = signal(0);
  commission  = signal(0);

  retraitValidationForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    codeValidation: ['', [Validators.required, Validators.minLength(4)]]
  });

  depotForm = this.fb.group({
    numeroTelephone: ['', [Validators.required,
      Validators.pattern(/^[6-9][0-9]{8}$/)]],
    montant: [null as number|null, [Validators.required, Validators.min(500)]]
  });

  retraitForm = this.fb.group({
    numeroTelephone: ['', [Validators.required,
      Validators.pattern(/^[6-9][0-9]{8}$/)]],
    montant: [null as number|null, [Validators.required, Validators.min(1000)]]
  });

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private walletSvc: PortefeuilleService
  ) {}

  ngOnInit() {
    const u = this.auth.currentUser();
    if (!u) return;
    this.retraitValidationForm.patchValue({ email: u.email });
    this.chargerWallet(u.compteId);
    this.walletSvc.historique(u.compteId).subscribe({
      next: p => this.transactions.set(p.content),
      error: () => {}
    });
  }

  chargerWallet(id: number) {
    this.walletSvc.get(id).subscribe({
      next: w => this.wallet.set(w),
      error: () => {}
    });
  }

  calculerMontantNet() {
    const m = this.retraitForm.value.montant || 0;
    const comm = m * 0.10;
    this.commission.set(comm);
    this.montantNet.set(m - comm);
  }

  deposer() {
    if (this.depotForm.invalid) return;
    const u = this.auth.currentUser();
    if (!u) return;
    this.depotLoading.set(true);
    this.depotError.set('');
    this.walletSvc.depot(u.compteId, {
      moyen: this.operateurDepot(),
      numeroTelephone: this.depotForm.value.numeroTelephone!,
      montant: this.depotForm.value.montant!
    }).subscribe({
      next: () => {
        this.depotSuccess.set('Dépôt effectué avec succès !');
        this.depotLoading.set(false);
        this.depotForm.reset();
        // Réactualiser le solde
        this.chargerWallet(u.compteId);
      },
      error: err => {
        this.depotError.set(err.error?.message || 'Erreur lors du dépôt');
        this.depotLoading.set(false);
      }
    });
  }

  demanderCodeValidation() {
    const u = this.auth.currentUser();
    if (!u || this.retraitForm.invalid) return;

    this.retraitCodeLoading.set(true);
    this.retraitError.set('');
    this.auth.demanderResetPassword({ email: u.email }).subscribe({
      next: () => {
        this.retraitCodeRecu.set(true);
        this.retraitValidationForm.patchValue({ email: u.email });
        this.retraitSuccess.set('Un code de validation a été envoyé à votre email.');
        this.retraitCodeLoading.set(false);
      },
      error: () => {
        this.retraitError.set('Impossible d’envoyer le code de validation à votre email.');
        this.retraitCodeLoading.set(false);
      }
    });
  }

  retirer() {
    if (this.retraitForm.invalid || this.retraitValidationForm.invalid) return;
    const u = this.auth.currentUser();
    if (!u) return;
    this.retraitLoading.set(true);
    this.retraitError.set('');
    this.walletSvc.retraitAvecCodeValidation(u.compteId, {
      moyen: this.operateurRetrait(),
      numeroTelephone: this.retraitForm.value.numeroTelephone!,
      montant: this.retraitForm.value.montant!,
      email: this.retraitValidationForm.value.email!,
      codeValidation: this.retraitValidationForm.value.codeValidation!
    }).subscribe({
      next: () => {
        this.retraitSuccess.set('Retrait sécurisé validé avec succès !');
        this.retraitLoading.set(false);
        this.retraitForm.reset();
        this.retraitValidationForm.reset({ email: u.email });
        this.retraitCodeRecu.set(false);
        this.montantNet.set(0);
        this.chargerWallet(u.compteId);
      },
      error: err => {
        this.retraitError.set(err.error?.message || 'Code invalide ou retrait refusé');
        this.retraitLoading.set(false);
      }
    });
  }
}
