export const metadata = {
  title: "Privacy Policy | LoL Counter & Item Recommender",
  description: "Privacy Policy for LoL Counter & Item Recommender.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-dark-900 text-white">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="rounded-2xl border border-white/10 bg-dark-800 p-6 md:p-8 space-y-8">
          <div className="space-y-3">
            <p className="text-xs tracking-[0.3em] uppercase text-gold/80">
              Legal
            </p>
            <h1 className="text-3xl md:text-4xl font-semibold text-white">
              Privacy Policy
            </h1>
            <p className="text-sm text-white/50">
              Last updated: April 22, 2026
            </p>
          </div>

          <section className="space-y-4 text-white/80 leading-7">
            <p>
              This Privacy Policy explains how LoL Counter &amp; Item
              Recommender handles information.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-gold">
              1. Information We Collect
            </h2>
            <div className="space-y-4 text-white/80 leading-7">
              <p>
                We may collect limited technical information necessary to
                operate the website, such as:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>server logs</li>
                <li>browser type</li>
                <li>device type</li>
                <li>pages visited</li>
                <li>referral information</li>
                <li>basic analytics data</li>
              </ul>
              <p>
                We do not intentionally collect sensitive personal information
                through the core functionality of the site.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-gold">
              2. Riot Game Data
            </h2>
            <div className="space-y-4 text-white/80 leading-7">
              <p>
                This service may process publicly available or API-accessible
                League of Legends match and gameplay data obtained through Riot
                Games developer tools and related resources.
              </p>
              <p>This may include gameplay-related information such as:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>champion selections</li>
                <li>match history-derived data</li>
                <li>item builds</li>
                <li>win/loss outcomes</li>
                <li>game version information</li>
              </ul>
              <p>
                This service does not claim ownership of Riot Games data.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-gold">
              3. How We Use Information
            </h2>
            <div className="space-y-4 text-white/80 leading-7">
              <p>We use information to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>operate and improve the website</li>
                <li>generate recommendations and statistics</li>
                <li>monitor performance and reliability</li>
                <li>prevent abuse and maintain security</li>
              </ul>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-gold">
              4. Cookies and Analytics
            </h2>
            <div className="space-y-4 text-white/80 leading-7">
              <p>
                The site may use basic cookies or similar technologies for
                functionality, analytics, or performance monitoring.
              </p>
              <p>
                If analytics tools are used, they may collect aggregated usage
                information.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-gold">
              5. Sharing of Information
            </h2>
            <div className="space-y-4 text-white/80 leading-7">
              <p>We do not sell personal information.</p>
              <p>We may share limited information only when necessary to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>operate hosting or infrastructure services</li>
                <li>comply with legal obligations</li>
                <li>
                  protect the safety, integrity, or rights of the service and
                  its users
                </li>
              </ul>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-gold">
              6. Data Retention
            </h2>
            <div className="space-y-4 text-white/80 leading-7">
              <p>
                We retain technical and operational data only as long as
                reasonably necessary for service operation, security, debugging,
                analytics, or legal compliance.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-gold">
              7. Third-Party Services
            </h2>
            <div className="space-y-4 text-white/80 leading-7">
              <p>
                This website may rely on third-party providers such as hosting,
                analytics, CDN, or infrastructure services.
              </p>
              <p>
                Those providers may process limited technical information
                according to their own privacy policies.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-gold">8. Security</h2>
            <div className="space-y-4 text-white/80 leading-7">
              <p>
                We take reasonable measures to protect information processed by
                the service. However, no method of storage or transmission is
                completely secure.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-gold">9. Children</h2>
            <div className="space-y-4 text-white/80 leading-7">
              <p>
                This service is not directed to children under the age required
                by applicable law, and we do not knowingly collect personal
                information from children.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-gold">
              10. Changes to This Policy
            </h2>
            <div className="space-y-4 text-white/80 leading-7">
              <p>
                We may update this Privacy Policy from time to time. The updated
                version will be posted on this page with a revised date.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-gold">11. Contact</h2>
            <div className="space-y-4 text-white/80 leading-7">
              <p>
                If you have questions about this Privacy Policy, contact:
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