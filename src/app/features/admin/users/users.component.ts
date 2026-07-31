import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UtilisateurService } from '../../../core/services/utilisateur.service';
import { Utilisateur } from '../../../core/models';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<div>
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:2rem">
    <div><h2>Gestion des utilisateurs</h2><p>{{ total() }} utilisateurs inscrits</p></div>
    <div style="display:flex;gap:0.75rem">
      <select class="field" style="width:auto" [(ngModel)]="filtreRole" (ngModelChange)="charger()">
        <option value="">Tous les rôles</option>
        <option value="PASSAGER">Clients</option>
        <option value="CHAUFFEUR">Chauffeurs</option>
      </select>
    </div>
  </div>

  @if (loading()) {
    <div style="text-align:center;padding:3rem;color:var(--color-muted)">Chargement...</div>
  } @else {
    <div class="card" style="padding:0;overflow:hidden">
      <table class="data-table">
        <thead><tr>
          <th>Utilisateur</th><th>Email</th><th>Rôle</th>
          <th>Note</th><th>Statut</th><th>KYC</th><th>Actions</th>
        </tr></thead>
        <tbody>
          @for (u of utilisateurs(); track u.id) {
            <tr>
              <td>
                <div style="display:flex;align-items:center;gap:0.75rem">
                  <div style="width:36px;height:36px;border-radius:50%;background:var(--color-bg);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.8rem;flex-shrink:0">
                    {{ u.prenom.charAt(0) }}{{ u.nom.charAt(0) }}
                  </div>
                  <div>
                    <div style="font-weight:600">{{ u.prenom }} {{ u.nom }}</div>
                    <div style="font-size:0.75rem;color:var(--color-muted)">ID #{{ u.id }}</div>
                  </div>
                </div>
              </td>
              <td style="font-size:0.875rem">{{ u.email }}</td>
              <td>
                <span class="badge" [class]="u.role==='CHAUFFEUR'?'badge-info':'badge-muted'">
                  {{ u.role === 'PASSAGER' ? 'Client' : u.role === 'CHAUFFEUR' ? 'Chauffeur' : u.role }}
                </span>
              </td>
              <td>
                @if (u.noteMoyenne > 0) {
                  <span style="display:flex;align-items:center;gap:0.25rem">
                    <span style="color:#F59E0B">★</span> {{ u.noteMoyenne | number:'1.1-1' }}
                  </span>
                } @else { <span style="color:var(--color-muted)">—</span> }
              </td>
              <td>
                <span class="badge" [class]="getStatutBadge(u.statut)">{{ u.statut }}</span>
              </td>
              <td>
                @if (u.kycValide) {
                  <span class="badge badge-success">✓ Validé</span>
                } @else {
                  <span class="badge badge-warning">En attente</span>
                }
              </td>
              <td>
                <div style="display:flex;gap:0.5rem">
                  @if (u.statut !== 'BLOQUE') {
                    <button class="btn btn-danger btn-sm" (click)="bloquer(u)">Bloquer</button>
                  } @else {
                    <button class="btn btn-success btn-sm" (click)="debloquer(u)">Débloquer</button>
                  }
                  @if (!u.kycValide && u.role === 'CHAUFFEUR') {
                    <button class="btn btn-outline btn-sm" (click)="validerKyc(u)">KYC ✓</button>
                  }
                </div>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    <!-- PAGINATION -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-top:1rem">
      <span style="font-size:0.875rem;color:var(--color-muted)">Page {{ page()+1 }} / {{ totalPages() }}</span>
      <div style="display:flex;gap:0.5rem">
        <button class="btn btn-outline btn-sm" [disabled]="page()===0" (click)="page.set(page()-1);charger()">← Préc.</button>
        <button class="btn btn-outline btn-sm" [disabled]="page()===totalPages()-1" (click)="page.set(page()+1);charger()">Suiv. →</button>
      </div>
    </div>
  }
</div>`
})
export class UsersComponent implements OnInit {
  loading = signal(true);
  utilisateurs = signal<Utilisateur[]>([]);
  total = signal(0);
  totalPages = signal(1);
  page = signal(0);
  filtreRole = '';

  constructor(private userSvc: UtilisateurService) {}

  ngOnInit() { this.charger(); }

  charger() {
    this.loading.set(true);
    this.userSvc.getAllAdmin(this.page()).subscribe({
      next: p => {
        this.utilisateurs.set(p.content);
        this.total.set(p.totalElements);
        this.totalPages.set(p.totalPages);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  bloquer(u: Utilisateur) {
    this.userSvc.changerStatut(u.id, 'BLOQUE').subscribe({
      next: updated => this.utilisateurs.update(arr => arr.map(x => x.id===u.id ? updated : x))
    });
  }

  debloquer(u: Utilisateur) {
    this.userSvc.changerStatut(u.id, 'ACTIF').subscribe({
      next: updated => this.utilisateurs.update(arr => arr.map(x => x.id===u.id ? updated : x))
    });
  }

  validerKyc(u: Utilisateur) {
    this.userSvc.validerKyc(u.id).subscribe({
      next: updated => this.utilisateurs.update(arr => arr.map(x => x.id===u.id ? updated : x))
    });
  }

  getStatutBadge(s: string) {
    return { 'ACTIF': 'badge badge-success', 'BLOQUE': 'badge badge-danger',
      'SUSPENDU': 'badge badge-warning', 'EN_ATTENTE_KYC': 'badge badge-info' }[s] || 'badge badge-muted';
  }
}
