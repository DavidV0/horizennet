import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { CourseService } from '../../shared/services/course.service';
import { Course, Module } from '../../shared/models/course.model';
import { Observable, switchMap, map } from 'rxjs';

interface ModuleWithProgress extends Module {
  image?: string;
  isUnlocked: boolean;
}

interface CourseWithModules extends Course {
  modules: ModuleWithProgress[];
}

@Component({
  selector: 'app-course-detail',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule
  ],
  templateUrl: './course-detail.component.html',
  styleUrls: ['./course-detail.component.scss']
})
export class CourseDetailComponent implements OnInit {
  course$!: Observable<CourseWithModules>;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private courseService: CourseService
  ) {}

  ngOnInit() {
    this.course$ = this.route.params.pipe(
      switchMap(params => this.courseService.getCourse(params['id'])),
      map(course => ({
        ...course,
        modules: course.modules.map((module, index) => ({
          ...module,
          image: `assets/images/module-${index + 1}.jpg`,
          isUnlocked: index === 0 // First module is unlocked by default
        }))
      }))
    );
  }

  calculateModuleProgress(module: Module): number {
    if (!module.lessons || module.lessons.length === 0) return 0;
    const completedLessons = module.lessons.filter(lesson => lesson.completed).length;
    return Math.round((completedLessons / module.lessons.length) * 100);
  }

  startModule(module: ModuleWithProgress) {
    if (!module.isUnlocked) return;
    const courseId = this.route.snapshot.params['id'];
    this.router.navigate(['dashboard', 'courses', courseId, 'modules', module.id]);
  }
} 