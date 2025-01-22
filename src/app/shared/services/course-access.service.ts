import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AuthService } from './auth.service';
import { Observable, map, of, from, switchMap, take } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CourseAccessService {
  constructor(
    private firestore: AngularFirestore,
    private authService: AuthService
  ) {}

  // Check if user has access to a specific course
  hasAccessToCourse(courseId: string): Observable<boolean> {
    return this.authService.user$.pipe(
      switchMap(user => {
        if (!user) return of(false);
        
        return from(
          this.firestore
            .collection('users')
            .doc(user.uid)
            .get()
            .toPromise()
        ).pipe(
          map(doc => {
            if (!doc?.exists) return false;
            const userData = doc.data() as any;
            return userData?.courses?.purchased?.includes(courseId) || false;
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
        
        return from(
          this.firestore
            .collection('users')
            .doc(user.uid)
            .get()
            .toPromise()
        ).pipe(
          map(doc => {
            if (!doc?.exists) return [];
            const userData = doc.data() as any;
            return userData?.courses?.purchased || [];
          })
        );
      })
    );
  }

  // Get course progress for a specific course
  getCourseProgress(courseId: string): Observable<number> {
    return this.authService.user$.pipe(
      switchMap(user => {
        if (!user) return of(0);
        
        return from(
          this.firestore
            .collection('users')
            .doc(user.uid)
            .get()
            .toPromise()
        ).pipe(
          map(doc => {
            if (!doc?.exists) return 0;
            const userData = doc.data() as any;
            return userData?.courses?.progress?.[courseId] || 0;
          })
        );
      })
    );
  }

  // Update course progress
  async updateCourseProgress(courseId: string, progress: number): Promise<void> {
    const user = await this.authService.user$.pipe(take(1)).toPromise();
    if (!user?.uid) throw new Error('User not authenticated');

    return this.firestore
      .collection('users')
      .doc(user.uid)
      .update({
        [`courses.progress.${courseId}`]: progress
      });
  }
} 