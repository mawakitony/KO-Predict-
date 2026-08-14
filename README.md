# KO Predict™

Application web d’analyse et de prédiction pour les apprenants préparant des certifications professionnelles (ex. PMP®).

**LearnWorlds** reste la plateforme d’apprentissage.  
**KO Predict™** calcule la trajectoire de préparation à l’examen à partir de règles déterministes (pas d’IA en V1).

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS
- Supabase (PostgreSQL + Auth)
- Déploiement prévu sur Vercel

## Prérequis

- Node.js 20+
- Compte Supabase (phase 2+)
- Compte GitHub / Vercel (déploiement)

## Installation locale

```bash
npm install
cp .env.example .env.local
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

## Variables d’environnement

Voir `.env.example`. Ne jamais committer de vraies clés.

| Variable | Usage |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL projet Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clé publique (client) |
| `SUPABASE_SERVICE_ROLE_KEY` | Serveur uniquement |
| `LEARNWORLDS_*` | Intégration LearnWorlds (phases 9–11) |
| `CRON_SECRET` | Protection du cron de recalcul |

## Scripts

```bash
npm run dev      # développement
npm run build    # build production
npm run start    # serveur production
npm run lint     # ESLint
```

## Phases de développement

1. Application Next.js ✅
2. Configuration Supabase ✅
3. Schéma base de données + RLS ✅
4. Données fictives (Tony Test) ✅
5. Moteur de calcul KO Predict™ ✅
6. Dashboard apprenant ✅
7. Dashboard admin ✅
8. Authentification ✅
9. Architecture LearnWorlds ✅
10. Sync LearnWorlds ✅
11. Webhooks LearnWorlds ✅
12. Recalcul automatique ✅
13. Déploiement Vercel ✅ (checklist prête)

## Configuration Supabase

1. Créer un projet sur [supabase.com](https://supabase.com).
2. Dans **Project Settings → API** (ou boîte de dialogue **Connect**), récupérer :
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - Publishable key (ou clé `anon` legacy) → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - Service role key → `SUPABASE_SERVICE_ROLE_KEY` (**jamais** dans le navigateur)
3. Créer `.env.local` à la racine :

```bash
cp .env.example .env.local
```

4. Remplir les trois variables Supabase.
5. Redémarrer `npm run dev`.
6. Vérifier : [http://localhost:3000/api/health/supabase](http://localhost:3000/api/health/supabase)

Clients prêts dans le code :

| Fichier | Usage |
|---------|--------|
| `lib/supabase/client.ts` | Client Components (navigateur) |
| `lib/supabase/server.ts` | Server Components / Actions / Routes |
| `lib/supabase/admin.ts` | Serveur uniquement (bypass RLS) |
| `proxy.ts` | Refresh session Auth (protection routes = phase 8) |

### Schéma (phase 3)

Migrations versionnées dans `supabase/migrations/` et déjà appliquées sur le projet cloud **KO Predict™** :

- `profiles` (lié à `auth.users`)
- `students`
- `learning_metrics`
- `predictions` (1 ligne courante / apprenant)
- `prediction_history`

RLS activé : un `student` ne lit que ses données ; un `admin` peut administrer.  
Les écritures sync/cron passent par la `service_role` côté serveur.

### Données de démo (phase 4)

Seed versionné : `supabase/seed.sql` (déjà appliqué sur le cloud).

| Champ | Valeur |
|-------|--------|
| Email student | `tony.test@kopredict.dev` |
| Mot de passe student | `TonyTest123!` |
| Email admin | `admin@kopredict.dev` |
| Mot de passe admin | `AdminTest123!` |
| Nom | Tony Test |
| Certification | PMP |
| Date cible | 2026-09-25 |
| Progression | 62 / 100 (62 %) |
| QCM | 78 % (récent 81 %) |
| Inactivité | 1 jour |

### Authentification (phase 8)

- Page `/login` (email + mot de passe Supabase Auth)
- `student` → `/dashboard`
- `admin` → `/admin`
- Routes protégées via `proxy.ts` + layouts serveur
- Déconnexion disponible dans les en-têtes dashboard / admin

La table `predictions` sera remplie quand le dashboard / sync appellera le moteur (phases 6+).

### Moteur KO Predict™ (phase 5)

Point d’entrée : `lib/prediction/engine.ts` → `calculatePrediction()`.

Modules : `progress`, `pace`, `readiness`, `probability`, `risk`, `recommendations`, `constants` (`FINAL_REVIEW_DAYS = 7`).

À afficher dans l’UI : **Estimation KO Predict™** (pas une garantie de réussite à l’examen).

## Tests

```bash
npm test
```

25 tests déterministes couvrent Tony Test, retards, sans QCM, date passée, pace = 0, 100 %, etc.

## Déploiement Vercel (phase 13)

### Prérequis

- Compte [Vercel](https://vercel.com) + GitHub (repo privé recommandé)
- Projet Supabase Cloud **KO Predict™** déjà migré
- Node.js 20+ en local (`npm run build` doit passer)

### 1. Pousser le code

```bash
git add .
git commit -m "feat: MVP KO Predict prêt pour Vercel"
# créer le remote GitHub puis :
git push -u origin master
```

Ne jamais committer `.env.local` (déjà dans `.gitignore`).

### 2. Créer le projet Vercel

1. [vercel.com/new](https://vercel.com/new) → importer le repo
2. Framework : **Next.js** (auto-détecté)
3. Root directory : `.` (racine du repo)
4. Build command : `npm run build` · Output : défaut Next.js

### 3. Variables d’environnement (Production + Preview)

Dans **Project → Settings → Environment Variables**, copier depuis `.env.example` :

| Variable | Obligatoire | Notes |
|----------|-------------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | oui | URL projet |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | oui | Clé publishable / anon |
| `SUPABASE_SERVICE_ROLE_KEY` | oui | Sync, webhooks, cron |
| `LEARNWORLDS_API_URL` | oui | ex. `https://www.woloyem.com/admin/api` |
| `LEARNWORLDS_CLIENT_ID` | oui | |
| `LEARNWORLDS_CLIENT_SECRET` | oui | |
| `LEARNWORLDS_WEBHOOK_SECRET` | oui | Secret LearnWorlds → Webhooks |
| `CRON_SECRET` | oui | Chaîne longue aléatoire ; Vercel Cron envoie `Authorization: Bearer …` |
| `LEARNWORLDS_ACCESS_TOKEN` | non | Optionnel si OAuth client_credentials OK |

