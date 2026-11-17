import { Injectable, inject, signal } from '@angular/core';
import { UtilisateurService } from './utilisateur.service';
import { ProfilPublic } from '../models';

/**
 * Cache des noms d'utilisateurs, partagé par toute l'application.
 * Les composants appellent `charger(ids)` puis lisent `nom(id)` dans leur gabarit :
 * l'affichage se met à jour dès que les noms arrivent (signal).
 */
@Injectable({ providedIn: 'root' })
export class ProfilsService {
  private userSvc = inject(UtilisateurService);
  private readonly cache = signal<Record<number, ProfilPublic>>({});
  private readonly enCours = new Set<number>();

  charger(ids: (number | null | undefined)[]) {
    const manquants = [...new Set(ids.filter((id): id is number => typeof id === 'number' && id > 0))]
      .filter(id => !this.cache()[id] && !this.enCours.has(id));
    for (let i = 0; i < manquants.length; i += 100) {
      const lot = manquants.slice(i, i + 100);
      lot.forEach(id => this.enCours.add(id));
      this.userSvc.getProfilsPublics(lot).subscribe({
        next: profils => {
          this.cache.update(c => {
            const copie = { ...c };
            for (const p of profils ?? []) copie[p.id] = p;
            return copie;
          });
          lot.forEach(id => this.enCours.delete(id));
        },
        error: () => lot.forEach(id => this.enCours.delete(id))
      });
    }
  }

  profil(id: number | null | undefined): ProfilPublic | null {
    return id ? this.cache()[id] ?? null : null;
  }

  /** « Prénom Nom », ou le libellé de secours tant que le nom n'est pas connu. */
  nom(id: number | null | undefined, secours = 'Utilisateur'): string {
    const p = this.profil(id);
    const nom = p ? `${p.prenom ?? ''} ${p.nom ?? ''}`.trim() : '';
    return nom || (id ? `${secours} #${id}` : secours);
  }

  initiales(id: number | null | undefined): string {
    const p = this.profil(id);
    const i = p ? `${(p.prenom ?? '').charAt(0)}${(p.nom ?? '').charAt(0)}`.toUpperCase() : '';
    return i || '?';
  }
}
