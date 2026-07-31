import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Notification, Page } from '../models';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private base = `${environment.apiUrl}/notifications`;

  constructor(private http: HttpClient) {}

  getNotifications(utilisateurId: number, page = 0): Observable<Page<Notification>> {
    return this.http.get<Page<Notification>>(`${this.base}/${utilisateurId}?page=${page}`);
  }

  getNonLues(utilisateurId: number): Observable<{ nonLues: number }> {
    return this.http.get<{ nonLues: number }>(`${this.base}/${utilisateurId}/non-lues`);
  }

  marquerLues(utilisateurId: number): Observable<void> {
    return this.http.put<void>(`${this.base}/${utilisateurId}/marquer-lues`, {});
  }
}
