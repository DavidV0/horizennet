import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-partner-agreement',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="agb-section">
      <h1>Vertriebspartnervertrag</h1>
      
      <div class="agb-content">
        <div class="agb-text">
          <section>
            <h2>1. Vertragszweck</h2>
            <h3>1.1 Vertragsparteien</h3>
            <p>Dieser Vertrag wird zwischen der</p>
            <p>HorizonNet Consulting e.U.<br>
            Peterskirchnerstraße 13, 4742 Pram, Österreich<br>
            (im Folgenden „HNC" genannt)</p>
            <p>und</p>
            <p>dem Vertriebspartner<br>
            (im Folgenden „PUBLISHER" genannt)</p>
            <p>zusammen die „VERTRAGSPARTEIEN" abgeschlossen.</p>

            <h3>1.2 Präambel</h3>
            <p>HorizonNet Consulting e.U. (im Folgenden „HNC") betreibt unter den Domains horizonnet-consulting.com und horizonnet-consulting.com/shop Webshops (im Folgenden „PLATTFORM"), auf den Dienstleistungen bzw. Produkte im Bereich Kryptowährungen, Wissensinhalte zum selbstständigen Verkauf und Skripte angeboten werden.</p>
            <p>Mit diesem Vertrag wird eine Affiliate-Marketing-Kooperation eingegangen, in deren Rahmen der PUBLISHER die Produkte der HNC vermarktet und pro erfolgreich generierten Verkauf eine Provision erhält.</p>

            <h3>1.3 Neutralität der Geschlechter</h3>
            <p>Zum Zwecke der besseren Lesbarkeit wird auf eine geschlechterspezifische Differenzierung verzichtet. Dies geschieht ohne Diskriminierungsabsicht.</p>

            <h3>1.4 Unternehmereigenschaft</h3>
            <p>Die VERTRAGSPARTEIEN bestätigen, dass sie Unternehmer im Sinne des § 1 Abs. 1 Z 1 KSchG sind.</p>

            <h3>1.5 Geschäftsfähigkeit</h3>
            <p>Der PUBLISHER trägt die Verantwortung, dass er die erforderliche Geschäftsfähigkeit besitzt, um diesen Vertrag einzugehen.</p>
          </section>

          <section>
            <h2>2. Vergütung des PUBLISHERS</h2>
            <h3>2.1 Vergütungsmodell „Pay per Sale"</h3>
            <p>Der PUBLISHER erhält eine Vergütung nach dem Modell „Pay per Sale".</p>
            <p>SALE: Ein Bezug eines entgeltpflichtigen Produkts oder einer Dienstleistung eines CUSTOMERS von HNC, der auf eine Weiterleitung über den individuellen Affiliate-Link des PUBLISHERS zurückzuführen ist.</p>

            <h3>2.2 Provision</h3>
            <ul>
              <li>Der PUBLISHER erhält 20% des Nettobetrages für die Produkte „Kryptowährungen Wissenspaket" und „Horizon Academy".</li>
              <li>Erfolgt der Kauf auf Raten, wird die Provision anteilig mit den eingehenden Ratenzahlungen ausbezahlt.</li>
            </ul>
            <p>Die Auszahlung erfolgt nur, wenn der Provisionsbetrag mindestens 50 EUR erreicht.</p>

            <h3>2.3 Auszahlung</h3>
            <ul>
              <li>Prüfung und Berechnung: Am 14. eines jeden Monats prüft HNC die Zahlungseingänge der CUSTOMERS.</li>
              <li>Anweisung: Der PUBLISHER muss HNC schriftlich benachrichtigen, ob die Auszahlung erfolgen soll.</li>
              <li>Auszahlung: Spätestens am 15. des Folgemonats auf das angegebene Bankkonto des PUBLISHERS.</li>
              <li>Währung: Die Auszahlung erfolgt in EURO.</li>
              <li>Der Affiliate-Link dient als rechtlicher Nachweis, dass ein SALE dem PUBLISHER zugeordnet wird.</li>
            </ul>
          </section>

          <section>
            <h2>3. Einbindung des Affiliate-Links</h2>
            <ul>
              <li>Der PUBLISHER erhält einen individuellen Affiliate-Link.</li>
              <li>Nur Verkäufe, die über diesen Link generiert werden, führen zu einem Provisionsanspruch.</li>
              <li>Die korrekte Einbindung des Links obliegt ausschließlich dem PUBLISHER.</li>
            </ul>
          </section>

          <section>
            <h2>4. Sorgfaltspflichten des PUBLISHERS</h2>
            <h3>4.1 Einhaltung gesetzlicher Verpflichtungen</h3>
            <p>Der PUBLISHER ist selbst dafür verantwortlich, sämtliche einschlägigen rechtlichen Bestimmungen (z. B. gewerbe-, steuer-, sozialversicherungs- und wettbewerbsrechtlich) einzuhalten. HNC übernimmt hierfür keine Haftung.</p>

            <h3>4.2 Wahrheitspflicht</h3>
            <p>Der PUBLISHER verpflichtet sich, die Produkte und Dienstleistungen von HNC wahrheitsgemäß und ohne irreführende Angaben zu bewerben.</p>

            <h3>4.3 Werben im Namen von HNC</h3>
            <p>Ohne ausdrückliche schriftliche Zustimmung von HNC ist es dem PUBLISHER untersagt, im Namen von HNC zu werben. Ein Verstoß führt zur sofortigen Kündigung des Vertrages und kann rechtliche Konsequenzen nach sich ziehen.</p>
          </section>

          <section>
            <h2>5. Selbstständige Tätigkeit</h2>
            <p>Der PUBLISHER handelt vollkommen selbstständig und auf eigenes Risiko. Es besteht keine Weisungsgebundenheit oder Eingliederung in den Betrieb von HNC.</p>
            <p>HNC garantiert keine Erfolge oder Einnahmen.</p>
          </section>

          <section>
            <h2>6. Datenschutz und Geheimhaltung</h2>
            <h3>6.1 Geheimhaltungspflicht</h3>
            <p>Der PUBLISHER verpflichtet sich, sämtliche geschäftlichen und betrieblichen Informationen, die im Rahmen der Zusammenarbeit bekannt werden, streng vertraulich zu behandeln.</p>

            <h3>6.2 Datenschutz</h3>
            <p>Die VERTRAGSPARTEIEN verpflichten sich, die DSGVO und andere datenschutzrechtliche Bestimmungen einzuhalten.</p>
          </section>

          <section>
            <h2>7. Haftung und Gewährleistung</h2>
            <ul>
              <li>HNC übernimmt keine Haftung für die Verfügbarkeit und Funktionsfähigkeit der PLATTFORM.</li>
              <li>Eine Haftung für entgangene Gewinne ist ausgeschlossen.</li>
            </ul>
          </section>

          <section>
            <h2>8. Vertragslaufzeit und Kündigung</h2>
            <h3>8.1 Vertragslaufzeit</h3>
            <p>Der Vertrag wird auf unbestimmte Zeit geschlossen.</p>

            <h3>8.2 Kündigung</h3>
            <p>Der Vertrag kann von beiden Seiten unter Einhaltung einer zweiwöchigen Kündigungsfrist gekündigt werden.</p>
            <p>Bei Kündigung verzichtet der PUBLISHER auf alle weiteren Provisionsansprüche.</p>
          </section>

          <section>
            <h2>9. Schlussbestimmungen</h2>
            <h3>9.1 Gerichtsstand</h3>
            <p>Der Gerichtsstand ist das Landesgericht Wels, Österreich.</p>

            <h3>9.2 Anwendbares Recht</h3>
            <p>Es gilt ausschließlich österreichisches Recht.</p>

            <h3>9.3 Kontakt</h3>
            <p>Bei Fragen zu diesem Vertrag kann der PUBLISHER jederzeit die E-Mail-Adresse support&#64;horizonnet-consulting.com nutzen.</p>
          </section>

          <section>
            <h2>10. Einverständniserklärung und Unterschrift</h2>
            <h3>Einverständnis</h3>
            <p>Der PUBLISHER bestätigt, diesen Vertrag freiwillig zu unterzeichnen und alle Pflichten und Risiken eigenständig zu tragen. HNC garantiert keine Erfolge.</p>
          </section>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['../../agb/agb.component.scss']
})
export class PartnerAgreementComponent {} 