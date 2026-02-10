/**
 * Subscription confirmed email template.
 * Sent when a user's subscription becomes active.
 */

import {
  wrapInBaseTemplate,
  createButton,
  createInfoCard,
  formatDate,
  BTV_COLORS,
} from './base.template';

/**
 * Generates the subscription confirmed HTML template.
 *
 * @param username - The user's display name
 * @param tier - The subscription tier (e.g., 'Gold')
 * @param periodEnd - The end date of the current billing period
 * @param frontendUrl - The frontend URL for the app link
 * @returns Complete HTML email string
 */
export function getSubscriptionConfirmedEmailTemplate(
  username: string,
  tier: string,
  periodEnd: Date,
  frontendUrl: string,
): string {
  const content = `
    <!-- Success Banner -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 24px;">
      <tr>
        <td align="center" style="padding: 24px; background: linear-gradient(135deg, ${BTV_COLORS.warning}20 0%, ${BTV_COLORS.primary}20 100%); border-radius: 12px; border: 1px solid ${BTV_COLORS.warning}40;">
          <p style="margin: 0; font-size: 48px;">👑</p>
          <h1 style="margin: 16px 0 0 0; font-size: 28px; font-weight: 700; color: ${BTV_COLORS.text};">
            Welcome to ${tier}!
          </h1>
        </td>
      </tr>
    </table>
    
    <!-- Greeting -->
    <p style="margin: 0 0 24px 0; font-size: 16px; color: ${BTV_COLORS.text}; line-height: 1.6;">
      Hey <strong>${username}</strong>,
    </p>
    <p style="margin: 0 0 24px 0; font-size: 16px; color: ${BTV_COLORS.textMuted}; line-height: 1.6;">
      Your <strong style="color: ${BTV_COLORS.warning};">${tier}</strong> subscription is now active! Thank you for your support. Here's what you can enjoy:
    </p>
    
    <!-- Benefits Section -->
    <h2 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: ${BTV_COLORS.text};">
      ✨ Your ${tier} Benefits
    </h2>
    
    ${createInfoCard('🎯', 'Priority Reservations', 'Get first access to popular events and secure your spot.')}
    ${createInfoCard('💎', 'Bonus Rewards', 'Earn extra coins and rewards on all your activities.')}
    ${createInfoCard('🏆', 'Exclusive Events', 'Access members-only tournaments and special games.')}
    ${createInfoCard('🛡️', 'Premium Support', 'Get priority assistance from our support team.')}
    
    <!-- Billing Info -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 24px 0; background-color: ${BTV_COLORS.surfaceLight}; border-radius: 8px;">
      <tr>
        <td style="padding: 16px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td style="padding: 8px 0;">
                <p style="margin: 0; font-size: 14px; color: ${BTV_COLORS.textMuted};">Subscription</p>
                <p style="margin: 4px 0 0 0; font-size: 16px; font-weight: 600; color: ${BTV_COLORS.text};">${tier} Plan</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-top: 1px solid ${BTV_COLORS.border};">
                <p style="margin: 0; font-size: 14px; color: ${BTV_COLORS.textMuted};">Current Period Ends</p>
                <p style="margin: 4px 0 0 0; font-size: 16px; font-weight: 600; color: ${BTV_COLORS.text};">${formatDate(periodEnd)}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    
    <!-- CTA Button -->
    ${createButton('Start Using Your Benefits', frontendUrl)}
    
    <!-- Manage Subscription -->
    <p style="margin: 24px 0 0 0; font-size: 13px; color: ${BTV_COLORS.textMuted}; text-align: center; line-height: 1.6;">
      You can manage your subscription anytime from your account settings.
    </p>
  `.trim();

  return wrapInBaseTemplate(
    `Your ${tier} Subscription is Active - BTV`,
    content,
    `Your ${tier} subscription is now active! Enjoy your premium benefits.`,
  );
}
