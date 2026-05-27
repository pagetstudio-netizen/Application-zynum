import { Resend } from "resend";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "ZyNum <noreply@zynum.net>";

const BASE_STYLE = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f8f9fa;
  margin: 0;
  padding: 0;
`;

function htmlLayout(content: string, previewText: string) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ZyNum</title>
</head>
<body style="${BASE_STYLE}">
  <div style="display:none;max-height:0;overflow:hidden;">${previewText}</div>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);max-width:90vw;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#ef4444,#dc2626);padding:28px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="vertical-align:middle;">
                          <img src="https://zynum.net/logo.jpg" alt="ZyNum" width="40" height="40" style="border-radius:10px;display:block;border:0;" />
                        </td>
                        <td style="padding-left:12px;vertical-align:middle;">
                          <span style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">ZyNum</span>
                          <span style="font-size:12px;color:rgba(255,255,255,0.7);margin-left:8px;">Numéros virtuels</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f8f9fa;padding:24px 40px;border-top:1px solid #e9ecef;">
              <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;line-height:1.6;">
                © 2025 ZyNum · Tous droits réservés<br/>
                <a href="https://zynum.net" style="color:#ef4444;text-decoration:none;">zynum.net</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function codeBox(code: string) {
  const digits = code.split("");
  const boxes = digits.map(d =>
    `<td style="width:44px;height:52px;text-align:center;vertical-align:middle;background:#fef2f2;border:2px solid #fca5a5;border-radius:10px;font-size:26px;font-weight:800;color:#dc2626;">${d}</td>`
  ).join('<td style="width:8px;"></td>');
  return `<table cellpadding="0" cellspacing="0" style="margin:24px auto;">
    <tr>${boxes}</tr>
  </table>`;
}

function ctaButton(url: string, label: string) {
  return `<a href="${url}" style="display:inline-block;background:linear-gradient(135deg,#ef4444,#dc2626);color:#ffffff;font-weight:700;font-size:15px;padding:14px 32px;border-radius:12px;text-decoration:none;margin:16px 0;letter-spacing:0.2px;">${label}</a>`;
}

export async function sendVerificationEmail(opts: { to: string; name: string; code: string; token: string }) {
  const link = `https://zynum.net/api/v1/auth/verify-email-link?token=${opts.token}`;
  const body = `
    <h2 style="font-size:22px;font-weight:800;color:#111827;margin:0 0 8px;">Vérifiez votre email ✉️</h2>
    <p style="font-size:15px;color:#6b7280;margin:0 0 24px;">Bonjour <strong>${opts.name}</strong>, entrez ce code pour activer votre compte ZyNum :</p>
    ${codeBox(opts.code)}
    <p style="font-size:13px;color:#9ca3af;text-align:center;margin:0 0 24px;">Ce code expire dans <strong>15 minutes</strong>.</p>
    <hr style="border:none;border-top:1px solid #f3f4f6;margin:24px 0;" />
    <p style="font-size:14px;color:#6b7280;margin:0 0 12px;">Ou cliquez sur le lien ci-dessous pour activer directement :</p>
    <div style="text-align:center;">${ctaButton(link, "Activer mon compte")}</div>
    <p style="font-size:12px;color:#d1d5db;margin:16px 0 0;text-align:center;">Si vous n'avez pas créé ce compte, ignorez cet email.</p>
  `;

  const resend = getResend();
  await resend.emails.send({
    from: FROM_EMAIL,
    to: [opts.to],
    subject: `${opts.code} — Vérification de votre compte ZyNum`,
    html: htmlLayout(body, `Votre code de vérification ZyNum : ${opts.code}`),
  });
}

