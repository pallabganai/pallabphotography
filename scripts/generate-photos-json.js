/**
 * Script to scan S3 bucket, generate thumbnails, and create photos.json
 * 
 * Usage:
 * 1. Install dependencies: npm install
 * 2. Configure AWS credentials (via AWS CLI: aws configure)
 *    OR set environment variables: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
 * 3. Optionally create .env file with S3_BUCKET_NAME, AWS_REGION, CLOUDFRONT_URL
 * 4. Run: npm run generate
 * 
 * AWS credentials are read from:
 * - ~/.aws/credentials (recommended, set via 'aws configure')
 * - Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
 * - IAM roles (if running on EC2/ECS/Lambda)
 */

const { S3Client, ListObjectsV2Command, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Load optional .env file for configuration (not credentials)
try {
  require('dotenv').config();
} catch (e) {
  // dotenv is optional - credentials come from AWS CLI config
}

// Configuration
// Note: AWS credentials are NOT read from .env - they come from ~/.aws/credentials
const CONFIG = {
  bucketName: process.env.S3_BUCKET_NAME || 'pallabphotography',
  region: process.env.AWS_REGION || 'us-west-2',
  photosFolder: 'photos/originals/', // Folder in S3 where original photos are uploaded
  thumbnailsFolder: 'photos/thumbnails/',
  mediumFolder: 'photos/medium/',
  fullFolder: 'photos/full/',
  cloudFrontUrl: process.env.CLOUDFRONT_URL || 'https://pallabsphotography.com',
  
  // Image sizes
  thumbnailWidth: 400,
  mediumWidth: 1200,
  fullWidth: 2000,
  quality: 85
};

// Initialize S3 Client
// AWS SDK automatically uses default credential provider chain:
// 1. Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
// 2. Shared credentials file (~/.aws/credentials) - RECOMMENDED
// 3. IAM roles (if running on EC2/ECS/Lambda)
const s3Client = new S3Client({
  region: CONFIG.region
  // No explicit credentials - uses default provider chain
});

/**
 * List all photos in the originals folder
 */
async function listPhotos() {
  try {
    const command = new ListObjectsV2Command({
      Bucket: CONFIG.bucketName,
      Prefix: CONFIG.photosFolder
    });

    const response = await s3Client.send(command);
    
    if (!response.Contents) {
      console.log('No photos found in S3 bucket');
      return [];
    }

    // Filter only image files
    const photos = response.Contents.filter(item => {
      const ext = path.extname(item.Key).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
    });

    console.log(`Found ${photos.length} photos in S3`);
    return photos;
  } catch (error) {
    console.error('Error listing photos:', error);
    throw error;
  }
}

/**
 * Download image from S3
 */
async function downloadImage(key) {
  try {
    const command = new GetObjectCommand({
      Bucket: CONFIG.bucketName,
      Key: key
    });

    const response = await s3Client.send(command);
    const chunks = [];
    
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }
    
    return Buffer.concat(chunks);
  } catch (error) {
    console.error(`Error downloading ${key}:`, error);
    throw error;
  }
}

/**
 * Generate and upload resized versions of an image
 */
async function generateResizedVersions(originalKey, imageBuffer) {
  const fileName = path.basename(originalKey);
  const fileNameWithoutExt = path.parse(fileName).name;
  
  try {
    // Get image metadata
    const metadata = await sharp(imageBuffer).metadata();
    
    // Generate thumbnail
    const thumbnail = await sharp(imageBuffer)
      .resize(CONFIG.thumbnailWidth, null, { withoutEnlargement: true })
      .jpeg({ quality: CONFIG.quality })
      .toBuffer();
    
    // Generate medium
    const medium = await sharp(imageBuffer)
      .resize(CONFIG.mediumWidth, null, { withoutEnlargement: true })
      .jpeg({ quality: CONFIG.quality })
      .toBuffer();
    
    // Generate full (optimized)
    const full = await sharp(imageBuffer)
      .resize(CONFIG.fullWidth, null, { withoutEnlargement: true })
      .jpeg({ quality: CONFIG.quality })
      .toBuffer();
    
    // Upload all versions to S3
    await Promise.all([
      uploadToS3(`${CONFIG.thumbnailsFolder}${fileNameWithoutExt}.jpg`, thumbnail, 'image/jpeg'),
      uploadToS3(`${CONFIG.mediumFolder}${fileNameWithoutExt}.jpg`, medium, 'image/jpeg'),
      uploadToS3(`${CONFIG.fullFolder}${fileNameWithoutExt}.jpg`, full, 'image/jpeg')
    ]);
    
    console.log(`✓ Generated resized versions for ${fileName}`);
    
    return {
      width: metadata.width,
      height: metadata.height
    };
  } catch (error) {
    console.error(`Error generating resized versions for ${originalKey}:`, error);
    throw error;
  }
}

