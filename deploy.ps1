# Deployment script for AWS S3 + CloudFront (PowerShell)
# Minimal, brace-safe rewrite to avoid parser quirks
$ErrorActionPreference = "Stop"

Write-Host "Starting deployment..."

# Configuration (with environment overrides)
# IMPORTANT: Set these as environment variables or update the defaults below
if ($env:S3_BUCKET) { $S3_BUCKET = $env:S3_BUCKET } else { $S3_BUCKET = "your-bucket-name" }
if ($env:CLOUDFRONT_DISTRIBUTION_ID) { $CLOUDFRONT_DISTRIBUTION_ID = $env:CLOUDFRONT_DISTRIBUTION_ID } else { $CLOUDFRONT_DISTRIBUTION_ID = "" }
if ($env:AWS_REGION) { $AWS_REGION = $env:AWS_REGION } else { $AWS_REGION = "us-west-2" }

# Check AWS CLI
try { $null = Get-Command aws -ErrorAction Stop } catch {
    Write-Host "AWS CLI not installed. Install and retry." -ForegroundColor Red
    exit 1
}

# Build
Write-Host "Building Angular app..."
npm run build
if (-not (Test-Path "dist/pallabsphotography")) {
    Write-Host "Build failed: dist/pallabsphotography not found." -ForegroundColor Red
    exit 1
}
Write-Host "Build complete."

# Cleanup (preserve photos/)
Write-Host "Cleaning old site files (preserving photos/)..."
$OLD_FILES = @("aboutme.html", "bundle.js", "elements.html", "galary.html", "galary0.html", "generic.html")
foreach ($file in $OLD_FILES) {
    $exists = aws s3 ls "s3://$S3_BUCKET/$file" --region $AWS_REGION 2>$null
    if ($LASTEXITCODE -eq 0) {
        aws s3 rm "s3://$S3_BUCKET/$file" --region $AWS_REGION 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) { Write-Host "  Deleted: $file" }
    }
}

if (aws s3 ls "s3://$S3_BUCKET/assets/" --region $AWS_REGION 2>$null) {
    Write-Host "Removing old assets/..."
    aws s3 rm "s3://$S3_BUCKET/assets/" --recursive --region $AWS_REGION 2>$null | Out-Null
}
Write-Host "Cleanup done."

# Deploy static assets
Write-Host "Uploading static assets..."
aws s3 sync dist/pallabsphotography/ "s3://$S3_BUCKET/" --region $AWS_REGION --delete --storage-class STANDARD --cache-control "public,max-age=31536000,immutable" --exclude "index.html" --exclude "*.json" --exclude "photos/*"
if ($LASTEXITCODE -ne 0) { Write-Host "Asset sync failed." -ForegroundColor Red; exit 1 }

Write-Host "Uploading index.html..."
aws s3 cp dist/pallabsphotography/index.html "s3://$S3_BUCKET/index.html" --region $AWS_REGION --storage-class STANDARD --cache-control "public,max-age=0,must-revalidate" --content-type "text/html; charset=utf-8" --metadata-directive REPLACE
if ($LASTEXITCODE -ne 0) { Write-Host "index.html upload failed." -ForegroundColor Red; exit 1 }

Write-Host "Uploading JSON..."
aws s3 sync dist/pallabsphotography/ "s3://$S3_BUCKET/" --region $AWS_REGION --storage-class STANDARD --exclude "*" --include "*.json" --cache-control "public,max-age=300" --content-type "application/json; charset=utf-8"
if ($LASTEXITCODE -ne 0) { Write-Host "JSON upload failed." -ForegroundColor Red; exit 1 }
Write-Host "Upload complete."

# CloudFront invalidation (optional)
$INVALIDATION_COST = 0.005
$INVALIDATION_PATHS = "/*"

if ($CLOUDFRONT_DISTRIBUTION_ID) {
    $isInteractive = $false
    try {
        if ([Environment]::UserInteractive -and $Host.UI.RawUI) { $isInteractive = $true }
    } catch { $isInteractive = $false }

    if ($isInteractive) {
        Write-Host ""
        Write-Host "CloudFront cache invalidation"
        Write-Host "  Paths: $INVALIDATION_PATHS"
        $costStr = '$' + $INVALIDATION_COST
        Write-Host "  Cost: $costStr (1 path)"
        $resp = Read-Host "  Invalidate now? (y/N)"
        if ($resp -match "^[Yy]$") {
            aws cloudfront create-invalidation --distribution-id $CLOUDFRONT_DISTRIBUTION_ID --paths $INVALIDATION_PATHS
            if ($LASTEXITCODE -eq 0) { Write-Host "Invalidation requested." } else { Write-Host "Invalidation failed." -ForegroundColor Red }
        } else {
            Write-Host "Skipped invalidation (saved $costStr)."
        }
    } else {
        Write-Host "Skipping invalidation (non-interactive mode). Set INVALIDATE_CLOUDFRONT=true to force."
    }

    if ($env:INVALIDATE_CLOUDFRONT -eq "true") {
        aws cloudfront create-invalidation --distribution-id $CLOUDFRONT_DISTRIBUTION_ID --paths $INVALIDATION_PATHS
        if ($LASTEXITCODE -eq 0) { Write-Host "Invalidation requested (forced)." } else { Write-Host "Invalidation failed (forced)." -ForegroundColor Red }
    }
} else {
    Write-Host "CloudFront invalidation skipped (no distribution ID set)."
}

Write-Host ""
Write-Host "Deployment finished. Site: https://$S3_BUCKET/"
