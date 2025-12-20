/**
 * Script to upload photos from local directory to S3
 * 
 * Usage:
 * 1. Configure AWS credentials (via AWS CLI: aws configure)
 *    OR set environment variables: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
 * 2. Optionally create .env file with S3_BUCKET_NAME, AWS_REGION
 * 3. Place your photos in a local folder
 * 4. Run: node upload-photos.js /path/to/photos
 * 
 * AWS credentials are read from:
 * - ~/.aws/credentials (recommended, set via 'aws configure')
 * - Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
 * - IAM roles (if running on EC2/ECS/Lambda)
 */

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
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
  photosFolder: 'photos/originals/'
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
 * Upload a file to S3
 */
async function uploadFile(filePath, s3Key) {
  try {
    const fileContent = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    
    let contentType = 'application/octet-stream';
    if (['.jpg', '.jpeg'].includes(ext)) contentType = 'image/jpeg';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.webp') contentType = 'image/webp';
    
    const command = new PutObjectCommand({
      Bucket: CONFIG.bucketName,
      Key: s3Key,
      Body: fileContent,
      ContentType: contentType
    });
    
    await s3Client.send(command);
    console.log(`✓ Uploaded: ${path.basename(filePath)}`);
  } catch (error) {
    console.error(`✗ Error uploading ${filePath}:`, error.message);
    throw error;
  }
}

/**
 * Upload all photos from a directory
 */
async function uploadPhotos(directoryPath) {
  if (!directoryPath) {
    console.error('Please provide a directory path');
    console.log('Usage: node upload-photos.js /path/to/photos');
    process.exit(1);
  }
  
  if (!fs.existsSync(directoryPath)) {
    console.error(`Directory not found: ${directoryPath}`);
    process.exit(1);
  }
  
  console.log(`Uploading photos from: ${directoryPath}\n`);
  
  const files = fs.readdirSync(directoryPath);
  const imageFiles = files.filter(file => {
    const ext = path.extname(file).toLowerCase();
    return ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
  });
  
  if (imageFiles.length === 0) {
    console.log('No image files found in the directory');
    return;
  }
  
  console.log(`Found ${imageFiles.length} images to upload\n`);
  
  for (let i = 0; i < imageFiles.length; i++) {
    const file = imageFiles[i];
    const filePath = path.join(directoryPath, file);
    const s3Key = `${CONFIG.photosFolder}${file}`;
    
    console.log(`[${i + 1}/${imageFiles.length}] Uploading ${file}...`);
    
    try {
      await uploadFile(filePath, s3Key);
    } catch (error) {
      console.error(`Failed to upload ${file}`);
      // Continue with next file
    }
  }
  
  console.log('\n✓ Upload complete!');
  console.log('\nNext step: Run "npm run generate" to create thumbnails and update photos.json');
}

// Run the script
if (require.main === module) {
  const directoryPath = process.argv[2];
  uploadPhotos(directoryPath).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { uploadPhotos };


