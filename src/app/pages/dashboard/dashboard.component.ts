import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../../shared/services/auth.service';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatCardModule, MatDividerModule],
  template: `
    <div class="dashboard-container">
      <div class="dashboard-content">
        <header class="dashboard-header">
          <h1>Willkommen, {{userData?.firstName || 'Kunde'}}</h1>
          <button mat-raised-button color="warn" (click)="logout()">
            <mat-icon>logout</mat-icon>
            Ausloggen
          </button>
        </header>

        <div class="dashboard-grid">
          <!-- Persönliche Informationen -->
          <mat-card>
            <mat-card-header>
              <mat-card-title>
                <mat-icon>person</mat-icon>
                Persönliche Informationen
              </mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <p><strong>Name:</strong> {{userData?.firstName}} {{userData?.lastName}}</p>
              <p><strong>E-Mail:</strong> {{userData?.email}}</p>
              <p><strong>Adresse:</strong> {{userData?.street}} {{userData?.streetNumber}}</p>
              <p><strong>PLZ/Ort:</strong> {{userData?.zipCode}} {{userData?.city}}</p>
              <p><strong>Land:</strong> {{userData?.country}}</p>
            </mat-card-content>
          </mat-card>

          <!-- Lizenzinformationen -->
          <mat-card>
            <mat-card-header>
              <mat-card-title>
                <mat-icon>vpn_key</mat-icon>
                Lizenzinformationen
              </mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <p><strong>Produktschlüssel:</strong> {{userData?.productKey}}</p>
              <p><strong>Status:</strong> {{userData?.status}}</p>
              <p><strong>Gekauft am:</strong> {{userData?.purchaseDate?.toDate() | date:'dd.MM.yyyy'}}</p>
              <p><strong>Zahlungsplan:</strong> {{userData?.paymentPlan}} Monatsraten</p>
            </mat-card-content>
          </mat-card>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container {
      min-height: 100vh;
      padding: 2rem;
      background-color: var(--color-primary);
      margin-top: 8vh;
    }

    .dashboard-content {
      background-color: var(--color-secondary);
      padding: 2rem;
      border-radius: 8px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }

    h1 {
      color: var(--color-white);
      margin: 0;
      font-size: 2rem;
    }

    .dashboard-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 2rem;
    }

    mat-card {
      background-color: var(--color-primary);
      color: var(--color-white);
    }

    mat-card-header {
      margin-bottom: 1rem;
    }

    mat-card-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--color-accent);
    }

    mat-card-content {
      p {
        margin: 0.5rem 0;
      }
    }

    button {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    ::ng-deep {
      .mat-mdc-card {
        --mdc-elevated-card-container-color: var(--color-primary);
      }
    }
  `]
})
export class DashboardComponent implements OnInit {
  userData: any;

  constructor(
    private authService: AuthService,
    private firestore: AngularFirestore
  ) {}

  ngOnInit() {
    this.loadUserData();
  }

  async loadUserData() {
    const user = await this.authService.user$.pipe(take(1)).toPromise();
    if (user) {
      this.firestore.collection('users').doc(user.uid).valueChanges()
        .subscribe(data => {
          this.userData = data;
        });
    }
  }

  async logout() {
    await this.authService.logout();
  }
}
