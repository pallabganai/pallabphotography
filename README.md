# Pallab's Photography Website

[![CI](https://github.com/pallabganai/pallabphotography/actions/workflows/ci.yml/badge.svg)](https://github.com/pallabganai/pallabphotography/actions/workflows/ci.yml)
[![CodeQL](https://github.com/pallabganai/pallabphotography/actions/workflows/codeql.yml/badge.svg)](https://github.com/pallabganai/pallabphotography/actions/workflows/codeql.yml)

A beautiful, cost-efficient photography portfolio website built with Angular and hosted on AWS. Features a responsive gallery with masonry layout, lightbox viewer, tag filtering, and lazy loading.

## 🌟 Features

### Gallery
- **Masonry Grid Layout** - Beautiful Pinterest-style photo grid
- **Lightbox Viewer** - Full-screen photo viewing with navigation
- **Tag Filtering** - Filter photos by categories/tags
- **Lazy Loading** - Optimized performance with lazy image loading
- **Responsive Design** - Works perfectly on all devices
- **Three Image Sizes** - Automatic thumbnail, medium, and full-size images

### SEO Optimized
- Meta tags and Open Graph support
- XML sitemap
- Robots.txt
- Structured data (JSON-LD)
- Canonical URLs
- Pre-rendered static HTML

### Cost-Efficient Hosting
- Static site hosted on AWS S3
- CloudFront CDN for fast global delivery
- Route 53 for DNS management
- **Estimated cost: $0.56-0.80/month** for low traffic

### Easy Photo Management
- Upload photos via AWS Console or CLI
- Automated thumbnail generation
- **Automatic photos.json generation** - Run `npm run generate` to dynamically create/update photos.json
- No code changes needed for new photos
- **photos.json is auto-generated** - Do not edit manually, it will be overwritten

## 📋 Prerequisites

- Node.js 18+ and npm
- AWS Account
- AWS CLI installed and configured
- Domain name (optional, but recommended)

## ⚙️ First Time Setup

**Before you can deploy, you must configure the following:**

1. **AWS Credentials** (Required):
   ```bash
   aws configure
   # Enter your AWS Access Key ID, Secret Access Key, Default Region, and Output Format
   # Credentials are saved to ~/.aws/credentials (not in the repo)
   ```

2. **Deployment Configuration** (Required):
   - **Option A (Recommended)**: Set environment variables before running deploy scripts:
     ```bash
     # Windows PowerShell
     $env:S3_BUCKET="your-bucket-name"
     $env:CLOUDFRONT_DISTRIBUTION_ID="E1234567890ABC"  # CloudFront Distribution ID (starts with "E"), optional if not using CloudFront
     $env:AWS_REGION="us-west-2"
     
     # Linux/Mac Bash
     export S3_BUCKET="your-bucket-name"
     export CLOUDFRONT_DISTRIBUTION_ID="E1234567890ABC"  # CloudFront Distribution ID (starts with "E"), optional if not using CloudFront
     export AWS_REGION="us-west-2"
     ```
   - **Option B**: Edit `deploy.sh` (Linux/Mac) or `deploy.ps1` (Windows) and update the default values
   
   **Note**: `CLOUDFRONT_DISTRIBUTION_ID` is the CloudFront Distribution ID (found in AWS Console, starts with "E"), NOT your domain name. If you're not using CloudFront, leave it empty.

3. **Domain URLs** (Required if using custom domain):
   - Update `src/index.html`: Change `PHOTO_GALLERY_CDN_URL` and meta tags to your domain
   - Update `src/app/services/seo.service.ts`: Change `baseUrl` to your domain
   - Update page components: Change SEO URLs in `gallery.component.ts`, `about.component.ts`, `contact.component.ts`

4. **Script Configuration** (Optional but recommended):
   ```bash
   cd scripts
   cp env.example .env
   # Edit .env with your S3_BUCKET_NAME, AWS_REGION, and CLOUDFRONT_URL
   ```

**Note**: The repository does not contain any hardcoded AWS credentials or sensitive information. All configuration must be done via environment variables or by editing the script files.

## 🚀 Quick Start

### 1. Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd pallabsphotography

# Install dependencies
npm install

# Install script dependencies
cd scripts
npm install
cd ..
```

### 2. Local Development

```bash
# Start development server
npm start

# Open browser to http://localhost:4200
```

### 3. Build for Production

```bash
# Build the application
npm run build

# Output will be in dist/pallabsphotography/
```

## 🖼️ Managing Photos

### Option A: Upload via Script (Recommended)

```bash
# 1. Configure AWS credentials (one-time setup)
aws configure
# Enter your AWS Access Key ID, Secret Access Key, and Region
# Credentials are saved to ~/.aws/credentials (not in the repo)

# 2. Optional: Configure script settings
cd scripts
cp env.example .env
# Edit .env with S3_BUCKET_NAME, AWS_REGION, CLOUDFRONT_URL (no credentials needed)

# 3. Upload photos from local directory
#    (replace /path/to/photos with your actual local folder, e.g.
#     /Users/you/Pictures/portfolio or "C:\Photos\Portfolio")
node upload-photos.js /path/to/photos

# 4. Generate thumbnails and photos.json (dynamically creates photos.json)
npm run generate
# This script:
# - Scans S3 bucket for photos
# - Generates thumbnails, medium, and full sizes
# - Automatically creates/updates photos.json
# - Uploads photos.json to S3
```

### Option B: Upload via AWS Console

```bash
# 1. Upload photos to S3 bucket
#    - Go to S3 Console
#    - Navigate to your bucket
#    - Upload to photos/originals/ folder

# 2. Configure AWS credentials (if not already done)
aws configure

# 3. Generate thumbnails and photos.json
cd scripts
npm run generate
```

### Recommended Photo Sizes

- Upload originals at least **2000px on the long edge** (JPEG preferred).
- The pipeline generates three sizes automatically:
  - **Thumbnail:** 400px width
  - **Medium:** 1200px width
  - **Full:** 2000px width
- Larger originals (e.g., 3000–4000px long edge) are fine; they’ll be downscaled.
- Keep file sizes reasonable (<10MB per original) for faster uploads and processing.

### Photo Naming Convention

Name your photos with tags for automatic categorization:

```
photo-landscape-sunset-beach.jpg
photo-portrait-studio-model.jpg
photo-architecture-modern-building.jpg
```

Tags will be automatically extracted from the filename.

**Ordering photos:** Prefix filenames with numbers to control display order, e.g.:
```
01-beach-sunset.jpg
02-mountain-trail.jpg
03-city-night.jpg
```
The numbers are used only for sorting and are not shown as tags.

## 🌐 AWS Deployment

### Initial Setup & Configuration

**Before deploying, you need to configure the following:**

1. **Set AWS Credentials** (Required - one-time setup):
   ```bash
   aws configure
   # Enter your AWS Access Key ID, Secret Access Key, Default Region, and Output Format
   # Credentials are saved to ~/.aws/credentials (not in the repo)
   ```

2. **Configure Deployment Scripts** (Required):
   
   **Option A: Use Environment Variables (Recommended)**
   ```bash
   # Windows PowerShell
   $env:S3_BUCKET="your-bucket-name"
   $env:CLOUDFRONT_DISTRIBUTION_ID="E1234567890ABC"  # CloudFront Distribution ID (starts with "E"), optional if not using CloudFront
   $env:AWS_REGION="us-west-2"
   
   # Linux/Mac Bash
   export S3_BUCKET="your-bucket-name"
   export CLOUDFRONT_DISTRIBUTION_ID="E1234567890ABC"  # CloudFront Distribution ID (starts with "E"), optional if not using CloudFront
   export AWS_REGION="us-west-2"
   ```
   
   **Important**: 
   - `CLOUDFRONT_DISTRIBUTION_ID` is the **CloudFront Distribution ID** (found in AWS CloudFront Console, starts with "E" like `E2AXKFXUTE7ZNY`)
   - This is **NOT** your domain name (e.g., `pallabsphotography.com`)
   - If you're not using CloudFront, leave this empty or omit it
   
   **Option B: Edit Script Files**
   - Edit `deploy.sh` (Linux/Mac) or `deploy.ps1` (Windows)
   - Update the default values:
     - `S3_BUCKET` - Your S3 bucket name
     - `CLOUDFRONT_DISTRIBUTION_ID` - Your CloudFront Distribution ID (starts with "E", e.g., `E2AXKFXUTE7ZNY`). Find it in AWS CloudFront Console. Optional - leave empty if not using CloudFront.
     - `AWS_REGION` - Your AWS region (e.g., "us-west-2", "us-east-1")

3. **Configure Photo Upload Scripts** (Optional but recommended):
   ```bash
   cd scripts
   cp env.example .env
   # Edit .env and set:
   #   S3_BUCKET_NAME=your-bucket-name
   #   AWS_REGION=us-west-2
   #   CLOUDFRONT_URL=https://your-domain.com
   ```

4. **Update Domain URLs in Code** (Required if using custom domain):
   - Edit `src/index.html`: Update `PHOTO_GALLERY_CDN_URL` and meta tags with your domain
   - Edit `src/app/services/seo.service.ts`: Update base URL
   - Edit `src/app/pages/*/**.component.ts`: Update SEO URLs for each page

### Quick Deployment

**Deploy code first, then upload photos:**

**Windows (PowerShell):**
```powershell
# 1. Set environment variables (or edit deploy.ps1)
$env:S3_BUCKET="your-bucket-name"
$env:CLOUDFRONT_DISTRIBUTION_ID="E1234567890ABC"  # CloudFront Distribution ID (starts with "E"), optional if not using CloudFront
$env:AWS_REGION="us-west-2"

# 2. Deploy code (replaces existing S3 content)
.\deploy.ps1

# 3. Upload photos (after code deployment)
cd scripts
node upload-photos.js "C:\path\to\your\photos"
npm run generate
```

**Linux/Mac (Bash):**
```bash
# 1. Set environment variables (or edit deploy.sh)
export S3_BUCKET="your-bucket-name"
export CLOUDFRONT_DISTRIBUTION_ID="E1234567890ABC"  # CloudFront Distribution ID (starts with "E"), optional if not using CloudFront
export AWS_REGION="us-west-2"

# 2. Deploy code (replaces existing S3 content)
./deploy.sh

# 3. Upload photos (after code deployment)
cd scripts
node upload-photos.js "/path/to/your/photos"
npm run generate
```

**Configuration Summary:**
- ✅ **AWS Credentials**: Configured via `aws configure` (saved to ~/.aws/credentials)
- ✅ **S3 Bucket Name**: Set via environment variable or edit deploy script
- ✅ **CloudFront Distribution ID**: Set via environment variable or edit deploy script. This is the Distribution ID (starts with "E"), NOT your domain name. Optional if not using CloudFront.
- ✅ **AWS Region**: Set via environment variable or edit deploy script
- ✅ **Domain URLs**: Update in `src/index.html` and component files (this is where your domain name goes, e.g., `https://yourdomain.com`)
- ✅ **Script Configuration**: Optional - create `scripts/.env` from `scripts/env.example`

## 📁 Project Structure

```
pallabsphotography/
├── src/
│   ├── app/
│   │   ├── components/           # Shared components
│   │   │   ├── navbar/
│   │   │   └── footer/
│   │   ├── pages/                # Page components
│   │   │   ├── home/
│   │   │   ├── gallery/
│   │   │   ├── about/
│   │   │   └── contact/
│   │   ├── services/             # Services
│   │   │   ├── photo.service.ts
│   │   │   └── seo.service.ts
│   │   ├── models/               # TypeScript interfaces
│   │   └── app.routes.ts         # Routing configuration
│   ├── assets/
│   │   ├── photos.json           # Photo metadata
│   │   └── photos/               # Photo directories
│   │       ├── thumbnails/
│   │       ├── medium/
│   │       └── full/
│   ├── styles.scss               # Global styles
│   └── index.html
├── scripts/
│   ├── generate-photos-json.js   # Generate photos.json
│   ├── upload-photos.js          # Upload photos to S3
│   └── env.example               # Scripts configuration template
├── deploy.sh                     # Deployment script (Linux/Mac)
├── deploy.ps1                    # Deployment script (Windows)
└── README.md                     # This file
```

## 🎨 Customization

### Update Site Content

1. **Home Page**: Edit `src/app/pages/home/home.component.html`
2. **About Page**: Edit `src/app/pages/about/about.component.html`
3. **Contact Info**: Edit `src/app/pages/contact/contact.component.html`
4. **Site Name**: Search and replace "Pallab's Photography" in:
   - `src/index.html`
   - Component files
   - SEO service

### Update Styling

- **Global styles**: `src/styles.scss`
- **Colors**: Update CSS variables in `styles.scss`
- **Fonts**: Change Google Fonts in `src/index.html`
- **Component styles**: Each component has its own `.scss` file

### Add Social Media Links

Edit `src/app/components/footer/footer.component.html` and `src/app/pages/contact/contact.component.html` to add your social media links.

## 🔧 Configuration

### Quick Reference: CloudFront Distribution ID vs Domain Name

**CloudFront Distribution ID** (for `CLOUDFRONT_DISTRIBUTION_ID`):
- Format: Starts with "E" followed by alphanumeric characters (e.g., `E2AXKFXUTE7ZNY`)
- Where to find: AWS Console → CloudFront → Your Distribution → General tab → Distribution ID
- Used in: `deploy.sh`, `deploy.ps1` (for cache invalidation)
- Optional: Only needed if you're using CloudFront

**Domain Name** (for code files):
- Format: Your website URL (e.g., `https://pallabsphotography.com`)
- Where to use: `src/index.html`, `src/app/services/seo.service.ts`, component files
- Used for: SEO meta tags, CDN URLs, Open Graph tags
- Required: Yes, if using a custom domain

### Required Configuration Steps

**1. AWS Credentials** (Required):
```bash
aws configure
# This saves credentials to ~/.aws/credentials (not in the repo)
```

**2. Deployment Configuration** (Required):
- Set environment variables `S3_BUCKET`, `CLOUDFRONT_DISTRIBUTION_ID` (optional), and `AWS_REGION`
- OR edit `deploy.sh` (Linux/Mac) or `deploy.ps1` (Windows) with your values

**3. Domain URLs** (Required if using custom domain):
- `src/index.html`: Update `PHOTO_GALLERY_CDN_URL` and Open Graph meta tags
- `src/app/services/seo.service.ts`: Update `baseUrl`
- `src/app/pages/gallery/gallery.component.ts`: Update SEO URL
- `src/app/pages/about/about.component.ts`: Update SEO URL
- `src/app/pages/contact/contact.component.ts`: Update SEO URL

**4. Script Configuration** (Optional but recommended):
- Copy `scripts/env.example` to `scripts/.env`
- Update `S3_BUCKET_NAME`, `AWS_REGION`, and `CLOUDFRONT_URL`

### Environment-Specific Settings

Files that may need updates for your environment:

1. **deploy.sh / deploy.ps1** - S3 bucket name, CloudFront distribution ID, AWS region
2. **scripts/.env** - S3 bucket name, region, CloudFront URL (no credentials)
3. **src/index.html** - Site title, meta tags, CDN URL
4. **src/app/services/seo.service.ts** - Base URL, default SEO values
5. **src/app/pages/*/**.component.ts** - Page-specific SEO URLs

### SEO Configuration

Update SEO settings in `src/app/services/seo.service.ts`:
- Default title
- Default description
- Default image
- Base URL (important: update this with your domain)

## 📊 Monitoring

### View Site Statistics

- **CloudFront**: AWS Console → CloudFront → Your distribution → Monitoring
- **S3**: AWS Console → S3 → Your bucket → Metrics
- **Costs**: AWS Console → Billing → Cost Explorer

### Set Up Alerts (Optional)

Create CloudWatch alarms for:
- High error rates
- Unusual traffic patterns
- Cost thresholds

## 🐛 Troubleshooting

### Local Development Issues

**Port already in use:**
```bash
# Use a different port
ng serve --port 4201
```

**Module not found:**
```bash
# Reinstall dependencies
rm -rf node_modules
npm install
```

### Deployment Issues

**403 Forbidden:**
- Check S3 bucket policy
- Verify CloudFront error page configuration

**Images not loading:**
- Verify photos.json URLs
- Check CORS configuration
- Confirm CloudFront origin settings

**Routing not working:**
- Verify CloudFront error pages (403→200, 404→200)
- Check S3 error document setting

### Photo Upload Issues

**AWS credentials error:**
```bash
# Configure AWS credentials (one-time setup)
aws configure
# This saves credentials to ~/.aws/credentials (not in the repo)
# The scripts will automatically use these credentials
```

**Sharp module error:**
```bash
# Rebuild sharp module
cd scripts
npm rebuild sharp
```

## 💰 Cost Optimization

1. **Optimize Images** - Use the provided scripts (automatic optimization)
2. **CloudFront Caching** - Already configured for optimal caching
3. **S3 Lifecycle Rules** - Archive old photo versions (optional)
4. **CloudFront Distribution** - Limit to specific geographic regions if needed

## 🔒 Security

Security is a top priority. The project includes:

- ✅ **HTTPS enforced** via CloudFront
- ✅ **Security headers** configured (X-Frame-Options, CSP, etc.)
- ✅ **IAM least privilege** access
- ✅ **XSS protection** built into Angular
- ✅ **Secure credential management**
- ✅ **Regular security audits** with npm audit

**Security:**
- HTTPS enforced via CloudFront
- Security headers configured
- IAM least privilege access
- Regular security audits with npm audit

## 📚 Technologies Used

- **Frontend**: Angular 17 (Standalone Components)
- **Styling**: SCSS, CSS Variables
- **Image Processing**: Sharp.js
- **AWS Services**: S3, CloudFront, Route 53
- **Build Tool**: Angular CLI
- **Fonts**: Google Fonts (Playfair Display, Poppins)

## 🤝 Contributing

This is a personal project, but feel free to:
- Report bugs
- Suggest features
- Share improvements

## 📄 License

This project is private and for personal use.

## 🆘 Support

For issues or questions, review the troubleshooting section above or check:
- AWS CLI documentation for deployment issues
- Angular documentation for build issues
- Scripts in `scripts/` folder for photo upload issues

## 🎯 Next Steps

After setup:

1. ✅ Complete AWS infrastructure setup
2. ✅ Deploy the website
3. 📸 Upload your photos
5. 🎨 Customize content (About page, social links)
6. 📧 Set up contact form backend (optional)
7. 📊 Add Google Analytics (optional)
8. 🔔 Set up monitoring alerts (recommended)

---

**Built with ❤️ for photography enthusiasts**

