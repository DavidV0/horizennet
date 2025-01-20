import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CourseService } from '../../../shared/services/course.service';
import { Course } from '../../../shared/models/course.model';
import { CourseFormComponent } from './course-form/course-form.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ConfirmDialogComponent } from '../../components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-courses',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './courses.component.html',
  styleUrls: ['./courses.component.scss']
})
export class CoursesComponent implements OnInit {
  displayedColumns: string[] = ['image', 'title', 'modules', 'status', 'actions'];
  dataSource: Course[] = [];
  isLoading = true;

  constructor(
    private courseService: CourseService,
    private dialog: MatDialog,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadCourses();
  }

  loadCourses() {
    this.isLoading = true;
    this.courseService.getCourses('ADMIN').subscribe(
      (courses) => {
        this.dataSource = courses;
        this.isLoading = false;
      },
      (error) => {
        console.error('Error loading courses:', error);
        this.isLoading = false;
      }
    );
  }

  createNewCourse() {
    const dialogRef = this.dialog.open(CourseFormComponent, {
      width: '900px',
      height: '80vh',
      data: { mode: 'create' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadCourses();
      }
    });
  }

  editCourse(course: Course) {
    const dialogRef = this.dialog.open(CourseFormComponent, {
      width: '900px',
      height: '80vh',
      data: { mode: 'edit', course }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadCourses();
      }
    });
  }

  deleteCourse(course: Course) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Kurs löschen',
        message: `Möchten Sie den Kurs "${course.title}" wirklich löschen?`
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.courseService.deleteCourse(course.id).subscribe(() => {
          this.loadCourses();
        });
      }
    });
  }

  toggleCourseStatus(course: Course) {
    const updatedCourse = {
      ...course,
      isActive: !course.isActive
    };
    this.courseService.updateCourse(course.id, updatedCourse).then(() => {
      this.loadCourses();
    });
  }

  manageCourseModules(course: Course) {
    this.router.navigate(['admin', 'courses', course.id, 'modules']);
  }
} 