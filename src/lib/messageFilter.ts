/**
 * Filters sensitive information from messages to protect business interests
 * Removes phone numbers, URLs, websites, and email addresses
 */
export function filterSensitiveContent(message: string): string {
  let filteredMessage = message;

  // Remove phone numbers (various formats)
  const phonePatterns = [
    /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, // 123-456-7890, 123.456.7890, 1234567890
    /\(\d{3}\)\s?\d{3}[-.]?\d{4}/g,   // (123) 456-7890, (123)456-7890
    /\+\d{1,3}[-.\s]?\d{3,4}[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g, // International formats
    /\b\d{10,15}\b/g, // General long number sequences
  ];
  
  phonePatterns.forEach(pattern => {
    filteredMessage = filteredMessage.replace(pattern, '[PHONE REMOVED]');
  });

  // Remove URLs and websites
  const urlPatterns = [
    /https?:\/\/[^\s]+/gi, // http:// and https:// URLs
    /www\.[^\s]+/gi,       // www. URLs
    /[a-zA-Z0-9-]+\.(com|net|org|edu|gov|co|io|me|ly|tv|app|dev|tech|ai|xyz|info|biz)\b[^\s]*/gi, // Common domains
  ];
  
  urlPatterns.forEach(pattern => {
    filteredMessage = filteredMessage.replace(pattern, '[LINK REMOVED]');
  });

  // Remove email addresses
  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  filteredMessage = filteredMessage.replace(emailPattern, '[EMAIL REMOVED]');

  // Remove social media handles
  const socialPattern = /@[a-zA-Z0-9_]+/g;
  filteredMessage = filteredMessage.replace(socialPattern, '[SOCIAL HANDLE REMOVED]');

  return filteredMessage.trim();
}