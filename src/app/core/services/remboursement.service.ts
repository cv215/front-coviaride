import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DemandeRemboursement {
  id: number;
  reservationId: number;
  passagerId: number;
  montant: number;
  motif: string;
  details: string;
  statut: 'EN_ATTENTE' | 'EN_COURS' | 'ACCEPTE' | 'REFUSE';
  commentaireAdmin?: string;
  dateCreation: string;
  dateTraitement?: string;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
}

@Injectable({ providedIn: 'root' })
export class RemboursementService {

  private base = `${environment.apiUrl}/paiements/remboursement`;

  constructor(private http: HttpClient) {}

  // ── CLIENT ──────────────────────────────────────────────────────────────

  soumettreDemande(passagerId: number, data: {
    reservationId: number;
    motif: string;
    details: string;
  }): Observable<DemandeRemboursement> {
    return this.http.post<DemandeRemboursement>(
      `${this.base}/passager/${passagerId}`, data);
  }

  getMesDemandes(passagerId: number, page = 0):
      Observable<Page<DemandeRemboursement>> {
    return this.http.get<Page<DemandeRemboursement>>(
      `${this.base}/passager/${passagerId}?page=${page}`);
  }

  // ── ADMIN ────────────────────────────────────────────────────────────────

  getAllDemandes(statut = 'EN_ATTENTE', page = 0):
      Observable<Page<DemandeRemboursement>> {
    const qs = statut ? `?statut=${statut}&page=${page}` : `?page=${page}`;
    return this.http.get<Page<DemandeRemboursement>>(
      `${this.base}/admin${qs}`);
  }

  traiterDemande(id: number, accepte: boolean, commentaire: string):
      Observable<DemandeRemboursement> {
    return this.http.put<DemandeRemboursement>(
      `${this.base}/admin/${id}/traiter`, { accepte, commentaire });
  }

  getStats(): Observable<Record<string, number>> {
    return this.http.get<Record<string, number>>(
      `${this.base}/admin/stats`);
  }
}