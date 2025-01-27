import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
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
    private ngZone: NgZone
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
    console.log('Starting to load courses...');
    
    this.subscription = this.authService.user$.pipe(
      take(1),
      switchMap(user => {
        console.log('Current user:', user?.uid);
        if (!user) return of(null);
        return this.firestore.doc<User>(`users/${user.uid}`).get();
      }),
      switchMap(userDoc => {
        if (!userDoc) {
          console.log('No user document found');
          return of([]);
        }

        const userData = userDoc.data() as User;
        console.log('User data:', userData);
        console.log('Purchased courses:', userData?.purchasedCourses);
        
        this.ngZone.run(() => {
          this.userData = userData;
        });
        
        if (!userData?.purchasedCourses?.length) {
          console.log('No purchased courses found');
          return of([]);
        }

        console.log('Loading courses for user...');
        return this.courseService.getCourses('USER').pipe(
          tap(courses => console.log('Received courses:', courses))
        );
      }),
      switchMap((courses: Course[]) => {
        if (!courses.length) {
          console.log('No courses received from service');
          return of([]);
        }

        console.log('Loading progress for courses:', courses);
        const progressPromises = courses.map(course => 
          this.userService.getCourseProgress(course.id).pipe(
            tap(progress => console.log(`Progress for course ${course.id}:`, progress)),
            map(progress => ({
              ...course,
              progress: progress || 0
            }))
          )
        );

        return forkJoin(progressPromises);
      })
    ).subscribe({
      next: (coursesWithProgress) => {
        console.log('Final courses with progress:', coursesWithProgress);
        this.ngZone.run(() => {
          this.courses = coursesWithProgress || [];
        });
      },
      error: (error) => {
        console.error('Error loading courses:', error);
        this.ngZone.run(() => {
          this.courses = [];
        });
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
