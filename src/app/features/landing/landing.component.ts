import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { IconComponent } from '../../shared/components/icon/icon.component';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, FormsModule, IconComponent],
  host: { class: 'lx' },
  template: `
<div class="landing">
  <!-- En-tête -->
  <header class="nav">
    <div class="wrap nav-inner">
      <a routerLink="/" class="brand">
        <span class="brand-mark"><lx-icon name="car" [size]="16" /></span>
        <span class="brand-name">Coviaride</span>
      </a>
      <nav class="nav-links">
        <a href="#comment" (click)="defiler($event, 'comment')">Comment ça marche</a>
        <a href="#avantages" (click)="defiler($event, 'avantages')">Nos engagements</a>
        <a routerLink="/connexion">Connexion</a>
        <a routerLink="/inscription" class="lx-btn lx-btn-primary">Commencer</a>
      </nav>
      <div class="nav-mobile">
        <a routerLink="/connexion">Connexion</a>
        <a routerLink="/inscription" class="lx-btn lx-btn-primary lx-btn-sm">S'inscrire</a>
      </div>
    </div>
  </header>

  <!-- Hero -->
  <section class="hero">
    <div class="hero-bg">
      <img src="https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1920"
        alt="" aria-hidden="true" />
      <span class="shade-x"></span><span class="shade-y"></span>
    </div>
    <div class="wrap hero-inner">
      <div class="hero-content">
        <span class="lx-pill-live lx-rise">Covoiturage interurbain au Cameroun</span>
        <h1 class="lx-rise lx-rise-1">Votre chauffeur, <em>à portée de main</em></h1>
        <p class="lead lx-rise lx-rise-2">Réservez une place auprès d'un chauffeur vérifié pour vos trajets de ville à ville. Paiement Mobile Money sécurisé, suivi en direct.</p>

        <form class="search lx-card lx-rise lx-rise-3" (ngSubmit)="rechercher()">
          <div class="lx-form-grid">
            <div>
              <label class="lx-label" for="l-dep">Départ</label>
              <div class="lx-field">
                <span class="lx-dot-start"></span>
                <input id="l-dep" class="lx-input" style="padding-left:2rem" name="depart" [(ngModel)]="depart" placeholder="Ville de départ" autocomplete="off" />
              </div>
            </div>
            <div>
              <label class="lx-label" for="l-dest">Destination</label>
              <div class="lx-field has-icon">
                <span class="lx-field-icon" style="color:var(--lx-red)"><lx-icon name="map-pin" /></span>
                <input id="l-dest" class="lx-input" name="destination" [(ngModel)]="destination" placeholder="Où souhaitez-vous aller ?" autocomplete="off" />
              </div>
            </div>
          </div>
          @if (erreur()) { <div class="lx-error" style="margin-top:.75rem">{{ erreur() }}</div> }
          <button type="submit" class="lx-btn lx-btn-primary lx-btn-block lx-btn-lg" style="margin-top:1rem">
            <lx-icon name="search" /> Rechercher un chauffeur disponible
          </button>
        </form>

        <div class="trust lx-rise lx-rise-4">
          <span><lx-icon name="check-circle" [size]="14" /> Chauffeurs vérifiés</span>
          <span><lx-icon name="check-circle" [size]="14" /> Paiement sécurisé</span>
          <span><lx-icon name="check-circle" [size]="14" /> Annulation gratuite avant acceptation</span>
        </div>
      </div>
    </div>
    <span class="scroll-hint"><lx-icon name="chevron-down" /></span>
  </section>

  <!-- Bandeau -->
  <section class="band">
    <div class="wrap band-grid">
      <div><div class="band-value lx-display">Vérifiés</div><div class="band-label">Chauffeurs & véhicules</div></div>
      <div><div class="band-value lx-display">MoMo · OM</div><div class="band-label">Paiement mobile</div></div>
      <div><div class="band-value lx-display">GPS</div><div class="band-label">Suivi en direct</div></div>
      <div><div class="band-value lx-display">7j / 7</div><div class="band-label">Service client</div></div>
    </div>
  </section>

  <!-- Comment ça marche -->
  <section id="comment" class="section alt">
    <div class="wrap">
      <div class="section-head center">
        <span class="lx-eyebrow">Simple et rapide</span>
        <h2>Comment ça marche</h2>
      </div>
      <div class="steps">
        @for (s of etapes; track s.n) {
          <div class="step">
            <div class="step-n lx-display">{{ s.n }}</div>
            <h3>{{ s.titre }}</h3>
            <p>{{ s.texte }}</p>
          </div>
        }
      </div>
    </div>
  </section>

  <!-- Engagements -->
  <section id="avantages" class="section">
    <div class="wrap">
      <div class="section-head">
        <span class="lx-eyebrow">Nos engagements</span>
        <h2>Pourquoi nous choisir</h2>
      </div>
      <div class="perks">
        @for (a of avantages; track a.titre) {
          <div class="perk">
            <span class="lx-icon-tile is-soft is-lg"><lx-icon [name]="a.icon" /></span>
            <h3>{{ a.titre }}</h3>
            <p>{{ a.texte }}</p>
          </div>
        }
      </div>
    </div>
  </section>

  <!-- Appel à l'action -->
  <section class="section">
    <div class="wrap cta">
      <span class="cta-glow"></span>
      <h2>Prêt à partir ?</h2>
      <p>Créez votre compte en quelques minutes et réservez votre première place.</p>
      <div class="cta-actions">
        <a routerLink="/inscription" class="lx-btn lx-btn-primary lx-btn-lg">Créer mon compte gratuit <lx-icon name="arrow-right" /></a>
        <a routerLink="/inscription" [queryParams]="{ role: 'chauffeur' }" class="lx-btn lx-btn-outline lx-btn-lg">Devenir chauffeur partenaire</a>
      </div>
    </div>
  </section>

  <footer class="footer">
    <div class="wrap footer-inner">
      <span class="lx-row" style="gap:.5rem">
        <span class="brand-mark small"><lx-icon name="car" [size]="14" /></span>
        <span class="brand-name small">Coviaride</span>
      </span>
      <span class="lx-muted">© {{ annee }} Coviaride. Covoiturage interurbain de confiance.</span>
      <span class="footer-links">
        <a routerLink="/connexion">Connexion</a>
        <a routerLink="/inscription">Inscription</a>
      </span>
    </div>
  </footer>
</div>
  `,
  styles: [`
    :host { display: block; min-height: 100vh; }
    .wrap { max-width: 1280px; margin: 0 auto; padding: 0 1.5rem; }

    .nav { position: absolute; top: 0; left: 0; right: 0; z-index: 30; }
    .nav-inner { display: flex; align-items: center; justify-content: space-between; padding-top: 1.25rem; padding-bottom: 1.25rem; }
    .brand { display: flex; align-items: center; gap: 0.5rem; text-decoration: none; }
    .brand-mark { width: 32px; height: 32px; border-radius: 8px; background: var(--lx-primary); color: var(--lx-primary-fg);
      display: flex; align-items: center; justify-content: center; &.small { width: 28px; height: 28px; } }
    .brand-name { font-family: var(--lx-font-display); font-style: italic; font-size: 1.25rem; font-weight: 500; color: #fff;
      &.small { font-size: 0.9rem; color: rgba(240, 236, 227, 0.7); } }
    .nav-links { display: flex; align-items: center; gap: 2rem;
      a:not(.lx-btn) { color: rgba(255, 255, 255, 0.7); text-decoration: none; font-size: 0.875rem; transition: color 0.15s; &:hover { color: #fff; } } }
    .nav-mobile { display: none; align-items: center; gap: 0.75rem; a:not(.lx-btn) { color: rgba(255,255,255,.8); font-size: 0.875rem; text-decoration: none; } }

    .hero { position: relative; min-height: 100vh; display: flex; align-items: center; overflow: hidden; }
    .hero-bg { position: absolute; inset: 0;
      img { width: 100%; height: 100%; object-fit: cover; }
      .shade-x { position: absolute; inset: 0; background: linear-gradient(to right, var(--lx-bg), rgba(9,10,11,.85), rgba(9,10,11,.3)); }
      .shade-y { position: absolute; inset: 0; background: linear-gradient(to top, rgba(9,10,11,.6), transparent); } }
    .hero-inner { position: relative; z-index: 1; width: 100%; padding-top: 6rem; padding-bottom: 4rem; }
    .hero-content { max-width: 672px; }
    h1 { font-size: clamp(2.75rem, 7vw, 4.5rem); line-height: 1.08; margin: 1.5rem 0; font-weight: 500;
      em { color: var(--lx-primary); font-style: italic; } }
    .lead { font-size: 1.125rem; color: rgba(240, 236, 227, 0.6); line-height: 1.65; max-width: 512px; margin: 0 0 2.5rem; }
    .search { padding: 1.25rem; box-shadow: 0 25px 50px rgba(0, 0, 0, 0.4); }
    .trust { display: flex; flex-wrap: wrap; gap: 0.5rem 1.5rem; margin-top: 1.5rem; font-size: 0.75rem; color: rgba(240, 236, 227, 0.5);
      span { display: inline-flex; align-items: center; gap: 0.4rem; } lx-icon { color: #10b981; } }
    .scroll-hint { position: absolute; bottom: 2rem; left: 50%; transform: translateX(-50%); color: rgba(240,236,227,.3);
      animation: bob 2.5s ease-in-out infinite; }
    @keyframes bob { 50% { transform: translate(-50%, 8px); } }

    .band { background: var(--lx-card); border-top: 1px solid var(--lx-border); border-bottom: 1px solid var(--lx-border); }
    .band-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2rem; text-align: center; padding-top: 1.5rem; padding-bottom: 1.5rem; }
    .band-value { font-size: clamp(1.5rem, 3vw, 2.1rem); color: var(--lx-primary); margin-bottom: 0.25rem; }
    .band-label { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--lx-muted-fg); }

    .section { padding: 6rem 0; &.alt { background: var(--lx-card); border-bottom: 1px solid var(--lx-border); } }
    .section-head { margin-bottom: 3.5rem; &.center { text-align: center; }
      h2 { font-size: clamp(2.25rem, 5vw, 3rem); margin: 0; } }
    .steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3rem; }
    .step-n { font-size: 3.75rem; color: rgba(200, 146, 42, 0.2); line-height: 1; margin-bottom: 1rem; }
    .step h3, .perk h3 { font-size: 1.25rem; margin: 0 0 0.75rem; }
    .step p, .perk p { font-size: 0.875rem; line-height: 1.65; margin: 0; }
    .perks { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2rem; }
    .perk .lx-icon-tile { margin-bottom: 1rem; transition: background 0.2s; }
    .perk:hover .lx-icon-tile { background: rgba(200, 146, 42, 0.2); }

    .cta { position: relative; max-width: 896px; overflow: hidden; text-align: center; padding: 4rem 3rem;
      background: var(--lx-card); border: 1px solid var(--lx-border); border-radius: var(--lx-r-xl);
      h2 { position: relative; font-size: clamp(2.25rem, 5vw, 3rem); margin: 0 0 1rem; }
      p { position: relative; max-width: 576px; margin: 0 auto 2.5rem; } }
    .cta-glow { position: absolute; inset: 0; background: linear-gradient(135deg, rgba(200,146,42,.1), transparent 60%); }
    .cta-actions { position: relative; display: flex; flex-wrap: wrap; gap: 1rem; justify-content: center; }

    .footer { border-top: 1px solid var(--lx-border); background: var(--lx-card); padding: 2.5rem 0; font-size: 0.75rem; }
    .footer-inner { display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
    .footer-links { display: flex; gap: 1.5rem; a { color: var(--lx-muted-fg); text-decoration: none; &:hover { color: var(--lx-fg); } } }

    @media (max-width: 900px) {
      .perks { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 767px) {
      .nav-links { display: none; }
      .nav-mobile { display: flex; }
      .band-grid { grid-template-columns: repeat(2, 1fr); gap: 1.5rem; }
      .steps { grid-template-columns: 1fr; gap: 2rem; }
      .section { padding: 4rem 0; }
      .section-head { margin-bottom: 2.5rem; }
      .cta { padding: 3rem 1.5rem; margin: 0 1rem; width: auto; }
      .cta-actions .lx-btn { width: 100%; }
      .footer-inner { flex-direction: column; text-align: center; }
      .lead { font-size: 1rem; }
    }
    @media (max-width: 520px) {
      .perks { grid-template-columns: 1fr; }
      .wrap { padding: 0 1rem; }
    }
  `]
})
export class LandingComponent {
  private router = inject(Router);
  private auth = inject(AuthService);

