import { Component, OnInit } from '@angular/core';
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
import { take, filter, switchMap, map } from 'rxjs/operators';
import { DashboardNavbarComponent } from '../../core/components/dashboard-navbar/dashboard-navbar.component';
import { Course } from '../../shared/models/course.model';
import { Observable } from 'rxjs';

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
export class DashboardComponent implements OnInit {
  userData: any;
  isChildRoute = false;
  courses$!: Observable<Course[]>;
  isLoading = true;

  constructor(
    private authService: AuthService,
    private courseService: CourseService,
    private firestore: AngularFirestore,
    private router: Router
  ) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      const currentUrl = this.router.url;
      this.isChildRoute = currentUrl !== '/dashboard';
    });
  }

  ngOnInit() {
    this.loadUserData();
    this.loadCourses();
  }

  async loadUserData() {
    const user = await this.authService.user$.pipe(take(1)).toPromise();
    if (user) {
      this.firestore.collection('users').doc(user.uid).valueChanges()
        .subscribe(data => {
          this.userData = data;
        });
    }
  }

  loadCourses() {
    this.courses$ = this.courseService.getCourses('USER').pipe(
      map(courses => courses.filter(course => course.isActive)),
      map(courses => {
        this.isLoading = false;
        return courses;
      })
    );
  }

  getModuleCount(course: Course): number {
    return course.modules.length;
  }

  getLessonCount(course: Course): number {
    return course.modules.reduce((total, module) => total + module.lessons.length, 0);
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
}
