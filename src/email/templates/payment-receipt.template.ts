/**
 * Payment receipt email template.
 * Sent after a successful payment is processed.
 */

import {
  wrapInBaseTemplate,
  createButton,
  formatDate,
  formatCurrency,
  BTV_COLORS,
} from './base.template';

/**
 * Generates the payment receipt HTML template.
 *
 * @param username - The user's display name
 * @param amount - The payment amount in smallest currency unit (e.g., cents)
 * @param currency - The currency code (e.g., 'USD')
 * @param description - Description of the payment
 * @param transactionDate - The date of the transaction
 * @param frontendUrl - The frontend URL for the app link
 * @returns Complete HTML email string
 */
export function getPaymentReceiptEmailTemplate(
  username: string,
  amount: number,
  currency: string,
  description: string,
  transactionDate: Date,
  frontendUrl: string,
): string {
  const formattedAmount = formatCurrency(amount, currency);
  const transactionId = `BTV-${Date.now().toString(36).toUpperCase()}`;

  const content = `
    <!-- Success Banner -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 24px;">
      <tr>
        <td align="center" style="padding: 24px; background: linear-gradient(135deg, ${BTV_COLORS.success}20 0%, ${BTV_COLORS.primary}20 100%); border-radius: 12px; border: 1px solid ${BTV_COLORS.success}40;">
          <p style="margin: 0; font-size: 48px;">✅</p>
          <h1 style="margin: 16px 0 0 0; font-size: 28px; font-weight: 700; color: ${BTV_COLORS.text};">
            Payment Received
          </h1>
          <p style="margin: 8px 0 0 0; font-size: 14px; color: ${BTV_COLORS.success};">
            Thank you for your payment!
          </p>
        </td>
      </tr>
    </table>
    
    <!-- Greeting -->
    <p style="margin: 0 0 24px 0; font-size: 16px; color: ${BTV_COLORS.text}; line-height: 1.6;">
      Hey <strong>${username}</strong>,
    </p>
    <p style="margin: 0 0 24px 0; font-size: 16px; color: ${BTV_COLORS.textMuted}; line-height: 1.6;">
      Your payment has been successfully processed. Here's your receipt:
    </p>
    
    <!-- Receipt Card -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 24px 0; background-color: ${BTV_COLORS.surfaceLight}; border-radius: 12px; border: 1px solid ${BTV_COLORS.border};">
      <tr>
        <td style="padding: 24px;">
          <!-- Receipt Header -->
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px dashed ${BTV_COLORS.border};">
            <tr>
              <td>
                <p style="margin: 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: ${BTV_COLORS.textMuted};">
                  Receipt
                </p>
              </td>
              <td align="right">
                <p style="margin: 0; font-size: 12px; color: ${BTV_COLORS.textMuted};">
                  ${transactionId}
                </p>
              </td>
            </tr>
          </table>
          
          <!-- Amount -->
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 16px;">
            <tr>
              <td align="center">
                <p style="margin: 0; font-size: 40px; font-weight: 700; color: ${BTV_COLORS.text};">
                  ${formattedAmount}
                </p>
              </td>
            </tr>
          </table>
          
          <!-- Details -->
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td style="padding: 12px 0; border-top: 1px solid ${BTV_COLORS.border};">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td>
                      <p style="margin: 0; font-size: 14px; color: ${BTV_COLORS.textMuted};">Description</p>
                    </td>
                    <td align="right">
                      <p style="margin: 0; font-size: 14px; font-weight: 500; color: ${BTV_COLORS.text};">${description}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 0; border-top: 1px solid ${BTV_COLORS.border};">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td>
                      <p style="margin: 0; font-size: 14px; color: ${BTV_COLORS.textMuted};">Date</p>
                    </td>
                    <td align="right">
                      <p style="margin: 0; font-size: 14px; font-weight: 500; color: ${BTV_COLORS.text};">${formatDate(transactionDate)}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 0; border-top: 1px solid ${BTV_COLORS.border};">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td>
                      <p style="margin: 0; font-size: 14px; color: ${BTV_COLORS.textMuted};">Status</p>
                    </td>
                    <td align="right">
                      <span style="display: inline-block; padding: 4px 12px; background-color: ${BTV_COLORS.success}20; border-radius: 12px; font-size: 12px; font-weight: 600; color: ${BTV_COLORS.success};">
                        Paid
                      </span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    
    <!-- View History CTA -->
    ${createButton('View Transaction History', `${frontendUrl}/wallet`)}
    
    <!-- Support Notice -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 32px; padding-top: 24px; border-top: 1px solid ${BTV_COLORS.border};">
      <tr>
        <td align="center">
          <p style="margin: 0; font-size: 13px; color: ${BTV_COLORS.textMuted}; line-height: 1.6;">
            Questions about this payment? Contact our support team and reference your transaction ID.
          </p>
        </td>
      </tr>
    </table>
  `.trim();

  return wrapInBaseTemplate(
    'Payment Receipt - BTV',
    content,
    `Payment of ${formattedAmount} received. Thank you!`,
  );
}
