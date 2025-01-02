import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
    data: { scrollPositionRestoration: 'top' }
  },
  {
    path: 'produkte',
    loadComponent: () => import('./pages/produkte/produkte.component').then(m => m.ProdukteComponent)
  },
  {
    path: 'ueber-uns',
    loadComponent: () => import('./pages/ueber-uns/ueber-uns.component').then(m => m.UeberUnsComponent)
  },
  {
    path: 'blog',
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/blog/blog.component').then(m => m.BlogComponent)
      },
      {
        path: ':slug',
        loadComponent: () => import('./pages/blog/blog-detail/blog-detail.component').then(m => m.BlogDetailComponent)
      }
    ]
  },
  {
    path: 'events',
    loadComponent: () => import('./pages/events/events.component').then(m => m.EventsComponent)
  },
  {
    path: 'shop',
    loadComponent: () => import('./pages/shop/shop.component').then(m => m.ShopComponent)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'agb',
    loadComponent: () => import('./pages/agb/agb.component').then(m => m.AgbComponent)
  },
  {
    path: 'widerruf',
    loadComponent: () => import('./pages/widerruf/widerruf.component').then(m => m.WiderrufComponent)
  },
  {
    path: 'disclaimer',
    loadComponent: () => import('./pages/disclaimer/disclaimer.component').then(m => m.DisclaimerComponent)
  },
  {
    path: 'impressum',
    loadComponent: () => import('./pages/impressum/impressum.component').then(m => m.ImpressumComponent)
  },
  {
    path: 'datenschutz',
    loadComponent: () => import('./pages/datenschutz/datenschutz.component').then(m => m.DatenschutzComponent)
  },
  {
    path: 'faq',
    loadComponent: () => import('./pages/faq/faq.component').then(m => m.FaqComponent)
  },
  {
    path: 'produkte/:id',
    loadComponent: () => import('./pages/product-detail/product-detail.component')
      .then(m => m.ProductDetailComponent)
  },
  {
    path: '**',
    redirectTo: ''
  }
];

export const routerConfig = {
  scrollPositionRestoration: 'enabled',
  anchorScrolling: 'enabled',
  scrollOffset: [0, 0]
};
