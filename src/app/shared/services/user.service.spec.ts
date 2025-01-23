import { TestBed } from '@angular/core/testing';
import { UserService } from './user.service';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { of } from 'rxjs';

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
      })
    };

    authMock = {
      currentUser: Promise.resolve(null),
      signInAnonymously: jasmine.createSpy('signInAnonymously').and.returnValue(Promise.resolve({}))
    };

    functionsMock = {
      httpsCallable: jasmine.createSpy('httpsCallable').and.returnValue(() => Promise.resolve())
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

    it('should update user_courses document with course IDs', async () => {
      await service.activateProductAccess(mockCustomerId, mockProductKey, mockProduct as any);
      
      expect(firestoreMock.collection).toHaveBeenCalledWith('user_courses');
      expect(firestoreMock.collection().doc).toHaveBeenCalledWith(mockCustomerId);
      expect(firestoreMock.collection().doc().set).toHaveBeenCalledWith(
        jasmine.objectContaining({
          courseIds: jasmine.any(Object)
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
}); 