  depart = '';
  destination = '';
  erreur = signal('');
  annee = new Date().getFullYear();

  readonly etapes = [
    { n: '01', titre: 'Indiquez votre trajet', texte: 'Saisissez votre ville de départ, votre destination et la date de votre voyage.' },
    { n: '02', titre: 'Choisissez votre chauffeur', texte: 'Comparez les trajets, les avis et les prix. Négociez si besoin, puis réservez.' },
    { n: '03', titre: 'Voyagez sereinement', texte: 'Suivez votre chauffeur en direct. Le paiement lui est versé une fois arrivé.' },
  ];

  readonly avantages = [
    { icon: 'shield-check', titre: 'Chauffeurs vérifiés', texte: 'Identité, permis et véhicule contrôlés avant chaque mise en ligne.' },
    { icon: 'clock', titre: 'Réservation rapide', texte: "Trouvez un trajet et envoyez votre demande en moins d'une minute." },
    { icon: 'credit-card', titre: 'Paiement protégé', texte: "Fonds bloqués jusqu'à votre embarquement, puis versés à l'arrivée." },
    { icon: 'message', titre: 'Contact direct', texte: "Échangez avec votre chauffeur depuis l'application, sans intermédiaire." },
  ];

  defiler(e: Event, id: string) {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }

  rechercher() {
    const depart = this.depart.trim();
    const arrivee = this.destination.trim();
    if (!depart || !arrivee) {
      this.erreur.set('Indiquez une ville de départ et une destination.');
      return;
    }
    this.erreur.set('');
    const cible = this.router.createUrlTree(['/client/nouvelle-course'], { queryParams: { depart, arrivee } }).toString();
    const user = this.auth.currentUser();
    if (user && this.auth.isAuthenticated() && (user.role === 'PASSAGER' || user.role === 'PASSAGER_ET_CHAUFFEUR')) {
      this.router.navigateByUrl(cible);
    } else {
      this.router.navigate(['/connexion'], { queryParams: { retour: cible } });
    }
  }
}
