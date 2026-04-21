import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "LoL Counter & Item Recommender",
  description: "League of Legends counter pick and item recommendation tool.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen flex flex-col bg-dark-900 text-white">
          <div className="flex-1">{children}</div>

          <footer className="border-t border-white/10 bg-dark-900">
            <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-white/40 leading-6">
                LoL Counter &amp; Item Recommender isn&apos;t endorsed by Riot Games and
                doesn&apos;t reflect the views or opinions of Riot Games or anyone
                officially involved in producing or managing Riot Games properties.
                Riot Games, League of Legends, and all associated properties are
                trademarks or registered trademarks of Riot Games, Inc.
              </p>

              <div className="flex items-center gap-4 shrink-0 text-sm text-white/70">
                <Link href="/terms" className="hover:text-gold transition-colors">
                  Terms
                </Link>
                <Link href="/privacy" className="hover:text-gold transition-colors">
                  Privacy
                </Link>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}