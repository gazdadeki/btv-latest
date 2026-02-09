/**
 * Subscription cancelled email template.
 * Sent when a user cancels their subscription.
 */

import {
  wrapInBaseTemplate,
  createButton,
  formatDate,
  BTV_COLORS,
} from './base.template';

/**
 * Generates the subscription cancelled HTML template.
 *
 * @param username - The user's display name
 * @param expiresAt - The date when the subscription access will end
 * @param frontendUrl - The frontend URL for the app link
 * @returns Complete HTML email string
 */
export function getSubscriptionCancelledEmailTemplate(
  username: string,
  expiresAt: Date,
  frontendUrl: string,
): string {
  const content = `
    <!-- Header -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 24px;">
      <tr>
        <td align="center">
          <p style="margin: 0; font-size: 48px;">💔</p>
        </td>
      </tr>
    </table>
    
    <!-- Title -->
    <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: ${BTV_COLORS.text}; text-align: center;">
      We're Sorry to See You Go
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 16px; color: ${BTV_COLORS.textMuted}; line-height: 1.6; text-align: center;">
      Your subscription has been cancelled as requested.
    </p>
    
    <!-- Greeting -->
    <p style="margin: 0 0 24px 0; font-size: 16px; color: ${BTV_COLORS.text}; line-height: 1.6;">
      Hey <strong>${username}</strong>,
    </p>
    <p style="margin: 0 0 24px 0; font-size: 16px; color: ${BTV_COLORS.textMuted}; line-height: 1.6;">
      We've received your cancellation request and your subscription will not renew. Here's what you need to know:
    </p>
    
    <!-- What Happens Next -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 24px 0; background-color: ${BTV_COLORS.surfaceLight}; border-radius: 12px; border: 1px solid ${BTV_COLORS.border};">
      <tr>
        <td style="padding: 24px;">
          <h2 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: ${BTV_COLORS.text};">
            📋 What Happens Next
          </h2>
          
          <!-- Active Until -->
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 16px;">
            <tr>
              <td style="vertical-align: top; padding-right: 12px;">
                <p style="margin: 0; font-size: 20px;">✅</p>
              </td>
              <td>
                <p style="margin: 0; font-size: 14px; font-weight: 600; color: ${BTV_COLORS.text};">
                  Access Continues Until ${formatDate(expiresAt)}
                </p>
                <p style="margin: 4px 0 0 0; font-size: 14px; color: ${BTV_COLORS.textMuted};">
                  You'll keep all your premium benefits until your current billing period ends.
                </p>
              </td>
            </tr>
          </table>
          
          <!-- After Expiry -->
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 16px;">
            <tr>
              <td style="vertical-align: top; padding-right: 12px;">
                <p style="margin: 0; font-size: 20px;">🔄</p>
              </td>
              <td>
                <p style="margin: 0; font-size: 14px; font-weight: 600; color: ${BTV_COLORS.text};">
                  Free Plan After Expiry
                </p>
                <p style="margin: 4px 0 0 0; font-size: 14px; color: ${BTV_COLORS.textMuted};">
                  You'll be moved to the free plan automatically. Your account and data remain safe.
                </p>
              </td>
            </tr>
          </table>
          
          <!-- Resubscribe -->
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td style="vertical-align: top; padding-right: 12px;">
                <p style="margin: 0; font-size: 20px;">💫</p>
              </td>
              <td>
                <p style="margin: 0; font-size: 14px; font-weight: 600; color: ${BTV_COLORS.text};">
                  You Can Always Come Back
                </p>
                <p style="margin: 4px 0 0 0; font-size: 14px; color: ${BTV_COLORS.textMuted};">
                  You can resubscribe anytime to regain access to premium features.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    
    <!-- Resubscribe CTA -->
    <p style="margin: 0 0 16px 0; font-size: 16px; color: ${BTV_COLORS.text}; line-height: 1.6; text-align: center;">
      Changed your mind?
    </p>
    ${createButton('Resubscribe Now', `${frontendUrl}/subscription`)}
    
    <!-- Feedback Request -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 32px; padding-top: 24px; border-top: 1px solid ${BTV_COLORS.border};">
      <tr>
        <td align="center">
          <p style="margin: 0; font-size: 14px; color: ${BTV_COLORS.textMuted}; line-height: 1.6;">
            We'd love to hear your feedback! If there's anything we could have done better, please let us know. Your input helps us improve.
          </p>
        </td>
      </tr>
    </table>
  `.trim();

  return wrapInBaseTemplate(
    'Your Subscription Has Been Cancelled - BTV',
    content,
    `Your subscription has been cancelled and will remain active until ${formatDate(expiresAt)}.`,
  );
}
