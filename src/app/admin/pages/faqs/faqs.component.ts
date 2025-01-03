import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { FaqService } from '../../../shared/services/faq.service';
import { FaqItem } from '../../../shared/interfaces/faq.interface';
import { FaqDialogComponent } from '../../components/faq-dialog/faq-dialog.component';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { BehaviorSubject } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-faqs',
  templateUrl: './faqs.component.html',
  styleUrls: ['./faqs.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule
  ]
})
export class FaqsComponent implements OnInit {
  faqs: FaqItem[] = [];
  displayedColumns: string[] = ['question', 'answer', 'actions'];
  private refresh$ = new BehaviorSubject<void>(undefined);

  constructor(
    private faqService: FaqService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.refresh$.pipe(
      switchMap(() => this.faqService.getAllFaqs())
    ).subscribe(faqs => {
      this.faqs = faqs;
    });
  }

  onAdd(): void {
    const dialogRef = this.dialog.open(FaqDialogComponent, {
      width: '600px',
      data: { mode: 'add' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.faqService.createFaq(result).then(() => {
          this.refresh$.next();
        });
      }
    });
  }

  onEdit(faq: FaqItem): void {
    if (!faq.id) {
      return;
    }

    const dialogRef = this.dialog.open(FaqDialogComponent, {
      width: '600px',
      data: { mode: 'edit', faq }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && faq.id) {
        this.faqService.updateFaq(faq.id, result).then(() => {
          this.refresh$.next();
        });
      }
    });
  }

  onDelete(faq: FaqItem): void {
    if (!faq.id) {
      return;
    }

    if (confirm('Sind Sie sicher, dass Sie diese FAQ löschen möchten?')) {
      this.faqService.deleteFaq(faq.id).then(() => {
        this.refresh$.next();
      });
    }
  }
}
