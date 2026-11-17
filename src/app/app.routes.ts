import { Routes } from '@angular/router';
import { authGuard, clientGuard, chauffeurGuard, adminGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  // Landing page
  {
    path: '',
    loadComponent: () => import('./features/landing/landing.component').then(m => m.LandingComponent)
  },

  // AUTH
  {
    path: 'connexion',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'inscription',
    loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent)
  },
  {
    path: 'valider-compte',
    loadComponent: () => import('./features/auth/validate-password/validate-password.component').then(m => m.ValidatePasswordComponent)
  },
  {
    path: 'mot-de-passe-oublie',
    loadComponent: () => import('./features/auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent)
  },

  // CLIENT SPACE
  {
    path: 'client',
    canActivate: [clientGuard],
    loadComponent: () => import('./features/client/client-layout/client-layout.component').then(m => m.ClientLayoutComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/client/dashboard/dashboard.component').then(m => m.ClientDashboardComponent)
      },
      {
        path: 'nouvelle-course',
        loadComponent: () => import('./features/client/new-course/new-course.component').then(m => m.NewCourseComponent)
      },
      {
        path: 'chauffeurs',
        loadComponent: () => import('./features/client/drivers/drivers.component').then(m => m.DriversComponent)
      },
      {
        path: 'historique',
        loadComponent: () => import('./features/client/history/history.component').then(m => m.HistoryComponent)
      },
      {
        path: 'transactions',
        loadComponent: () => import('./features/client/transactions/transactions.component').then(m => m.TransactionsComponent)
      },
      {
        path: 'remboursement',
        loadComponent: () => import('./features/client/remboursement/remboursement.component').then(m => m.RemboursementComponent)
      },
      {
       path: 'portefeuille',
       loadComponent: () => import('./features/client/portefeuille/portefeuille.component').then(m => m.PortefeuilleClientComponent)
      },
      {
       path: 'profil',
       loadComponent: () => import('./features/client/profile/profile.component').then(m => m.ProfileComponent)
      },

      {
        path: 'suivi/:id',
        loadComponent: () => import('./features/client/tracking/tracking.component').then(m => m.TrackingComponent)
      },
      {
       path: 'messages',
       loadComponent: () => import('./features/client/messages/messages.component').then(m => m.MessagesComponent)
      }
    ]
  },

  // CHAUFFEUR SPACE
  {
    path: 'chauffeur',
    canActivate: [chauffeurGuard],
    loadComponent: () => import('./features/chauffeur/chauffeur-layout/chauffeur-layout.component').then(m => m.ChauffeurLayoutComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/chauffeur/dashboard/chauffeur-dashboard.component').then(m => m.ChauffeurDashboardComponent)
      },
      {
        path: 'courses',
        loadComponent: () => import('./features/chauffeur/courses/courses.component').then(m => m.CoursesComponent)
      },
      {
        path: 'revenus',
        loadComponent: () => import('./features/chauffeur/earnings/earnings.component').then(m => m.EarningsComponent)
      },
      {
        path: 'profil',
        loadComponent: () => import('./features/chauffeur/profile/chauffeur-profile.component').then(m => m.ChauffeurProfileComponent)
      },
      {
       path: 'messages',
       loadComponent: () => import('./features/client/messages/messages.component').then(m => m.MessagesComponent)
      },
      {
        path: 'suivi/:id',
        loadComponent: () => import('./features/client/tracking/tracking.component').then(m => m.TrackingComponent)
      }
    ]
  },

  // ADMIN SPACE
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () => import('./features/admin/admin-layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/admin/dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent)
      },
      {
        path: 'utilisateurs',
        loadComponent: () => import('./features/admin/users/users.component').then(m => m.UsersComponent)
      },
      {
        path: 'kyc',
        loadComponent: () => import('./features/admin/drivers-kyc/drivers-kyc.component').then(m => m.DriversKycComponent)
      },
      {
        path: 'signalements',
        loadComponent: () => import('./features/admin/signalements/signalements.component').then(m => m.SignalementsComponent)
      },
      {
        path: 'commissions',
        loadComponent: () => import('./features/admin/commissions/commissions.component').then(m => m.CommissionsComponent)
      },
      {
        path: 'admins',
        loadComponent: () => import('./features/admin/admins/admins.component').then(m => m.AdminsComponent)
      },
      {
        path: 'remboursements',
        loadComponent: () => import('./features/admin/remboursements/remboursements.component').then(m => m.RemboursementsComponent)
      }
    ]
  },

  { path: '**', redirectTo: '' }
];
