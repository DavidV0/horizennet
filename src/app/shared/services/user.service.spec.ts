import { TestBed } from '@angular/core/testing';
import { UserService } from './user.service';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { of } from 'rxjs';
import { User } from '../models/user.model';

describe('UserService', () => {
  let service: UserService;
  let firestoreMock: any;
  let authMock: any;
  let functionsMock: any;

  beforeEach(() => {
    firestoreMock = {
      collection: jasmine.createSpy('collection').and.returnValue({
        doc: jasmine.createSpy('doc').and.returnValue({
          set: jasmine.createSpy('set').and.returnValue(Promise.resolve())
        })
      }),
      doc: jasmine.createSpy('doc')
    };

    authMock = {
      currentUser: Promise.resolve(null),
      signInAnonymously: jasmine.createSpy('signInAnonymously').and.returnValue(Promise.resolve({}))
    };

    functionsMock = {
      httpsCallable: jasmine.createSpy('httpsCallable').and.returnValue(() => of({}))
    };

    TestBed.configureTestingModule({
      providers: [
        UserService,
        { provide: AngularFirestore, useValue: firestoreMock },
        { provide: AngularFireAuth, useValue: authMock },
        { provide: AngularFireFunctions, useValue: functionsMock }
      ]
    });

    service = TestBed.inject(UserService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('activateProductAccess', () => {
    const mockCustomerId = 'test-customer-id';
    const mockProductKey = 'test-product-key';
    const mockProduct = {
      id: 'test-product-id',
      courseIds: ['course1', 'course2']
    };

    it('should sign in anonymously if no user is authenticated', async () => {
      await service.activateProductAccess(mockCustomerId, mockProductKey, mockProduct as any);
      expect(authMock.signInAnonymously).toHaveBeenCalled();
    });

    it('should create product key document with correct data', async () => {
      await service.activateProductAccess(mockCustomerId, mockProductKey, mockProduct as any);
      
      expect(firestoreMock.collection).toHaveBeenCalledWith('productKeys');
      expect(firestoreMock.collection().doc).toHaveBeenCalledWith(mockProductKey);
      expect(firestoreMock.collection().doc().set).toHaveBeenCalledWith(
        jasmine.objectContaining({
          isActivated: false,
          customerId: mockCustomerId,
          courseIds: mockProduct.courseIds
        }),
        { merge: true }
      );
    });

    it('should update customers document with product access', async () => {
      await service.activateProductAccess(mockCustomerId, mockProductKey, mockProduct as any);
      
      expect(firestoreMock.collection).toHaveBeenCalledWith('customers');
      expect(firestoreMock.collection().doc).toHaveBeenCalledWith(mockCustomerId);
      expect(firestoreMock.collection().doc().set).toHaveBeenCalledWith(
        jasmine.objectContaining({
          [`products.${mockProduct.id}`]: {
            activated: false,
            productKey: mockProductKey,
            createdAt: jasmine.any(Date),
            courseIds: mockProduct.courseIds
          }
        }),
        { merge: true }
      );
    });

    it('should handle errors gracefully', async () => {
      firestoreMock.collection = jasmine.createSpy('collection').and.returnValue({
        doc: jasmine.createSpy('doc').and.returnValue({
          set: jasmine.createSpy('set').and.returnValue(Promise.reject(new Error('Test error')))
        })
      });

      await expectAsync(
        service.activateProductAccess(mockCustomerId, mockProductKey, mockProduct as any)
      ).toBeRejected();
    });
  });

  it('should update user document with purchased courses', async () => {
    const user = { uid: 'test-uid', email: 'test@test.com' } as User;
    const courseId = 'test-course-id';
    
    const userDocRef = { 
      get: jasmine.createSpy('get').and.returnValue(Promise.resolve({ 
        data: () => ({ purchasedCourses: [] }) 
      })), 
      update: jasmine.createSpy('update').and.returnValue(Promise.resolve()) 
    };
    
    firestoreMock.doc.and.returnValue(userDocRef);
    
    await service.purchaseCourse(courseId, user);
    
    expect(firestoreMock.doc).toHaveBeenCalledWith('users/test-uid');
    expect(userDocRef.update).toHaveBeenCalledWith({
      purchasedCourses: [courseId]
    });
  });
}); 