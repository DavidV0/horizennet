import { Injectable } from '@angular/core';
import { Blog } from '../interfaces/blog.interface';
import { 
  Firestore, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDoc,
  getDocs,
  query,
  orderBy
} from '@angular/fire/firestore';
import { Observable, from, of, catchError } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class BlogService {
  private readonly collectionName = 'blogs';

  constructor(private firestore: Firestore) {}

  getAllBlogs(): Observable<Blog[]> {
    const blogsRef = collection(this.firestore, this.collectionName);
    const q = query(blogsRef, orderBy('date', 'desc'));
    
    return from(getDocs(q)).pipe(
      map(snapshot => {
        if (snapshot.empty) {
          return [];
        }
        return snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Blog));
      }),
      catchError(() => of([]))
    );
  }

  getBlog(id: string): Observable<Blog | undefined> {
    const docRef = doc(this.firestore, this.collectionName, id);
    
    return from(getDoc(docRef)).pipe(
      map(docSnap => {
        if (!docSnap.exists()) {
          return undefined;
        }
        return { id: docSnap.id, ...docSnap.data() } as Blog;
      }),
      catchError(() => of(undefined))
    );
  }

  async createBlog(blog: Blog): Promise<void> {
    const docRef = doc(this.firestore, this.collectionName, blog.id);
    return setDoc(docRef, blog);
  }

  async updateBlog(id: string, blog: Partial<Blog>): Promise<void> {
    const docRef = doc(this.firestore, this.collectionName, id);
    return setDoc(docRef, blog, { merge: true });
  }

  async deleteBlog(id: string): Promise<void> {
    const docRef = doc(this.firestore, this.collectionName, id);
    return deleteDoc(docRef);
  }
} 