import { Component, ViewChild, ElementRef, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { StorageService, UploadProgress } from '../../../../../shared/services/storage.service';
import { Lesson } from '../../../../../shared/models/course.model';

interface LessonFile {
  name: string;
  url: string;
  type: string;
}

interface QuizQuestion {
  text: string;
  options: string[];
  correctAnswers: number[];
}

interface LegacyQuestion {
  text: string;
  options: string[];
  correctAnswer: number;
}

interface QuestionForm {
  text: string;
  options: string[];
  correctAnswers: number[];
}

interface QuizFormValue {
  title: string;
  questions: {
    text: string;
    options: string[];
    correctAnswers: number[];
  }[];
}

@Component({
  selector: 'app-lesson-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressBarModule,
    MatTabsModule,
    MatExpansionModule,
    MatSelectModule,
    MatCheckboxModule
  ],
  templateUrl: './lesson-dialog.component.html',
  styleUrls: ['./lesson-dialog.component.scss']
})
export class LessonDialogComponent implements OnInit {
  @ViewChild('videoInput') videoInput!: ElementRef<HTMLInputElement>;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  
  lessonForm: FormGroup;
  isEditMode: boolean;
  videoPreview: string | null = null;
  videoName: string | null = null;
  uploadProgress = 0;
  selectedFiles: { file: File, name: string }[] = [];
  videoUrl: string | null = null;
  videoFile: File | null = null;
  
  constructor(
    private fb: FormBuilder,
    private storageService: StorageService,
    public dialogRef: MatDialogRef<LessonDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { lesson?: Lesson }
  ) {
    this.isEditMode = !!data.lesson;
    this.lessonForm = this.fb.group({
      title: [data.lesson?.title || '', [Validators.required]],
      description: [data.lesson?.description || ''],
      duration: [data.lesson?.duration || '', [Validators.required, Validators.min(1)]],
      content: [data.lesson?.content || ''],
      videoUrl: [data.lesson?.videoUrl || ''],
      files: this.fb.array([]),
      quiz: this.fb.group({
        title: [''],
        questions: this.fb.array([])
      })
    });

    if (data.lesson?.videoUrl) {
      this.videoUrl = data.lesson.videoUrl;
      this.videoName = this.extractVideoName(data.lesson.videoUrl);
    }

    // Initialize existing files if any
    if (data.lesson?.files) {
      data.lesson.files.forEach(file => {
        this.addExistingFile(file);
      });
    }

    // Initialize existing quiz if any
    if (data.lesson?.quiz) {
      this.lessonForm.patchValue({
        quiz: {
          title: data.lesson.quiz.title
        }
      });
      data.lesson.quiz.questions.forEach((question: LegacyQuestion | QuizQuestion) => {
        const correctAnswers = 'correctAnswers' in question 
          ? question.correctAnswers 
          : [question.correctAnswer];
        
        this.addExistingQuestion({
          text: question.text,
          options: question.options,
          correctAnswers: correctAnswers
        });
      });
    }
  }

  ngOnInit() {
    if (!this.questions.length) {
      this.addQuestion();
    }
  }

  get files() {
    return this.lessonForm.get('files') as FormArray;
  }

  get questions() {
    return this.lessonForm.get('quiz')?.get('questions') as FormArray;
  }

  addExistingFile(file: LessonFile) {
    this.files.push(this.fb.group({
      name: [file.name],
      url: [file.url],
      type: [file.type]
    }));
  }

  addExistingQuestion(question: QuizQuestion) {
    const questionGroup = this.fb.group({
      text: [question.text, Validators.required],
      options: this.fb.array(question.options.map(option => this.fb.control(option))),
      correctAnswers: [question.correctAnswers || []]
    });

    this.questions.push(questionGroup);
  }

  createQuestion(): FormGroup {
    return this.fb.group({
      text: ['', Validators.required],
      options: this.fb.array([
        this.fb.control(''),
        this.fb.control('')
      ]),
      correctAnswers: [[]]
    });
  }

  addQuestion() {
    this.questions.push(this.createQuestion());
  }

  removeQuestion(index: number) {
    this.questions.removeAt(index);
  }

  getOptionsForQuestion(questionIndex: number): FormArray {
    return this.questions.at(questionIndex).get('options') as FormArray;
  }

  triggerVideoInput() {
    this.videoInput.nativeElement.click();
  }

  triggerFileInput() {
    this.fileInput.nativeElement.click();
  }

