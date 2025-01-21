import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AuthService } from './auth.service';
import { Observable, combineLatest } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { Progress, CourseProgress } from '../models/progress.model';
import { Course } from '../models/course.model';
import { CourseService } from './course.service';

@Injectable({
  providedIn: 'root'
})
export class ProgressService {
  constructor(
    private firestore: AngularFirestore,
    private authService: AuthService,
    private courseService: CourseService
  ) {}

  // Fortschritt für eine Lektion speichern
  saveLessonProgress(courseId: string, moduleId: string, lessonId: string, completed: boolean) {
    return this.authService.user$.pipe(
      switchMap(user => {
        if (!user) throw new Error('No user logged in');
        
        const progressRef = this.firestore.collection('progress').doc(`${user.uid}_${courseId}_${moduleId}_${lessonId}`);
        
        return progressRef.set({
          userId: user.uid,
          courseId,
          moduleId,
          lessonId,
          completed,
          lastAccessed: new Date()
        }, { merge: true });
      })
    );
  }

  // Fortschritt für einen Kurs abrufen
  getCourseProgress(courseId: string): Observable<CourseProgress> {
    return this.authService.user$.pipe(
      switchMap(user => {
        if (!user) throw new Error('No user logged in');

        return combineLatest([
          this.firestore.collection<Progress>('progress', ref => 
            ref.where('userId', '==', user.uid)
               .where('courseId', '==', courseId)
          ).valueChanges(),
          this.courseService.getCourse(courseId)
        ]).pipe(
          map(([progresses, course]) => {
            if (!course) throw new Error('Course not found');

            const courseProgress: CourseProgress = {
              totalLessons: 0,
              completedLessons: 0,
              progress: 0,
              modules: {}
            };

            // Initialisiere Module und zähle Gesamtlektionen
            course.modules.forEach(module => {
              courseProgress.totalLessons += module.lessons.length;
              courseProgress.modules[module.id] = {
                totalLessons: module.lessons.length,
                completedLessons: 0,
                progress: 0,
                lessons: {}
              };

              // Initialisiere alle Lektionen als nicht abgeschlossen
              module.lessons.forEach(lesson => {
                courseProgress.modules[module.id].lessons[lesson.id] = {
                  completed: false,
                  lastAccessed: undefined
                };
              });
            });

            // Aktualisiere mit tatsächlichem Fortschritt
            progresses.forEach(progress => {
              if (progress.completed && courseProgress.modules[progress.moduleId]?.lessons[progress.lessonId]) {
                courseProgress.completedLessons++;
                courseProgress.modules[progress.moduleId].completedLessons++;
                courseProgress.modules[progress.moduleId].lessons[progress.lessonId].completed = true;
                courseProgress.modules[progress.moduleId].lessons[progress.lessonId].lastAccessed = progress.lastAccessed;
              }
            });

            // Berechne Prozentsätze nur wenn es Lektionen gibt
            if (courseProgress.totalLessons > 0) {
              courseProgress.progress = Math.round((courseProgress.completedLessons / courseProgress.totalLessons) * 100);
              
              // Berechne Fortschritt für jedes Modul
              Object.keys(courseProgress.modules).forEach(moduleId => {
                const module = courseProgress.modules[moduleId];
                if (module.totalLessons > 0) {
                  module.progress = Math.round((module.completedLessons / module.totalLessons) * 100);
                }
              });
            }

            console.log('Calculated course progress:', courseProgress); // Debug log
            return courseProgress;
          })
        );
      })
    );
  }

  // Fortschritt für alle Kurse abrufen
  getAllCoursesProgress(): Observable<{[courseId: string]: CourseProgress}> {
    return this.authService.user$.pipe(
      switchMap(user => {
        if (!user) throw new Error('No user logged in');

        return this.firestore.collection<Progress>('progress', ref => 
          ref.where('userId', '==', user.uid)
        ).valueChanges();
      }),
      map(progresses => {
        const coursesProgress: {[courseId: string]: CourseProgress} = {};
        
        // Gruppiere nach Kursen
        progresses.forEach(progress => {
          if (!coursesProgress[progress.courseId]) {
            coursesProgress[progress.courseId] = {
              totalLessons: 0,
              completedLessons: 0,
              progress: 0,
              modules: {}
            };
          }
          // ... Ähnliche Logik wie oben für jeden Kurs
        });

        return coursesProgress;
      })
    );
  }

  // Neue Methode hinzufügen
  getLastAccessedLesson(courseId: string): Observable<{moduleId: string, lessonId: string} | null> {
    return this.authService.user$.pipe(
      switchMap(user => {
        if (!user) throw new Error('No user logged in');

        return this.firestore.collection<Progress>('progress', ref => 
          ref.where('userId', '==', user.uid)
             .where('courseId', '==', courseId)
             .orderBy('lastAccessed', 'desc')
             .limit(1)
        ).valueChanges();
      }),
      map(progresses => {
        if (progresses.length === 0) return null;
        const lastProgress = progresses[0];
        return {
          moduleId: lastProgress.moduleId,
          lessonId: lastProgress.lessonId
        };
      })
    );
  }
} 