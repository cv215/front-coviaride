import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) return true;
  router.navigate(['/connexion']);
  return false;
};

export const clientGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    router.navigate(['/connexion']);
    return false;
  }
  if (auth.isClient() || auth.isAdmin()) return true;
  router.navigate(['/']);
  return false;
};

export const chauffeurGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    router.navigate(['/connexion']);
    return false;
  }
  if (auth.isChauffeur() || auth.isAdmin()) return true;
  router.navigate(['/']);
  return false;
};

export const adminGuard: CanActivateFn = () => {
  const router = inject(Router);

  // Lire DIRECTEMENT depuis localStorage (pas depuis le signal)
  try {
    const raw = localStorage.getItem('ce_user');
    const token = localStorage.getItem('ce_access_token');

    if (!token || !raw) {
      router.navigate(['/connexion']);
      return false;
    }

    const user = JSON.parse(raw);
    if (user?.role === 'SUPER_ADMIN') {
      return true;
    }

    router.navigate(['/']);
    return false;

  } catch {
    router.navigate(['/connexion']);
    return false;
  }
};