#!/usr/bin/env ts-node

/**
 * Test script for Resend email integration
 * Run with: npx ts-node scripts/test-resend.ts
 */

import { ENV } from "../src/config/env";
import { EmailService } from "../src/services/email.service";

async function testResendIntegration() {
  console.log("🧪 Testing Resend Integration...\n");

  // Check environment variables
  console.log("📋 Environment Check:");
  console.log(`- NODE_ENV: ${ENV.NODE_ENV}`);
  console.log(
    `- RESEND_API_KEY: ${ENV.RESEND_API_KEY ? "✅ Set" : "❌ Missing"}`
  );
  console.log(`- RESEND_FROM_EMAIL: ${ENV.RESEND_FROM_EMAIL || "❌ Missing"}`);
  console.log(`- FRONTEND_URL: ${ENV.FRONTEND_URL}`);
  console.log("");

  if (!ENV.RESEND_API_KEY) {
    console.log(
      "❌ RESEND_API_KEY is not set. Please add it to your .env file:"
    );
    console.log("   RESEND_API_KEY=your_resend_api_key_here");
    console.log("   RESEND_FROM_EMAIL=your-verified-email@yourdomain.com");
    return;
  }

  if (!ENV.RESEND_FROM_EMAIL) {
    console.log(
      "❌ RESEND_FROM_EMAIL is not set. Please add it to your .env file:"
    );
    console.log("   RESEND_FROM_EMAIL=your-verified-email@yourdomain.com");
    return;
  }

  try {
    // Initialize email service
    console.log("🚀 Initializing EmailService...");
    const emailService = new EmailService();
    console.log("✅ EmailService initialized successfully\n");

    // Test verification email
    console.log("📧 Testing verification email...");
    const testEmail = "test@example.com"; // Replace with your test email
    const testName = "Test User";
    const testToken = "test-verification-token-123";

    await emailService.sendVerificationEmail(testEmail, testName, testToken);
    console.log("✅ Verification email sent successfully\n");

    // Test password reset email
    console.log("🔐 Testing password reset email...");
    const resetToken = "test-reset-token-456";

    await emailService.sendPasswordResetEmail(testEmail, testName, resetToken);
    console.log("✅ Password reset email sent successfully\n");

    console.log(
      "🎉 All tests passed! Resend integration is working correctly."
    );
    console.log("\n📝 Next steps:");
    console.log("1. Verify your domain in Resend dashboard");
    console.log("2. Update RESEND_FROM_EMAIL to use your verified domain");
    console.log("3. Test with real email addresses");
  } catch (error) {
    console.error("❌ Test failed:", error);
    console.log("\n🔧 Troubleshooting:");
    console.log("1. Check your RESEND_API_KEY is correct");
    console.log("2. Ensure your domain is verified in Resend");
    console.log("3. Check Resend dashboard for any errors");
  }
}

// Run the test
testResendIntegration().catch(console.error);
