/**
 * Filters sensitive information from messages to protect business interests
 * Removes phone numbers, URLs, websites, and email addresses
 */
export function filterSensitiveContent(message: string): string {
  let filteredMessage = message;
  console.log('Original message:', message);
  
  // Test specific numbers
  console.log('Testing "558":', /\b\d{3,9}\b/g.test("558"));
  console.log('Testing " 558 ":', /\b\d{3,9}\b/g.test(" 558 "));
  console.log('Testing "hi 558":', /\b\d{3,9}\b/g.test("hi 558"));

  // Remove phone numbers (various formats)
  const phonePatterns = [
    /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, // 123-456-7890, 123.456.7890, 1234567890
    /\(\d{3}\)\s?\d{3}[-.]?\d{4}/g,   // (123) 456-7890, (123)456-7890
    /\+\d{1,3}[-.\s]?\d{3,4}[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g, // International formats
    /\b\d{10,15}\b/g, // General long number sequences
    /\b\d{3,9}\b/g, // Number sequences that could be phone numbers (3-9 digits)
    /\b\d{4}[-.\s]\d{3,4}\b/g, // 4-3 or 4-4 digit patterns
    /\b\d{3}[-.\s]\d{3,4}[-.\s]\d{2,4}\b/g, // 3-3-2, 3-3-3, 3-4-3 patterns
  ];
  
  phonePatterns.forEach(pattern => {
    const matches = filteredMessage.match(pattern);
    if (matches) {
      console.log('Phone pattern matched:', matches);
    }
    filteredMessage = filteredMessage.replace(pattern, '[PHONE REMOVED]');
  });

  // Remove URLs and websites - Enhanced patterns
  const urlPatterns = [
    /https?:\/\/[^\s]+/gi, // http:// and https:// URLs
    /www\.[^\s]+/gi,       // www. URLs
    /[a-zA-Z0-9-]+\.(com|net|org|edu|gov|co|io|me|ly|tv|app|dev|tech|ai|xyz|info|biz|ca|us|uk|de|fr|it|es|jp|kr|au|nl|se|no|dk|fi|pl|ru|br|mx|ar|cl|pe|ve|co|ec|py|uy|bo|gq|sr|gy|fk)\b[^\s]*/gi, // Extended domains
    /\b[a-zA-Z0-9-]+\.[a-zA-Z]{2,}\/[^\s]*/gi, // Any domain with path
    /\b[a-zA-Z0-9-]+\.[a-zA-Z]{2,}\b/gi, // Simple domains
  ];
  
  urlPatterns.forEach(pattern => {
    const matches = filteredMessage.match(pattern);
    if (matches) {
      console.log('URL pattern matched:', matches);
    }
    filteredMessage = filteredMessage.replace(pattern, '[LINK REMOVED]');
  });

  // Remove email addresses
  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const emailMatches = filteredMessage.match(emailPattern);
  if (emailMatches) {
    console.log('Email pattern matched:', emailMatches);
  }
  filteredMessage = filteredMessage.replace(emailPattern, '[EMAIL REMOVED]');

  // Remove social media handles
  const socialPattern = /@[a-zA-Z0-9_]+/g;
  const socialMatches = filteredMessage.match(socialPattern);
  if (socialMatches) {
    console.log('Social handle pattern matched:', socialMatches);
  }
  filteredMessage = filteredMessage.replace(socialPattern, '[SOCIAL HANDLE REMOVED]');

  console.log('Filtered message:', filteredMessage);
  return filteredMessage.trim();
}