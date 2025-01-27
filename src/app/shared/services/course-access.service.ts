import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { User, Progress, CourseProgress } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class CourseAccessService {
  constructor(
    private firestore: AngularFirestore,
    private authService: AuthService
  ) {}

  private calculateCourseProgress(courseProgress: CourseProgress | undefined): number {
    if (!courseProgress?.modules) return 0;

    let completedLessons = 0;
    let totalLessons = 0;

    Object.values(courseProgress.modules).forEach(module => {
      Object.values(module.lessons).forEach(lesson => {
        if (lesson.completed) completedLessons++;
        totalLessons++;
      });
    });

    return totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;
  }

  hasAccessToCourse(courseId: string): Observable<boolean> {
    return this.getCourseAccess(courseId).pipe(
      map(result => result.hasAccess)
    );
  }

  getCourseAccess(courseId: string): Observable<{ hasAccess: boolean; progress: number }> {
    return this.authService.user$.pipe(
      switchMap(user => {
        if (!user) {
          return of({ hasAccess: false, progress: 0 });
        }

        return this.firestore.doc<User>(`users/${user.uid}`).valueChanges().pipe(
          map(userData => {
            if (!userData) return { hasAccess: false, progress: 0 };

            const hasAccess = 
              userData.purchasedCourses?.includes(courseId) || 
              userData.purchased?.includes(courseId) || 
              userData.courses?.purchased?.includes(courseId) || 
              false;

            const courseProgress = userData?.progress?.courses[courseId];
            const progress = courseProgress ? this.calculateCourseProgress(courseProgress) : 0;

            return { hasAccess, progress };
          })
        );
      })
    );
  }

  // Get all courses the user has access to
  getUserCourses(): Observable<string[]> {
    return this.authService.user$.pipe(
      switchMap(user => {
        if (!user) return of([]);
        
        return this.firestore.doc<User>(`users/${user.uid}`).valueChanges().pipe(
          map(userData => userData?.purchasedCourses || [])
        );
      })
    );
  }

  // Get course progress for a specific course
  getCourseProgress(courseId: string): Observable<number> {
    return this.authService.user$.pipe(
      switchMap(user => {
        if (!user) return of(0);
        
        return this.firestore.doc<User>(`users/${user.uid}`).valueChanges().pipe(
          map(userData => {
            const courseProgress = userData?.progress?.courses[courseId];
            return courseProgress ? this.calculateCourseProgress(courseProgress) : 0;
          })
        );
      })
    );
  }
} 