import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { Blog, BlogContent } from '../../../shared/interfaces/blog.interface';

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
    MatIconModule
  ],
  template: `
    <h2 mat-dialog-title>{{ data.blog ? 'Edit' : 'Add' }} Blog Post</h2>
    <form [formGroup]="blogForm" (ngSubmit)="onSubmit()">
      <div mat-dialog-content>
        <mat-form-field appearance="fill">
          <mat-label>Category</mat-label>
          <input matInput formControlName="category" required>
        </mat-form-field>

        <mat-form-field appearance="fill">
          <mat-label>Title</mat-label>
          <input matInput formControlName="title" required>
        </mat-form-field>

        <mat-form-field appearance="fill">
          <mat-label>Date</mat-label>
          <input matInput formControlName="date" required>
        </mat-form-field>

        <mat-form-field appearance="fill">
          <mat-label>Read Time</mat-label>
          <input matInput formControlName="readTime" required>
        </mat-form-field>

        <mat-form-field appearance="fill">
          <mat-label>Image URL</mat-label>
          <input matInput formControlName="image" required>
        </mat-form-field>

        <div formArrayName="content">
          <h3>Content</h3>
          <div *ngFor="let contentItem of contentControls; let i = index" [formGroupName]="i">
            <mat-form-field appearance="fill">
              <mat-label>Type</mat-label>
              <mat-select formControlName="type" required>
                <mat-option value="paragraph">Paragraph</mat-option>
                <mat-option value="subheading">Subheading</mat-option>
                <mat-option value="quote">Quote</mat-option>
                <mat-option value="list">List</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="fill" *ngIf="contentItem.get('type')?.value !== 'list'">
              <mat-label>Text</mat-label>
              <textarea matInput formControlName="text" rows="3"></textarea>
            </mat-form-field>

            <div *ngIf="contentItem.get('type')?.value === 'list'" formArrayName="items">
              <div *ngFor="let item of getListItems(i).controls; let j = index">
                <mat-form-field appearance="fill">
                  <mat-label>List Item {{j + 1}}</mat-label>
                  <input matInput [formControlName]="j">
                  <button mat-icon-button matSuffix type="button" (click)="removeListItem(i, j)">
                    <mat-icon>remove</mat-icon>
                  </button>
                </mat-form-field>
              </div>
              <button mat-button type="button" (click)="addListItem(i)">Add List Item</button>
            </div>

            <button mat-icon-button color="warn" type="button" (click)="removeContent(i)">
              <mat-icon>delete</mat-icon>
            </button>
          </div>
          <button mat-button type="button" (click)="addContent()">Add Content Section</button>
        </div>
      </div>

      <div mat-dialog-actions align="end">
        <button mat-button type="button" (click)="onCancel()">Cancel</button>
        <button mat-raised-button color="primary" type="submit" [disabled]="!blogForm.valid">
          {{ data.blog ? 'Update' : 'Create' }}
        </button>
      </div>
    </form>
  `,
  styles: [`
    :host {
      display: block;
      background-color: #1a1a1a;
      color: white;
      padding: 20px;
    }

    mat-form-field {
      width: 100%;
      margin-bottom: 16px;
    }

    .mat-mdc-dialog-content {
      max-height: 70vh;
      overflow-y: auto;
    }

    h2 {
      color: #ffd700;
      margin-bottom: 20px;
    }

    h3 {
      color: #ffd700;
      margin: 20px 0;
    }

    button[color="primary"] {
      background: linear-gradient(45deg, #ffd700, #ffed4a);
      color: black;
    }

    .content-section {
      margin-bottom: 24px;
      padding: 16px;
      border: 1px solid #333;
      border-radius: 4px;
    }
  `]
})
export class BlogDialogComponent {
  blogForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<BlogDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { blog: Blog | null }
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

  onSubmit() {
    if (this.blogForm.valid) {
      this.dialogRef.close(this.blogForm.value);
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
} 