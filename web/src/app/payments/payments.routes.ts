import { Routes } from '@angular/router';

/** Árbol de rutas del flujo de pagos (T1–T5), independiente del `/dashboard` de tareas. */
export const paymentsRoutes: Routes = [
  { path: '', redirectTo: 'inicio', pathMatch: 'full' },
  {
    path: 'inicio',
    loadComponent: () => import('./ui/home/home.component').then((m) => m.PaymentsHomeComponent)
  },
  {
    path: 'contacto',
    loadComponent: () => import('./ui/contact-selection/contact-selection.component').then((m) => m.ContactSelectionComponent)
  },
  {
    path: 'monto',
    loadComponent: () => import('./ui/payment-amount/payment-amount.component').then((m) => m.PaymentAmountComponent)
  },
  {
    path: 'confirmar',
    loadComponent: () =>
      import('./ui/payment-confirmation/payment-confirmation.component').then((m) => m.PaymentConfirmationComponent)
  },
  {
    path: 'procesando',
    loadComponent: () =>
      import('./ui/payment-processing/payment-processing.component').then((m) => m.PaymentProcessingComponent)
  },
  {
    path: 'resultado',
    loadComponent: () => import('./ui/payment-result/payment-result.component').then((m) => m.PaymentResultComponent)
  }
];

export default paymentsRoutes;
