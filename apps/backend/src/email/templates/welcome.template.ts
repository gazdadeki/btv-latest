/**
 * Welcome email template.
 * Sent to newly registered users with a warm welcome, verification code, and getting started guide.
 */

import {
  wrapInBaseTemplate,
  createButton,
  createInfoCard,
  createCodeBox,
  BTV_COLORS,
} from './base.template';

/**
 * Generates the welcome email HTML template.
 *
 * @param username - The user's display name
 * @param frontendUrl - The frontend URL for the app link
 * @param verificationCode - The verification code for email verification
 * @returns Complete HTML email string
 */
export function getWelcomeEmailTemplate(
  username: string,
  frontendUrl: string,
  verificationCode: string,
): string {
  const content = `
    <!-- Welcome Banner -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 24px;">
      <tr>
        <td align="center" style="padding: 24px; background: linear-gradient(135deg, ${BTV_COLORS.primary}20 0%, ${BTV_COLORS.secondary}20 100%); border-radius: 12px;">
          <p style="margin: 0; font-size: 48px;">🎉</p>
          <h1 style="margin: 16px 0 0 0; font-size: 28px; font-weight: 700; color: ${BTV_COLORS.text};">
            Welcome to BTV!
          </h1>
        </td>
      </tr>
    </table>
    
    <!-- Greeting -->
    <p style="margin: 0 0 24px 0; font-size: 16px; color: ${BTV_COLORS.text}; line-height: 1.6;">
      Hey <strong>${username}</strong>,
    </p>
    <p style="margin: 0 0 24px 0; font-size: 16px; color: ${BTV_COLORS.textMuted}; line-height: 1.6;">
      Thanks for joining BTV! We're excited to have you on board. Before you can get started, please verify your email address using the code below.
    </p>
    
    <!-- Verification Code Section -->
    <h2 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: ${BTV_COLORS.text};">
      🔐 Your Verification Code
    </h2>
    
    ${createCodeBox(verificationCode)}
    
    <!-- Expiry Notice -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 24px;">
      <tr>
        <td align="center">
          <p style="margin: 0; padding: 12px 16px; background-color: ${BTV_COLORS.surfaceLight}; border-radius: 8px; font-size: 13px; color: ${BTV_COLORS.textMuted};">
            ⏱️ This code expires in <strong style="color: ${BTV_COLORS.text};">15 minutes</strong>
          </p>
        </td>
      </tr>
    </table>
    
    <!-- Divider -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 24px 0;">
      <tr>
        <td style="border-top: 1px solid ${BTV_COLORS.border};"></td>
      </tr>
    </table>
    
    <!-- Getting Started Section -->
    <h2 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: ${BTV_COLORS.text};">
      🚀 Get Started
    </h2>
    
    ${createInfoCard('📅', 'Browse Schedules', 'Explore upcoming events and find games that match your interests.')}
    ${createInfoCard('🎮', 'Make Reservations', 'Reserve your spot in games and compete with other players.')}
    ${createInfoCard('💰', 'Earn Rewards', 'Participate in events and earn coins for your achievements.')}
    ${createInfoCard('⭐', 'Go Gold', 'Upgrade to Gold for exclusive benefits and priority access.')}
    
    <!-- CTA Button -->
    ${createButton('Start Exploring', frontendUrl)}
    
    <!-- Help Section -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 32px; padding-top: 24px; border-top: 1px solid ${BTV_COLORS.border};">
      <tr>
        <td align="center">
          <p style="margin: 0; font-size: 14px; color: ${BTV_COLORS.textMuted}; line-height: 1.6;">
            Need help getting started? Check out our tutorials in the app or reach out to our support team.
          </p>
        </td>
      </tr>
    </table>
  `.trim();

  return wrapInBaseTemplate(
    'Welcome to BTV!',
    content,
    `Welcome aboard, ${username}! Your verification code is: ${verificationCode}`,
  );
}