export async function sendWelcomeEmail(opts: { to: string; name: string }) {
  const body = `
    <h2 style="font-size:22px;font-weight:800;color:#111827;margin:0 0 8px;">Bienvenue sur ZyNum 🎉</h2>
    <p style="font-size:15px;color:#6b7280;margin:0 0 20px;">Bonjour <strong>${opts.name}</strong>, votre compte est maintenant actif !</p>
    <div style="background:#fef2f2;border-radius:12px;padding:20px 24px;margin:0 0 24px;">
      <p style="font-size:14px;color:#374151;margin:0 0 12px;font-weight:600;">Avec ZyNum vous pouvez :</p>
      <ul style="margin:0;padding:0 0 0 20px;color:#6b7280;font-size:14px;line-height:1.8;">
        <li>Acheter des numéros virtuels dans 180+ pays</li>
        <li>Recevoir des codes OTP en quelques secondes</li>
        <li>Payer en FCFA via mobile money</li>
      </ul>
    </div>
    <div style="text-align:center;">${ctaButton("https://zynum.net/dashboard", "Accéder au tableau de bord")}</div>
  `;

  const resend = getResend();
  await resend.emails.send({
    from: FROM_EMAIL,
    to: [opts.to],
    subject: "Bienvenue sur ZyNum — Votre compte est activé !",
    html: htmlLayout(body, "Votre compte ZyNum est maintenant actif."),
  });
}

export async function sendPasswordResetEmail(opts: { to: string; name: string; code: string; token: string }) {
  const link = `https://zynum.net/api/v1/auth/reset-password-link?token=${opts.token}`;
  const body = `
    <h2 style="font-size:22px;font-weight:800;color:#111827;margin:0 0 8px;">Réinitialisation du mot de passe 🔐</h2>
    <p style="font-size:15px;color:#6b7280;margin:0 0 24px;">Bonjour <strong>${opts.name}</strong>, utilisez ce code pour réinitialiser votre mot de passe :</p>
    ${codeBox(opts.code)}
    <p style="font-size:13px;color:#9ca3af;text-align:center;margin:0 0 24px;">Ce code expire dans <strong>15 minutes</strong>.</p>
    <hr style="border:none;border-top:1px solid #f3f4f6;margin:24px 0;" />
    <p style="font-size:14px;color:#6b7280;margin:0 0 12px;">Ou cliquez sur le lien ci-dessous :</p>
    <div style="text-align:center;">${ctaButton(link, "Réinitialiser mon mot de passe")}</div>
    <p style="font-size:12px;color:#d1d5db;margin:16px 0 0;text-align:center;">Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
  `;

  const resend = getResend();
  await resend.emails.send({
    from: FROM_EMAIL,
    to: [opts.to],
    subject: `${opts.code} — Réinitialisation de votre mot de passe ZyNum`,
    html: htmlLayout(body, `Votre code de réinitialisation : ${opts.code}`),
  });
}

export async function sendLoginVerificationEmail(opts: { to: string; name: string; code: string }) {
  const body = `
    <h2 style="font-size:22px;font-weight:800;color:#111827;margin:0 0 8px;">Vérification de connexion 🔑</h2>
    <p style="font-size:15px;color:#6b7280;margin:0 0 24px;">Bonjour <strong>${opts.name}</strong>, une tentative de connexion a été détectée. Entrez ce code pour confirmer :</p>
    ${codeBox(opts.code)}
    <p style="font-size:13px;color:#9ca3af;text-align:center;margin:0 0 24px;">Ce code expire dans <strong>10 minutes</strong>.</p>
    <p style="font-size:12px;color:#d1d5db;margin:0;text-align:center;">Si ce n'est pas vous, changez votre mot de passe immédiatement.</p>
  `;

  const resend = getResend();
  await resend.emails.send({
    from: FROM_EMAIL,
    to: [opts.to],
    subject: `${opts.code} — Code de connexion ZyNum`,
    html: htmlLayout(body, `Votre code de connexion : ${opts.code}`),
  });
}

