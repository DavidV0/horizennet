import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Blog, BlogContent } from '../../../shared/interfaces/blog.interface';
import { StorageService } from '../../../shared/services/storage.service';
import { Auth } from '@angular/fire/auth';

@Component({
  selector: 'app-blog-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatIconModule,
    MatProgressBarModule
  ],
  template: `
    <div class="dialog-content">
      <h2 mat-dialog-title>{{ data.blog ? 'Edit' : 'Add' }} Blog Post</h2>
      <form [formGroup]="blogForm" (ngSubmit)="onSubmit()">
        <div mat-dialog-content>
          <mat-form-field appearance="outline">
            <mat-label>Category</mat-label>
            <input matInput formControlName="category" required>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Title</mat-label>
            <input matInput formControlName="title" required>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Date</mat-label>
            <input matInput formControlName="date" required>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Read Time</mat-label>
            <input matInput formControlName="readTime" required>
          </mat-form-field>

          <div class="image-upload-section">
            <input
              type="file"
              #fileInput
              style="display: none"
              (change)="onFileSelected($event)"
              accept="image/*"
            >
            
            <div class="image-preview" *ngIf="imagePreview || blogForm.get('image')?.value">
              <img [src]="imagePreview || blogForm.get('image')?.value" alt="Blog image preview">
            </div>

            <div class="upload-actions">
              <button mat-raised-button type="button" (click)="fileInput.click()">
                <mat-icon>cloud_upload</mat-icon>
                {{ blogForm.get('image')?.value ? 'Change Image' : 'Upload Image' }}
              </button>
              
              <button 
                mat-icon-button 
                type="button" 
                color="warn" 
                *ngIf="blogForm.get('image')?.value"
                (click)="removeImage()"
              >
                <mat-icon>delete</mat-icon>
              </button>
            </div>

            <mat-progress-bar
              *ngIf="uploadProgress > 0 && uploadProgress < 100"
              mode="determinate"
              [value]="uploadProgress"
            ></mat-progress-bar>
          </div>

          <div formArrayName="content">
            <h3>Content</h3>
            <div *ngFor="let contentItem of contentControls; let i = index" [formGroupName]="i" class="content-item">
              <mat-form-field appearance="outline">
                <mat-label>Type</mat-label>
                <mat-select formControlName="type" required>
                  <mat-option value="paragraph">Paragraph</mat-option>
                  <mat-option value="subheading">Subheading</mat-option>
                  <mat-option value="quote">Quote</mat-option>
                  <mat-option value="list">List</mat-option>
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline" *ngIf="contentItem.get('type')?.value !== 'list'">
                <mat-label>Text</mat-label>
                <textarea matInput formControlName="text" rows="3"></textarea>
              </mat-form-field>

              <div *ngIf="contentItem.get('type')?.value === 'list'" formArrayName="items" class="list-items">
                <div *ngFor="let item of getListItems(i).controls; let j = index" class="list-item">
                  <mat-form-field appearance="outline">
                    <mat-label>List Item {{j + 1}}</mat-label>
                    <input matInput [formControlName]="j">
                    <button mat-icon-button matSuffix type="button" (click)="removeListItem(i, j)">
                      <mat-icon>remove</mat-icon>
                    </button>
                  </mat-form-field>
                </div>
                <button mat-button type="button" class="add-item-button" (click)="addListItem(i)">Add List Item</button>
              </div>

              <button mat-icon-button color="warn" type="button" (click)="removeContent(i)" class="remove-content">
                <mat-icon>delete</mat-icon>
              </button>
            </div>
            <button mat-button type="button" class="add-section-button" (click)="addContent()">Add Content Section</button>
          </div>
        </div>

        <div mat-dialog-actions align="end">
          <button mat-button type="button" (click)="onCancel()">Cancel</button>
          <button mat-raised-button color="primary" type="submit" [disabled]="!blogForm.valid || isUploading">
            {{ data.blog ? 'Update' : 'Create' }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      background-color: var(--color-secondary);
      color: var(--color-white);
      padding: 20px;
    }

    .dialog-content {
      max-width: 800px;
      margin: 0 auto;
    }

    h2 {
      color: var(--color-accent);
      margin-bottom: 20px;
    }

    h3 {
      color: var(--color-accent);
      margin: 20px 0;
    }

    mat-form-field {
      width: 100%;
      margin-bottom: 16px;
    }

    .mat-mdc-dialog-content {
      max-height: 70vh;
      overflow-y: auto;
    }

    .image-upload-section {
      margin: 20px 0;
      padding: 20px;
      border: 2px dashed var(--color-accent);
      border-radius: 8px;
      text-align: center;
    }

    .image-preview {
      margin: 20px 0;
      
      img {
        max-width: 100%;
        max-height: 300px;
        border-radius: 4px;
      }
    }

    .upload-actions {
      display: flex;
      gap: 10px;
      justify-content: center;
      align-items: center;
      margin: 10px 0;
    }

    mat-progress-bar {
      margin-top: 10px;
    }

    .content-item {
      position: relative;
      padding: 20px;
      margin-bottom: 20px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 4px;
    }

    .list-items {
      margin-top: 10px;
    }

    .list-item {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .remove-content {
      position: absolute;
      top: 10px;
      right: 10px;
    }

    ::ng-deep {
      .mat-mdc-dialog-title,
      h3,
      button[mat-button],
      .content-item {
        color: var(--color-white) !important;
      }

      .upload-actions {
        button {
          mat-icon {
            color: #2196F3;
          }
        }
      }

      .mat-mdc-form-field {
        --mdc-outlined-text-field-outline-color: rgba(255, 255, 255, 0.7);
        --mdc-outlined-text-field-focus-outline-color: var(--color-accent);
        --mdc-outlined-text-field-hover-outline-color: var(--color-accent);
        --mdc-outlined-text-field-label-text-color: var(--color-white);
        --mdc-outlined-text-field-focus-label-text-color: var(--color-accent);
        --mdc-outlined-text-field-input-text-color: var(--color-white);
        --mdc-outlined-text-field-caret-color: var(--color-accent);

        .mat-mdc-select-trigger {
          color: var(--color-white);

          .mat-mdc-select-arrow {
            color: var(--color-white);
          }
        }

        .mdc-text-field--outlined {
          .mdc-text-field__input {
            padding: 12px 16px !important;
            font-family: 'DM Sans', sans-serif;
            color: var(--color-white) !important;
          }
        }

        textarea.mdc-text-field__input {
          padding: 12px 16px !important;
          font-family: 'DM Sans', sans-serif;
          color: var(--color-white) !important;
        }

        .mat-mdc-select {
          padding-left: 16px;
          font-family: 'DM Sans', sans-serif;
          color: var(--color-white);
        }
      }

      .mat-mdc-select {
        --mdc-outlined-text-field-label-text-color: var(--color-white);
        --mdc-outlined-text-field-input-text-color: var(--color-white);
        font-family: 'DM Sans', sans-serif;
        color: var(--color-white);

        .mat-mdc-select-value {
          color: var(--color-white);
        }

        .mat-mdc-select-arrow-wrapper {
          .mat-mdc-select-arrow {
            color: var(--color-white);
          }
        }
      }

      .mat-mdc-select-panel {
        background-color: var(--color-secondary) !important;
        border: 1px solid var(--color-accent);
      }

      .mat-mdc-option {
        color: var(--color-white);
        font-family: 'DM Sans', sans-serif;
        padding: 12px 16px !important;

        &:hover {
          background-color: rgba(255, 255, 255, 0.1);
        }

        &.mat-mdc-option-active {
          background-color: rgba(255, 255, 255, 0.2);
        }

        .mdc-list-item__primary-text {
          color: var(--color-white) !important;
        }
      }

      .mdc-menu-surface {
        background-color: var(--color-secondary) !important;
        border: 1px solid var(--color-accent);
      }

      .mat-mdc-dialog-container {
        --mdc-dialog-container-color: var(--color-secondary);
      }

      .mat-mdc-raised-button.mat-primary {
        --mdc-protected-button-container-color: var(--color-accent);
        --mdc-protected-button-label-text-color: var(--color-white);
        font-family: 'DM Sans', sans-serif;
      }

      .mat-mdc-button {
        color: var(--color-white);
        font-family: 'DM Sans', sans-serif;
      }

      .mat-mdc-select-value-text {
        padding-left: 16px;
        font-family: 'DM Sans', sans-serif;
        color: var(--color-white) !important;
      }

      .mat-mdc-select-arrow {
        color: var(--color-white) !important;
      }

      .mat-mdc-form-field-subscript-wrapper {
        color: var(--color-white);
        font-family: 'DM Sans', sans-serif;
      }

      mat-label {
        color: var(--color-white);
        font-family: 'DM Sans', sans-serif;
      }

      .mat-mdc-icon-button {
        color: var(--color-white);
        
        &[color="warn"] {
          color: #f44336;
        }
      }

      button[mat-button] {
        &.add-item-button,
        &.add-section-button {
          color: var(--color-white) !important;
          opacity: 0.87;
          
          &:hover {
            opacity: 1;
          }
        }
      }

      .content-section-title {
        color: var(--color-white);
        font-size: 1.2em;
        margin: 20px 0;
        font-family: 'DM Sans', sans-serif;
      }

      button.add-item-button,
      button.add-section-button {
        background-color: #FF8A00 !important;
        color: var(--color-white) !important;
        border: none;
        border-radius: 4px;
        padding: 0 16px;
        height: 36px;
        font-weight: normal;
        text-transform: none;
        box-shadow: none;

        &:hover {
          background-color: #FF6B00 !important;
        }
      }

      .upload-actions {
        .upload-text {
          color: var(--color-white) !important;
        }

        button {
          &.upload-button {
            mat-icon {
              color: #2196F3;
            }
          }

          &.delete-button {
            mat-icon {
              color: #000000;
            }
          }
        }
      }
    }

    button[mat-raised-button] {
      &[color="warn"] {
        background-color: #f44336;
        color: white;
      }
    }

    .upload-actions {
      button {
        mat-icon {
          color: #2196F3;
        }
      }
    }

    input, textarea {
      color: var(--color-white) !important;
      font-family: 'DM Sans', sans-serif !important;
    }
  `]
})
export class BlogDialogComponent {
  blogForm: FormGroup;
  imagePreview: string | null = null;
  uploadProgress: number = 0;
  isUploading: boolean = false;
  private currentImagePath: string | null = null;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<BlogDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { blog: Blog | null },
    private storageService: StorageService,
    private auth: Auth
  ) {
    this.blogForm = this.fb.group({
      id: [data.blog?.id || `blog-${Date.now()}`],
      category: [data.blog?.category || '', Validators.required],
      title: [data.blog?.title || '', Validators.required],
      date: [data.blog?.date || '', Validators.required],
      readTime: [data.blog?.readTime || '', Validators.required],
      image: [data.blog?.image || '', Validators.required],
      content: this.fb.array([])
    });

    if (data.blog?.content) {
      data.blog.content.forEach(content => this.addExistingContent(content));
    }
  }

  get contentControls() {
    return (this.blogForm.get('content') as FormArray).controls;
  }

  addContent() {
    const content = this.fb.group({
      type: ['paragraph', Validators.required],
      text: [''],
      items: this.fb.array([])
    });
    (this.blogForm.get('content') as FormArray).push(content);
  }

  addExistingContent(content: BlogContent) {
    const contentGroup = this.fb.group({
      type: [content.type, Validators.required],
      text: [content.text || ''],
      items: this.fb.array(content.items || [])
    });
    (this.blogForm.get('content') as FormArray).push(contentGroup);
  }

  removeContent(index: number) {
    (this.blogForm.get('content') as FormArray).removeAt(index);
  }

  getListItems(contentIndex: number): FormArray {
    return this.contentControls[contentIndex].get('items') as FormArray;
  }

  addListItem(contentIndex: number) {
    this.getListItems(contentIndex).push(this.fb.control(''));
  }

  removeListItem(contentIndex: number, itemIndex: number) {
    this.getListItems(contentIndex).removeAt(itemIndex);
  }

  async onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.isUploading = true;
      
      try {
        // Delete old image if it exists and is a blog-images file
        const oldImageUrl = this.blogForm.get('image')?.value;
        if (oldImageUrl && oldImageUrl.includes('blog-images')) {
          const oldPath = this.extractPathFromUrl(oldImageUrl);
          if (oldPath) {
            try {
              await this.storageService.deleteImage(oldPath);
            } catch (deleteError: any) {
              // Ignoriere 404-Fehler (Datei existiert nicht)
              if (deleteError?.code !== 'storage/object-not-found') {
                console.error('Error deleting old image:', deleteError);
              }
            }
          }
        }

        // Upload new image
        const fileName = this.storageService.generateUniqueFileName(file);
        const path = `blog-images/${fileName}`;
        this.currentImagePath = path;
        
        const downloadUrl = await this.storageService.uploadImage(file, path);
        this.blogForm.patchValue({ image: downloadUrl });
        this.imagePreview = downloadUrl;
      } catch (error) {
        console.error('Error handling image:', error);
      } finally {
        this.isUploading = false;
      }
    }
  }

  async removeImage() {
    try {
      const currentImageUrl = this.blogForm.get('image')?.value;
      if (currentImageUrl && currentImageUrl.includes('blog-images')) {
        const path = this.extractPathFromUrl(currentImageUrl);
        if (path) {
          try {
            await this.storageService.deleteImage(path);
          } catch (deleteError: any) {
            // Ignoriere 404-Fehler (Datei existiert nicht)
            if (deleteError?.code !== 'storage/object-not-found') {
              console.error('Error deleting image:', deleteError);
            }
          }
        }
      }
      this.blogForm.patchValue({ image: '' });
      this.imagePreview = '';
      this.currentImagePath = null;
    } catch (error) {
      console.error('Error removing image:', error);
    }
  }

  private extractPathFromUrl(url: string): string | null {
    try {
      // Extract path from Firebase Storage URL
      // Example URL: https://firebasestorage.googleapis.com/v0/b/[project]/o/blog-images%2Fimage.jpg
      const match = url.match(/o\/(.*?)\?/);
      if (match && match[1]) {
        return decodeURIComponent(match[1]);
      }
      return null;
    } catch (error) {
      console.error('Error extracting path from URL:', error);
      return null;
    }
  }

  onSubmit() {
    if (this.blogForm.valid) {
      this.dialogRef.close(this.blogForm.value);
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
} 