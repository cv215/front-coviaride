import { ApplicationConfig, LOCALE_ID } from '@angular/core';
import { provideRouter, withViewTransitions } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    // Les transitions animées sont ignorées quand l'onglet est en arrière-plan : sinon le navigateur
    // les annule et la page reste blanche.
    provideRouter(routes, withViewTransitions({
      skipInitialTransition: true,
      onViewTransitionCreated: ({ transition }) => {
        if (document.hidden) transition.skipTransition();
        transition.finished.catch(() => {});
      }
    })),
    provideHttpClient(withInterceptors([authInterceptor])),
    // Nombres et dates au format français partout (12 500 au lieu de 12,500).
    { provide: LOCALE_ID, useValue: 'fr' }
  ]
};
