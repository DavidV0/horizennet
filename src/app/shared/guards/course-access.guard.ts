import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable, map, take } from 'rxjs';
import { CourseAccessService } from '../services/course-access.service';

@Injectable({
  providedIn: 'root'
})
export class CourseAccessGuard implements CanActivate {
  constructor(
    private courseAccessService: CourseAccessService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    const courseId = route.params['id'];
    
    return this.courseAccessService.hasAccessToCourse(courseId).pipe(
      take(1),
      map(hasAccess => {
        if (!hasAccess) {
          this.router.navigate(['/courses'], { 
            queryParams: { 
              error: 'access_denied',
              course: courseId 
            }
          });
        }
        return hasAccess;
      })
    );
  }
} 