import { Injectable } from '@angular/core';
import { AngularFirestore, DocumentData } from '@angular/fire/compat/firestore';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { Observable, from, switchMap, map, combineLatest, take } from 'rxjs';
import { Course, Module, Lesson } from '../models/course.model';

interface UserCourses {
  courseIds: string[];
}

@Injectable({
  providedIn: 'root'
})
export class CourseService {
  private readonly COURSES_COLLECTION = 'courses';
  private readonly USER_COURSES_COLLECTION = 'user_courses';

  constructor(
    private firestore: AngularFirestore,
    private storage: AngularFireStorage
  ) {}

  getCourses(role: string): Observable<Course[]> {
    if (role === 'ADMIN') {
      return this.firestore
        .collection<Course>(this.COURSES_COLLECTION)
        .valueChanges({ idField: 'id' });
    }
    return this.firestore
      .collection<Course>(this.COURSES_COLLECTION, ref => 
        ref.where('isActive', '==', true))
      .valueChanges({ idField: 'id' });
  }

  getCourse(id: string): Observable<Course> {
    return this.firestore
      .doc<Course>(`${this.COURSES_COLLECTION}/${id}`)
      .valueChanges({ idField: 'id' }) as Observable<Course>;
  }

  async createCourse(course: Partial<Course>, imageFile?: File): Promise<void> {
    const id = this.firestore.createId();
    let imageUrl = '';

    if (imageFile) {
      const path = `courses/${id}/${imageFile.name}`;
      const ref = this.storage.ref(path);
      await this.storage.upload(path, imageFile);
      imageUrl = await ref.getDownloadURL().toPromise();
    }

    return this.firestore
      .doc(`${this.COURSES_COLLECTION}/${id}`)
      .set({
        ...course,
        id,
        image: imageUrl,
        modules: course.modules || [],
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });
  }

  async updateCourse(id: string, course: Partial<Course>, imageFile?: File): Promise<void> {
    let imageUrl = course.image;

    if (imageFile) {
      const path = `courses/${id}/${imageFile.name}`;
      const ref = this.storage.ref(path);
      await this.storage.upload(path, imageFile);
      imageUrl = await ref.getDownloadURL().toPromise();
    }

    return this.firestore
      .doc(`${this.COURSES_COLLECTION}/${id}`)
      .update({
        ...course,
        image: imageUrl,
        updatedAt: new Date()
      });
  }

  deleteCourse(id: string): Observable<void> {
    return from(this.firestore.doc(`${this.COURSES_COLLECTION}/${id}`).delete());
  }

  updateModules(courseId: string, modules: Module[]): Observable<void> {
    return from(
      this.firestore
        .doc(`${this.COURSES_COLLECTION}/${courseId}`)
        .update({ modules, updatedAt: new Date() })
    );
  }

  updateLessons(courseId: string, moduleId: string, lessons: Lesson[]): Observable<void> {
    return this.getCourse(courseId).pipe(
      map(course => {
        const moduleIndex = course.modules.findIndex(m => m.id === moduleId);
        if (moduleIndex !== -1) {
          course.modules[moduleIndex].lessons = lessons;
          return course.modules;
        }
        throw new Error('Module not found');
      }),
      switchMap(modules => this.updateModules(courseId, modules))
    );
  }

  addLesson(courseId: string, moduleId: string, lesson: Lesson): Observable<void> {
    return this.getCourse(courseId).pipe(
      map(course => {
        const moduleIndex = course.modules.findIndex(m => m.id === moduleId);
        if (moduleIndex === -1) {
          throw new Error('Module not found');
        }
        
        if (!course.modules[moduleIndex].lessons) {
          course.modules[moduleIndex].lessons = [];
        }
        
        course.modules[moduleIndex].lessons.push(lesson);
        return course.modules;
      }),
      switchMap(modules => this.updateModules(courseId, modules))
    );
  }

  addModule(courseId: string, module: Module): Observable<void> {
    return this.getCourse(courseId).pipe(
      map(course => {
        if (!course.modules) {
          course.modules = [];
        }
        course.modules.push(module);
        return course.modules;
      }),
      switchMap(modules => this.updateModules(courseId, modules))
    );
  }

