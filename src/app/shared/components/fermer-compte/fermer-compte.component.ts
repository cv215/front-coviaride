import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService, messageErreur } from '../../../core/services/toast.service';
import { IconComponent } from '../icon/icon.component';

/**
 * « Quitter CoviaRide » : fermeture du compte par son titulaire.
 * Mot de passe exigé ; le serveur refuse tant qu'il reste de l'argent sur le portefeuille.
 */
@Component({
  selector: 'lx-fermer-compte',
  standalone: true,
  imports: [FormsModule, IconComponent],
  template: `
@if (!ouvert()) {
  <button type="button" class="lx-list-item is-danger" (click)="ouvert.set(true)">
    <lx-icon name="trash" /><span class="lx-list-body">Fermer mon compte</span>
  </button>
} @else {
  <form class="lx-card lx-stack zone" (ngSubmit)="fermer()">
    <div>
      <h3 class="lx-card-title" style="margin:0">Fermer mon compte</h3>
      <p class="lx-muted" style="margin:.35rem 0 0;font-size:.85rem;line-height:1.5">
        Vous ne pourrez plus vous connecter. Retirez d'abord tout le solde de votre portefeuille.
        L'historique de vos paiements est conservé, comme la loi l'exige.
      </p>
    </div>
    <div>
      <label class="lx-label-plain" for="fc-motif">Pourquoi partez-vous ? (facultatif)</label>
      <select id="fc-motif" class="lx-select" name="motif" [(ngModel)]="motif">
        <option value="">Je préfère ne pas répondre</option>
        <option value="Je n'utilise plus l'application">Je n'utilise plus l'application</option>
        <option value="Pas assez de trajets près de chez moi">Pas assez de trajets près de chez moi</option>
        <option value="Prix trop élevés">Prix trop élevés</option>
        <option value="Problème avec un chauffeur ou un passager">Problème avec un chauffeur ou un passager</option>
        <option value="Autre">Autre</option>
      </select>
    </div>
    <div>
      <label class="lx-label-plain" for="fc-mdp">Mot de passe</label>
      <input id="fc-mdp" class="lx-input" type="password" name="motDePasse" [(ngModel)]="motDePasse" autocomplete="current-password" required />
    </div>
    <div class="form-actions">
      <button type="button" class="lx-btn lx-btn-ghost" (click)="ouvert.set(false)">Annuler</button>
      <button type="submit" class="lx-btn lx-btn-danger" [disabled]="chargement() || !motDePasse">
        {{ chargement() ? 'Fermeture…' : 'Fermer définitivement' }}
      </button>
    </div>
  </form>
}
  `,
  styles: [`
    :host { display: block; }
    .zone { border-color: rgba(248, 113, 113, 0.35); }
    .form-actions { display: flex; justify-content: flex-end; gap: 0.6rem; flex-wrap: wrap; }
  `]
})
export class FermerCompteComponent {
  private auth = inject(AuthService);
  private toast = inject(ToastService);

  ouvert = signal(false);
  chargement = signal(false);
  motDePasse = '';
  motif = '';

  fermer() {
    if (!this.motDePasse) return;
    this.chargement.set(true);
    this.auth.fermerCompte(this.motDePasse, this.motif || undefined).subscribe({
      next: r => {
        this.chargement.set(false);
        this.toast.success('Compte fermé', r?.message);
        this.auth.deconnexion();
      },
      error: err => {
        this.chargement.set(false);
        this.toast.error(messageErreur(err, 'Fermeture impossible pour le moment.'));
      }
    });
  }
}
