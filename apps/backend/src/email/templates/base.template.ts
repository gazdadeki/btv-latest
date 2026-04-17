/**
 * Base email template with BTV branding.
 * Provides consistent styling and structure for all transactional emails.
 * Features responsive design, dark theme accents, and professional typography.
 */

/**
 * BTV brand colors used across all email templates
 */
export const BTV_COLORS = {
  primary: '#6366f1',
  primaryDark: '#4f46e5',
  secondary: '#10b981',
  background: '#0f172a',
  surface: '#1e293b',
  surfaceLight: '#334155',
  text: '#f8fafc',
  textMuted: '#94a3b8',
  textDark: '#1e293b',
  border: '#475569',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  white: '#ffffff',
};

/**
 * Wraps email content in the base BTV-branded HTML template.
 * Includes header with logo, footer with company info, and responsive styles.
 *
 * @param title - Email subject/title for display
 * @param content - Main HTML content to be wrapped
 * @param preheader - Preview text shown in email clients (optional)
 * @returns Complete HTML email string
 */
export function wrapInBaseTemplate(
  title: string,
  content: string,
  preheader?: string,
): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    /* Reset styles */
    body, table, td, p, a, li, blockquote {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    table, td {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    img {
      -ms-interpolation-mode: bicubic;
      border: 0;
      height: auto;
      line-height: 100%;
      outline: none;
      text-decoration: none;
    }
    body {
      height: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      background-color: ${BTV_COLORS.background};
    }
    /* Typography */
    h1, h2, h3, h4, h5, h6 {
      margin: 0;
      padding: 0;
    }
    /* Button styles */
    .button {
      display: inline-block;
      box-sizing: border-box;
      max-width: 100%;
      padding: 16px 32px;
      background: linear-gradient(135deg, ${BTV_COLORS.primary} 0%, ${BTV_COLORS.primaryDark} 100%);
      color: ${BTV_COLORS.white} !important;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      text-align: center;
      transition: all 0.2s ease;
      word-break: break-word;
    }
    .button-secondary {
      background: transparent;
      border: 2px solid ${BTV_COLORS.primary};
      color: ${BTV_COLORS.primary} !important;
    }
    /* Card styles */
    .card {
      background-color: ${BTV_COLORS.surface};
      border-radius: 12px;
      border: 1px solid ${BTV_COLORS.border};
      padding: 24px;
    }
    /* Code/verification code styles */
    .code-box {
      background: linear-gradient(135deg, ${BTV_COLORS.surface} 0%, ${BTV_COLORS.surfaceLight} 100%);
      border: 2px solid ${BTV_COLORS.primary};
      border-radius: 12px;
      padding: 20px 40px;
      font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
      font-size: 32px;
      font-weight: 700;
      letter-spacing: 8px;
      color: ${BTV_COLORS.text};
      text-align: center;
    }
    /* Responsive */
    @media only screen and (max-width: 600px) {
      .container {
        width: 100% !important;
        padding: 20px !important;
      }
      .content {
        padding: 20px !important;
      }
      .code-box {
        font-size: 24px !important;
        letter-spacing: 4px !important;
        padding: 16px 24px !important;
      }
      .button {
        display: block !important;
        width: 100% !important;
        box-sizing: border-box !important;
        padding: 14px 20px !important;
      }
      .button-wrapper {
        width: 100% !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${BTV_COLORS.background}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  ${preheader ? `<div style="display: none; max-height: 0; overflow: hidden;">${preheader}</div>` : ''}
  
  <!-- Main container -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: ${BTV_COLORS.background};">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        
        <!-- Email content wrapper -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="container" style="max-width: 600px; width: 100%;">
          
          <!-- Header with logo -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="padding: 16px 24px; background: linear-gradient(135deg, ${BTV_COLORS.primary} 0%, ${BTV_COLORS.primaryDark} 100%); border-radius: 12px;">
                    <h1 style="margin: 0; font-size: 28px; font-weight: 800; color: ${BTV_COLORS.white}; letter-spacing: 2px;">
                      BTV
                    </h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Main content card -->
          <tr>
            <td>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: ${BTV_COLORS.surface}; border-radius: 16px; border: 1px solid ${BTV_COLORS.border};">
                <tr>
                  <td class="content" style="padding: 40px;">
                    ${content}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top: 32px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="padding-bottom: 16px;">
                    <p style="margin: 0; font-size: 14px; color: ${BTV_COLORS.textMuted};">
                      &copy; ${new Date().getUTCFullYear()} BTV. All rights reserved.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <p style="margin: 0; font-size: 12px; color: ${BTV_COLORS.textMuted}; line-height: 1.6;">
                      You're receiving this email because you have an account with BTV.<br>
                      If you didn't request this email, you can safely ignore it.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();
}

/**
 * Creates a styled primary button element.
 *
 * @param text - Button label
 * @param href - Button link URL
 * @returns HTML string for the button
 */
export function createButton(text: string, href: string): string {
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" class="button-wrapper" style="margin: 24px 0; width: 100%;">
      <tr>
        <td align="center">
          <a href="${href}" class="button" style="display: inline-block; box-sizing: border-box; max-width: 100%; padding: 16px 32px; background: linear-gradient(135deg, ${BTV_COLORS.primary} 0%, ${BTV_COLORS.primaryDark} 100%); color: ${BTV_COLORS.white}; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; text-align: center; word-break: break-word;">
            ${text}
          </a>
        </td>
      </tr>
    </table>
  `.trim();
}

/**
 * Creates a styled verification/code display box.
 *
 * @param code - The code to display
 * @returns HTML string for the code box
 */
export function createCodeBox(code: string): string {
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 24px 0;">
      <tr>
        <td align="center">
          <div class="code-box" style="background: linear-gradient(135deg, ${BTV_COLORS.surface} 0%, ${BTV_COLORS.surfaceLight} 100%); border: 2px solid ${BTV_COLORS.primary}; border-radius: 12px; padding: 20px 40px; font-family: 'SF Mono', 'Monaco', 'Consolas', monospace; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: ${BTV_COLORS.text};">
            ${code}
          </div>
        </td>
      </tr>
    </table>
  `.trim();
}

/**
 * Creates an info card with icon and content.
 *
 * @param icon - Unicode emoji or icon character
 * @param title - Card title
 * @param content - Card content/description
 * @returns HTML string for the info card
 */
export function createInfoCard(
  icon: string,
  title: string,
  content: string,
): string {
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 16px 0; background-color: ${BTV_COLORS.surfaceLight}; border-radius: 8px; border: 1px solid ${BTV_COLORS.border};">
      <tr>
        <td style="padding: 16px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td style="vertical-align: top; padding-right: 12px; font-size: 24px;">
                ${icon}
              </td>
              <td>
                <p style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600; color: ${BTV_COLORS.text};">
                  ${title}
                </p>
                <p style="margin: 0; font-size: 14px; color: ${BTV_COLORS.textMuted};">
                  ${content}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `.trim();
}

/**
 * Formats a date for display in emails.
 *
 * @param date - Date to format
 * @returns Formatted date string (e.g., "January 15, 2024")
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * Formats a currency amount for display.
 *
 * @param amount - Amount in smallest currency unit (e.g., cents)
 * @param currency - Currency code (e.g., 'USD')
 * @returns Formatted currency string (e.g., "$12.99")
 */
export function formatCurrency(amount: number, currency: string): string {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  });
  return formatter.format(amount / 100);
}