  updateModule(courseId: string, moduleId: string, module: Partial<Module>): Observable<void> {
    return this.getCourse(courseId).pipe(
      map(course => {
        const moduleIndex = course.modules.findIndex(m => m.id === moduleId);
        if (moduleIndex === -1) {
          throw new Error('Module not found');
        }
        course.modules[moduleIndex] = { ...course.modules[moduleIndex], ...module };
        return course.modules;
      }),
      switchMap(modules => this.updateModules(courseId, modules))
    );
  }

  deleteModule(courseId: string, moduleId: string): Observable<void> {
    return this.getCourse(courseId).pipe(
      map(course => {
        course.modules = course.modules.filter(m => m.id !== moduleId);
        return course.modules;
      }),
      switchMap(modules => this.updateModules(courseId, modules))
    );
  }

  updateLesson(courseId: string, moduleId: string, lessonId: string, lesson: Partial<Lesson>): Observable<void> {
    return this.getCourse(courseId).pipe(
      map(course => {
        const moduleIndex = course.modules.findIndex(m => m.id === moduleId);
        if (moduleIndex === -1) {
          throw new Error('Module not found');
        }
        
        const lessonIndex = course.modules[moduleIndex].lessons.findIndex(l => l.id === lessonId);
        if (lessonIndex === -1) {
          throw new Error('Lesson not found');
        }
        
        course.modules[moduleIndex].lessons[lessonIndex] = {
          ...course.modules[moduleIndex].lessons[lessonIndex],
          ...lesson
        };
        return course.modules;
      }),
      switchMap(modules => this.updateModules(courseId, modules))
    );
  }

  deleteLesson(courseId: string, moduleId: string, lessonId: string): Observable<void> {
    return this.getCourse(courseId).pipe(
      map(course => {
        const moduleIndex = course.modules.findIndex(m => m.id === moduleId);
        if (moduleIndex === -1) {
          throw new Error('Module not found');
        }
        
        course.modules[moduleIndex].lessons = course.modules[moduleIndex].lessons.filter(l => l.id !== lessonId);
        return course.modules;
      }),
      switchMap(modules => this.updateModules(courseId, modules))
    );
  }

  getUserCourses(userId: string): Observable<Course[]> {
    return this.firestore
      .collection(this.USER_COURSES_COLLECTION)
      .doc<UserCourses>(userId)
      .valueChanges()
      .pipe(
        switchMap((userCourses) => {
          if (!userCourses?.courseIds || userCourses.courseIds.length === 0) {
            return new Observable<Course[]>(subscriber => subscriber.next([]));
          }

          const courseObservables = userCourses.courseIds.map(courseId =>
            this.firestore
              .doc<Course>(`${this.COURSES_COLLECTION}/${courseId}`)
              .valueChanges({ idField: 'id' })
          );

          return combineLatest(courseObservables);
        }),
        map((courses: (Course | undefined | null)[]) => 
          courses.filter((course): course is Course => course !== undefined && course !== null)
        )
      );
  }

  async activateCourseForUser(userId: string, courseId: string): Promise<void> {
    const userCoursesRef = this.firestore.collection(this.USER_COURSES_COLLECTION).doc(userId);
    
    const doc = await userCoursesRef.get().toPromise();
    const data = doc?.data() as UserCourses | undefined;
    
    if (doc?.exists && data) {
      return userCoursesRef.update({
        courseIds: [...new Set([...data.courseIds, courseId])]
      });
    } else {
      return userCoursesRef.set({
        courseIds: [courseId]
      });
    }
  }

  isActivatedForUser(userId: string, courseId: string): Observable<boolean> {
    return this.firestore
      .collection(this.USER_COURSES_COLLECTION)
      .doc<UserCourses>(userId)
      .valueChanges()
      .pipe(
        map(userCourses => 
          userCourses?.courseIds?.includes(courseId) || false
        )
      );
  }

  refreshCourse(courseId: string) {
    // Hole den Kurs neu aus Firestore und aktualisiere den Cache
    this.firestore.collection('courses').doc(courseId).get()
      .pipe(take(1))
      .subscribe(doc => {
        if (doc.exists) {
          // Aktualisiere den lokalen Cache oder triggere eine Neuladen
          // Je nachdem, wie dein Service implementiert ist
        }
      });
  }
} 