import { useState } from 'react';

interface FilterResult {
  isBlocked: boolean;
  reason?: string;
}

export const useChatFilterPro = (isProUser: boolean = false) => {
  const [lastFilterResult, setLastFilterResult] = useState<FilterResult | null>(null);

  const filterMessage = (content: string): FilterResult => {
    // Pro users have no restrictions - they can send anything
    if (isProUser) {
      const result = { isBlocked: false };
      setLastFilterResult(result);
      return result;
    }

    // Apply filtering only for free users
    const lowerContent = content.toLowerCase().trim();
    
    // Enhanced phone number patterns (various formats)
    const phonePatterns = [
      /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/, // 123-456-7890, 123.456.7890, 123 456 7890
      /\b\d{10,}\b/, // 10+ consecutive digits
      /\(\d{3}\)\s?\d{3}[-.\s]?\d{4}/, // (123) 456-7890
      /\+\d{1,3}[-.\s]?\d{3,}/, // +1-234-567-8900, +44 20 1234 5678
      /\b\d{3}[-.\s]?\d{4}\b/, // 123-4567
      /\b\d{7,15}\b/, // Any sequence of 7-15 digits that could be a phone number
      /\b\d{3}\s?\d{3}\s?\d{4}\b/, // 123 456 7890 variants
      /phone\s*:?\s*\d+/i, // "phone: 123456789" or "phone 123456789"
      /number\s*:?\s*\d+/i, // "number: 123456789" or "number 123456789"
      /call\s+me\s+at\s+\d+/i, // "call me at 1234567890"
    ];

    // Website/URL patterns
    const websitePatterns = [
      /https?:\/\/[^\s]+/, // http:// or https:// URLs
      /www\.[^\s]+/, // www. URLs
      /\b[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.com\b/i, // .com domains
      /\b[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.(net|org|edu|gov|co\.uk|io|app|dev)\b/i, // other common domains
    ];

    // Enhanced social media and contact requests
    const contactRequestPatterns = [
      /\b(instagram|insta|ig)\b/i,
      /\b(facebook|fb)\b/i,
      /\b(twitter|x\.com)\b/i,
      /\b(whatsapp|whats app)\b/i,
      /\b(telegram|tg)\b/i,
      /\b(snapchat|snap)\b/i,
      /\b(tiktok|tik tok)\b/i,
      /\b(linkedin|linked in)\b/i,
      /\b(youtube|yt)\b/i,
      /\b(discord)\b/i,
      /give me your (number|phone|contact|instagram|insta|ig|facebook|fb|whatsapp|snap|snapchat)/i,
      /what('s| is) your (number|phone|contact|instagram|insta|ig|facebook|fb|whatsapp|snap|snapchat)/i,
      /can (i|you) (have|get) your (number|phone|contact|instagram|insta|ig|facebook|fb)/i,
      /do you have (instagram|insta|ig|facebook|fb|whatsapp|snap|snapchat)/i,
      /my (instagram|insta|ig|facebook|fb|whatsapp|snap|snapchat) is/i,
      /follow me on/i,
      /add me on/i,
      /dm me/i,
      /message me (on|at)/i,
      /\bwebsite\b/i, // "website" mentions
      /\bname handle\b/i, // "name handle" mentions
      /handle\s*[:@]/i, // "handle: @something" or "handle @something"
      /my\s+handle\s+is/i, // "my handle is"
      /phone\s*number/i, // "phone number" mentions
    ];

    // Email patterns
    const emailPatterns = [
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
      /\b[A-Za-z0-9._%+-]+\s*@\s*[A-Za-z0-9.-]+\s*\.\s*[A-Z|a-z]{2,}\b/, // spaced emails
    ];

    // Check for phone numbers
    for (const pattern of phonePatterns) {
      if (pattern.test(content)) {
        const result = { 
          isBlocked: true, 
          reason: 'Phone numbers are not allowed for Free users. Upgrade to Pro to share contact details.' 
        };
        setLastFilterResult(result);
        return result;
      }
    }

    // Check for websites/URLs
    for (const pattern of websitePatterns) {
      if (pattern.test(content)) {
        const result = { 
          isBlocked: true, 
          reason: 'Website links are not allowed for Free users. Upgrade to Pro to share links.' 
        };
        setLastFilterResult(result);
        return result;
      }
    }

    // Check for social media and contact requests
    for (const pattern of contactRequestPatterns) {
      if (pattern.test(lowerContent)) {
        const result = { 
          isBlocked: true, 
          reason: 'Contact details are not allowed for Free users. Upgrade to Pro for unlimited messaging access.' 
        };
        setLastFilterResult(result);
        return result;
      }
    }

    // Check for email addresses
    for (const pattern of emailPatterns) {
      if (pattern.test(content)) {
        const result = { 
          isBlocked: true, 
          reason: 'Email addresses are not allowed for Free users. Upgrade to Pro to share contact details.' 
        };
        setLastFilterResult(result);
        return result;
      }
    }

    // Additional suspicious patterns
    const suspiciousPatterns = [
      /contact me (outside|off) (the )?(platform|app|site)/i,
      /let('s| us) (talk|chat|meet) (outside|off) (the )?(platform|app|site)/i,
      /reach (out to )?me (at|on)/i,
      /my (website|site|page) is/i,
      /check out my (website|site|page|profile)/i,
      /@[a-zA-Z0-9._]+/, // Social media handles like @username
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(lowerContent)) {
        const result = { 
          isBlocked: true, 
          reason: 'External contact sharing is restricted for Free users. Upgrade to Pro for full messaging access.' 
        };
        setLastFilterResult(result);
        return result;
      }
    }

    const result = { isBlocked: false };
    setLastFilterResult(result);
    return result;
  };

  return { filterMessage, lastFilterResult };
};