  async onVideoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.videoFile = input.files[0];
      try {
        const url = await this.uploadVideo(this.videoFile);
        this.videoUrl = url;
        this.lessonForm.patchValue({ videoUrl: url });
        this.uploadProgress = 0;
      } catch (error) {
        console.error('Error uploading video:', error);
        this.uploadProgress = 0;
        // TODO: Show error message to user
      }
    }
  }

  private async uploadVideo(file: File): Promise<string> {
    const path = `lessons/videos/${Date.now()}_${file.name}`;
    return new Promise((resolve, reject) => {
      const subscription = this.storageService.uploadProductImage(file, path).subscribe({
        next: (progress: UploadProgress) => {
          if (typeof progress.progress === 'number') {
            this.uploadProgress = progress.progress;
          }
          if (progress.url) {
            resolve(progress.url);
            subscription.unsubscribe();
          }
        },
        error: (error) => {
          reject(error);
          subscription.unsubscribe();
        }
      });
    });
  }

  removeVideo() {
    this.videoUrl = null;
    this.videoFile = null;
    this.lessonForm.patchValue({ videoUrl: '' });
    this.videoInput.nativeElement.value = '';
  }

  getVideoFileName(): string {
    return this.videoFile?.name || this.videoUrl?.split('/').pop() || 'Video';
  }

  async onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      const files = Array.from(input.files);
      for (const file of files) {
        try {
          const path = `lessons/files/${Date.now()}_${file.name}`;
          const url = await new Promise<string>((resolve, reject) => {
            const subscription = this.storageService.uploadProductImage(file, path).subscribe({
              next: (progress: UploadProgress) => {
                if (typeof progress.progress === 'number') {
                  this.uploadProgress = progress.progress;
                }
                if (progress.url) {
                  resolve(progress.url);
                  subscription.unsubscribe();
                }
              },
              error: (error) => {
                reject(error);
                subscription.unsubscribe();
              }
            });
          });
          this.addFile(file.name, url);
          this.uploadProgress = 0;
        } catch (error) {
          console.error('Error uploading file:', error);
          this.uploadProgress = 0;
          // TODO: Show error message to user
        }
      }
    }
  }

  addFile(name: string, url: string) {
    this.files.push(this.fb.group({
      name: [name],
      url: [url],
      type: [name.split('.').pop() || '']
    }));
  }

  removeFile(index: number) {
    this.files.removeAt(index);
  }

  private extractVideoName(url: string): string {
    const parts = url.split('/');
    return parts[parts.length - 1];
  }

  onSubmit() {
    if (this.lessonForm.valid && this.uploadProgress === 0) {
      const formValue = this.lessonForm.value;
      
      // Debug-Log
      console.log('Quiz Form Value:', formValue.quiz);
      
      const lesson: Lesson = {
        id: this.data.lesson?.id || crypto.randomUUID(),
        title: formValue.title,
        description: formValue.description || '',
        duration: formValue.duration,
        type: 'video',
        content: formValue.content || '',
        videoUrl: this.videoUrl || '',
        files: formValue.files?.length > 0 ? formValue.files : undefined,
        completed: this.data.lesson?.completed || false,
        // Prüfe ob es tatsächlich Quiz-Fragen gibt
        quiz: formValue.quiz?.questions?.length > 0 ? {
          title: formValue.quiz.title || 'Quiz',
          questions: formValue.quiz.questions.map((q: QuizFormValue['questions'][0]) => ({
            text: q.text,
            options: q.options,
            correctAnswers: q.correctAnswers || []
          }))
        } : undefined
      };

      // Debug-Log
      console.log('Processed Lesson with Quiz:', lesson);
      
      this.dialogRef.close(lesson);
    }
  }

  onCancel() {
    this.dialogRef.close();
  }

  getFileName(index: number): string {
    const file = this.files.at(index).value;
    return file?.name || '';
  }

  addOption(questionIndex: number) {
    const options = this.getOptionsForQuestion(questionIndex);
    options.push(this.fb.control(''));
  }

  removeOption(questionIndex: number, optionIndex: number) {
    const options = this.getOptionsForQuestion(questionIndex);
    options.removeAt(optionIndex);
    
    const question = this.questions.at(questionIndex);
    const correctAnswers = question.get('correctAnswers')?.value || [];
    const updatedCorrectAnswers = correctAnswers
      .filter((index: number) => index !== optionIndex)
      .map((index: number) => index > optionIndex ? index - 1 : index);
    
    question.patchValue({ correctAnswers: updatedCorrectAnswers });
  }

  toggleCorrectAnswer(questionIndex: number, optionIndex: number) {
    const question = this.questions.at(questionIndex);
    const correctAnswers = question.get('correctAnswers')?.value || [];
    
    const index = correctAnswers.indexOf(optionIndex);
    if (index === -1) {
      correctAnswers.push(optionIndex);
    } else {
      correctAnswers.splice(index, 1);
    }
    
    question.patchValue({ correctAnswers });
  }

  isCorrectAnswer(questionIndex: number, optionIndex: number): boolean {
    const question = this.questions.at(questionIndex);
    return question.get('correctAnswers')?.value?.includes(optionIndex) || false;
  }
} 