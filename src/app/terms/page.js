export const metadata = {
  title: "Terms of Service | LoL Counter & Item Recommender",
  description: "Terms of Service for LoL Counter & Item Recommender.",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-dark-900 text-white">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="rounded-2xl border border-white/10 bg-dark-800 p-6 md:p-8 space-y-8">
          <div className="space-y-3">
            <p className="text-xs tracking-[0.3em] uppercase text-gold/80">
              Legal
            </p>
            <h1 className="text-3xl md:text-4xl font-semibold text-white">
              Terms of Service
            </h1>
            <p className="text-sm text-white/50">
              Last updated: April 22, 2026
            </p>
          </div>

          <section className="space-y-4 text-white/80 leading-7">
            <p>
              Welcome to LoL Counter &amp; Item Recommender.
            </p>
            <p>
              By accessing or using this website, you agree to these Terms of
              Service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-gold">
              1. Purpose of the Service
            </h2>
            <div className="space-y-4 text-white/80 leading-7">
              <p>
                LoL Counter &amp; Item Recommender provides League of
                Legends-related informational tools, including champion counter
                suggestions and item recommendation features based on available
                game data.
              </p>
              <p>
                The service is intended for informational and personal use only.
                It does not provide guarantees of in-game performance, match
                outcomes, or rank improvement.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-gold">
              2. No Affiliation with Riot Games
            </h2>
            <div className="space-y-4 text-white/80 leading-7">
              <p>
                LoL Counter &amp; Item Recommender is not endorsed by Riot Games
                and does not reflect the views or opinions of Riot Games or
                anyone officially involved in producing or managing Riot Games
                properties.
              </p>
              <p>
                Riot Games, League of Legends, and all associated properties are
                trademarks or registered trademarks of Riot Games, Inc.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-gold">
              3. Use of Riot Data
            </h2>
            <div className="space-y-4 text-white/80 leading-7">
              <p>
                This service may use data made available through the Riot Games
                API and Riot&apos;s static game data resources.
              </p>
              <p>
                Users must understand that game data, patches, champion balance,
                item balance, and other gameplay-related information may change
                over time. Recommendations may become outdated or incomplete.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-gold">
              4. Acceptable Use
            </h2>
            <div className="space-y-4 text-white/80 leading-7">
              <p>You agree not to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>use the service for unlawful purposes</li>
                <li>attempt to interfere with the site&apos;s operation</li>
                <li>
                  scrape, reverse engineer, or abuse the service in a way that
                  harms availability
                </li>
                <li>
                  use the service to violate Riot Games policies or applicable
                  law
                </li>
              </ul>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-gold">
              5. No Warranty
            </h2>
            <div className="space-y-4 text-white/80 leading-7">
              <p>
                This service is provided on an &quot;as is&quot; and &quot;as
                available&quot; basis.
              </p>
              <p>We make no warranties, express or implied, regarding:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>accuracy</li>
                <li>completeness</li>
                <li>reliability</li>
                <li>availability</li>
                <li>fitness for a particular purpose</li>
              </ul>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-gold">
              6. Limitation of Liability
            </h2>
            <div className="space-y-4 text-white/80 leading-7">
              <p>
                To the maximum extent permitted by law, LoL Counter &amp; Item
                Recommender and its operator shall not be liable for any
                indirect, incidental, special, consequential, or punitive
                damages, or for any loss arising from the use of the service.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-gold">
              7. Changes to the Service
            </h2>
            <div className="space-y-4 text-white/80 leading-7">
              <p>
                We may modify, suspend, or discontinue any part of the service
                at any time without notice.
              </p>
              <p>
                We may also update these Terms of Service from time to time.
                Continued use of the service after updates means you accept the
                revised terms.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-gold">8. Contact</h2>
            <div className="space-y-4 text-white/80 leading-7">
              <p>
                For questions about these Terms of Service, contact:
              </p>
              <p className="text-white">
                [YOUR CONTACT EMAIL]
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}