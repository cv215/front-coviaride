import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, ForgotPasswordRequest, InscriptionRequest, LoginRequest, ResetPasswordRequest, ValidatePasswordRequest } from '../models';

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
      tap(res => this.sauvegarderSession(res))
    );
  }

  demanderResetPassword(req: ForgotPasswordRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${environment.apiUrl}/auth/mot-de-passe/oublie`, req);
  }

  reinitialiserMotDePasse(req: ResetPasswordRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${environment.apiUrl}/auth/mot-de-passe/reset`, req);
  }

  /** Vérifie le mot de passe actuel côté serveur avant d'enregistrer le nouveau. */
  /** Le titulaire ferme son compte (quitte l'application). */
  fermerCompte(motDePasse: string, motif?: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${environment.apiUrl}/auth/compte/fermeture`, { motDePasse, motif });
  }

  changerMotDePasse(ancienMotDePasse: string, nouveauMotDePasse: string): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${environment.apiUrl}/auth/compte/mot-de-passe`, { ancienMotDePasse, nouveauMotDePasse });
  }

  /** @param expiree true quand la session a expiré : on renvoie vers la connexion en gardant la page demandée. */
  deconnexion(expiree = false): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUser.set(null);
    if (expiree) {
      const retour = this.router.url;
      if (!retour.startsWith('/connexion')) {
        this.router.navigate(['/connexion'], { queryParams: { expire: 1, retour } });
      }
    } else {
      this.router.navigate(['/']);
    }
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_KEY);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;
    // Access token expiré mais refresh token présent : l'intercepteur le renouvellera.
    return !this.estExpire(token) || !!this.getRefreshToken();
  }

  private estExpire(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      return typeof payload.exp === 'number' && payload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
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
    const user = { ...(this.currentUser() ?? {}), ...res } as AuthResponse;
    localStorage.setItem(this.TOKEN_KEY, res.accessToken);
    if (res.refreshToken) localStorage.setItem(this.REFRESH_KEY, res.refreshToken);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    this.currentUser.set(user);
  }

  private loadUser(): AuthResponse | null {
    try {
      const data = localStorage.getItem(this.USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      localStorage.removeItem(this.USER_KEY);
      return null;
    }
  }
}
