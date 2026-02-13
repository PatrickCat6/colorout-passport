import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { email, holderName, passportCode } = await request.json();

    const RESEND_API_KEY = 're_DvwcquNd_HhWWqMAPykBnjaJSy9orsFDd';

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #000;
      color: #fff;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background: linear-gradient(to bottom right, #1a1a1a, #000);
      border: 1px solid #333;
      border-radius: 16px;
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #8b5cf6, #06b6d4);
      padding: 40px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 48px;
      font-weight: 300;
      background: linear-gradient(to right, #fff, #e0e0e0);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .content {
      padding: 40px;
    }
    .code-box {
      background: linear-gradient(to bottom right, #2d1b69, #0e7490);
      border: 1px solid #6366f1;
      border-radius: 12px;
      padding: 30px;
      text-align: center;
      margin: 30px 0;
    }
    .code {
      font-size: 32px;
      font-weight: 300;
      letter-spacing: 2px;
      color: #fff;
      font-family: 'Courier New', monospace;
    }
    .button {
      display: inline-block;
      background: linear-gradient(to right, #8b5cf6, #06b6d4);
      color: #fff;
      text-decoration: none;
      padding: 16px 32px;
      border-radius: 8px;
      font-weight: 500;
      margin: 20px 0;
    }
    .footer {
      text-align: center;
      padding: 30px;
      color: #666;
      font-size: 14px;
    }
    h2 {
      font-weight: 300;
      font-size: 24px;
    }
    p {
      line-height: 1.6;
      color: #ccc;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>ColorOut™</h1>
      <p style="color: #e0e0e0; margin: 10px 0 0 0;">Certificate of Authenticity</p>
    </div>
    
    <div class="content">
      <h2>Welcome, ${holderName}! 🎨</h2>
      
      <p>Your ColorOut™ Passport has been approved! You are now part of an exclusive community of collectors preserving color as preserving humanity.</p>
      
      <div class="code-box">
        <p style="margin: 0 0 10px 0; font-size: 14px; color: #a0a0a0; text-transform: uppercase; letter-spacing: 1px;">Your Unique Code</p>
        <div class="code">${passportCode}</div>
      </div>
      
      <p>Your ColorOut™ tattoo is now permanently documented and authenticated. Use your passport code to:</p>
      
      <ul style="color: #ccc; line-height: 1.8;">
        <li>Verify your certificate at any time</li>
        <li>Access priority booking for future sessions</li>
        <li>Join the exclusive ColorOut™ community</li>
        <li>Get early access to PumpSkins drops and exhibitions</li>
      </ul>
      
      <div style="text-align: center;">
        <a href="https://coloroutpassport.com?code=${passportCode}" class="button">
          View Your Passport
        </a>
      </div>
      
      <p style="margin-top: 30px; padding-top: 30px; border-top: 1px solid #333;">
        <strong>Next Steps:</strong><br>
        1. Save this email for your records<br>
        2. Visit the link above to see your verified passport<br>
        3. Share your ColorOut™ story on social media (tag @patrickcat6)
      </p>
    </div>
    
    <div class="footer">
      <p>ColorOut™ by Patrick Cat<br>
      Preserving color as preserving humanity</p>
      <p style="font-size: 12px; color: #555;">© 2025 Mixi Art Studio. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'ColorOut Passport <passport@coloroutpassport.com>',
        to: [email],
        subject: `🎨 Your ColorOut™ Passport is Ready! (${passportCode})`,
        html: emailHtml
      })
    });

    const data = await response.json();

    if (response.ok) {
      return NextResponse.json({ success: true, data });
    } else {
      return NextResponse.json({ success: false, error: data }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
