import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../shared/services/auth.service';
import { AdminService } from '../../shared/services/admin.service';
import { map, switchMap, take } from 'rxjs/operators';
import { User } from '@angular/fire/auth';

export const adminGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const adminService = inject(AdminService);

  return authService.user$.pipe(
    take(1),
    switchMap(async (user: User | null) => {
      if (!user) {
        router.navigate(['/admin/login']);
        return false;
      }
      
      const isAdmin = await adminService.isAdmin(user.uid);
      if (!isAdmin) {
        router.navigate(['/admin/login']);
        return false;
      }
      
      return true;
    })
  );
}; 