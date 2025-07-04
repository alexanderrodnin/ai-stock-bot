/**
 * Test filename sanitization functionality
 */

// Mock the StockUploadService class to test sanitizeFilename method
class TestStockUploadService {
  sanitizeFilename(filename) {
    return filename
      .replace(/\s+/g, '_')           // Replace spaces with underscores
      .replace(/[^\w\-_]/g, '')       // Remove special characters except word chars, hyphens, underscores (removed dots)
      .replace(/_{2,}/g, '_')         // Replace multiple underscores with single underscore
      .replace(/^_+|_+$/g, '')        // Remove leading/trailing underscores
      .toLowerCase()                  // Convert to lowercase
      .substring(0, 50);              // Limit length to 50 characters
  }
}

const service = new TestStockUploadService();

console.log('🧪 Testing filename sanitization...\n');

// Test cases
const testCases = [
  {
    input: 'AI Generated: A man walks down the street. Cyberpunk, anime, hig',
    expected: 'ai_generated_a_man_walks_down_the_street_cyberpunk'
  },
  {
    input: 'Simple test',
    expected: 'simple_test'
  },
  {
    input: 'Test with!@#$%^&*()special chars',
    expected: 'test_withspecial_chars'
  },
  {
    input: '   Leading and trailing spaces   ',
    expected: 'leading_and_trailing_spaces'
  },
  {
    input: 'Multiple    spaces    between    words',
    expected: 'multiple_spaces_between_words'
  }
];

let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
  const result = service.sanitizeFilename(testCase.input);
  const success = result === testCase.expected;
  
  console.log(`Test ${index + 1}: ${success ? '✅' : '❌'}`);
  console.log(`  Input:    "${testCase.input}"`);
  console.log(`  Expected: "${testCase.expected}"`);
  console.log(`  Got:      "${result}"`);
  
  if (success) {
    passed++;
  } else {
    failed++;
  }
  
  console.log('');
});

console.log(`📊 Results: ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log('🎉 All tests passed! Filename sanitization works correctly.');
} else {
  console.log('❌ Some tests failed. Please check the implementation.');
}
