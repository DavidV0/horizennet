import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { ProductService } from '../../shared/services/product.service';

interface Product {
  id: string;
  title: string;
  description: string;
  image: string;
  features?: string[];
  longDescription?: string;
  ctaText: string;
  ctaLink: string;
}

@Component({
  selector: 'app-produkte',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, RouterModule],
  templateUrl: './produkte.component.html',
  styleUrls: ['./produkte.component.scss']
})
export class ProdukteComponent {
  products: Product[] = [
    {
      id: 'academy',
      title: 'HORIZON NET ACADEMY',
      description: 'Sichern Sie sich jetzt den entscheidenden Vorteil mit der HorizonNet Academy! Werden Sie Teil einer exklusiven Gemeinschaft und nutzen Sie die Chance, Ihre Karriere auf das nächste Level zu heben. In unserer Academy bieten wir Ihnen die Möglichkeit in den HorizonNet Inner Circle einzutreten.',
      image: 'assets/images/products/academy.jpg',
      features: [
        'Exklusive Gemeinschaft',
        'Starkes Netzwerk',
        'Modernste Strategien',
        'Wettbewerbsvorteil'
      ],
      longDescription: 'Nutzen Sie die Kraft eines starken Netzwerks, um Ihre Erfolge zu maximieren und neue Geschäftsfelder zu erschließen. Wir zeigen Ihnen, wie Sie mit modernsten Strategien und Techniken Ihre Ziele erreichen und sich einen entscheidenden Wettbewerbsvorteil sichern.',
      ctaText: 'Jetzt durchstarten',
      ctaLink: '/produkte/academy'
    },
    {
      id: 'crypto',
      title: 'KRYPTO WÄHRUNGEN',
      description: 'Sichern Sie sich jetzt eine der lukrativsten Chancen der digitalen Ära! Mit Kryptowährungen können Sie durch geschickten Handel Ihr Geld vermehren.',
      image: 'assets/images/products/crypto.jpg',
      features: [
        'Sicheres Investment',
        'Bitcoin & Co.',
        'Beeindruckende Kursgewinne',
        'Expertenwissen'
      ],
      longDescription: 'Lernen Sie in unserem Kurs, wie Sie sicher in Bitcoin und Co. investieren und von beeindruckenden Kursgewinnen profitieren. Jetzt ist der ideale Zeitpunkt, um in die Welt der Kryptowährungen einzusteigen!',
      ctaText: 'Jetzt in Krypto investieren',
      ctaLink: '/produkte/crypto'
    },
    {
      id: 'insurance',
      title: 'VERSICHERUNGEN',
      description: 'Sichern Sie sich jetzt den umfassenden Schutz, den Sie verdienen! Versicherungen sind das A und O für Ihre Sicherheit – ob Gesundheit, Vermögen oder Ihr Auto mit 500 PS unter der Haube.',
      image: 'assets/images/products/insurance.jpg',
      features: [
        'Österreichs renommiertester Partner',
        'Beste Angebote',
        'Maßgeschneiderte Lösungen',
        'Umfassender Schutz'
      ],
      longDescription: 'Mit Österreichs renommiertestem Partner erhalten Sie die besten Angebote und maßgeschneiderte Lösungen für Ihre individuellen Bedürfnisse. Jetzt ist der ideale Moment, um aktiv zu werden!',
      ctaText: 'Jetzt absichern',
      ctaLink: '/produkte/versicherungen'
    },
    {
      id: 'precious-metals',
      title: 'EDELMETALLE',
      description: 'Sichern Sie sich jetzt eine der sichersten und profitabelsten Investitionen unserer Zeit! Edelmetalle wie Gold und Silber sind zeitlose Werte, die Ihr Vermögen schützen und wachsen lassen.',
      image: 'assets/images/products/precious-metals.jpg',
      features: [
        'Gold & Silber',
        'Vermögensschutz',
        'Wertstabilität',
        'Zeitlose Werte'
      ],
      longDescription: 'Ob strahlendes Gold, glänzendes Silber oder andere kostbare Metalle – jetzt ist der ideale Moment, um zu handeln.',
      ctaText: 'In Edelmetalle investieren',
      ctaLink: '/produkte/edelmetalle'
    },
    {
      id: 'real-estate',
      title: 'IMMOBILIEN',
      description: 'Sichern Sie sich jetzt den Einstieg in eine der profitabelsten Investitionen unserer Zeit! Mit nur ab € 25,- pro Monat können Sie durch uns ins Immobilien-Business einsteigen.',
      image: 'assets/images/products/real-estate.jpg',
      features: [
        'Einstieg ab € 25,-/Monat',
        'Separater Cashflow',
        'Stabile Werte',
        'Vermögenswachstum'
      ],
      longDescription: 'Immobilien sind stabile Werte, die Ihr Vermögen schützen und vermehren. Jetzt ist der ideale Moment, um zu handeln!',
      ctaText: 'Immobilien-Chance nutzen',
      ctaLink: '/produkte/immobilien'
    },
    {
      id: 'fitness',
      title: 'FITNESS',
      description: 'Erreichen Sie jetzt das nächste Level Ihres Erfolgs! Sport ist mehr als nur körperliche Betätigung – er ist der Schlüssel zu mentaler Stärke und Disziplin, die jeden erfolgreichen Menschen auszeichnen.',
      image: 'assets/images/products/fitness.jpg',
      features: [
        'Von Profisportlern entwickelt',
        'Effektive Übungen',
        'Maßgeschneiderte Ernährungspläne',
        'Mentale Stärke'
      ],
      longDescription: 'Mit unserem exklusiven Fitnessprogramm, entwickelt von einem Profisportler, erhalten Sie die perfekte Kombination aus effektiven Übungen und maßgeschneiderten Ernährungsplänen, um Ihren Traumkörper zu verwirklichen.',
      ctaText: 'Jetzt durchstarten',
      ctaLink: '/produkte/fitness'
    }
  ];

  constructor(private productService: ProductService) {
    this.products = this.productService.getAllProducts().map(product => ({
      ...product,
      ctaLink: `/produkte/${product.id}`
    }));
  }
} 