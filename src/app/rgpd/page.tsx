import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Politique de Confidentialité (RGPD) - GameProgress",
};

export default function RGPDPage() {
  return (
    <div className="min-h-screen bg-[var(--surface)] text-[var(--on-surface)] px-4 py-10 max-w-3xl mx-auto">
      <h1 className="text-2xl font-[family-name:var(--font-grotesk)] font-bold mb-8 bg-gradient-to-r from-[#8a839e] to-[#c084fc] bg-clip-text text-transparent animate-gradient-text">
        Politique de Confidentialité
      </h1>
      <p className="text-xs text-[var(--on-surface-variant)] mb-6">Dernière mise à jour : 5 avril 2026</p>

      <section className="space-y-6 text-sm text-[var(--on-surface-variant)] leading-relaxed">
        <div>
          <h2 className="text-base font-semibold text-[var(--on-surface)] mb-2">1. Responsable du traitement</h2>
          <p>
            Le responsable du traitement des données est Mathieu Guicheteau, opérant sous l&apos;enseigne MathBusiness.<br />
            Contact : mathieu.guicheteau7@gmail.com
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-[var(--on-surface)] mb-2">2. Données collectées</h2>
          <p>Nous collectons les données suivantes :</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li><strong>Données d&apos;identification :</strong> nom, adresse e-mail, photo de profil (via le fournisseur d&apos;authentification)</li>
            <li><strong>Données d&apos;utilisation :</strong> interactions enregistrées, contacts, journal, missions, sessions, messages communautaires</li>
            <li><strong>Données de progression :</strong> XP, niveau, badges, streaks</li>
            <li><strong>Données techniques :</strong> données de connexion, type d&apos;appareil (pour le mode hors-ligne)</li>
          </ul>
        </div>

        <div>
          <h2 className="text-base font-semibold text-[var(--on-surface)] mb-2">3. Finalités du traitement</h2>
          <p>Les données sont traitées pour :</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Fournir et améliorer le service GameProgress</li>
            <li>Permettre la gamification et le suivi de progression</li>
            <li>Permettre les fonctionnalités communautaires (leaderboard, posts, messages)</li>
            <li>Assurer la sécurité du service</li>
          </ul>
        </div>

        <div>
          <h2 className="text-base font-semibold text-[var(--on-surface)] mb-2">4. Base légale</h2>
          <p>
            Le traitement est fondé sur le consentement de l&apos;utilisateur (article 6.1.a du RGPD) lors de la création du compte, et sur l&apos;exécution du contrat (article 6.1.b) pour la fourniture du service.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-[var(--on-surface)] mb-2">5. Hébergement et sous-traitants</h2>
          <p>Les données sont hébergées par :</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li><strong>Supabase Inc.</strong> (base de données et stockage) — serveurs UE</li>
            <li><strong>Vercel Inc.</strong> (hébergement de l&apos;application) — serveurs UE/US</li>
          </ul>
          <p className="mt-2">
            Ces prestataires respectent les exigences du RGPD et disposent de garanties appropriées pour les transferts de données hors UE (clauses contractuelles types).
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-[var(--on-surface)] mb-2">6. Durée de conservation</h2>
          <p>
            Les données sont conservées tant que le compte est actif. En cas de suppression du compte, toutes les données personnelles sont supprimées dans un délai de 30 jours.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-[var(--on-surface)] mb-2">7. Vos droits</h2>
          <p>Conformément au RGPD, vous disposez des droits suivants :</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li><strong>Droit d&apos;accès :</strong> obtenir une copie de vos données</li>
            <li><strong>Droit de rectification :</strong> corriger vos données inexactes</li>
            <li><strong>Droit à l&apos;effacement :</strong> demander la suppression de vos données</li>
            <li><strong>Droit à la portabilité :</strong> recevoir vos données dans un format structuré</li>
            <li><strong>Droit d&apos;opposition :</strong> vous opposer au traitement de vos données</li>
            <li><strong>Droit à la limitation :</strong> demander la restriction du traitement</li>
          </ul>
          <p className="mt-2">
            Pour exercer ces droits, contactez-nous à : mathieu.guicheteau7@gmail.com
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-[var(--on-surface)] mb-2">8. Suppression du compte</h2>
          <p>
            Vous pouvez supprimer votre compte et toutes vos données à tout moment depuis la page Paramètres de l&apos;application. Cette action est irréversible et entraîne la suppression définitive de toutes vos données.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-[var(--on-surface)] mb-2">9. Cookies</h2>
          <p>
            L&apos;application utilise uniquement des cookies techniques nécessaires au fonctionnement du service (session d&apos;authentification). Aucun cookie publicitaire ou de tracking n&apos;est utilisé.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-[var(--on-surface)] mb-2">10. Réclamation</h2>
          <p>
            Si vous estimez que le traitement de vos données n&apos;est pas conforme, vous pouvez adresser une réclamation à la CNIL (Commission Nationale de l&apos;Informatique et des Libertés) : www.cnil.fr
          </p>
        </div>
      </section>
    </div>
  );
}
