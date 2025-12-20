#!/bin/bash

# Deployment script for AWS S3 + CloudFront
# This script builds the Angular app and deploys it to S3

set -e

echo "🚀 Starting deployment process..."

# Load .env file if it exists (for S3_BUCKET, CLOUDFRONT_DISTRIBUTION_ID, AWS_REGION)
# Note: AWS credentials should still be configured via 'aws configure'
if [ -f ".env" ]; then
    echo "Loading configuration from .env file..."
    export $(grep -v '^#' .env | grep -E '^(S3_BUCKET|S3_BUCKET_NAME|CLOUDFRONT_DISTRIBUTION_ID|AWS_REGION)=' | xargs)
    # Map S3_BUCKET_NAME to S3_BUCKET if S3_BUCKET is not set
    if [ -z "$S3_BUCKET" ] && [ -n "$S3_BUCKET_NAME" ]; then
        export S3_BUCKET="$S3_BUCKET_NAME"
    fi
fi

# Configuration
# Priority: 1. Environment variables, 2. .env file, 3. Defaults
# You can also set these as environment variables:
#   export S3_BUCKET="your-bucket-name"
#   export CLOUDFRONT_DISTRIBUTION_ID="E1234567890ABC"
#   export AWS_REGION="us-east-1"
S3_BUCKET="${S3_BUCKET:-your-bucket-name}"
CLOUDFRONT_DISTRIBUTION_ID="${CLOUDFRONT_DISTRIBUTION_ID:-}"
AWS_REGION="${AWS_REGION:-us-west-2}"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first."
    echo "Visit: https://aws.amazon.com/cli/"
    exit 1
fi

# Build the Angular application
echo "📦 Building Angular application..."
npm run build

# Check if build was successful
if [ ! -d "dist/pallabsphotography" ]; then
    echo "❌ Build failed. dist/pallabsphotography directory not found."
    exit 1
fi

echo "✓ Build completed successfully"

# Clean up old files (preserving photos/ folder)
echo "🧹 Cleaning up old website files (preserving photos/ folder)..."
# Delete known old files that won't be in the new build
OLD_FILES=("aboutme.html" "bundle.js" "elements.html" "galary.html" "galary0.html" "generic.html")
for file in "${OLD_FILES[@]}"; do
    if aws s3 ls s3://$S3_BUCKET/$file --region $AWS_REGION &>/dev/null; then
        aws s3 rm s3://$S3_BUCKET/$file --region $AWS_REGION && echo "  ✓ Deleted: $file" || true
    fi
done

# Delete old assets folder (new build will have its own)
if aws s3 ls s3://$S3_BUCKET/assets/ --region $AWS_REGION &>/dev/null; then
    echo "  Removing old assets/ folder..."
    aws s3 rm s3://$S3_BUCKET/assets/ --recursive --region $AWS_REGION && echo "  ✓ Deleted old assets/" || true
fi

# Delete old images folder (if exists, comment out if you want to keep it)
# if aws s3 ls s3://$S3_BUCKET/images/ --region $AWS_REGION &>/dev/null; then
#     echo "  Removing old images/ folder..."
#     aws s3 rm s3://$S3_BUCKET/images/ --recursive --region $AWS_REGION && echo "  ✓ Deleted old images/" || true
# fi

echo "✓ Cleanup completed (photos/ folder preserved)"

# Deploy to S3 with --delete flag to remove any remaining old files
echo "☁️  Uploading to S3 bucket: $S3_BUCKET..."
# Upload static assets (JS, CSS, images) with STANDARD storage class and long cache
# Note: Bucket has default encryption (AES256), so files will be encrypted automatically
aws s3 sync dist/pallabsphotography/ s3://$S3_BUCKET/ \
    --region $AWS_REGION \
    --delete \
    --storage-class STANDARD \
    --cache-control "public,max-age=31536000,immutable" \
    --exclude "index.html" \
    --exclude "*.json" \
    --exclude "photos/*"

# Upload index.html with no-cache and proper content type
echo "📄 Uploading index.html with no-cache..."
aws s3 cp dist/pallabsphotography/index.html s3://$S3_BUCKET/index.html \
    --region $AWS_REGION \
    --storage-class STANDARD \
    --cache-control "public,max-age=0,must-revalidate" \
    --content-type "text/html; charset=utf-8" \
    --metadata-directive REPLACE

# Upload JSON files with short cache and proper content type
echo "📄 Uploading JSON files..."
aws s3 sync dist/pallabsphotography/ s3://$S3_BUCKET/ \
    --region $AWS_REGION \
    --storage-class STANDARD \
    --exclude "*" \
    --include "*.json" \
    --cache-control "public,max-age=300" \
    --content-type "application/json; charset=utf-8"

echo "✓ Upload to S3 completed"

# Invalidate CloudFront cache (optional, costs $0.005 per invalidation path)
# Invalidating "/*" counts as 1 path = $0.005 total cost
INVALIDATION_COST=0.005
INVALIDATION_PATHS="/*"

if [ -n "$CLOUDFRONT_DISTRIBUTION_ID" ] && [ "$CLOUDFRONT_DISTRIBUTION_ID" != "" ]; then
    # Check if running in interactive mode (not automated/pipeline)
    if [ -t 0 ] && [ -t 1 ]; then
        # Interactive mode - ask for confirmation
        echo ""
        echo "⚠️  CloudFront Cache Invalidation"
        echo "   Paths to invalidate: $INVALIDATION_PATHS"
        echo "   Cost: \$$INVALIDATION_COST (1 path × \$0.005 per path)"
        read -p "   Do you want to invalidate CloudFront cache? (y/N): " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo "🔄 Invalidating CloudFront cache (cost: \$$INVALIDATION_COST)..."
            aws cloudfront create-invalidation \
                --distribution-id $CLOUDFRONT_DISTRIBUTION_ID \
                --paths "$INVALIDATION_PATHS"
            echo "✓ CloudFront invalidation initiated"
        else
            echo "⏭️  Skipping CloudFront invalidation (saved \$$INVALIDATION_COST)"
            echo "   Note: Changes may take 5-10 minutes to appear due to cache"
        fi
    else
        # Non-interactive mode (automated/pipeline) - skip invalidation by default
        echo ""
        echo "⏭️  Skipping CloudFront invalidation (non-interactive mode)"
        echo "   Cost saved: \$$INVALIDATION_COST"
        echo "   Note: Changes may take 5-10 minutes to appear due to cache"
        echo "   To force invalidation, set INVALIDATE_CLOUDFRONT=true environment variable"
    fi
    
    # Allow override via environment variable for automated processes
    if [ "$INVALIDATE_CLOUDFRONT" = "true" ]; then
        echo "🔄 Invalidating CloudFront cache (forced via INVALIDATE_CLOUDFRONT=true, cost: \$$INVALIDATION_COST)..."
        aws cloudfront create-invalidation \
            --distribution-id $CLOUDFRONT_DISTRIBUTION_ID \
            --paths "$INVALIDATION_PATHS"
        echo "✓ CloudFront invalidation initiated"
    fi
else
    echo "⚠️  Skipping CloudFront invalidation (distribution ID not configured)"
fi

echo ""
echo "✅ Deployment completed successfully!"
echo "🌐 Your site should be live at: https://$S3_BUCKET/"
echo ""


