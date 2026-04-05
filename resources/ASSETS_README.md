# Assets natifs GameProgress

Place tes fichiers ici pour générer les icônes et splash screens :

## Fichiers requis

1. **icon.png** — Icône de l'app (1024x1024 px, PNG, pas de transparence)
2. **icon-foreground.png** — Icône adaptive Android, premier plan (1024x1024 px, PNG, transparent)
3. **icon-background.png** — Icône adaptive Android, arrière-plan (1024x1024 px)
4. **splash.png** — Splash screen (2732x2732 px, PNG, logo centré sur fond #0a0a0a)
5. **splash-dark.png** — Splash screen mode sombre (optionnel, même taille)

## Générer les assets

Une fois les fichiers placés ici :

```bash
npx @capacitor/assets generate
```

Cela génère automatiquement toutes les tailles pour Android et iOS.
