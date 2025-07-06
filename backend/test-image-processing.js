const axios = require('axios');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function testImageProcessing() {
  console.log('🔍 Testing image processing pipeline...\n');

  try {
    // Test 1: Download and analyze picsum image
    console.log('Step 1: Downloading picsum image...');
    const picsumUrl = 'https://picsum.photos/1024/1024?random=100';
    const response = await axios({
      method: 'GET',
      url: picsumUrl,
      responseType: 'arraybuffer',
      timeout: 30000
    });

    const originalBuffer = Buffer.from(response.data);
    console.log(`✅ Downloaded ${originalBuffer.length} bytes`);

    // Analyze original image
    const originalMetadata = await sharp(originalBuffer).metadata();
    console.log('Original image metadata:', {
      format: originalMetadata.format,
      width: originalMetadata.width,
      height: originalMetadata.height,
      channels: originalMetadata.channels,
      space: originalMetadata.space,
      hasProfile: !!originalMetadata.icc,
      density: originalMetadata.density
    });

    // Test 2: Process image like in production
    console.log('\nStep 2: Processing image (production pipeline)...');
    const tempDir = './temp';
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const processedPath = path.join(tempDir, 'processed_test.jpg');
    
    const processedImage = await sharp(originalBuffer)
      .resize({
        width: 4000,
        height: 4000,
        fit: 'inside',
        withoutEnlargement: false
      })
      .jpeg({
        quality: 72,
        progressive: false,
        mozjpeg: true
      })
      .withMetadata()
      .toColorspace('srgb')
      .toFile(processedPath);

    console.log('Processed image info:', processedImage);

    // Analyze processed image
    const processedMetadata = await sharp(processedPath).metadata();
    console.log('Processed image metadata:', {
      format: processedMetadata.format,
      width: processedMetadata.width,
      height: processedMetadata.height,
      channels: processedMetadata.channels,
      space: processedMetadata.space,
      hasProfile: !!processedMetadata.icc,
      density: processedMetadata.density
    });

    // Test 3: Create a better processed version
    console.log('\nStep 3: Creating improved version...');
    const improvedPath = path.join(tempDir, 'improved_test.jpg');
    
    await sharp(originalBuffer)
      .resize(4000, 4000, {
        fit: 'cover', // Use cover instead of inside
        position: 'center'
      })
      .jpeg({
        quality: 85, // Higher quality
        progressive: false,
        mozjpeg: true,
        chromaSubsampling: '4:4:4' // Better color sampling
      })
      .withMetadata({
        density: 300 // Set DPI
      })
      .toColorspace('srgb')
      .toFile(improvedPath);

    const improvedMetadata = await sharp(improvedPath).metadata();
    console.log('Improved image metadata:', {
      format: improvedMetadata.format,
      width: improvedMetadata.width,
      height: improvedMetadata.height,
      channels: improvedMetadata.channels,
      space: improvedMetadata.space,
      hasProfile: !!improvedMetadata.icc,
      density: improvedMetadata.density
    });

    // Test 4: File sizes
    const originalStats = { size: originalBuffer.length };
    const processedStats = fs.statSync(processedPath);
    const improvedStats = fs.statSync(improvedPath);

    console.log('\nFile sizes:');
    console.log(`Original: ${(originalStats.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Processed: ${(processedStats.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Improved: ${(improvedStats.size / 1024 / 1024).toFixed(2)} MB`);

    console.log('\n✅ Image processing test completed!');
    console.log('\nRecommendations:');
    console.log('1. Check if picsum.photos images have proper color profiles');
    console.log('2. Consider using higher quality settings for 123RF');
    console.log('3. Ensure proper DPI/density settings');
    console.log('4. Test with different fit modes (cover vs inside)');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testImageProcessing();
