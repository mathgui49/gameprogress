import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mentions Légales - GameProgress",
};

export default function MentionsLegalesPage() {
  return (
    <div className="min-h-screen bg-[var(--surface)] text-[var(--on-surface)] px-4 py-10 max-w-3xl mx-auto">
      <h1 className="text-2xl font-[family-name:var(--font-grotesk)] font-bold mb-8 bg-gradient-to-r from-[#8a839e] to-[#c084fc] bg-clip-text text-transparent">
        Mentions Légales
      </h1>
      <p className="text-xs text-[var(--on-surface-variant)] mb-6">Dernière mise à jour : 5 avril 2026</p>

      <section className="space-y-6 text-sm text-[var(--on-surface-variant)] leading-relaxed">
        <div>
          <h2 className="text-base font-semibold text-[var(--on-surface)] mb-2">1. Éditeur</h2>
          <p>
            L&apos;application GameProgress est éditée par :<br />
            <strong>Mathieu Guicheteau</strong><br />
            Enseigne : MathBusiness<br />
            E-mail : mathieu.guicheteau7@gmail.com
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-[var(--on-surface)] mb-2">2. Hébergement</h2>
          <p>
            L&apos;application est hébergée par :<br />
            <strong>Vercel Inc.</strong><br />
            440 N Barranca Ave #4133, Covina, CA 91723, États-Unis<br />
            Site : vercel.com
          </p>
          <p className="mt-2">
            La base de données est hébergée par :<br />
            <strong>Supabase Inc.</strong><br />
            970 Toa Payoh North #07-04, Singapore 318992<br />
            Site : supabase.com
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-[var(--on-surface)] mb-2">3. Directeur de la publication</h2>
          <p>
            Mathieu Guicheteau — mathieu.guicheteau7@gmail.com
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-[var(--on-surface)] mb-2">4. Propriété intellectuelle</h2>
          <p>
            L&apos;ensemble du contenu de l&apos;application GameProgress (textes, graphismes, logiciels, images, logos) est la propriété exclusive de Mathieu Guicheteau / MathBusiness, sauf mention contraire. Toute reproduction, représentation ou diffusion, totale ou partielle, sans autorisation écrite préalable est interdite.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-[var(--on-surface)] mb-2">5. Données personnelles</h2>
          <p>
            Pour toute information relative à la collecte et au traitement des données personnelles, veuillez consulter notre{" "}
            <a href="/rgpd" className="text-[#c084fc] hover:underline">Politique de Confidentialité</a>.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-[var(--on-surface)] mb-2">6. Crédits</h2>
          <p>
            Conception et développement : Mathieu Guicheteau<br />
            Propulsé par MathBusiness
          </p>
        </div>
      </section>
    </div>
  );
}
