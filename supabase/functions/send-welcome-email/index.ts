import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, password, name } = await req.json()
    const firstName = name ? name.trim().split(' ')[0] : 'there';
    console.log(`📧 Sending Credential-Split Email to: ${email}`);

    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not set')
    }

    const loginUrl = 'https://www.codeslogic.com';

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'CodesLogic <onboarding@codeslogic.com>',
        to: [email],
        subject: `Welcome to CodesLogic, ${firstName}!`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
            <style>
              body, table, td, p, h1, div, span {
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
              }
            </style>
          </head>
          <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
            <!-- Hidden Preheader -->
            <div style="display: none; max-height: 0px; overflow: hidden;">
              Your professional workspace is ready. Access your credentials and login to continue.
              &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
            </div>

            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5; padding: 40px 15px;">
              <tr>
                <td align="center">
                  <!-- Main White Card -->
                  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; border: 1px solid #e0e0e0; box-shadow: 0 4px 6px rgba(0,0,0,0.05); overflow: hidden;">
                    
                    <!-- Header -->
                    <tr>
                      <td style="padding: 30px 40px; border-bottom: 1px solid #f0f0f0;">
                        <table border="0" cellspacing="0" cellpadding="0">
                          <tr>
                            <td style="padding-right: 8px; vertical-align: middle;">
                              <img src="https://efrborampxloagtlphyf.supabase.co/storage/v1/object/public/digital-assets/Icon-01.png" width="32" height="32" alt="CodesLogic Icon" style="display: block;">
                            </td>
                            <td style="vertical-align: middle;">
                              <div style="font-size: 22px; color: #333333; letter-spacing: 0.2px; line-height: 1;">
                                <span style="font-weight: 700;">Codes</span><span style="font-weight: 400;">Logic</span>
                              </div>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>

                    <!-- Body Content -->
                    <tr>
                      <td style="padding: 40px;">
                        <h1 style="color: #333333; font-size: 24px; font-weight: 700; margin: 0 0 20px 0; line-height: 1.2;">
                          Welcome to CodesLogic, ${firstName}!
                        </h1>
                        
                        <p style="font-size: 16px; line-height: 1.6; color: #555555; margin: 0 0 30px 0;">
                          Your professional workspace is ready. We've verified your application and created your credentials below.
                        </p>

                        <!-- Separate Fields -->
                        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 35px;">
                          
                          <!-- Email Field -->
                          <tr>
                            <td style="padding-bottom: 18px;">
                              <div style="color: #666666; font-size: 13px; font-weight: 500; margin-bottom: 6px;">Email Address</div>
                              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #fafafa; border: 1px solid #f0f0f0; border-radius: 8px;">
                                <tr>
                                  <td style="padding: 12px 14px; font-size: 15px; font-weight: 400; color: #555555;">
                                    <span style="color: #555555 !important; text-decoration: none !important; border: none !important;">
                                      ${email.replace('@', '&#64;').replace(/\./g, '&#46;')}
                                    </span>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>

                          <!-- Password Field -->
                          <tr>
                            <td>
                              <div style="color: #666666; font-size: 13px; font-weight: 500; margin-bottom: 6px;">Temporary Password</div>
                              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #fafafa; border: 1px solid #f0f0f0; border-radius: 8px;">
                                <tr>
                                  <td style="padding: 12px 14px; font-size: 16px; font-weight: 400; color: #555555;">
                                    ${password}
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>

                        <!-- CTA Button -->
                        <table border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 0px;">
                          <tr>
                            <td>
                              <a href="${loginUrl}" 
                                 style="display: inline-block; background: linear-gradient(to bottom, #FF6B4B, #D9361A); color: #ffffff; padding: 16px 36px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 16px; text-align: center; box-shadow: 0 4px 14px rgba(217,54,26,0.25);">
                                 Login to your account
                              </a>
                            </td>
                          </tr>
                        </table>

                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td style="padding: 30px 40px; background-color: #fafafa; border-top: 1px solid #f0f0f0; text-align: center;">
                        <p style="margin: 0; font-size: 12px; color: #999999; font-weight: 400;">
                          © 2026 CodesLogic. All Rights Reserved.
                        </p>
                      </td>
                    </tr>
                  </table>
                  
                  <!-- Unique Hidden ID to prevent Gmail threading/collapsing -->
                  <div style="display: none; color: #f5f5f5; font-size: 1px; opacity: 0;">
                    ID: ${Math.random().toString(36).substring(7)}
                  </div>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
      }),
    })

    const resData = await res.json();
    return new Response(JSON.stringify(resData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
