import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule],
  template: `
    <div class="dashboard-home">
      <h2>Willkommen im Admin-Bereich</h2>
      
      <div class="dashboard-grid">
        <mat-card>
          <mat-card-header>
            <mat-icon>shopping_bag</mat-icon>
            <mat-card-title>Shop Produkte</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <p>Verwalten Sie Ihre Produkte im Shop</p>
          </mat-card-content>
        </mat-card>

        <mat-card>
          <mat-card-header>
            <mat-icon>product_catalog</mat-icon>
            <mat-card-title>Produkte</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <p>Verwalten Sie Ihre Produkte auf der Homepage</p>
          </mat-card-content>
        </mat-card>

        <mat-card>
          <mat-card-header>
            <mat-icon>event</mat-icon>
            <mat-card-title>Events</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <p>Organisieren Sie Ihre Veranstaltungen</p>
          </mat-card-content>
        </mat-card>

        <mat-card>
          <mat-card-header>
            <mat-icon>article</mat-icon>
            <mat-card-title>Blog</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <p>Verwalten Sie Ihre Blog-Beiträge</p>
          </mat-card-content>
        </mat-card>

        <mat-card>
          <mat-card-header>
            <mat-icon>help</mat-icon>
            <mat-card-title>FAQs</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <p>Bearbeiten Sie häufig gestellte Fragen</p>
          </mat-card-content>
        </mat-card>
        <mat-card>
          <mat-card-header>
            <mat-icon>admin_panel_settings</mat-icon>
            <mat-card-title>Admin</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <p>Fügen Sie einen neuen Admin hinzu</p>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-home {
      padding: var(--spacing-lg);

      h2 {
        color: var(--color-accent);
        margin-bottom: var(--spacing-xl);
      }

      .dashboard-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: var(--spacing-lg);
        
        mat-card {
          background-color: var(--color-secondary);
          color: var(--color-white);
          transition: transform 0.3s ease;

          &:hover {
            transform: translateY(-4px);
          }

          mat-card-header {
            display: flex;
            align-items: center;
            gap: var(--spacing-md);
            margin-bottom: var(--spacing-md);

            mat-icon {
              color: var(--color-accent);
              font-size: 24px;
              width: 24px;
              height: 24px;
            }

            mat-card-title {
              color: var(--color-accent);
              margin: 0;
            }
          }

          mat-card-content {
            p {
              color: var(--color-text);
              margin: 0;
              padding-left: 16px;
            }
          }
        }
      }
    }

    

    @media (max-width: 768px) {
      .dashboard-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class DashboardHomeComponent {} 