/**
 * Upload buffer to S3
 */
async function uploadToS3(key, buffer, contentType) {
  try {
    const command = new PutObjectCommand({
      Bucket: CONFIG.bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: 'max-age=31536000' // 1 year cache
    });
    
    await s3Client.send(command);
  } catch (error) {
    console.error(`Error uploading ${key}:`, error);
    throw error;
  }
}

/**
 * Extract tags from filename or metadata
 */
function extractTags(fileName) {
  // You can customize this logic
  // Example: photo-landscape-sunset-beach.jpg -> ['landscape', 'sunset', 'beach']
  const nameWithoutExt = path.parse(fileName).name;
  const parts = nameWithoutExt.split('-').slice(1); // Skip first part (usually an ID or date)
  return parts.filter(tag => tag.length > 2);
}

/**
 * Generate photos.json file
 */
async function generatePhotosJson() {
  console.log('Starting photo processing...\n');
  
  // List all photos
  const photos = await listPhotos();
  
  if (photos.length === 0) {
    console.log('No photos to process');
    return;
  }
  
  const photoData = [];
  
  // Process each photo
  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i];
    const fileName = path.basename(photo.Key);
    const fileNameWithoutExt = path.parse(fileName).name;
    
    console.log(`\n[${i + 1}/${photos.length}] Processing: ${fileName}`);
    
    try {
      // Download original
      const imageBuffer = await downloadImage(photo.Key);
      
      // Generate resized versions
      const { width, height } = await generateResizedVersions(photo.Key, imageBuffer);
      
      // Extract tags
      const tags = extractTags(fileName);
      
      // Create photo entry
      const photoEntry = {
        id: fileNameWithoutExt,
        title: fileNameWithoutExt.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        description: '',
        tags: tags,
        sizes: {
          thumbnail: `${CONFIG.cloudFrontUrl}/${CONFIG.thumbnailsFolder}${fileNameWithoutExt}.jpg`,
          medium: `${CONFIG.cloudFrontUrl}/${CONFIG.mediumFolder}${fileNameWithoutExt}.jpg`,
          full: `${CONFIG.cloudFrontUrl}/${CONFIG.fullFolder}${fileNameWithoutExt}.jpg`
        },
        uploadDate: photo.LastModified.toISOString(),
        width: width,
        height: height,
        alt: fileNameWithoutExt.replace(/-/g, ' ')
      };
      
      photoData.push(photoEntry);
      
    } catch (error) {
      console.error(`✗ Failed to process ${fileName}`);
      // Continue with next photo
    }
  }
  
  // Sort by upload date (newest first)
  photoData.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
  
  // Create photos.json object
  const photosJson = {
    photos: photoData,
    lastUpdated: new Date().toISOString()
  };
  
  // Write to local file
  const outputPath = path.join(__dirname, '../src/assets/photos.json');
  fs.writeFileSync(outputPath, JSON.stringify(photosJson, null, 2));
  console.log(`\n✓ Generated photos.json with ${photoData.length} photos`);
  console.log(`✓ Saved to: ${outputPath}`);
  
  // Upload to S3
  await uploadToS3('assets/photos.json', JSON.stringify(photosJson), 'application/json');
  console.log('✓ Uploaded photos.json to S3');
  
  console.log('\n✓ All done! Your gallery is ready.');
}

// Run the script
if (require.main === module) {
  generatePhotosJson().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { generatePhotosJson };


