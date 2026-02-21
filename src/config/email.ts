import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Verify connection configuration
transporter.verify((error) => {
  if (error) {
    console.log('SMTP connection error:', error);
  } else {
    console.log('SMTP server is ready to send emails');
  }
});

export const sendEmail = async (to: string, subject: string, html: string) => {
  try {
    const info = await transporter.sendMail({
      from: `"ProHire" <${process.env.SMTP_FROM || 'noreply@prohire.com'}>`,
      to,
      subject,
      html,
    });
    console.log('Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Email sending failed:', error);
    throw error;
  }
};

// Email templates
export const emailTemplates = {
  welcomeEmail: (name: string) => ({
    subject: 'Welcome to ProHire!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Welcome to ProHire, ${name}!</h2>
        <p>We're excited to have you on board. Start exploring jobs or posting opportunities today.</p>
        <a href="${process.env.CLIENT_URL}/dashboard" style="display: inline-block; background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 20px;">Get Started</a>
      </div>
    `,
  }),

  verifyEmail: (name: string, token: string) => ({
    subject: 'Verify Your Email - ProHire',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Verify Your Email, ${name}!</h2>
        <p>Please click the button below to verify your email address.</p>
        <a href="${process.env.CLIENT_URL}/verify-email?token=${token}" style="display: inline-block; background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 20px;">Verify Email</a>
        <p style="margin-top: 20px; color: #666;">This link will expire in 24 hours.</p>
      </div>
    `,
  }),

  resetPassword: (name: string, token: string) => ({
    subject: 'Reset Your Password - ProHire',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Reset Your Password, ${name}</h2>
        <p>You requested to reset your password. Click the button below to proceed.</p>
        <a href="${process.env.CLIENT_URL}/reset-password?token=${token}" style="display: inline-block; background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 20px;">Reset Password</a>
        <p style="margin-top: 20px; color: #666;">This link will expire in 1 hour. If you didn't request this, please ignore this email.</p>
      </div>
    `,
  }),

  jobApproved: (jobTitle: string, employerName: string) => ({
    subject: 'Your Job Has Been Approved - ProHire',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Job Approved!</h2>
        <p>Hi ${employerName},</p>
        <p>Your job posting "<strong>${jobTitle}</strong>" has been approved and is now live on ProHire.</p>
        <p>Candidates can now start applying for this position.</p>
        <a href="${process.env.CLIENT_URL}/jobs" style="display: inline-block; background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 20px;">View Your Job</a>
      </div>
    `,
  }),

  applicationReceived: (jobTitle: string, candidateName: string, employerName: string) => ({
    subject: 'New Application Received - ProHire',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">New Application!</h2>
        <p>Hi ${employerName},</p>
        <p><strong>${candidateName}</strong> has applied for your job "<strong>${jobTitle}</strong>".</p>
        <a href="${process.env.CLIENT_URL}/employer/applications" style="display: inline-block; background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 20px;">View Application</a>
      </div>
    `,
  }),
};