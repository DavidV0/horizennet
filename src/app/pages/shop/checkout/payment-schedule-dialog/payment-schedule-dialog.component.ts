import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

interface DialogData {
  monthlyAmount: number;
  totalAmount: number;
  months: number;
}

@Component({
  selector: 'app-payment-schedule-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  template: `
    <div class="payment-schedule-dialog">
      <h2>Dein Zahlungsplan</h2>
      
      <div class="schedule-content">
        <div class="schedule-header">
          <div class="header-cell">Zahlungsbetrag</div>
          <div class="header-cell">Zahlungsdatum</div>
        </div>
        
        <div class="schedule-rows">
          <div class="schedule-row" *ngFor="let payment of getPaymentSchedule()">
            <div class="payment-amount">€ {{ payment.amount | number:'1.2-2' }}</div>
            <div class="payment-date">{{ payment.date | date:'dd.MM.yyyy' }}</div>
          </div>
        </div>
      </div>

      <div class="dialog-actions">
        <button mat-button (click)="close()">Schließen</button>
      </div>
    </div>
  `,
  styles: [`
    .payment-schedule-dialog {
      padding: 24px;
      background-color: #1a1a1a;
      color: white;
    }

    h2 {
      margin: 0 0 24px;
      color: #ffd700;
      font-size: 24px;
      text-align: center;
    }

    .schedule-content {
      margin-bottom: 24px;
    }

    .schedule-header {
      display: grid;
      grid-template-columns: 1fr 1fr;
      padding: 12px;
      background-color: #2a2a2a;
      border-radius: 4px 4px 0 0;
      font-weight: bold;
      color: #ffd700;
    }

    .schedule-rows {
      max-height: 400px;
      overflow-y: auto;
    }

    .schedule-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      padding: 12px;
      border-bottom: 1px solid #333;
      transition: background-color 0.2s;

      &:hover {
        background-color: #2a2a2a;
      }
    }

    .payment-amount {
      color: #ffd700;
    }

    .dialog-actions {
      display: flex;
      justify-content: center;
      margin-top: 24px;

      button {
        background-color: transparent;
        color: #ffd700;
        border: 1px solid #ffd700;
        padding: 8px 24px;
        border-radius: 4px;
        transition: all 0.3s;

        &:hover {
          background-color: #ffd700;
          color: #1a1a1a;
        }
      }
    }
  `]
})
export class PaymentScheduleDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<PaymentScheduleDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {}

  getPaymentSchedule() {
    const schedule = [];
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() + 1); // Start next month
    
    for (let i = 0; i < this.data.months; i++) {
      const paymentDate = new Date(startDate);
      paymentDate.setMonth(startDate.getMonth() + i);
      schedule.push({
        amount: this.data.monthlyAmount,
        date: paymentDate
      });
    }

    return schedule;
  }

  close() {
    this.dialogRef.close();
  }
} 