import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Portefeuille, Transaction, MobileMoneyRequest, Page, RetraitAvecCodeValidationRequest } from '../models';

@Injectable({ providedIn: 'root' })
export class PortefeuilleService {
  private base = `${environment.apiUrl}/portefeuilles`;

  constructor(private http: HttpClient) {}

  get(utilisateurId: number): Observable<Portefeuille> {
    return this.http.get<Portefeuille>(`${this.base}/${utilisateurId}`);
  }

  depot(utilisateurId: number, req: MobileMoneyRequest): Observable<Transaction> {
    return this.http.post<Transaction>(`${this.base}/${utilisateurId}/depot`, req);
  }

  retrait(utilisateurId: number, req: MobileMoneyRequest): Observable<Transaction> {
    return this.http.post<Transaction>(`${this.base}/${utilisateurId}/retrait`, req);
  }

  retraitAvecCodeValidation(utilisateurId: number, req: RetraitAvecCodeValidationRequest): Observable<Transaction> {
    return this.http.post<Transaction>(`${this.base}/${utilisateurId}/retrait/verification-email`, req);
  }

  historique(utilisateurId: number, page = 0): Observable<Page<Transaction>> {
    return this.http.get<Page<Transaction>>(`${this.base}/${utilisateurId}/historique?page=${page}`);
  }
}
