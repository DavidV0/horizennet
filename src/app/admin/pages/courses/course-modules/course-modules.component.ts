import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatListModule } from '@angular/material/list';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { CourseService } from '../../../../shared/services/course.service';
import { Course, Module, Lesson } from '../../../../shared/models/course.model';
import { ConfirmDialogComponent } from '../../../components/confirm-dialog/confirm-dialog.component';
import { ModuleDialogComponent } from './module-dialog/module-dialog.component';
import { LessonDialogComponent } from './lesson-dialog/lesson-dialog.component';
import { Observable, map } from 'rxjs';

@Component({
  selector: 'app-course-modules',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatExpansionModule,
    MatListModule,
    MatDialogModule,
    MatMenuModule
  ],
  templateUrl: './course-modules.component.html',
  styleUrls: ['./course-modules.component.scss']
})
export class CourseModulesComponent implements OnInit {
  course$!: Observable<Course>;
  courseId!: string;

  constructor(
    private courseService: CourseService,
    private route: ActivatedRoute,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.courseId = this.route.snapshot.paramMap.get('id') || '';
    this.course$ = this.courseService.getCourse(this.courseId);
  }

  addModule() {
    const dialogRef = this.dialog.open(ModuleDialogComponent, {
      data: {}
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.courseService.addModule(this.courseId, result).subscribe();
      }
    });
  }

  editModule(module: Module) {
    const dialogRef = this.dialog.open(ModuleDialogComponent, {
      data: { module }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.courseService.updateModule(this.courseId, module.id, result).subscribe();
      }
    });
  }

  deleteModule(module: Module) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Modul löschen',
        message: `Möchten Sie das Modul "${module.title}" wirklich löschen?`,
        confirmText: 'Löschen',
        cancelText: 'Abbrechen'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.courseService.deleteModule(this.courseId, module.id).subscribe();
      }
    });
  }

  addLesson(module: Module) {
    const dialogRef = this.dialog.open(LessonDialogComponent, {
      data: {}
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const newLesson = {
          ...result,
          id: crypto.randomUUID(),
          order: module.lessons?.length || 0
        };
        this.courseService.addLesson(this.courseId, module.id, newLesson).subscribe();
      }
    });
  }

  editLesson(module: Module, lesson: Lesson) {
    const dialogRef = this.dialog.open(LessonDialogComponent, {
      data: { lesson }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.courseService.updateLesson(this.courseId, module.id, lesson.id, result).subscribe();
      }
    });
  }

  deleteLesson(module: Module, lesson: Lesson) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Lektion löschen',
        message: `Möchten Sie die Lektion "${lesson.title}" wirklich löschen?`,
        confirmText: 'Löschen',
        cancelText: 'Abbrechen'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.courseService.deleteLesson(this.courseId, module.id, lesson.id).subscribe();
      }
    });
  }
} 