/**
 * Applique Site URL / Redirect URLs + template Invite user
 * via la Management API Supabase.
 *
 * Prérequis : SUPABASE_ACCESS_TOKEN (https://supabase.com/dashboard/account/tokens)
 * Ne jamais committer ni logger le token.
 *
 * Usage :
 *   $env:SUPABASE_ACCESS_TOKEN="sbp_..."
 *   node scripts/configure-supabase-invite-auth.mjs
 *
 * Note free tier : sans SMTP custom, Supabase refuse la modification
 * des email templates (API et souvent dashboard). Les URLs restent applicables.
 */

const PROJECT_REF = "tpmwcffzdzmchizqzxkh";

const INVITE_HTML = `<h2>Vous êtes invité(e) sur KO Predict™</h2>
<p>
Vous avez été invité(e) à accéder à votre espace KO Predict™.
</p>
<p>
Cliquez sur le bouton ci-dessous pour activer votre compte et créer votre mot de passe.
</p>
<p>
<a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=invite&next=/auth/finalize">
  Accept invitation
</a>
</p>`;

const SITE_URL = "http://localhost:3000";
const URI_ALLOW_LIST = [
  "http://localhost:3000/auth/callback",
  "http://localhost:3000/auth/callback?next=/auth/finalize",
  "http://localhost:3000/auth/finalize",
  "http://localhost:3000/**",
].join(",");

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function patchAuth(token, body) {
  const url = `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let parsed = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    /* ignore */
  }
  return { ok: res.ok, status: res.status, text, parsed };
}

async function getAuth(token) {
  const url = `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`;
  const res = await fetch(url, {
    method: "GET",
    headers: authHeaders(token),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`GET auth config ${res.status}: ${text.slice(0, 400)}`);
  }
  return JSON.parse(text);
}

function verify(cfg) {
  const tpl = String(cfg.mailer_templates_invite_content ?? "");
  const needed = [
    "http://localhost:3000/auth/callback",
    "http://localhost:3000/auth/callback?next=/auth/finalize",
    "http://localhost:3000/auth/finalize",
    "http://localhost:3000/**",
  ];
  const allow = String(cfg.uri_allow_list ?? "");
  return {
    siteOk: cfg.site_url === SITE_URL,
    redirectsOk: needed.every((u) => allow.includes(u)),
    tokenHash: tpl.includes("token_hash={{ .TokenHash }}"),
    callback: tpl.includes("/auth/callback"),
    typeInvite: tpl.includes("type=invite"),
    nextFinalize: tpl.includes("next=/auth/finalize"),
  };
}

async function main() {
  const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
  if (!token) {
    console.error(
      "MANQUANT: définissez SUPABASE_ACCESS_TOKEN (Account → Access Tokens).",
    );
    process.exit(2);
  }

  const urls = await patchAuth(token, {
    site_url: SITE_URL,
    uri_allow_list: URI_ALLOW_LIST,
  });
  if (!urls.ok) {
    console.error(`Échec PATCH URLs (${urls.status}).`);
    console.error(urls.text.slice(0, 800));
    process.exit(1);
  }
  console.log("URLs: OK");

  const tpl = await patchAuth(token, {
    mailer_subjects_invite: "Vous êtes invité(e) sur KO Predict™",
    mailer_templates_invite_content: INVITE_HTML,
  });
  if (!tpl.ok) {
    console.error(`Template Invite: ÉCHEC (${tpl.status}).`);
    console.error(tpl.text.slice(0, 800));
    console.error(
      "Cause fréquente (free tier): SMTP custom requis pour modifier les templates.",
    );
  } else {
    console.log("Template Invite: OK");
  }

  const cfg = await getAuth(token);
  const v = verify(cfg);
  console.log("Vérification distante:");
  console.log("  site_url:", cfg.site_url, v.siteOk ? "OK" : "ERREUR");
  console.log("  uri_allow_list:", v.redirectsOk ? "OK" : "ERREUR");
  console.log("  TokenHash:", v.tokenHash ? "OK" : "ERREUR");
  console.log("  /auth/callback:", v.callback ? "OK" : "ERREUR");
  console.log("  type=invite:", v.typeInvite ? "OK" : "ERREUR");
  console.log("  next=/auth/finalize:", v.nextFinalize ? "OK" : "ERREUR");

  if (!v.siteOk || !v.redirectsOk || !v.tokenHash) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
