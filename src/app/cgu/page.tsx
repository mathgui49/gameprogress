import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Conditions Générales d'Utilisation - GameProgress",
};

export default function CGUPage() {
  return (
    <div className="min-h-screen bg-[var(--surface)] text-[var(--on-surface)] px-4 py-10 max-w-3xl mx-auto">
      <h1 className="text-2xl font-[family-name:var(--font-grotesk)] font-bold mb-8 bg-gradient-to-r from-[#8a839e] to-[#c084fc] bg-clip-text text-transparent animate-gradient-text">
        Conditions Générales d&apos;Utilisation
      </h1>
      <p className="text-xs text-[var(--on-surface-variant)] mb-6">Dernière mise à jour : 5 avril 2026</p>

      <section className="space-y-6 text-sm text-[var(--on-surface-variant)] leading-relaxed">
        <div>
          <h2 className="text-base font-semibold text-[var(--on-surface)] mb-2">1. Objet</h2>
          <p>
            Les présentes Conditions Générales d&apos;Utilisation (CGU) définissent les modalités d&apos;accès et d&apos;utilisation de l&apos;application GameProgress, éditée par Mathieu Guicheteau sous l&apos;enseigne MathBusiness.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-[var(--on-surface)] mb-2">2. Acceptation des CGU</h2>
          <p>
            L&apos;utilisation de l&apos;application implique l&apos;acceptation pleine et entière des présentes CGU. Si vous n&apos;acceptez pas ces conditions, vous ne devez pas utiliser l&apos;application.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-[var(--on-surface)] mb-2">3. Description du service</h2>
          <p>
            GameProgress est une application de développement personnel gamifiée permettant aux utilisateurs de suivre leurs interactions sociales, définir des missions, tenir un journal et visualiser leur progression via un système de points d&apos;expérience (XP).
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-[var(--on-surface)] mb-2">4. Inscription et compte</h2>
          <p>
            L&apos;accès à l&apos;application nécessite la création d&apos;un compte via un fournisseur d&apos;authentification tiers (Google, etc.). L&apos;utilisateur est responsable de la confidentialité de ses identifiants et de toute activité sur son compte.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-[var(--on-surface)] mb-2">5. Utilisation acceptable</h2>
          <p>L&apos;utilisateur s&apos;engage à :</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Ne pas utiliser l&apos;application à des fins illicites ou nuisibles</li>
            <li>Ne pas publier de contenu offensant, diffamatoire ou discriminatoire</li>
            <li>Ne pas tenter de compromettre la sécurité ou le fonctionnement de l&apos;application</li>
            <li>Respecter les autres utilisateurs dans les fonctionnalités communautaires</li>
          </ul>
        </div>

        <div>
          <h2 className="text-base font-semibold text-[var(--on-surface)] mb-2">6. Propriété intellectuelle</h2>
          <p>
            L&apos;ensemble des éléments de l&apos;application (design, code, textes, logos) est protégé par le droit de la propriété intellectuelle. Toute reproduction non autorisée est interdite.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-[var(--on-surface)] mb-2">7. Contenu utilisateur</h2>
          <p>
            Les utilisateurs conservent la propriété de leur contenu. En publiant du contenu sur les fonctionnalités communautaires, l&apos;utilisateur accorde une licence non exclusive d&apos;affichage au sein de l&apos;application.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-[var(--on-surface)] mb-2">8. Limitation de responsabilité</h2>
          <p>
            L&apos;application est fournie &quot;en l&apos;état&quot;. MathBusiness ne garantit pas la disponibilité permanente du service et ne saurait être tenu responsable de pertes de données ou d&apos;interruptions de service.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-[var(--on-surface)] mb-2">9. Résiliation</h2>
          <p>
            L&apos;utilisateur peut supprimer son compte à tout moment depuis les paramètres de l&apos;application. MathBusiness se réserve le droit de suspendre ou supprimer tout compte en cas de violation des présentes CGU.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-[var(--on-surface)] mb-2">10. Modification des CGU</h2>
          <p>
            MathBusiness se réserve le droit de modifier les présentes CGU. Les utilisateurs seront informés de toute modification substantielle. La poursuite de l&apos;utilisation vaut acceptation des nouvelles conditions.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-[var(--on-surface)] mb-2">11. Droit applicable</h2>
          <p>
            Les présentes CGU sont régies par le droit français. Tout litige sera soumis aux tribunaux compétents de Paris.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-[var(--on-surface)] mb-2">12. Contact</h2>
          <p>
            Pour toute question relative aux présentes CGU, vous pouvez nous contacter à l&apos;adresse : mathieu.guicheteau7@gmail.com
          </p>
        </div>
      </section>
    </div>
  );
}
