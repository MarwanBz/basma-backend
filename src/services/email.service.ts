import {
  getPasswordResetEmailTemplate,
  getVerificationEmailTemplate,
} from "@/templates/emails";

import { ENV } from "@/config/env";
import { Resend } from "resend";
import { logger } from "@/config/logger";

export class EmailService {
  private resend: Resend;
  private readonly fromAddress: string;

  constructor() {
    // Initialize Resend with API key
    this.resend = new Resend(ENV.RESEND_API_KEY);
    this.fromAddress = ENV.RESEND_FROM_EMAIL || "noreply@example.com";

    logger.info("Using Resend configuration", {
      context: "EmailService.constructor",
      fromAddress: this.fromAddress,
    });

    // Add email template precompilation
    this.precompileTemplates();

    // Test Resend connection
    this.testConnection();
  }

  private async testConnection() {
    try {
      // Test Resend connection by sending a test email to ourselves
      if (ENV.NODE_ENV === "development") {
        logger.info("Resend connection test skipped in development mode");
        return;
      }

      // In production, we could test with a simple API call
      // For now, we'll just log that we're using Resend
      logger.info("Resend client initialized successfully");
    } catch (error) {
      logger.error("Resend connection failed", { error });
    }
  }

  private precompileTemplates() {
    try {
      getVerificationEmailTemplate("test", "test"); // Pre-compile by running once
      getPasswordResetEmailTemplate("test", "test"); // Pre-compile by running once
      logger.info("Email templates precompiled successfully");
    } catch (error) {
      logger.error("Failed to precompile email templates", { error });
    }
  }

  async sendVerificationEmail(
    to: string,
    name: string,
    verificationToken: string
  ): Promise<void> {
    const verificationUrl = `${ENV.FRONTEND_URL}/verify-email/${verificationToken}`;

    try {
      const { data, error } = await this.resend.emails.send({
        from: this.fromAddress,
        to: [to],
        subject: "Verify your email address",
        html: getVerificationEmailTemplate(name, verificationUrl),
      });

      if (error) {
        throw new Error(`Resend error: ${error.message}`);
      }

      logger.info("Verification email sent", {
        context: "EmailService.sendVerificationEmail",
        to,
        messageId: data?.id,
      });
    } catch (error) {
      logger.error("Failed to send verification email", {
        context: "EmailService.sendVerificationEmail",
        error: error instanceof Error ? error.message : "Unknown error",
        to,
      });
      // In development, don't fail the request due to email errors
      if (ENV.NODE_ENV === "development") {
        return;
      }
      throw error;
    }
  }

  async sendPasswordResetEmail(
    to: string,
    name: string,
    resetToken: string
  ): Promise<void> {
    const resetUrl = `${ENV.FRONTEND_URL}/reset-password/${resetToken}`;

    try {
      const { data, error } = await this.resend.emails.send({
        from: this.fromAddress,
        to: [to],
        subject: "Reset Your Password",
        html: getPasswordResetEmailTemplate(name, resetUrl),
      });

      if (error) {
        throw new Error(`Resend error: ${error.message}`);
      }

      logger.info("Password reset email sent", {
        context: "EmailService.sendPasswordResetEmail",
        to,
        messageId: data?.id,
      });
    } catch (error) {
      logger.error("Failed to send password reset email", {
        context: "EmailService.sendPasswordResetEmail",
        error: error instanceof Error ? error.message : "Unknown error",
        to,
      });
      // In development, don't fail the request due to email errors
      if (ENV.NODE_ENV === "development") {
        return;
      }
      throw error;
    }
  }

  // Generic method for sending custom emails
  async sendEmail(
    to: string | string[],
    subject: string,
    html: string,
    text?: string
  ): Promise<void> {
    try {
      const { data, error } = await this.resend.emails.send({
        from: this.fromAddress,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        text,
      });

      if (error) {
        throw new Error(`Resend error: ${error.message}`);
      }

      logger.info("Email sent successfully", {
        context: "EmailService.sendEmail",
        to: Array.isArray(to) ? to : [to],
        subject,
        messageId: data?.id,
      });
    } catch (error) {
      logger.error("Failed to send email", {
        context: "EmailService.sendEmail",
        error: error instanceof Error ? error.message : "Unknown error",
        to: Array.isArray(to) ? to : [to],
        subject,
      });
      // In development, don't fail the request due to email errors
      if (ENV.NODE_ENV === "development") {
        return;
      }
      throw error;
    }
  }
}
