import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { AdminService } from '../../shared/services/admin.service';
import { map, switchMap, take } from 'rxjs/operators';

export const adminGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const adminService = inject(AdminService);

  return authService.isLoggedIn().pipe(
    take(1),
    switchMap(user => {
      if (!user) {
        router.navigate(['/admin/login']);
        return [false];
      }
      return adminService.isAdmin(user.uid);
    }),
    map(isAdmin => {
      if (isAdmin) {
        return true;
      }
      router.navigate(['/admin/products']);
      return false;
    })
  );
}; 