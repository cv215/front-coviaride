import { Component, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { PortefeuilleService } from '../../../core/services/portefeuille.service';
import { messageErreur } from '../../../core/services/toast.service';
import { Portefeuille } from '../../../core/models';
import { IconComponent } from '../../../shared/components/icon/icon.component';

@Component({
  selector: 'app-portefeuille',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IconComponent],
  templateUrl: './portefeuille.component.html',
  styleUrl: './portefeuille.component.scss'
})
export class PortefeuilleClientComponent implements OnInit {

  mode         = signal<'depot' | 'retrait'>('depot');
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
    codeValidation: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]]
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
  ) {
    // Recalcul de la commission à chaque saisie (valueChanges est toujours à jour,
    // contrairement à l'événement (input) qui peut précéder la mise à jour du formulaire).
    this.retraitForm.get('montant')!.valueChanges.pipe(takeUntilDestroyed())
      .subscribe(() => this.calculerMontantNet());
  }

  ngOnInit() {
    const u = this.auth.currentUser();
    if (!u) return;
    this.retraitValidationForm.patchValue({ email: u.email });
    this.chargerWallet(u.compteId);
    this.chargerHistorique(u.compteId);
  }

  chargerHistorique(id: number) {
    this.walletSvc.historique(id).subscribe({
      next: p => this.transactions.set(p.content ?? []),
      error: () => {}
    });
  }

  chargerWallet(id: number) {
    this.walletSvc.get(id).subscribe({
      next: w => this.wallet.set(w),
      error: () => {}
    });
  }

  statutLabel(s: string): string {
    const map: Record<string, string> = { EFFECTUEE: 'Effectuée', EN_ATTENTE: 'En attente', EN_COURS: 'En cours', ECHOUEE: 'Échouée', ANNULEE: 'Annulée', REFUSEE: 'Refusée' };
    return map[s] ?? (s ? s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, ' ') : '—');
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
    this.depotSuccess.set('');
    this.walletSvc.depot(u.compteId, {
      moyen: this.operateurDepot(),
      numeroTelephone: this.depotForm.value.numeroTelephone!,
      montant: this.depotForm.value.montant!
    }).subscribe({
      next: () => {
        this.depotSuccess.set('Dépôt effectué avec succès !');
        this.depotLoading.set(false);
        this.depotForm.reset();
        // Réactualiser le solde et l'historique
        this.chargerWallet(u.compteId);
        this.chargerHistorique(u.compteId);
        setTimeout(() => this.depotSuccess.set(''), 5000);
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
    this.walletSvc.demanderCodeRetrait(u.compteId, {
      moyen: this.operateurRetrait(),
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
        this.retraitError.set(messageErreur(err, 'Impossible d’envoyer le code de validation à votre email.'));
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
    this.retraitSuccess.set('');
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
        this.commission.set(0);
        this.chargerWallet(u.compteId);
        this.chargerHistorique(u.compteId);
      },
      error: err => {
        this.retraitError.set(err.error?.message || 'Code invalide ou retrait refusé');
        this.retraitLoading.set(false);
      }
    });
  }
}
