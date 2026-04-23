// Layout HTML partagé pour tous les emails YANA.
// Contraintes client mail (Gmail/Outlook) : table-based, inline styles,
// pas de CSS external, pas de JS, images hostées (ici : on évite les images).
// Thème clair volontaire (rendu universel), accent orange YANA #F97316.

export interface EmailLayoutVars {
  heading: string
  body: string
  cta_label: string
  cta_url: string
  footer_note?: string
  unsubscribe_url: string
  preheader?: string // texte invisible affiché en preview dans la boîte de réception
}

export function renderEmailHtml(v: EmailLayoutVars): string {
  const preheader = (v.preheader ?? v.heading).slice(0, 120)
  const footerNote = v.footer_note
    ? `<p style="margin:24px 0 0 0;font-size:13px;line-height:1.6;color:#78716C;">${escape(v.footer_note)}</p>`
    : ''

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="fr">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="color-scheme" content="light only" />
<meta name="supported-color-schemes" content="light only" />
<title>${escape(v.heading)}</title>
</head>
<body style="margin:0;padding:0;background:#FAFAF9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#1C1917;-webkit-font-smoothing:antialiased;">
<!-- preheader (invisible, seen in inbox preview) -->
<div style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0;">${escape(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FAFAF9;">
  <tr><td align="center" style="padding:40px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid #F5F5F4;">
      <tr><td style="padding:40px 40px 8px 40px;">
        <div style="font-size:12px;color:#78716C;letter-spacing:0.24em;text-transform:uppercase;font-weight:600;">
          <span style="display:inline-block;vertical-align:middle;width:8px;height:8px;background:#F97316;border-radius:50%;margin-right:8px;"></span>
          YANA
        </div>
        <h1 style="margin:16px 0 8px 0;font-size:26px;line-height:1.25;font-weight:700;color:#1C1917;">
          ${escape(v.heading)}
        </h1>
      </td></tr>
      <tr><td style="padding:8px 40px 24px 40px;">
        <div style="font-size:15px;line-height:1.65;color:#44403C;">${v.body}</div>
      </td></tr>
      <tr><td style="padding:8px 40px 32px 40px;" align="center">
        <!-- CTA button — VML fallback pour Outlook -->
        <!--[if mso]>
        <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${escapeAttr(v.cta_url)}" style="height:48px;v-text-anchor:middle;width:240px;" arcsize="50%" stroke="f" fillcolor="#F97316">
          <w:anchorlock/>
          <center style="color:#ffffff;font-family:sans-serif;font-size:15px;font-weight:600;">${escape(v.cta_label)}</center>
        </v:roundrect>
        <![endif]-->
        <!--[if !mso]><!-- -->
        <a href="${escapeAttr(v.cta_url)}" style="display:inline-block;padding:14px 32px;background:#F97316;color:#FFFFFF;text-decoration:none;border-radius:999px;font-weight:600;font-size:15px;line-height:1;">
          ${escape(v.cta_label)}
        </a>
        <!--<![endif]-->
      </td></tr>
      <tr><td style="padding:0 40px 40px 40px;">
        ${footerNote}
      </td></tr>
    </table>
    <p style="margin:16px 0 0 0;font-size:11px;color:#A8A29E;line-height:1.6;">
      YANA by Purama · SASU PURAMA · 8 Rue de la Chapelle, 25560 Frasne<br/>
      <a href="${escapeAttr(v.unsubscribe_url)}" style="color:#78716C;text-decoration:underline;">Se désabonner</a>
    </p>
  </td></tr>
</table>
</body>
</html>`
}

// Version texte pour les clients mail sans HTML.
export function renderEmailText(v: EmailLayoutVars): string {
  const stripped = v.body.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
  return `${v.heading}

${stripped}

${v.cta_label} → ${v.cta_url}

${v.footer_note ?? ''}

—
YANA by Purama · Se désabonner : ${v.unsubscribe_url}`
}

// ------------------------------------------------------------------ helpers --

function escape(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escapeAttr(raw: string): string {
  return escape(raw).replace(/'/g, '&#39;')
}
