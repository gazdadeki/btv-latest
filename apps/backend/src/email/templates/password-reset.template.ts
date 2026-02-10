/**
 * Password reset email template.
 * Provides a link for users to reset their forgotten password.
 */

import { wrapInBaseTemplate, createButton, BTV_COLORS } from './base.template';

/**
 * Generates the password reset HTML template.
 *
 * @param resetToken - The unique reset token
 * @param frontendUrl - The frontend URL for building the reset link
 * @returns Complete HTML email string
 */
export function getPasswordResetEmailTemplate(
  resetToken: string,
  frontendUrl: string,
): string {
  const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

  const content = `
    <!-- Title -->
    <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: ${BTV_COLORS.text};">
      Reset Your Password
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 16px; color: ${BTV_COLORS.textMuted}; line-height: 1.6;">
      We received a request to reset your password. Click the button below to create a new password.
    </p>
    
    <!-- Reset Button -->
    ${createButton('Reset Password', resetLink)}
    
    <!-- Alternative Link -->
    <p style="margin: 24px 0 0 0; font-size: 14px; color: ${BTV_COLORS.textMuted}; line-height: 1.6; text-align: center;">
      Or copy and paste this link into your browser:
    </p>
    <p style="margin: 8px 0 0 0; font-size: 12px; color: ${BTV_COLORS.primary}; line-height: 1.6; text-align: center; word-break: break-all;">
      <a href="${resetLink}" style="color: ${BTV_COLORS.primary}; text-decoration: underline;">
        ${resetLink}
      </a>
    </p>
    
    <!-- Expiry Notice -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 24px;">
      <tr>
        <td align="center">
          <p style="margin: 0; padding: 12px 16px; background-color: ${BTV_COLORS.surfaceLight}; border-radius: 8px; font-size: 13px; color: ${BTV_COLORS.textMuted};">
            ⏱️ This link expires in <strong style="color: ${BTV_COLORS.text};">1 hour</strong>
          </p>
        </td>
      </tr>
    </table>
    
    <!-- Security Notice -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 24px; background-color: rgba(239, 68, 68, 0.1); border-radius: 8px; border: 1px solid ${BTV_COLORS.error};">
      <tr>
        <td style="padding: 16px;">
          <p style="margin: 0; font-size: 13px; color: ${BTV_COLORS.text}; line-height: 1.6;">
            🔒 <strong>Security Notice:</strong> If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
          </p>
        </td>
      </tr>
    </table>
  `.trim();

  return wrapInBaseTemplate(
    'Reset Your Password - BTV',
    content,
    'Reset your BTV password',
  );
}
