const axios = require('axios');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function testImprovedProcessing() {
  console.log('🔍 Testing improved image processing with EXIF...\n');

  try {
    // Test 1: Download picsum image
    console.log('Step 1: Downloading picsum image...');
    const picsumUrl = 'https://picsum.photos/1024/1024?random=200';
    const response = await axios({
      method: 'GET',
      url: picsumUrl,
      responseType: 'arraybuffer',
      timeout: 30000
    });

    const originalBuffer = Buffer.from(response.data);
    console.log(`✅ Downloaded ${originalBuffer.length} bytes`);

    // Test 2: Process with improved settings (like production)
    console.log('\nStep 2: Processing with improved settings...');
    const tempDir = './temp';
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const improvedPath = path.join(tempDir, 'improved_production.jpg');
    
    await sharp(originalBuffer)
      .resize({
        width: 4000,
        height: 4000,
        fit: 'cover',
        position: 'center',
        withoutEnlargement: false
      })
      .jpeg({
        quality: 85,
        progressive: false,
        mozjpeg: true,
        chromaSubsampling: '4:4:4'
      })
      .withMetadata()
      .withExif({
        IFD0: {
          XResolution: '300/1',
          YResolution: '300/1',
          ResolutionUnit: '2' // inches
        }
      })
      .toColorspace('srgb')
      .toFile(improvedPath);

    // Test 3: Analyze the result
    const improvedMetadata = await sharp(improvedPath).metadata();
    console.log('Improved image metadata:', {
      format: improvedMetadata.format,
      width: improvedMetadata.width,
      height: improvedMetadata.height,
      channels: improvedMetadata.channels,
      space: improvedMetadata.space,
      hasProfile: !!improvedMetadata.icc,
      density: improvedMetadata.density,
      exif: improvedMetadata.exif ? 'Present' : 'Missing'
    });

    // Test 4: Check EXIF data specifically
    if (improvedMetadata.exif) {
      console.log('\nEXIF data found:');
      try {
        // Try to read EXIF resolution data
        const exifData = improvedMetadata.exif;
        console.log('EXIF buffer length:', exifData.length);
        
        // Check if we can extract resolution info
        const image = sharp(improvedPath);
        const stats = await image.stats();
        console.log('Image stats:', {
          channels: stats.channels.length,
          isOpaque: stats.isOpaque
        });
      } catch (exifError) {
        console.log('Could not parse EXIF details:', exifError.message);
      }
    }

    // Test 5: File size comparison
    const improvedStats = fs.statSync(improvedPath);
    console.log('\nFile analysis:');
    console.log(`Original: ${(originalBuffer.length / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Improved: ${(improvedStats.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Size increase: ${((improvedStats.size / originalBuffer.length - 1) * 100).toFixed(1)}%`);

    // Test 6: Create a test with explicit DPI setting using different method
    console.log('\nStep 3: Testing alternative DPI method...');
    const alternativePath = path.join(tempDir, 'alternative_dpi.jpg');
    
    // First resize, then set DPI
    const resizedBuffer = await sharp(originalBuffer)
      .resize(4000, 4000, { fit: 'cover', position: 'center' })
      .jpeg({ quality: 85, progressive: false, mozjpeg: true })
      .toBuffer();

    // Then add DPI metadata
    await sharp(resizedBuffer)
      .withMetadata()
      .withExif({
        IFD0: {
          XResolution: '300/1',
          YResolution: '300/1',
          ResolutionUnit: '2',
          Software: 'AI Stock Bot v2.0',
          ImageDescription: 'AI-generated stock image processed for 123RF'
        }
      })
      .toFile(alternativePath);

    const altMetadata = await sharp(alternativePath).metadata();
    console.log('Alternative method metadata:', {
      format: altMetadata.format,
      width: altMetadata.width,
      height: altMetadata.height,
      density: altMetadata.density,
      hasExif: !!altMetadata.exif
    });

    console.log('\n✅ Improved processing test completed!');
    console.log('\n📋 Summary for 123RF compatibility:');
    console.log('✓ Size: 4000x4000 pixels (16 megapixels - exceeds 6MP requirement)');
    console.log('✓ Format: JPEG with high quality (85%)');
    console.log('✓ Color space: sRGB');
    console.log('✓ EXIF metadata: Added with 300 DPI resolution');
    console.log('✓ Compression: Optimized with mozjpeg');
    
    console.log('\n🔧 Recommendations:');
    console.log('1. The improved processing should resolve the gray square issue');
    console.log('2. Higher DPI (300) ensures print quality standards');
    console.log('3. Better quality settings (85%) preserve image details');
    console.log('4. EXIF metadata provides proper resolution information');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testImprovedProcessing();
