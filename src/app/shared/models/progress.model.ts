export interface Progress {
  userId: string;
  courseId: string;
  moduleId: string;
  lessonId: string;
  completed: boolean;
  lastAccessed?: Date;
  timeSpent?: number;  // in Sekunden
}

export interface CourseProgress {
  totalLessons: number;
  completedLessons: number;
  progress: number;  // Prozentsatz
  modules: {
    [moduleId: string]: {
      totalLessons: number;
      completedLessons: number;
      progress: number;
      lessons: {
        [lessonId: string]: {
          completed: boolean;
          lastAccessed?: Date;
        }
      }
    }
  }
}

export interface LessonProgress {
  completed: boolean;
  lastAccessed?: Date | undefined;
} 