import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { CourseService } from '../../shared/services/course.service';
import { Lesson, Module } from '../../shared/models/course.model';
import { Observable, switchMap, map, tap } from 'rxjs';
import { VgCoreModule, VgApiService } from '@videogular/ngx-videogular/core';
import { VgControlsModule } from '@videogular/ngx-videogular/controls';
import { VgOverlayPlayModule } from '@videogular/ngx-videogular/overlay-play';
import { VgBufferingModule } from '@videogular/ngx-videogular/buffering';

interface NavigationState {
  currentModule: Module;
  currentLessonIndex: number;
  hasNextLesson: boolean;
  hasPreviousLesson: boolean;
  nextLessonRoute?: string[];
  previousLessonRoute?: string[];
}

@Component({
  selector: 'app-lesson',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatTabsModule,
    VgCoreModule,
    VgControlsModule,
    VgOverlayPlayModule,
    VgBufferingModule
  ],
  templateUrl: './lesson.component.html',
  styleUrls: ['./lesson.component.scss']
})
export class LessonComponent implements OnInit {
  lesson$!: Observable<Lesson>;
  navigation$!: Observable<NavigationState>;
  selectedTabIndex = 0;
  api!: VgApiService;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private courseService: CourseService
  ) {}

  ngOnInit() {
    this.navigation$ = this.route.params.pipe(
      switchMap(params => 
        this.courseService.getModule(params['courseId'], params['moduleId']).pipe(
          map(module => {
            const currentLessonIndex = module.lessons.findIndex(l => l.id === params['lessonId']);
            return {
              currentModule: module,
              currentLessonIndex,
              hasNextLesson: currentLessonIndex < module.lessons.length - 1,
              hasPreviousLesson: currentLessonIndex > 0,
              nextLessonRoute: currentLessonIndex < module.lessons.length - 1 ? 
                ['..', '..', 'module', module.id, 'lesson', module.lessons[currentLessonIndex + 1].id] : undefined,
              previousLessonRoute: currentLessonIndex > 0 ?
                ['..', '..', 'module', module.id, 'lesson', module.lessons[currentLessonIndex - 1].id] : undefined
            };
          })
        )
      )
    );

    this.lesson$ = this.navigation$.pipe(
      map(nav => nav.currentModule.lessons[nav.currentLessonIndex])
    );
  }

  onPlayerReady(api: VgApiService) {
    this.api = api;
  }

  onVideoEnded() {
    // Markiere die Lektion als abgeschlossen wenn das Video zu Ende ist
    const params = this.route.snapshot.params;
    this.courseService.markLessonAsCompleted(
      params['courseId'],
      params['moduleId'],
      params['lessonId']
    );
  }

  downloadFile(file: { url: string, name: string }) {
    fetch(file.url)
      .then(response => response.blob())
      .then(blob => {
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      });
  }

  goToNextLesson() {
    this.navigation$.pipe(
      tap(nav => {
        if (nav.hasNextLesson && nav.nextLessonRoute) {
          this.router.navigate(nav.nextLessonRoute, { relativeTo: this.route });
        }
      })
    ).subscribe();
  }

  goToPreviousLesson() {
    this.navigation$.pipe(
      tap(nav => {
        if (nav.hasPreviousLesson && nav.previousLessonRoute) {
          this.router.navigate(nav.previousLessonRoute, { relativeTo: this.route });
        }
      })
    ).subscribe();
  }
} 