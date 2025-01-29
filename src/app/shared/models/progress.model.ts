export interface Progress {
  courses: {
    [courseId: string]: CourseProgress;
  };
}

export interface CourseProgress {
  modules: {
    [moduleId: string]: ModuleProgress;
  };
  startedAt: Date;
}

export interface ModuleProgress {
  lessons: {
    [lessonId: string]: LessonProgress;
  };
}

export interface LessonProgress {
  completed: boolean;
  completedAt: Date | null;
  completionType: 'video' | 'quiz' | null;
  videoProgress: number;
  quizCompleted: boolean;
} 
