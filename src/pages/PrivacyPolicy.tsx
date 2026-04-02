import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen px-4 py-8 sm:py-12" style={{ background: 'linear-gradient(135deg, hsl(230 28% 7%) 0%, hsl(250 35% 12%) 40%, hsl(270 40% 14%) 60%, hsl(230 28% 7%) 100%)' }}>
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" /> Terug
        </button>

        <div className="glass-card-highlight rounded-2xl p-6 sm:p-10 shadow-2xl shadow-black/20">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Privacybeleid & Vertrouwelijkheid</h1>
          <p className="text-xs text-muted-foreground mb-8">Laatst bijgewerkt: 1 april 2026</p>

          <div className="space-y-6 text-sm text-muted-foreground leading-relaxed">
            <section>
              <h2 className="text-base font-semibold text-foreground mb-2">1. Introductie</h2>
              <p>Welkom bij Xodeon Labs. Dit privacybeleid beschrijft hoe wij jouw persoonlijke gegevens verzamelen, gebruiken en beschermen wanneer je onze diensten gebruikt. Door een account aan te maken, ga je akkoord met dit beleid.</p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground mb-2">2. Gegevens die we verzamelen</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong className="text-foreground">Accountgegevens:</strong> E-mailadres, gebruikersnaam, profielfoto en weergavenaam.</li>
                <li><strong className="text-foreground">Locatiegegevens:</strong> Bij het inloggen wordt je land automatisch gedetecteerd op basis van je IP-adres. Dit wordt opgeslagen in je profiel en is alleen zichtbaar voor beheerders.</li>
                <li><strong className="text-foreground">Gebruiksgegevens:</strong> Hoe je de app gebruikt, welke functies je bezoekt en wanneer je online bent.</li>
                <li><strong className="text-foreground">Projectgegevens:</strong> Apps, code en bestanden die je aanmaakt binnen het platform.</li>
                <li><strong className="text-foreground">Communicatie:</strong> Berichten in chats, groepsgesprekken en organisatiecommunicatie.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground mb-2">3. Gebruik van gegevens</h2>
              <p>Wij gebruiken jouw gegevens om:</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>Je account te beheren en authenticatie te bieden</li>
                <li>Onze diensten te verbeteren en te personaliseren</li>
                <li>Technische ondersteuning te bieden</li>
                <li>Veiligheid en integriteit van het platform te waarborgen</li>
                <li>Te communiceren over updates of wijzigingen</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground mb-2">4. Vertrouwelijkheid</h2>
              <p>Jouw projecten en code zijn standaard privé. Wij delen jouw gegevens niet met derden, tenzij:</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>Je hier expliciet toestemming voor geeft (bijv. door een app openbaar te maken)</li>
                <li>Het wettelijk verplicht is</li>
                <li>Het noodzakelijk is voor het functioneren van de dienst (bijv. hosting)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground mb-2">5. Gegevensbescherming</h2>
              <p>Wij nemen passende technische en organisatorische maatregelen om jouw gegevens te beschermen tegen ongeoorloofde toegang, verlies of misbruik. Dit omvat encryptie, toegangscontroles en regelmatige beveiligingsaudits.</p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground mb-2">6. Bewaartermijn</h2>
              <p>Wij bewaren jouw gegevens zolang je een actief account hebt. Chatberichten worden automatisch verwijderd volgens de ingestelde retentieperiode. Bij het verwijderen van je account worden alle persoonlijke gegevens binnen 30 dagen gewist.</p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground mb-2">7. Jouw rechten</h2>
              <p>Je hebt het recht om:</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>Inzage te vragen in je persoonlijke gegevens</li>
                <li>Correctie of verwijdering van je gegevens te verzoeken</li>
                <li>Bezwaar te maken tegen de verwerking van je gegevens</li>
                <li>Je gegevens over te dragen naar een andere dienst</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground mb-2">8. Cookies</h2>
              <p>Wij gebruiken essentiële cookies voor authenticatie en sessiemanagement. Er worden geen tracking- of advertentiecookies gebruikt.</p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground mb-2">9. Wijzigingen</h2>
              <p>Dit beleid kan worden gewijzigd. Bij belangrijke wijzigingen word je hiervan op de hoogte gebracht via e-mail of een melding in de app.</p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground mb-2">10. Contact</h2>
              <p>Heb je vragen over dit privacybeleid? Neem contact met ons op via de instellingen in de app of stuur een bericht naar het beheerteam.</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
