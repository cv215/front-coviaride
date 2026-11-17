import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DashboardAdmin, Signalement, Page } from '../models';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private base = `${environment.apiUrl}/administration`;
  private authBase = `${environment.apiUrl}/auth`;

  constructor(private http: HttpClient) {}

  getDashboard(): Observable<DashboardAdmin> {
    return this.http.get<DashboardAdmin>(`${this.base}/dashboard`);
  }

  getWeeklyStats(): Observable<any> {
    return this.http.get<any>(`${this.base}/statistiques/hebdo`);
  }

  getCommissions(): Observable<{ totalCommissions: number }> {
    return this.http.get<{ totalCommissions: number }>(`${this.base}/statistiques/commissions`);
  }

  getSignalements(statut = 'OUVERT', page = 0): Observable<Page<Signalement>> {
    return this.http.get<Page<Signalement>>(`${this.base}/signalements?statut=${statut}&page=${page}`);
  }

  resoudreSignalement(id: number, resolution: string): Observable<Signalement> {
    return this.http.put<Signalement>(`${this.base}/signalements/${id}/resoudre`, { resolution });
  }

  listAdministrateurs(): Observable<any[]> {
    return this.http.get<any[]>(`${this.authBase}/admin/comptes`);
  }

  createAdministrateur(payload: { email: string; motDePasse: string; services: string[] }): Observable<any> {
    return this.http.post<any>(`${this.authBase}/admin/creer`, payload);
  }

  /** Bloque/débloque la connexion (compte d'authentification), en plus du statut du profil. */
  changerBlocageCompte(id: number, bloque: boolean): Observable<{ id: number; bloque: boolean }> {
    return this.http.put<{ id: number; bloque: boolean }>(`${this.authBase}/admin/comptes/${id}/blocage`, { bloque });
  }

  getTrajets(page = 0, size = 20): Observable<Page<any>> {
    return this.http.get<Page<any>>(`${environment.apiUrl}/trajets/admin/tous?page=${page}&size=${size}`);
  }

  updatePasswordAdmin(id: number, motDePasse: string): Observable<any> {
    return this.http.put<any>(`${this.authBase}/admin/${id}/mot-de-passe`, { motDePasse });
  }
}
