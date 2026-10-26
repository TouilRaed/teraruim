# Teraruim Admin (mobile)

Expo React Native app pour gérer commandes et livres de la librairie Teraruim.

## Setup

```bash
cd mobile
npm install
npx expo start
```

Scanner le QR code avec **Expo Go** (Android/iOS).

## Configuration

L'URL de l'API est dans `app.json` → `expo.extra.apiBaseUrl`. Par défaut : `https://teraruim.vercel.app` (remplacez par votre domaine Vercel après déploiement).

Pour pointer vers le serveur de dev local (Next.js sur `npm run dev`) :

```json
"extra": { "apiBaseUrl": "http://<IP-PC-LOCAL>:3000" }
```

⚠️ Le téléphone et le PC doivent être sur le même Wi-Fi. `localhost` ne marche pas depuis le téléphone.

## Auth

Connexion avec le `ADMIN_PASSWORD` (+ code 2FA si `ADMIN_TOTP_SECRET` configuré).
Le JWT renvoyé est stocké dans `expo-secure-store`, valide 30 jours.

## Notifications push (nouvelle commande)

1. Sur device physique : autoriser les notifications à la connexion.
2. Le token Expo est envoyé à `/api/admin/mobile/devices` automatiquement.
3. Le backend (`src/lib/expoPush.ts`) envoie un push à chaque création de commande dans `src/app/api/checkout/route.ts`.

Pour les builds standalone (EAS), il faut configurer le `projectId` Expo dans `app.json` :
```json
"extra": { "eas": { "projectId": "<votre-id>" } }
```

## Build production (EAS)

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android   # ou ios
```

## Backend endpoints utilisés

| Méthode | Path                                | Description                |
|---------|-------------------------------------|----------------------------|
| POST    | `/api/admin/mobile/login`           | password + code → JWT      |
| GET     | `/api/admin/mobile/stats`           | KPIs du dashboard          |
| GET     | `/api/admin/mobile/orders`          | liste paginée + filtres    |
| GET     | `/api/admin/mobile/orders/[id]`     | détail d'une commande      |
| PATCH   | `/api/admin/orders/[id]`            | changer statut             |
| DELETE  | `/api/admin/orders/[id]`            | supprimer                  |
| GET     | `/api/admin/mobile/products`        | liste paginée              |
| POST    | `/api/admin/products`               | créer                      |
| PATCH   | `/api/admin/products/[id]`          | modifier                   |
| DELETE  | `/api/admin/products/[id]`          | supprimer                  |
| POST    | `/api/admin/mobile/devices`         | enregistrer token push     |

Tous (sauf login) attendent `Authorization: Bearer <jwt>`.
