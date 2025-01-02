import { Injectable } from '@angular/core';
import { Product } from '../interfaces/product.interface';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private products: Product[] = [
    {
      id: 'academy',
      title: 'HORIZON NET ACADEMY',
      shortDescription: 'Sichern Sie sich jetzt den entscheidenden Vorteil mit der HorizonNet Academy!',
      description: 'Werden Sie Teil einer exklusiven Gemeinschaft und nutzen Sie die Chance, Ihre Karriere auf das nächste Level zu heben. In unserer Academy bieten wir Ihnen die Möglichkeit in den HorizonNet Inner Circle einzutreten.',
      image: 'assets/images/products/academy.jpg',
      features: [
        'Exklusive Gemeinschaft',
        'Starkes Netzwerk',
        'Modernste Strategien',
        'Wettbewerbsvorteil'
      ],
      benefits: [
        'Zugang zum Inner Circle',
        'Persönliches Mentoring',
        'Praxiserprobte Strategien',
        'Networking Events'
      ],
      longDescription: 'Nutzen Sie die Kraft eines starken Netzwerks, um Ihre Erfolge zu maximieren und neue Geschäftsfelder zu erschließen. Wir zeigen Ihnen, wie Sie mit modernsten Strategien und Techniken Ihre Ziele erreichen und sich einen entscheidenden Wettbewerbsvorteil sichern.',
      ctaText: 'Jetzt durchstarten',
      ctaLink: '/produkte/academy'
    },
    {
      id: 'crypto',
      title: 'KRYPTO WÄHRUNGEN',
      shortDescription: 'Sichern Sie sich jetzt eine der lukrativsten Chancen der digitalen Ära!',
      description: 'Mit Kryptowährungen können Sie durch geschickten Handel Ihr Geld vermehren. Lernen Sie in unserem Kurs, wie Sie sicher in Bitcoin und Co. investieren und von beeindruckenden Kursgewinnen profitieren.',
      image: 'assets/images/products/krypto.png',
      features: [
        'Sicheres Investment',
        'Bitcoin & Co.',
        'Beeindruckende Kursgewinne',
        'Expertenwissen'
      ],
      benefits: [
        'Professionelle Handelsstrategien',
        'Krypto-Trading Expertise',
        'Marktanalysen',
        'Community Support'
      ],
      longDescription: 'Lernen Sie in unserem Kurs, wie Sie sicher in Bitcoin und Co. investieren und von beeindruckenden Kursgewinnen profitieren. Jetzt ist der ideale Zeitpunkt, um in die Welt der Kryptowährungen einzusteigen!',
      ctaText: 'Jetzt in Krypto investieren',
      ctaLink: '/produkte/crypto'
    },
    {
      id: 'insurance',
      title: 'VERSICHERUNGEN',
      shortDescription: 'Sichern Sie sich jetzt den umfassenden Schutz, den Sie verdienen!',
      description: 'Versicherungen sind das A und O für Ihre Sicherheit – ob Gesundheit, Vermögen oder Ihr Auto mit 500 PS unter der Haube. Mit Österreichs renommiertestem Partner erhalten Sie die besten Angebote.',
      image: 'assets/images/products/versicherungen.png',
      features: [
        'Österreichs renommiertester Partner',
        'Beste Angebote',
        'Maßgeschneiderte Lösungen',
        'Umfassender Schutz'
      ],
      benefits: [
        'Individuelle Beratung',
        'Optimale Absicherung',
        'Flexible Lösungen',
        'Schnelle Schadenabwicklung'
      ],
      longDescription: 'Mit Österreichs renommiertestem Partner erhalten Sie die besten Angebote und maßgeschneiderte Lösungen für Ihre individuellen Bedürfnisse. Jetzt ist der ideale Moment, um aktiv zu werden!',
      ctaText: 'Jetzt absichern',
      ctaLink: '/produkte/versicherungen'
    },
    {
      id: 'precious-metals',
      title: 'EDELMETALLE',
      shortDescription: 'Sichern Sie sich jetzt eine der sichersten und profitabelsten Investitionen unserer Zeit!',
      description: 'Edelmetalle wie Gold und Silber sind zeitlose Werte, die Ihr Vermögen schützen und wachsen lassen. Ob strahlendes Gold, glänzendes Silber oder andere kostbare Metalle.',
      image: 'assets/images/products/edelmetalle.png',
      features: [
        'Gold & Silber',
        'Vermögensschutz',
        'Wertstabilität',
        'Zeitlose Werte'
      ],
      benefits: [
        'Inflationsschutz',
        'Physischer Besitz',
        'Wertstabile Anlage',
        'Steuervorteile'
      ],
      longDescription: 'Ob strahlendes Gold, glänzendes Silber oder andere kostbare Metalle – jetzt ist der ideale Moment, um zu handeln.',
      ctaText: 'In Edelmetalle investieren',
      ctaLink: '/produkte/edelmetalle'
    },
    {
      id: 'real-estate',
      title: 'IMMOBILIEN',
      shortDescription: 'Sichern Sie sich jetzt den Einstieg in eine der profitabelsten Investitionen unserer Zeit!',
      description: 'Mit nur ab € 25,- pro Monat können Sie durch uns ins Immobilien-Business einsteigen und beginnen, sich einen separaten Cashflow aufzubauen.',
      image: 'assets/images/products/immobilien.png',
      features: [
        'Einstieg ab € 25,-/Monat',
        'Separater Cashflow',
        'Stabile Werte',
        'Vermögenswachstum'
      ],
      benefits: [
        'Günstiger Einstieg',
        'Passive Einnahmen',
        'Wertsteigerung',
        'Steuervorteile'
      ],
      longDescription: 'Immobilien sind stabile Werte, die Ihr Vermögen schützen und vermehren. Jetzt ist der ideale Moment, um zu handeln!',
      ctaText: 'Immobilien-Chance nutzen',
      ctaLink: '/produkte/immobilien'
    },
    {
      id: 'fitness',
      title: 'FITNESS',
      shortDescription: 'Erreichen Sie jetzt das nächste Level Ihres Erfolgs!',
      description: 'Sport ist mehr als nur körperliche Betätigung – er ist der Schlüssel zu mentaler Stärke und Disziplin, die jeden erfolgreichen Menschen auszeichnen.',
      image: 'assets/images/products/fitness.png',
      features: [
        'Von Profisportlern entwickelt',
        'Effektive Übungen',
        'Maßgeschneiderte Ernährungspläne',
        'Mentale Stärke'
      ],
      benefits: [
        'Individueller Trainingsplan',
        'Ernährungsberatung',
        'Mentales Coaching',
        'Community Support'
      ],
      longDescription: 'Mit unserem exklusiven Fitnessprogramm, entwickelt von einem Profisportler, erhalten Sie die perfekte Kombination aus effektiven Übungen und maßgeschneiderten Ernährungsplänen, um Ihren Traumkörper zu verwirklichen.',
      ctaText: 'Jetzt durchstarten',
      ctaLink: '/produkte/fitness'
    }
  ];

  getProduct(id: string): Product | undefined {
    return this.products.find(product => product.id === id);
  }

  getAllProducts(): Product[] {
    return this.products;
  }
} 