import { Component, OnInit, OnDestroy, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../shared/services/auth.service';
import { CourseService } from '../../shared/services/course.service';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable, of, BehaviorSubject, forkJoin, Subscription, from } from 'rxjs';
import { take, filter, switchMap, map, tap, catchError, finalize } from 'rxjs/operators';
import { DashboardNavbarComponent } from '../../core/components/dashboard-navbar/dashboard-navbar.component';
import { Course } from '../../shared/models/course.model';
import { UserService } from '../../shared/services/user.service';
import { User } from '../../shared/models/user.model';

interface UserCourse {
  title: string;
  description: string;
  image: string;
  modules: any[];
  isActive: boolean;
  createdAt: any;
  updatedAt: any;
}

interface CourseWithProgress extends Course {
  progress: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule,
    MatButtonModule, 
    MatIconModule, 
    MatCardModule, 
    MatDividerModule,
    MatProgressSpinnerModule,
    DashboardNavbarComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  userData: any;
  isChildRoute = false;
  courses: CourseWithProgress[] = [];
  private subscription!: Subscription;

  constructor(
    private authService: AuthService,
    private courseService: CourseService,
    private firestore: AngularFirestore,
    private router: Router,
    private userService: UserService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.isChildRoute = this.router.url !== '/dashboard';
    });
  }

  ngOnInit() {
    this.loadCourses();
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  private loadCourses() {
    this.subscription = this.authService.user$.pipe(
      take(1),
      switchMap(user => {
        if (!user) return of(null);
        return this.firestore.doc<User>(`users/${user.uid}`).get();
      })
    ).subscribe({
      next: async (userDoc) => {
        if (!userDoc) return;

        let userData = userDoc.data() as User;
        this.userData = userData;

        // Prüfe ob der User die alte Struktur hat und migriere wenn nötig
        if (userData?.courses || userData?.purchased) {
          console.log('🔄 Alte Datenstruktur erkannt - starte Migration');
          await this.userService.migratePurchasedCourses(userDoc.id);
          
          // Lade die aktualisierten Daten
          const updatedUserDoc = await this.firestore.doc<User>(`users/${userDoc.id}`).get().toPromise();
          if (!updatedUserDoc?.exists) return;
          userData = updatedUserDoc.data() as User;
          this.userData = userData;
        }

        if (!userData?.purchasedCourses?.length) {
          this.courses = [];
          return;
        }

        const coursesPromises = userData.purchasedCourses.map(courseId => 
          this.firestore.doc<Course>(`courses/${courseId}`).get().toPromise()
        );

        const courseDocs = await Promise.all(coursesPromises);
        
        const coursesArray = courseDocs
          .filter(doc => doc?.exists)
          .map(doc => {
            const course = doc!.data() as Course;
            const courseId = doc!.id;
            
            let completedLessons = 0;
            let totalLessons = 0;

            course.modules.forEach(module => {
              module.lessons.forEach(lesson => {
                totalLessons++;
                const lessonProgress = userData.progress?.courses[courseId]?.modules[module.id]?.lessons[lesson.id];
                if (lessonProgress?.completed) {
                  completedLessons++;
                  lesson.completed = true;
                }
              });
            });

            return {
              ...course,
              id: courseId,
              progress: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0
            } as CourseWithProgress;
          });

        this.ngZone.run(() => {
          this.courses = coursesArray;
          this.cdr.detectChanges();
        });
      },
      error: (error) => {
        this.courses = [];
        this.cdr.detectChanges();
      }
    });
  }

  getModuleCount(course: Course): number {
    return course.modules.length;
  }

  getLessonCount(course: Course): number {
    return course.modules.reduce((total, module) => total + module.lessons.length, 0);
  }

  getTotalLessons(course: Course): number {
    return course.modules?.reduce((total, module) => total + (module.lessons?.length || 0), 0) || 0;
  }

  getCourseProgress(course: Course): number {
    const totalLessons = this.getLessonCount(course);
    if (totalLessons === 0) return 0;

    const completedLessons = course.modules.reduce((total, module) => {
      return total + module.lessons.filter(lesson => lesson.completed).length;
    }, 0);

    return Math.round((completedLessons / totalLessons) * 100);
  }

  continueCourse(courseId: string) {
    this.router.navigate(['/dashboard/courses', courseId]);
  }

  startCourse(course: any) {
    if (course && course.id) {
      if (course.modules && course.modules.length > 0) {
        const firstModule = course.modules[0];
        this.router.navigate(['/dashboard/courses', course.id, 'modules', firstModule.id]);
      } else {
        this.router.navigate(['/dashboard/courses', course.id]);
      }
    }
  }
}