Après ajout des variables : **Redeploy**.

### 4. Supabase Auth (URLs)

Dans Supabase → **Authentication → URL Configuration** :

| Champ | Valeur |
|-------|--------|
| Site URL | `https://<projet>.vercel.app` |
| Redirect URLs | `https://<projet>.vercel.app/**` et `http://localhost:3000/**` |

### 5. Cron Vercel

`vercel.json` planifie `GET /api/cron/recalculate` à **01:00 UTC** chaque jour.

- Sur les plans Hobby, les crons ont des limites ; Pro recommandé en prod.
- Vérifier les logs : **Deployments → Functions → Cron**.

Test manuel :

```bash
curl -X GET "https://<projet>.vercel.app/api/cron/recalculate" \
  -H "Authorization: Bearer $CRON_SECRET"
```

### 6. Webhooks LearnWorlds

Dans LearnWorlds → **Settings → Developers → Webhooks** :

1. URL : `https://<projet>.vercel.app/api/webhooks/learnworlds`
2. Activer au minimum : user updated, course completed, enrollment / product bought
3. Copier le secret → `LEARNWORLDS_WEBHOOK_SECRET` sur Vercel
4. Envoyer un dummy / événement réel et vérifier `webhook_events` dans Supabase

### 7. Vérifications post-déploiement

| URL | Attendu |
|-----|---------|
| `/` | Landing KO Predict™ |
| `/api/health` | `"readiness.production": true` |
| `/api/health/supabase` | `ok: true`, `adminConfigured: true` |
| `/login` | Connexion `admin@kopredict.dev` / `tony.test@…` |
| `/admin` | Roster (admin) |
| `/dashboard` | Prédiction (student) |

### 8. Domaine custom (optionnel)

Vercel → Domains → ajouter `predict.woloyem.com` (exemple) → mettre à jour Site URL / Redirects Supabase + URL webhook LearnWorlds.

