import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DashboardAdmin, Signalement, Page } from '../models';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private base = `${environment.apiUrl}/administration`;

  constructor(private http: HttpClient) {}

  getDashboard(): Observable<DashboardAdmin> {
    return this.http.get<DashboardAdmin>(`${this.base}/dashboard`);
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
}
