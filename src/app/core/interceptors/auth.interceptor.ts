import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, catchError, finalize, shareReplay, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { AuthResponse } from '../models';

/**
 * Routes d'authentification publiques : on n'y joint pas de token et une 401 n'y déclenche
 * jamais de rafraîchissement (sinon un mauvais mot de passe déconnectait l'utilisateur,
 * et un refresh-token expiré provoquait une boucle infinie).
 */
const ROUTES_PUBLIQUES = [
  '/auth/connexion', '/auth/inscription', '/auth/valider-mot-de-passe',
  '/auth/refresh-token', '/auth/mot-de-passe/'
];

/** Un seul rafraîchissement à la fois, partagé par toutes les requêtes en échec simultanées. */
let refreshEnCours$: Observable<AuthResponse> | null = null;

const avecToken = (req: HttpRequest<unknown>, token: string) =>
  req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const estPublique = ROUTES_PUBLIQUES.some(r => req.url.includes(r));
  const token = auth.getToken();

  const authReq = token && !estPublique ? avecToken(req, token) : req;

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status !== 401 || estPublique || !auth.getRefreshToken()) {
        if (err.status === 401 && !estPublique) auth.deconnexion(true);
        return throwError(() => err);
      }

      if (!refreshEnCours$) {
        refreshEnCours$ = auth.refreshToken().pipe(
          finalize(() => { refreshEnCours$ = null; }),
          shareReplay(1)
        );
      }

      return refreshEnCours$.pipe(
        switchMap(res => next(avecToken(req, res.accessToken))),
        catchError(refreshErr => {
          auth.deconnexion(true);
          return throwError(() => (refreshErr instanceof HttpErrorResponse ? err : refreshErr));
        })
      );
    })
  );
};
