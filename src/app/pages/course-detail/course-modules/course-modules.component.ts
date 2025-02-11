import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CourseService } from '../../../shared/services/course.service';
import { Observable, map, switchMap } from 'rxjs';
import { Course, Module } from '../../../shared/models/course.model';
import { UserService } from '../../../shared/services/user.service';

@Component({
  selector: 'app-course-modules',
  standalone: true,
  imports: [
    CommonModule,
    MatExpansionModule,
    MatIconModule,
    MatButtonModule,
    RouterModule
  ],
  templateUrl: './course-modules.component.html',
  styleUrls: ['./course-modules.component.scss']
})
export class CourseModulesComponent implements OnInit {
  course$!: Observable<Course>;
  moduleProgress: { [moduleId: string]: Observable<number> } = {};

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private courseService: CourseService,
    private userService: UserService
  ) {}

  ngOnInit() {
    const courseId = this.route.parent!.snapshot.params['id'];
    
    this.course$ = this.courseService.getCourse(courseId).pipe(
      map(course => {
        // Initialisiere den Fortschritt für jedes Modul
        course.modules.forEach(module => {
          this.moduleProgress[module.id] = this.userService.getModuleProgress(courseId, module.id);
        });
        return course;
      })
    );
  }

  getModuleProgress(moduleId: string): Observable<number> {
    return this.moduleProgress[moduleId];
  }
} 