export async function sendAffiliateWithdrawalEmail(opts: {
  withdrawalId: number;
  userName: string;
  userEmail: string;
  amountUsd: number;
  phone: string;
  country: string;
}) {
  const ADMIN_EMAIL = "pagetstudio@gmail.com";
  const body = `
    <h2 style="font-size:22px;font-weight:800;color:#111827;margin:0 0 8px;">💸 Nouvelle demande de retrait affilié</h2>
    <p style="font-size:15px;color:#6b7280;margin:0 0 24px;">Un affilié a soumis une demande de retrait. Veuillez la traiter sous <strong>48h</strong>.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;margin:0 0 24px;">
      <tr><td style="padding:16px 20px;border-bottom:1px solid #e5e7eb;">
        <span style="font-size:12px;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Référence</span>
        <p style="margin:4px 0 0;font-size:16px;font-weight:700;color:#111827;">#${opts.withdrawalId}</p>
      </td></tr>
      <tr><td style="padding:16px 20px;border-bottom:1px solid #e5e7eb;">
        <span style="font-size:12px;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Utilisateur</span>
        <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#111827;">${opts.userName}</p>
        <p style="margin:2px 0 0;font-size:13px;color:#6b7280;">${opts.userEmail}</p>
      </td></tr>
      <tr><td style="padding:16px 20px;border-bottom:1px solid #e5e7eb;">
        <span style="font-size:12px;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Montant demandé</span>
        <p style="margin:4px 0 0;font-size:22px;font-weight:800;color:#dc2626;">$${opts.amountUsd.toFixed(2)}</p>
      </td></tr>
      <tr><td style="padding:16px 20px;border-bottom:1px solid #e5e7eb;">
        <span style="font-size:12px;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Mode de paiement / Numéro de réception</span>
        <p style="margin:4px 0 0;font-size:15px;font-weight:700;color:#111827;font-family:monospace;">${opts.phone}</p>
      </td></tr>
      <tr><td style="padding:16px 20px;">
        <span style="font-size:12px;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Pays</span>
        <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#111827;">${opts.country}</p>
      </td></tr>
    </table>

    <div style="text-align:center;">${ctaButton("https://zynum.net/dashboard", "Gérer via le panneau admin")}</div>
    <p style="font-size:12px;color:#d1d5db;margin:16px 0 0;text-align:center;">Ce message est envoyé automatiquement par ZyNum à chaque demande de retrait affilié.</p>
  `;

  const resend = getResend();
  await resend.emails.send({
    from: FROM_EMAIL,
    to: [ADMIN_EMAIL],
    subject: `[ZyNum Affiliation] Retrait #${opts.withdrawalId} — $${opts.amountUsd.toFixed(2)} — ${opts.userName}`,
    html: htmlLayout(body, `Retrait affilié #${opts.withdrawalId} : $${opts.amountUsd.toFixed(2)} de ${opts.userName}`),
  });
}

export async function sendBroadcastEmail(opts: {
  to: string;
  name: string;
  subject: string;
  message: string;
  imageBase64?: string;
  imageMimeType?: string;
}) {
  const hasImage = !!(opts.imageBase64 && opts.imageMimeType);
  const imageBlock = hasImage
    ? `<div style="text-align:center;margin:0 0 24px;"><img src="data:${opts.imageMimeType};base64,${opts.imageBase64}" alt="" style="max-width:100%;border-radius:12px;display:block;margin:0 auto;" /></div>`
    : "";

  const body = `
    <h2 style="font-size:22px;font-weight:800;color:#111827;margin:0 0 16px;">${opts.subject}</h2>
    ${imageBlock}
    <div style="font-size:15px;color:#374151;line-height:1.7;white-space:pre-line;">${opts.message}</div>
    <hr style="border:none;border-top:1px solid #f3f4f6;margin:24px 0;" />
    <div style="text-align:center;">${ctaButton("https://zynum.net/dashboard", "Accéder à ZyNum")}</div>
  `;

  const resend = getResend();
  await resend.emails.send({
    from: FROM_EMAIL,
    to: [opts.to],
    subject: opts.subject,
    html: htmlLayout(body, opts.message.slice(0, 120)),
  });
}
