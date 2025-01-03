import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatExpansionModule } from '@angular/material/expansion';
import { ContactSectionComponent } from '../../core/components/contact-section/contact-section.component';
import { FaqService } from '../../shared/services/faq.service';
import { FaqItem } from '../../shared/interfaces/faq.interface';
import { Subscription } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-faq',
  standalone: true,
  imports: [
    CommonModule, 
    MatExpansionModule, 
    ContactSectionComponent,
    MatIconModule
  ],
  templateUrl: './faq.component.html',
  styleUrls: ['./faq.component.scss']
})
export class FaqComponent implements OnInit, OnDestroy {
  faqItems: FaqItem[] = [];
  private subscription?: Subscription;

  constructor(private faqService: FaqService) {}

  ngOnInit(): void {
    this.loadFaqs();
  }

  private loadFaqs(): void {
    this.subscription = this.faqService.getAllFaqs().subscribe({
      next: (faqs) => {
        this.faqItems = faqs;
      },
      error: () => {
        this.faqItems = [];
      }
    });
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
} 