import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, FormsModule],
  template: `
<div class="landing">
  <!-- TOPBAR -->
  <nav class="landing-nav">
    <span class="logo">CoviaRide</span>
    <div class="nav-links">
      <a routerLink="/connexion" class="btn btn-ghost btn-sm">Se connecter</a>
      <a routerLink="/inscription" class="btn btn-primary btn-sm">Créer un compte</a>
    </div>
  </nav>

  <!-- HERO -->
  <section class="hero-section">
    <div class="hero-content">
      <h1>Votre chauffeur <em>express</em> avec sa voiture</h1>
      <p class="hero-sub">Trouvez un chauffeur disponible avec son véhicule pour toutes vos trajets d'une ville à une autre en toute sécurité</p>
      <div class="search-box">
        <div class="input">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          <input type="text" placeholder="Adresse de départ" [(ngModel)]="depart"/>
        </div>
        <div class="input">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          <input type="text" placeholder="Destination" [(ngModel)]="destination"/>
        </div>
        <a routerLink="/inscription" class="btn btn-primary btn-full">Trouver un chauffeur →</a>
      </div>
    </div>
    <div class="hero-image">
      <div class="hero-img-placeholder">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
      </div>
    </div>
  </section>

  <!-- FEATURES -->
  <section class="features-section">
    <div class="feature-item">
      <div class="f-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
      <h3>Rapide &amp; Fiable</h3>
      <p>voyager en moins de 2h</p>
    </div>
    <div class="feature-item">
      <div class="f-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>
      <h3>Sécurisé</h3>
      <p>Chauffeurs vérifiés et assurés</p>
    </div>
    <div class="feature-item">
      <div class="f-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg></div>
      <h3>Suivi en temps réel</h3>
      <p>Suivez votre voyage en direct</p>
    </div>
  </section>

  <!-- CTA CHAUFFEUR -->
  <section class="cta-section">
    <h2>Devenez chauffeur partenaire</h2>
    <p>Générez des revenus en proposant vos services avec votre véhicule</p>
    <a routerLink="/inscription" class="btn btn-primary btn-lg">Rejoindre CoviaRide →</a>
  </section>
</div>
  `,
  styles: [`
    .landing { background: var(--color-surface); }
    .landing-nav { display:flex; align-items:center; justify-content:space-between;
      padding:1rem 3rem; border-bottom:1px solid var(--color-border);
      position:sticky; top:0; background:var(--color-surface); z-index:100; }
    .logo { font-weight:800; font-size:1.1rem; }
    .nav-links { display:flex; gap:0.75rem; }

    .hero-section { display:grid; grid-template-columns:1fr 1fr; min-height:calc(100vh - 65px); }
    .hero-content { padding:4rem 3rem; display:flex; flex-direction:column; justify-content:center;
      max-width:600px; }
    h1 { font-size:clamp(2.2rem,5vw,3.5rem); font-weight:800; line-height:1.1;
      margin-bottom:1rem; em { font-style:italic; color:var(--color-accent); } }
    .hero-sub { font-size:1rem; color:var(--color-muted); margin-bottom:2rem; }
    .search-box { display:flex; flex-direction:column; gap:0.75rem; max-width:480px;
      .input { background:var(--color-bg); } }

    .hero-image { background:#111; display:flex; align-items:center; justify-content:center; }
    .hero-img-placeholder { svg { width:80px; height:80px; color:#444; } }

    .features-section { display:grid; grid-template-columns:repeat(3,1fr);
      gap:2rem; padding:4rem 3rem; background:var(--color-surface); }
    .feature-item { text-align:center;
      .f-icon { width:56px; height:56px; background:var(--color-primary); border-radius:14px;
        display:flex; align-items:center; justify-content:center; margin:0 auto 1rem;
        svg { width:24px; height:24px; color:#fff; } }
      h3 { margin-bottom:0.5rem; }
    }

    .cta-section { background:var(--color-bg); padding:5rem 3rem; text-align:center;
      h2 { margin-bottom:0.75rem; } p { margin-bottom:2rem; } }

    @media(max-width:768px) {
      .hero-section { grid-template-columns:1fr; .hero-image{display:none;} }
      .hero-content { padding:2rem 1.5rem; }
      .features-section { grid-template-columns:1fr; padding:2rem 1.5rem; }
      .cta-section { padding:3rem 1.5rem; }
      .landing-nav { padding:1rem 1.5rem; }
    }
  `]
})
export class LandingComponent {
  depart = '';
  destination = '';
}
