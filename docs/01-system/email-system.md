# Email System

## How We Send Emails

**Current**: Resend API ✅  
**Previous**: SMTP ❌ (removed)

## What Emails We Send

1. **Welcome emails** - When users sign up
2. **Password reset** - When they forget password  
3. **Notifications** - When tasks are assigned

## Resend Setup

### Environment Variables
```bash
RESEND_API_KEY=re_your_api_key
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

### Code Example
```typescript
const resend = new Resend(API_KEY)

await resend.emails.send({
  from: 'noreply@yourdomain.com',
  to: 'user@example.com', 
  subject: 'Welcome!',
  html: '<h1>Hello!</h1>'
})
```

## Email Templates

Located in: `src/templates/emails/`

- `verification.template.ts` - Email verification
- `reset-password.template.ts` - Password reset

## Why We Switched to Resend

| SMTP (Old) | Resend (New) |
|------------|--------------|
| ❌ Complex setup | ✅ Simple API |
| ❌ Delivery issues | ✅ Reliable delivery |
| ❌ No analytics | ✅ Built-in tracking |
| ❌ Manual config | ✅ Managed service |

## Development Mode

Emails are **disabled** in development to make testing easier:

```typescript
if (ENV.NODE_ENV === "development") {
  console.log("Email would be sent to:", email)
  return // Don't actually send
}
```

## Testing Emails

Run the test script:
```bash
npx ts-node scripts/test-resend.ts
```

This will:
- ✅ Check API key is set
- ✅ Test email sending
- ✅ Verify templates work

## Common Issues

| Problem | Solution |
|---------|----------|
| "Domain not verified" | Verify domain in Resend dashboard |
| "Invalid API key" | Check RESEND_API_KEY in .env |
| "Rate limit exceeded" | Wait or upgrade Resend plan |

## Email Status

- ✅ **Resend integrated** and working
- ⚠️ **Verification disabled** for development  
- ✅ **Templates created** and tested
- ✅ **Error handling** implemented

---
*Reliable emails, simple setup!*
