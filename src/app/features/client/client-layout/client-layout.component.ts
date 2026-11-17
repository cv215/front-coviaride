import { Component, OnInit, computed, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { UtilisateurService } from '../../../core/services/utilisateur.service';
import { Utilisateur } from '../../../core/models';
import { AppShellComponent, ShellNavItem } from '../../../shared/components/app-shell/app-shell.component';

@Component({
  selector: 'app-client-layout',
  standalone: true,
  imports: [RouterOutlet, AppShellComponent],
  template: `
<lx-app-shell
  homePath="/client/dashboard"
  profilePath="/client/profil"
  messagesPath="/client/messages"
  roleLabel="Passager"
  [nom]="nomComplet()"
  [salutation]="salutation()"
  [navPrincipale]="navPrincipale"
  [navSecondaire]="navSecondaire"
  [titresSupplementaires]="{ '/client/suivi': 'Suivi en direct' }"
  [action]="{ path: '/client/nouvelle-course', icon: 'plus', label: 'Réserver' }">
  <router-outlet />
</lx-app-shell>
  `
})
export class ClientLayoutComponent implements OnInit {
  readonly navPrincipale: ShellNavItem[] = [
    { path: '/client/dashboard',       icon: 'home',        label: 'Accueil',     titre: '' },
    { path: '/client/nouvelle-course', icon: 'calendar',    label: 'Réserver',    titre: 'Nouvelle réservation' },
    { path: '/client/historique',      icon: 'history',     label: 'Mes courses', titre: 'Mes courses' },
    { path: '/client/portefeuille',    icon: 'credit-card', label: 'Paiements',   titre: 'Portefeuille' },
    { path: '/client/profil',          icon: 'user',        label: 'Profil',      titre: 'Mon profil' },
  ];
  readonly navSecondaire: ShellNavItem[] = [
    { path: '/client/messages',      icon: 'message',    label: 'Messages',      titre: 'Messages' },
    { path: '/client/chauffeurs',    icon: 'users',      label: 'Chauffeurs',    titre: 'Chauffeurs disponibles' },
    { path: '/client/transactions',  icon: 'receipt',    label: 'Transactions',  titre: 'Mes transactions' },
    { path: '/client/remboursement', icon: 'rotate-ccw', label: 'Remboursement', titre: 'Remboursement' },
  ];

  utilisateur = signal<Utilisateur | null>(null);
  nomComplet = computed(() => [this.utilisateur()?.prenom, this.utilisateur()?.nom].filter(Boolean).join(' ').trim());
  salutation = computed(() => {
    const u = this.utilisateur();
    const prenom = u?.prenom || u?.nom || this.auth.currentUser()?.email?.split('@')[0] || '';
    return prenom ? `Bonjour, ${prenom}` : 'Bonjour';
  });

  constructor(private auth: AuthService, private utilisateurSvc: UtilisateurService) {}

  ngOnInit() {
    const user = this.auth.currentUser();
    if (!user) return;
    this.utilisateurSvc.getProfil(user.compteId).subscribe({
      next: u => this.utilisateur.set(u),
      error: () => this.utilisateur.set(null)
    });
  }
}
