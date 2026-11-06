import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./login/login.component').then((module) => module.LoginComponent)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/dashboard.component').then((module) => module.DashboardComponent)
  },
  {
    path: 'pagos',
    loadChildren: () => import('./payments/payments.routes').then((module) => module.paymentsRoutes)
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'dashboard' }
];
