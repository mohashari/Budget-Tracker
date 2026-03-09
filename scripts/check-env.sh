#!/bin/bash
# Verify all required environment variables are set for production
REQUIRED_VARS=(
  "NEXTAUTH_URL"
  "NEXTAUTH_SECRET"
  "DATABASE_URL"
  "REDIS_URL"
  "S3_ENDPOINT"
  "S3_ACCESS_KEY"
  "S3_SECRET_KEY"
  "S3_BUCKET"
  "SMTP_HOST"
  "SMTP_PORT"
  "SMTP_FROM"
)
MISSING=0
for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    echo "❌ Missing: $var"
    MISSING=$((MISSING + 1))
  else
    echo "✅ Set: $var"
  fi
done
if [ $MISSING -gt 0 ]; then
  echo ""
  echo "$MISSING variable(s) missing. Set them before deploying."
  exit 1
fi
echo ""
echo "All required variables are set!"
