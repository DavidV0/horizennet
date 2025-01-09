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
          console.log('No blogs found in Firestore');
          return [];
        }
        
        return snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data
          } as Blog;
        });
      }),
      catchError(error => {
        console.error('Error fetching blogs from Firestore:', error);
        return of([]);
      })
    );
  }

  async getBlog(id: string): Promise<Blog | undefined> {
    try {
      const docRef = doc(this.firestore, this.collectionName, id);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Blog : undefined;
    } catch (error) {
      console.error('Error getting blog:', error);
      return undefined;
    }
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