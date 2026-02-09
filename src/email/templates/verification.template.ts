/**
 * Email verification template.
 * Displays a verification code for users to confirm their email address.
 */

import { wrapInBaseTemplate, createCodeBox, BTV_COLORS } from './base.template';

/**
 * Generates the email verification HTML template.
 *
 * @param code - The verification code to display
 * @returns Complete HTML email string
 */
export function getVerificationEmailTemplate(code: string): string {
  const content = `
    <!-- Title -->
    <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: ${BTV_COLORS.text};">
      Verify Your Email
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 16px; color: ${BTV_COLORS.textMuted}; line-height: 1.6;">
      Thanks for signing up! Please use the verification code below to confirm your email address.
    </p>
    
    <!-- Verification Code -->
    ${createCodeBox(code)}
    
    <!-- Instructions -->
    <p style="margin: 24px 0 0 0; font-size: 14px; color: ${BTV_COLORS.textMuted}; line-height: 1.6; text-align: center;">
      Enter this code in the app to complete your verification.
    </p>
    
    <!-- Expiry Notice -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 24px;">
      <tr>
        <td align="center">
          <p style="margin: 0; padding: 12px 16px; background-color: ${BTV_COLORS.surfaceLight}; border-radius: 8px; font-size: 13px; color: ${BTV_COLORS.textMuted};">
            ⏱️ This code expires in <strong style="color: ${BTV_COLORS.text};">15 minutes</strong>
          </p>
        </td>
      </tr>
    </table>
    
    <!-- Security Notice -->
    <p style="margin: 24px 0 0 0; font-size: 12px; color: ${BTV_COLORS.textMuted}; line-height: 1.6; text-align: center;">
      If you didn't create an account with BTV, you can safely ignore this email.
    </p>
  `.trim();

  return wrapInBaseTemplate(
    'Verify Your Email - BTV',
    content,
    `Your verification code is: ${code}`,
  );
}
