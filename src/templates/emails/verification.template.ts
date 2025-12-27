import { messages } from "@/config/messages.ar";

const emailContent = messages.email.verification;

export const getVerificationEmailTemplate = (
  name: string,
  verificationUrl: string
) => `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${emailContent.subject}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
            line-height: 1.8;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            direction: rtl;
            text-align: right;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px 10px 0 0;
            text-align: center;
        }
        .content {
            background: #fff;
            padding: 30px;
            border: 1px solid #e0e0e0;
            border-top: none;
            border-radius: 0 0 10px 10px;
        }
        .button {
            display: inline-block;
            padding: 14px 32px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white !important;
            text-decoration: none;
            border-radius: 8px;
            margin: 25px 0;
            font-weight: bold;
            font-size: 16px;
        }
        .button:hover {
            opacity: 0.9;
        }
        .link-text {
            background: #f5f5f5;
            padding: 15px;
            border-radius: 5px;
            word-break: break-all;
            font-size: 14px;
            margin: 15px 0;
        }
        .footer {
            margin-top: 30px;
            font-size: 0.9em;
            color: #888;
            border-top: 1px solid #eee;
            padding-top: 20px;
        }
        .expiry {
            background: #fff3cd;
            color: #856404;
            padding: 12px;
            border-radius: 5px;
            margin: 15px 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1 style="margin: 0;">بصمة</h1>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">${emailContent.subject}</p>
    </div>
    
    <div class="content">
        <h2>${emailContent.greeting} ${name}،</h2>
        <p>${emailContent.thankYou}</p>
        
        <div style="text-align: center;">
            <a href="${verificationUrl}" class="button">${emailContent.buttonText}</a>
        </div>
        
        <p>${emailContent.copyLink}</p>
        <div class="link-text">${verificationUrl}</div>
        
        <div class="expiry">
            ⏰ ${emailContent.expiry}
        </div>
        
        <div class="footer">
            <p>💡 ${emailContent.ignore}</p>
            <p>📧 ${emailContent.automated}</p>
        </div>
    </div>
</body>
</html>
`;
