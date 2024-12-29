import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatExpansionModule } from '@angular/material/expansion';
import { ContactSectionComponent } from '../../core/components/contact-section/contact-section.component';

interface FaqItem {
  question: string;
  answer: string;
}

@Component({
  selector: 'app-faq',
  standalone: true,
  imports: [CommonModule, MatExpansionModule, ContactSectionComponent],
  templateUrl: './faq.component.html',
  styleUrls: ['./faq.component.scss']
})
export class FaqComponent {
  faqItems: FaqItem[] = [
    {
      question: 'Was ist Kryptonet und wie funktioniert es?',
      answer: 'Kryptonet ist eine exklusive Plattform, die dir hilft, verschiedene Geschäftsmodelle wie Krypto-Trading, Amazon Dropshipping und mehr zu meistern. Durch unsere Kurse und KI-Bots lernst du, wie du effizient Geld verdienen kannst. Alles ist in einem benutzerfreundlichen Dashboard verfügbar.'
    },
    {
      question: 'Wie schnell kann ich mit Kryptonet Geld verdienen?',
      answer: 'It\'s all about you. Wenn du bereit bist, viel Zeit zu investieren, wirst du auch schneller Ergebnisse sehen. Zuerst muss dein Mindset auf die richtigen Framings konditioniert werden. Erste finanzielle Erfolge siehst du meist schon nach 2-3 Monaten.'
    },
    {
      question: 'Ist Kryptonet seriös und sicher?',
      answer: 'Ja, Kryptonet ist eine seriöse Plattform. Wir zeigen durch Live-Beispiele und Erfolgsgeschichten, dass unsere Methoden funktionieren. Deine Investition in unser Programm ist gut abgesichert durch unser bewährtes System und die Unterstützung erfahrener Experten.'
    },
    {
      question: 'Kann ich auch als Anfänger ohne Vorkenntnisse erfolgreich sein?',
      answer: 'Absolut! Unsere Kurse und Tools sind darauf ausgelegt, sowohl Anfängern als auch Fortgeschrittenen zu helfen. Du erhältst alle notwendigen Informationen und Unterstützung, um erfolgreich zu starten und kontinuierlich zu wachsen.'
    },
    {
      question: 'Was passiert, wenn ich Schwierigkeiten habe oder Fragen auftauchen?',
      answer: 'Unser 24/7 Support-Team steht dir jederzeit zur Verfügung, um alle deine Fragen zu beantworten und dir bei Problemen zu helfen. Wir bieten auch regelmäßige Schulungen und Community-Events, um dich kontinuierlich zu unterstützen.'
    }
  ];
} 