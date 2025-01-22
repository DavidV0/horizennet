import { Injectable } from '@angular/core';
import { Storage, ref, uploadBytes, getDownloadURL, deleteObject, uploadBytesResumable } from '@angular/fire/storage';
import { Auth } from '@angular/fire/auth';
import { Observable, Subject } from 'rxjs';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { finalize } from 'rxjs/operators';

export interface UploadProgress {
  progress: number;
  url?: string;
}

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  constructor(
    private storage: Storage,
    private auth: Auth,
    private angularFireStorage: AngularFireStorage
  ) {}

  uploadProductImage(file: File, path: string): Observable<UploadProgress> {
    const progress$ = new Subject<UploadProgress>();

    if (!this.auth.currentUser) {
      console.error('No authenticated user found');
      progress$.error(new Error('User must be authenticated to upload images'));
      return progress$;
    }

    const storageRef = ref(this.storage, path);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (progress < 100) {
          progress$.next({ progress });
        }
      },
      (error) => {
        console.error('Upload error:', error);
        progress$.error(error);
      },
      async () => {
        try {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          progress$.next({ progress: 100, url });
          progress$.complete();
        } catch (error) {
          console.error('Error getting download URL:', error);
          progress$.error(error);
        }
      }
    );

    return progress$;
  }

  async uploadImage(file: File, path: string): Promise<string> {
    if (!this.auth.currentUser) {
      console.error('No authenticated user found');
      throw new Error('User must be authenticated to upload images');
    }

    try {
      const storageRef = ref(this.storage, path);
      const snapshot = await uploadBytes(storageRef, file);
      return await getDownloadURL(snapshot.ref);
    } catch (error) {
      console.error('Error in uploadImage:', error);
      throw error;
    }
  }

  async deleteImage(path: string): Promise<void> {
    const storageRef = ref(this.storage, path);
    try {
      await deleteObject(storageRef);
    } catch (error) {
      console.error('Error deleting image:', error);
      throw error;
    }
  }

  generateUniqueFileName(file: File): string {
    const extension = file.name.split('.').pop();
    const timestamp = new Date().getTime();
    const randomString = Math.random().toString(36).substring(2, 15);
    return `${timestamp}-${randomString}.${extension}`;
  }

  async uploadVideo(file: File, onProgress: (progress: number) => void): Promise<string> {
    const timestamp = new Date().getTime();
    const filePath = `videos/${timestamp}_${file.name}`;
    const storageRef = ref(this.storage, filePath);
    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise((resolve, reject) => {
      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          onProgress(progress);
        },
        (error) => {
          console.error('Upload error:', error);
          reject(error);
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadURL);
          } catch (error) {
            console.error('Error getting download URL:', error);
            reject(error);
          }
        }
      );
    });
  }

  async uploadFile(path: string, file: File): Promise<string> {
    const ref = this.angularFireStorage.ref(path);
    const task = ref.put(file);

    return new Promise((resolve, reject) => {
      task.snapshotChanges().pipe(
        finalize(async () => {
          try {
            const url = await ref.getDownloadURL().toPromise();
            resolve(url);
          } catch (error) {
            reject(error);
          }
        })
      ).subscribe({
        error: (error) => reject(error)
      });
    });
  }

  deleteFile(path: string): Promise<void> {
    return this.angularFireStorage.ref(path).delete().toPromise();
  }

  getDownloadURL(path: string): Observable<string> {
    return this.angularFireStorage.ref(path).getDownloadURL();
  }
} 