import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { PortefeuilleService } from '../../../core/services/portefeuille.service';
import { Portefeuille } from '../../../core/models';
import { IconComponent } from '../../../shared/components/icon/icon.component';

type Filtre = 'tous' | 'DEPOT' | 'RETRAIT';

/**
 * Relevé des opérations du portefeuille.
 * Les dépôts et retraits se font depuis le Portefeuille, où le retrait
 * exige le code de validation envoyé par email.
 */
@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule, RouterLink, IconComponent],
  templateUrl: './transactions.component.html',
  styleUrl: './transactions.component.scss'
})
export class TransactionsComponent implements OnInit {
  wallet = signal<Portefeuille | null>(null);
  transactions = signal<any[]>([]);
  loading = signal(true);
  erreur = signal('');
  filtre = signal<Filtre>('tous');

  readonly filtres: { id: Filtre; label: string }[] = [
    { id: 'tous', label: 'Toutes' },
    { id: 'DEPOT', label: 'Dépôts' },
    { id: 'RETRAIT', label: 'Retraits' },
  ];

  visibles = computed(() => {
    const f = this.filtre();
    return f === 'tous' ? this.transactions() : this.transactions().filter(t => t.type === f);
  });

  totaux = computed(() => {
    let entrees = 0, sorties = 0;
    for (const t of this.transactions()) {
      if (t.statut && t.statut !== 'EFFECTUEE') continue;
      if (t.type === 'DEPOT') entrees += Number(t.montant ?? 0);
      else sorties += Number(t.montant ?? 0);
    }
    return { entrees, sorties };
  });

  constructor(private auth: AuthService, private walletSvc: PortefeuilleService) {}

  ngOnInit() {
    this.charger();
  }

  charger() {
    const u = this.auth.currentUser();
    if (!u) { this.loading.set(false); return; }
    this.loading.set(true);
    this.erreur.set('');
    this.walletSvc.get(u.compteId).subscribe({ next: w => this.wallet.set(w), error: () => {} });
    this.walletSvc.historique(u.compteId).subscribe({
      next: p => {
        this.transactions.set(p.content ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.erreur.set('Impossible de charger vos opérations pour le moment.');
        this.loading.set(false);
      }
    });
  }

  statutLabel(s: string): string {
    const map: Record<string, string> = { EFFECTUEE: 'Effectuée', EN_ATTENTE: 'En attente', EN_COURS: 'En cours', ECHOUEE: 'Échouée', ANNULEE: 'Annulée', REFUSEE: 'Refusée' };
    return map[s] ?? (s ? s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, ' ') : '—');
  }

  compte(f: Filtre): number {
    return f === 'tous' ? this.transactions().length : this.transactions().filter(t => t.type === f).length;
  }
}
