import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail(to: string, subject: string, html: string) {
  try {
    await resend.emails.send({
      from: "REELTV <noreply@reeltv.app>",
      to,
      subject,
      html,
    });
  } catch (error) {
    console.error("Failed to send email:", error);
  }
}

export function orderConfirmationEmail(name: string, packageName: string, channelName: string) {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #e11d48;">🎬 Your Broadcast is Confirmed!</h1>
      <p>Hi ${name},</p>
      <p>Your <strong>${packageName}</strong> package for <strong>${channelName}</strong> has been confirmed.</p>
      <p>Your Reel will start broadcasting according to the schedule.</p>
      <hr style="border: 1px solid #eee; margin: 20px 0;" />
      <p style="color: #666; font-size: 12px;">REELTV - Buy airtime. Broadcast your Reel.</p>
    </div>
  `;
}
