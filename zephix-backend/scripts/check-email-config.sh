#!/bin/bash
# Quick email verification diagnostic script

echo "🔍 Email Verification Diagnostic"
echo "================================"
echo ""

# Check SendGrid API Key
echo "1. SendGrid Configuration:"
if [ -z "$SENDGRID_API_KEY" ]; then
  echo "   ❌ SENDGRID_API_KEY is NOT set"
  echo "   ⚠️  Emails will NOT be sent"
else
  echo "   ✅ SENDGRID_API_KEY is set"
  echo "   📝 Key length: ${#SENDGRID_API_KEY} characters"
fi

echo "   📧 From email: ${SENDGRID_FROM_EMAIL:-noreply@zephix.dev}"
echo "   🌐 Frontend URL: ${FRONTEND_URL:-http://localhost:5173}"
echo ""

# Check if .env file exists
if [ -f ".env" ]; then
  echo "2. Environment File:"
  echo "   ✅ .env file exists"
  if grep -q "SENDGRID_API_KEY" .env; then
    if grep -q "SENDGRID_API_KEY=$" .env || grep -q "^SENDGRID_API_KEY=\s*$" .env; then
      echo "   ⚠️  SENDGRID_API_KEY is in .env but appears to be empty"
    else
      echo "   ✅ SENDGRID_API_KEY is set in .env"
    fi
  else
    echo "   ❌ SENDGRID_API_KEY is NOT in .env file"
  fi
else
  echo "2. Environment File:"
  echo "   ⚠️  .env file not found in current directory"
fi

echo ""
echo "3. Recommendations:"
if [ -z "$SENDGRID_API_KEY" ]; then
  echo "   🔧 ACTION REQUIRED: Configure SendGrid"
  echo ""
  echo "   Option 1: SendGrid (Recommended for production)"
  echo "   1. Sign up at https://sendgrid.com"
  echo "   2. Create API key in Settings > API Keys"
  echo "   3. Add to .env: SENDGRID_API_KEY=your-api-key-here"
  echo "   4. Add to .env: SENDGRID_FROM_EMAIL=noreply@yourdomain.com"
  echo ""
  echo "   Option 2: Gmail SMTP (Quick test)"
  echo "   1. Enable 2FA on Gmail account"
  echo "   2. Generate app password: https://myaccount.google.com/apppasswords"
  echo "   3. Add to .env:"
  echo "      SMTP_HOST=smtp.gmail.com"
  echo "      SMTP_PORT=587"
  echo "      SMTP_USER=your-email@gmail.com"
  echo "      SMTP_PASS=your-16-char-app-password"
  echo "      SMTP_FROM=noreply@zephix.com"
  echo ""
  echo "   After configuration, restart the backend service"
fi

echo ""
echo "================================"
echo "✅ Diagnostic complete"