### Sécurité

- Ne jamais exposer `SUPABASE_SERVICE_ROLE_KEY` ni secrets LearnWorlds côté client
- Régénérer la service role si elle a fuité (chat, logs, screenshot)
- Utiliser un `CRON_SECRET` distinct en production (≥ 32 caractères)

### Admin — LearnWorlds roster

Deux onglets sur `/admin` :

1. **Tous les apprenants LearnWorlds** (API `GET /v2/users`, 50/page)
2. **Apprenants KO Predict™** (dashboard existant)

Activation : `POST /api/admin/learnworlds/activate`  
Finalisation compte : invitation email → `/auth/callback` → `/auth/finalize` → mot de passe → `/dashboard`

**Pourquoi sans config le lien tombait sur `/login` :**  
`inviteUserByEmail` est appelé côté serveur (pas de `code_verifier` PKCE dans le navigateur).  
L’ancien callback faisait `exchangeCodeForSession` → échec → redirect `/login?error=invite`.

**Correctif :** callback gère `token_hash` + `verifyOtp`, cookies sur la réponse, et fallback hash client.  
En cas d’échec : rester sur `/auth/finalize` avec message d’erreur (plus de dump sur `/login`).

Redirect URLs Supabase à autoriser :
- `http://localhost:3000/auth/callback`
- `http://localhost:3000/auth/callback?next=/auth/finalize`
- `http://localhost:3000/auth/finalize`
- équivalents production

Site URL recommandé : `http://localhost:3000` (pas `/login`).

Template email **Invite user** (Auth → Email Templates) — recommandé :

```html
<a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=invite&next=/auth/finalize">
  Accept invitation
</a>
```

## Connexion LearnWorlds

Couche dans `lib/learnworlds/` :

| Module | Rôle |
|--------|------|
| `client.ts` | Auth OAuth2 / Bearer + `Lw-Client` |
| `users.ts` | `GET /v2/users`, `GET /v2/users/{id\|email}` |
| `progress.ts` | `GET /v2/users/{id}/progress`, `/enrollments`, `/v2/courses` |
| `mappers.ts` | `cf_ko_target_exam_date` / `ko_target_exam_date` → `students.target_exam_date` |
| `sync.ts` | Sync → metrics + prediction |

### Sync manuelle

```bash
# Connecté en admin (cookie session) OU header x-cron-secret
curl -X POST http://localhost:3000/api/learnworlds/sync \
  -H "Content-Type: application/json" \
  -d "{\"learnworldsUserIdOrEmail\":\"apprenant@email.com\",\"currentPace\":5}"
```

QCM assessments : endpoint non confirmé en V1 — les moyennes QCM existantes sont préservées à la sync.

### Webhooks (phase 11)

Endpoint : `POST /api/webhooks/learnworlds`

| Élément | Détail |
|---------|--------|
| Signature | Header `Learnworlds-Webhook-Signature: v1=<hmac-sha256>` |
| Secret | `LEARNWORLDS_WEBHOOK_SECRET` (Settings → Developers → Webhooks) |
| Idempotence | Table `webhook_events` (`delivery_key` = sha256 du body) |
| Sync | `userUpdated`, `courseCompleted`, `enrolledFreeCourse`, `productBought`, etc. |
| Prérequis écriture | `SUPABASE_SERVICE_ROLE_KEY` |

URL à coller dans LearnWorlds (après déploiement) :

`https://<votre-domaine>/api/webhooks/learnworlds`

### Recalcul automatique (phase 12)

Endpoint : `GET|POST /api/cron/recalculate`

| Élément | Détail |
|---------|--------|
| Auth | `Authorization: Bearer CRON_SECRET` ou `x-cron-secret` |
| Schedule | `vercel.json` → tous les jours à 01:00 UTC |
| Effet | Recalcule inactive_days + prédictions des apprenants actifs |
| Trajectoire | Compare vs prédiction précédente (« date repoussée de X jours ») |

```bash
curl -X POST http://localhost:3000/api/cron/recalculate \
  -H "Authorization: Bearer $CRON_SECRET"
```

## Licence

Propriétaire — WOLOYEM / KO Predict™.
