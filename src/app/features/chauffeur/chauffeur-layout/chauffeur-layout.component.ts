import { Component, OnInit, computed, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { UtilisateurService } from '../../../core/services/utilisateur.service';
import { Utilisateur } from '../../../core/models';
import { AppShellComponent, ShellNavItem } from '../../../shared/components/app-shell/app-shell.component';

@Component({
  selector: 'app-chauffeur-layout',
  standalone: true,
  imports: [RouterOutlet, AppShellComponent],
  template: `
<lx-app-shell
  espace="Chauffeur"
  homePath="/chauffeur/dashboard"
  profilePath="/chauffeur/profil"
  messagesPath="/chauffeur/messages"
  roleLabel="Chauffeur partenaire"
  [nom]="nomComplet()"
  [salutation]="salutation()"
  [navPrincipale]="navPrincipale"
  [action]="{ path: '/chauffeur/courses', icon: 'plus', label: 'Publier un trajet', query: { nouveau: '1' } }">
  <router-outlet />
</lx-app-shell>
  `
})
export class ChauffeurLayoutComponent implements OnInit {
  readonly navPrincipale: ShellNavItem[] = [
    { path: '/chauffeur/dashboard', icon: 'home',    label: 'Accueil',  titre: '' },
    { path: '/chauffeur/courses',   icon: 'route',   label: 'Courses',  titre: 'Mes courses' },
    { path: '/chauffeur/revenus',   icon: 'wallet',  label: 'Revenus',  titre: 'Revenus' },
    { path: '/chauffeur/messages',  icon: 'message', label: 'Messages', titre: 'Messages' },
    { path: '/chauffeur/profil',    icon: 'user',    label: 'Profil',   titre: 'Mon profil' },
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
