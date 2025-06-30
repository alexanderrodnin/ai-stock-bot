require('dotenv').config();
const ftp = require('basic-ftp');
const FtpService = require('./services/ftpService');

// Get FTP credentials from environment variables
const ftpConfig = {
  host: process.env.FTP_HOST,
  user: process.env.FTP_USER,
  password: process.env.FTP_PASSWORD,
  remoteDir: process.env.FTP_REMOTE_DIR || '/ai_image'
};

// Validate required FTP credentials
if (!ftpConfig.host || !ftpConfig.user || !ftpConfig.password) {
  console.error('Error: FTP credentials are missing in .env file.');
  console.error('Please configure your .env file with the following variables:');
  console.error('  FTP_HOST=ftp.123rf.com');
  console.error('  FTP_USER=your_username');
  console.error('  FTP_PASSWORD=your_password');
  console.error('  FTP_REMOTE_DIR=/ai_image  (optional)');
  process.exit(1);
}

// Function to format file size
function formatFileSize(size) {
  let unit = 'B';
  if (size > 1024) {
    size = (size / 1024).toFixed(2);
    unit = 'KB';
  }
  if (size > 1024) {
    size = (size / 1024).toFixed(2);
    unit = 'MB';
  }
  return `${size} ${unit}`;
}

// Function to list directory contents
async function listDirectory(client, directory) {
  try {
    // Save current directory
    const currentDir = await client.pwd();
    
    // Change to the specified directory
    await client.cd(directory);
    console.log(`\n[DIRECTORY] Contents of ${directory}:`);
    
    // List files
    const list = await client.list();
    
    // Group items by type
    const directories = list.filter(item => item.isDirectory);
    const files = list.filter(item => !item.isDirectory);
    
    if (list.length === 0) {
      console.log('  (Empty directory)');
    } else {
      // Display directories
      if (directories.length > 0) {
        console.log('\n  Directories:');
        directories.forEach(dir => {
          console.log(`    [DIR] ${dir.name}`);
        });
      }
      
      // Display files
      if (files.length > 0) {
        console.log('\n  Files:');
        files.forEach(file => {
          console.log(`    [FILE] ${file.name} (${formatFileSize(file.size)})`);
        });
      }
      
      console.log(`\n  Total: ${directories.length} directories, ${files.length} files`);
    }
    
    // Return to the original directory
    await client.cd(currentDir);
  } catch (err) {
    console.error(`\n[ERROR] Error listing directory ${directory}: ${err.message}`);
  }
}

// Test the connection
async function testFtpConnection() {
  const client = new ftp.Client();
  client.ftp.verbose = false; // Disable verbose logging for cleaner output
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                123RF FTP CONNECTION TEST                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\nTesting FTP connection with the following settings:');
  console.log(`Host: ${ftpConfig.host}`);
  console.log(`User: ${ftpConfig.user}`);
  console.log(`Password: ${'*'.repeat(ftpConfig.password.length)}`);
  console.log(`Remote Directory: ${ftpConfig.remoteDir}`);
  console.log('\nAttempting to connect...');
  
  try {
    // Connect to FTP server
    await client.access({
      host: ftpConfig.host,
      user: ftpConfig.user,
      password: ftpConfig.password,
      secure: false // Set to true if the server requires secure connection
    });
    
    console.log('\n[SUCCESS] Connection successful!');
    
    // For 123RF, we need to manually capture welcome message from the verbose log
    // Enable verbose temporarily to capture the welcome message
    client.ftp.verbose = true;
    try {
      // Execute a simple command to see the server response
      await client.pwd();
    } catch (err) {
      // Ignore errors
    }
    client.ftp.verbose = false;
    
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                   SERVER INFORMATION                       ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`Current Directory: ${await client.pwd()}`);
    
    // Try to get system info
    try {
      const systemInfo = await client.send("SYST");
      if (typeof systemInfo === 'object') {
        console.log(`Server System: Pure-FTPd`);
      } else {
        console.log(`Server System: ${systemInfo || 'Unknown'}`);
      }
    } catch (err) {
      console.log(`Server System: Unknown`);
    }
    
    // Try to get quota information
    try {
      const quotaInfo = await client.send("SITE QUOTA");
      if (quotaInfo) {
        console.log('\nQuota Information:');
        console.log(`  ${quotaInfo}`);
      }
    } catch (err) {
      // Ignore errors for unsupported commands
    }
    
    // List files in the root directory
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                 ROOT DIRECTORY CONTENTS                    ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    
    await listDirectory(client, '/');
    
    // Check for available upload directories
    const rootList = await client.list('/');
    const directories = rootList.filter(item => item.isDirectory);
    
    if (directories.length > 0) {
      console.log('\n╔════════════════════════════════════════════════════════════╗');
      console.log('║               AVAILABLE UPLOAD DIRECTORIES                 ║');
      console.log('╚════════════════════════════════════════════════════════════╝');
      
      const directoryDescriptions = {
        'ai_image': 'For AI-generated images',
        'editorial': 'For editorial content',
        'free': 'For free content',
        'pluspremium': 'For premium content',
        'releases': 'For model releases',
        'vector': 'For vector graphics'
      };
      
      let foundUploadDirs = false;
      
      directories.forEach(dir => {
        if (directoryDescriptions[dir.name]) {
          console.log(`  [✓] ${dir.name} - ${directoryDescriptions[dir.name]}`);
          foundUploadDirs = true;
        }
      });
      
      if (!foundUploadDirs) {
        console.log('  No standard upload directories found.');
      }
    }
    
    // List contents of the ai_image directory
    await listDirectory(client, '/ai_image');
    
    console.log('\n[SUCCESS] FTP connection test successful!');
    console.log('You can now use the "Place this image on 123RF" button in the Telegram bot.');
  } catch (err) {
    console.error(`\n[ERROR] Connection failed: ${err.message}`);
    console.error('Please check your FTP credentials and try again.');
    process.exit(1);
  } finally {
    client.close();
    console.log('\nFTP connection closed');
  }
}

// Run the test
testFtpConnection().catch(err => {
  console.error(`Unexpected error: ${err.message}`);
  process.exit(1);
});
