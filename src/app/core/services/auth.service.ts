import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, InscriptionRequest, LoginRequest, ValidatePasswordRequest } from '../models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'ce_access_token';
  private readonly REFRESH_KEY = 'ce_refresh_token';
  private readonly USER_KEY = 'ce_user';

  currentUser = signal<AuthResponse | null>(this.loadUser());

  constructor(private http: HttpClient, private router: Router) {}

  inscrire(req: InscriptionRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${environment.apiUrl}/auth/inscription`, req);
  }

  validerMotDePasse(req: ValidatePasswordRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/valider-mot-de-passe`, req).pipe(
      tap(res => this.sauvegarderSession(res))
    );
  }

  connexion(req: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/connexion`, req).pipe(
      tap(res => {
        localStorage.setItem(this.TOKEN_KEY, res.accessToken);
        localStorage.setItem(this.REFRESH_KEY, res.refreshToken);
        localStorage.setItem(this.USER_KEY, JSON.stringify(res));

        this.currentUser.set(res);
      })
    );
  }

  deconnexion(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUser.set(null);
    this.router.navigate(['/']);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    const token = this.getToken()
    return !!token;
  }

  getRole(): string {
    const fromSignal = this.currentUser()?.role;
    if (fromSignal) return fromSignal;

    const userData = localStorage.getItem(this.USER_KEY);
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        return parsed?.role ?? '';
      } catch {}
    }
    return '';
  }

  isClient(): boolean {
    const role = this.getRole();
    return role === 'PASSAGER' || role === 'PASSAGER_ET_CHAUFFEUR';
  }

  isChauffeur(): boolean {
    const role = this.getRole();
    return role === 'CHAUFFEUR' || role === 'PASSAGER_ET_CHAUFFEUR';
  }

  isAdmin(): boolean {
    return this.getRole() === 'SUPER_ADMIN';
  }

  refreshToken(): Observable<AuthResponse> {
    const refreshToken = localStorage.getItem(this.REFRESH_KEY);
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/refresh-token`, { refreshToken }).pipe(
      tap(res => this.sauvegarderSession(res))
    );
  }

  private sauvegarderSession(res: AuthResponse): void {
    localStorage.setItem(this.TOKEN_KEY, res.accessToken);
    localStorage.setItem(this.REFRESH_KEY, res.refreshToken);
    localStorage.setItem(this.USER_KEY, JSON.stringify(res));
    this.currentUser.set(res);
  }

  private loadUser(): AuthResponse | null {
    const data = localStorage.getItem(this.USER_KEY);
    return data ? JSON.parse(data) : null;
  }
}
