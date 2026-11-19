import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { RouterOutlet } from '@angular/router';
import { AdminService } from '../../../core/services/admin.service';
import { RemboursementService } from '../../../core/services/remboursement.service';
import { UtilisateurService } from '../../../core/services/utilisateur.service';
import { AppShellComponent, ShellNavItem } from '../../../shared/components/app-shell/app-shell.component';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, AppShellComponent],
  template: `
<lx-app-shell
  espace="Admin"
  homePath="/admin/dashboard"
  roleLabel="Super administrateur"
  titreSecondaire="Gestion"
  salutation="Vue d'ensemble"
  [notifications]="false"
  [large]="true"
  [navPrincipale]="navPrincipale()"
  [navSecondaire]="navSecondaire"
  [navMobile]="navMobile()">
  <router-outlet />
</lx-app-shell>
  `
})
export class AdminLayoutComponent implements OnInit {
  private adminSvc = inject(AdminService);
  private rembSvc = inject(RemboursementService);
  private userSvc = inject(UtilisateurService);
  private destroyRef = inject(DestroyRef);

  compteurs = signal({ signalements: 0, remboursements: 0, kyc: 0 });

  navPrincipale = computed<ShellNavItem[]>(() => {
    const c = this.compteurs();
    return [
      { path: '/admin/dashboard',      icon: 'gauge',      label: 'Tableau de bord', titre: "Vue d'ensemble" },
      { path: '/admin/utilisateurs',   icon: 'users',      label: 'Utilisateurs',    titre: 'Utilisateurs' },
      { path: '/admin/kyc',            icon: 'shield-check', label: 'KYC chauffeurs', titre: 'Vérification des chauffeurs', count: c.kyc },
      { path: '/admin/signalements',   icon: 'alert',      label: 'Signalements',    titre: 'Signalements', count: c.signalements },
      { path: '/admin/remboursements', icon: 'rotate-ccw', label: 'Remboursements',  titre: 'Remboursements', count: c.remboursements },
    ];
  });
  readonly navSecondaire: ShellNavItem[] = [
    { path: '/admin/commissions', icon: 'tag',   label: 'Commissions',     titre: 'Commissions' },
    { path: '/admin/historique',  icon: 'history', label: 'Mes réservations', titre: 'Mes réservations' },
    { path: '/admin/nouvelle-course', icon: 'plus', label: 'Réserver un trajet', titre: 'Réserver un trajet' },
    { path: '/admin/admins',      icon: 'shield', label: 'Administrateurs', titre: 'Administrateurs' },
  ];
  navMobile = computed<ShellNavItem[]>(() => {
    const p = this.navPrincipale();
    return [
      { ...p[0], label: 'Accueil' },
      { ...p[1], label: 'Comptes' },
      { ...p[2], label: 'KYC' },
      { ...p[3], label: 'Alertes' },
      { ...p[4], label: 'Rembours.' },
    ];
  });

  ngOnInit() {
    this.rafraichir();
    // Les compteurs du menu se mettent à jour seuls toutes les minutes.
    interval(60000).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (!document.hidden) this.rafraichir();
    });
  }

  private rafraichir() {
    this.adminSvc.getSignalements('OUVERT', 0).subscribe({
      next: p => this.compteurs.update(c => ({ ...c, signalements: p?.totalElements ?? 0 })), error: () => {}
    });
    this.rembSvc.getStats().subscribe({
      next: st => this.compteurs.update(c => ({ ...c, remboursements: st?.['enAttente'] ?? 0 })), error: () => {}
    });
    // Le serveur compte les dossiers à vérifier : une seule ligne suffit, on lit le total.
    this.userSvc.getAllAdmin(0, 1, { kyc: 'A_VERIFIER' }).subscribe({
      next: p => this.compteurs.update(c => ({ ...c, kyc: p?.totalElements ?? 0 })),
      error: () => {}
    });
  }
}
