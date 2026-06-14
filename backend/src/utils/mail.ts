import nodemailer from "nodemailer";
import ejs from "ejs";
import path from "path";

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 465,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USERNAME,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }
  return transporter;
}

export const sendMail = async (to: string, subject: string, html: string) => {
  try {
    const info = await getTransporter().sendMail({
      from: `"${process.env.SMTP_FROM_NAME || "Threads Clone"}" <${process.env.SMTP_FROM_EMAIL}>`,
      to,
      subject,
      html,
    });
    return info;
  } catch (err: any) {
    console.error("Mail send error:", err);
    return false;
  }
};

export const sendMailTemplate = async (
  to: string,
  subject: string,
  template: string,
  context: Record<string, unknown> = {},
) => {
  try {
    const templatePath = path.join(
      process.cwd(),
      "src",
      "mail",
      "templates",
      `${template}.ejs`,
    );
    const html = await ejs.renderFile(templatePath, context);
    return await sendMail(to, subject, html);
  } catch (err) {
    console.error("Template rendering or processing failed:", err);
    return false;
  }
};
