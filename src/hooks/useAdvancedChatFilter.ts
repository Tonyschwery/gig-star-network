import { useState, useEffect } from 'react';
import { Message } from '@/contexts/ChatContext';

interface FilterResult {
  isBlocked: boolean;
  reason?: string;
  riskScore?: number;
  patterns?: string[];
}

interface ConversationBuffer {
  messages: Message[];
  riskScore: number;
  lastAnalysis: number;
}

// Context clues that indicate contact sharing intent
const CONTACT_INTENT_PATTERNS = [
  /\b(contact|reach|call|text|phone|number|website|link|email|handle|find|follow|add|dm|message)\b/i,
  /\b(instagram|insta|ig|facebook|fb|twitter|x\.com|whatsapp|telegram|snapchat|tiktok|youtube)\b/i,
  /\b(outside|off)\s+(platform|app|site|here)\b/i,
  /\b(my|check|visit|look|see)\b/i,
];

// Split pattern detectors
const SPLIT_PATTERNS = {
  // Phone number fragments
  phoneFragments: [
    /\b\d{3}\b/, // 3 digits that could be area code
    /\b\d{3}[-.\s]*\d{4}\b/, // 7 digit fragments
    /\b\d{4}\b/, // Last 4 digits
    /\b\d{2,3}[-.\s]*\d{2,4}\b/, // Various number combinations
  ],
  
  // Website/domain fragments
  domainFragments: [
    /\b\w+\s*(dot|\.)\s*(com|net|org|io|co|uk|app|dev)\b/i,
    /\bwww\s*\.\s*\w+/i,
    /\bhttps?\s*:\s*\/\s*\/\s*\w+/i,
    /\b\w+\s*\.\s*\w+\s*\.\s*\w+/i, // multi-level domains split
  ],
  
  // Email fragments
  emailFragments: [
    /@\s*\w+/i,
    /\w+\s*@/i,
    /\b\w+\s*(at|@)\s*\w+\s*(dot|\.)\s*(com|net|org|gmail|yahoo|hotmail)/i,
  ],
  
  // Social media handle fragments
  socialFragments: [
    /@\s*\w+/i,
    /\bhandle\s*[:@]?\s*\w+/i,
    /\b(instagram|ig|facebook|fb|twitter|x)\s*[:@]?\s*\w+/i,
  ]
};

export const useAdvancedChatFilter = (
  channelInfo: { id: string; type: string } | null,
  senderId: string | undefined,
  isProRecipient: boolean = false
) => {
  const [conversationBuffers, setConversationBuffers] = useState<Map<string, ConversationBuffer>>(new Map());
  const [lastFilterResult, setLastFilterResult] = useState<FilterResult | null>(null);

  // Pro users bypass all filtering
  if (isProRecipient) {
    return {
      filterMessage: () => ({ isBlocked: false, reason: undefined, riskScore: 0, patterns: [] }),
      lastFilterResult: null,
      updateConversationBuffer: () => {},
    };
  }

  const getBufferKey = () => {
    if (!channelInfo || !senderId) return null;
    return `${channelInfo.type}-${channelInfo.id}-${senderId}`;
  };

  const updateConversationBuffer = (messages: Message[]) => {
    const bufferKey = getBufferKey();
    if (!bufferKey) return;

    // Keep only last 10 messages from this sender for analysis
    const senderMessages = messages
      .filter(msg => msg.sender_id === senderId)
      .slice(-10);

    const buffer: ConversationBuffer = {
      messages: senderMessages,
      riskScore: 0,
      lastAnalysis: Date.now(),
    };

    setConversationBuffers(prev => new Map(prev.set(bufferKey, buffer)));
  };

  const analyzeConversationPatterns = (newMessage: string): FilterResult => {
    const bufferKey = getBufferKey();
    if (!bufferKey) return { isBlocked: false, reason: undefined, riskScore: 0, patterns: [] };

    const buffer = conversationBuffers.get(bufferKey);
    if (!buffer) return { isBlocked: false, reason: undefined, riskScore: 0, patterns: [] };

    // Combine recent messages with new message for analysis
    const recentContent = [
      ...buffer.messages.slice(-5).map(msg => msg.content),
      newMessage
    ].join(' ').toLowerCase();

    let riskScore = 0;
    const detectedPatterns: string[] = [];

    // 1. Check for contact intent context
    let hasContactIntent = false;
    for (const pattern of CONTACT_INTENT_PATTERNS) {
      if (pattern.test(recentContent)) {
        hasContactIntent = true;
        riskScore += 15;
        detectedPatterns.push('contact_intent');
        break;
      }
    }

    // 2. Analyze split patterns only if contact intent detected
    if (hasContactIntent) {
      // Phone number fragment detection
      const phoneFragmentCount = SPLIT_PATTERNS.phoneFragments
        .reduce((count, pattern) => count + (pattern.test(recentContent) ? 1 : 0), 0);
      
      if (phoneFragmentCount >= 2) {
        riskScore += 30;
        detectedPatterns.push('split_phone');
      }

      // Domain fragment detection
      const domainFragmentCount = SPLIT_PATTERNS.domainFragments
        .reduce((count, pattern) => count + (pattern.test(recentContent) ? 1 : 0), 0);
      
      if (domainFragmentCount >= 1) {
        riskScore += 25;
        detectedPatterns.push('split_domain');
      }

      // Email fragment detection
      const emailFragmentCount = SPLIT_PATTERNS.emailFragments
        .reduce((count, pattern) => count + (pattern.test(recentContent) ? 1 : 0), 0);
      
      if (emailFragmentCount >= 1) {
        riskScore += 25;
        detectedPatterns.push('split_email');
      }

      // Social media fragment detection
      const socialFragmentCount = SPLIT_PATTERNS.socialFragments
        .reduce((count, pattern) => count + (pattern.test(recentContent) ? 1 : 0), 0);
      
      if (socialFragmentCount >= 1) {
        riskScore += 20;
        detectedPatterns.push('split_social');
      }
    }

    // 3. Sequential number detection (advanced phone splitting)
    const numberSequences = recentContent.match(/\b\d{2,4}\b/g) || [];
    if (numberSequences.length >= 3 && hasContactIntent) {
      riskScore += 35;
      detectedPatterns.push('number_sequence');
    }

    // 4. Suspicious spacing/punctuation patterns
    const suspiciousSpacing = [
      /\d\s+\d\s+\d/, // "5 5 5 - 1 2 3 4"
      /\w+\s+dot\s+\w+/i, // "john dot com"
      /\w+\s+at\s+\w+/i, // "john at gmail"
    ];

    for (const pattern of suspiciousSpacing) {
      if (pattern.test(recentContent)) {
        riskScore += 20;
        detectedPatterns.push('suspicious_spacing');
        break;
      }
    }

    // Update buffer with new risk score
    buffer.riskScore = riskScore;
    setConversationBuffers(prev => new Map(prev.set(bufferKey, buffer)));

    // Determine if message should be blocked
    const shouldBlock = riskScore >= 40; // Threshold for blocking

    const result: FilterResult = {
      isBlocked: shouldBlock,
      riskScore,
      patterns: detectedPatterns,
      reason: shouldBlock ? generateBlockReason(detectedPatterns) : undefined,
    };

    setLastFilterResult(result);
    return result;
  };

  const generateBlockReason = (patterns: string[]): string => {
    if (patterns.includes('split_phone') || patterns.includes('number_sequence')) {
      return 'Phone numbers are not allowed for Free users. Upgrade to Pro to share contact details.';
    }
    if (patterns.includes('split_domain')) {
      return 'Website links are not allowed for Free users. Upgrade to Pro to share links.';
    }
    if (patterns.includes('split_email')) {
      return 'Email addresses are not allowed for Free users. Upgrade to Pro to share contact details.';
    }
    if (patterns.includes('split_social')) {
      return 'Social media handles are not allowed for Free users. Upgrade to Pro for unlimited messaging access.';
    }
    return 'Contact details are not allowed for Free users. Upgrade to Pro for full messaging access.';
  };

  const filterMessage = (content: string): FilterResult => {
    // First run traditional single-message filtering
    const singleMessageResult = filterSingleMessage(content);
    if (singleMessageResult.isBlocked) {
      setLastFilterResult(singleMessageResult);
      return singleMessageResult;
    }

    // Then run advanced conversation analysis
    return analyzeConversationPatterns(content);
  };

  const filterSingleMessage = (content: string): FilterResult => {
    const lowerContent = content.toLowerCase().trim();
    
    // Enhanced phone number patterns (from original filter)
    const phonePatterns = [
      /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/,
      /\b\d{10,}\b/,
      /\(\d{3}\)\s?\d{3}[-.\s]?\d{4}/,
      /\+\d{1,3}[-.\s]?\d{3,}/,
      /\b\d{3}[-.\s]?\d{4}\b/,
      /\b\d{7,15}\b/,
      /phone\s*:?\s*\d+/i,
      /number\s*:?\s*\d+/i,
      /call\s+me\s+at\s+\d+/i,
    ];

    // Website/URL patterns
    const websitePatterns = [
      /https?:\/\/[^\s]+/,
      /www\.[^\s]+/,
      /\b[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.com\b/i,
      /\b[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.(net|org|edu|gov|co\.uk|io|app|dev)\b/i,
    ];

    // Email patterns
    const emailPatterns = [
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
      /\b[A-Za-z0-9._%+-]+\s*@\s*[A-Za-z0-9.-]+\s*\.\s*[A-Z|a-z]{2,}\b/,
    ];

    // Social media patterns
    const socialPatterns = [
      /@[a-zA-Z0-9._]+/,
      /\b(instagram|insta|ig|facebook|fb|twitter|x\.com|whatsapp|telegram|snapchat|tiktok|youtube|discord)\b/i,
    ];

    // Check each pattern type
    for (const pattern of phonePatterns) {
      if (pattern.test(content)) {
        return { isBlocked: true, reason: 'Phone numbers are not allowed for Free users. Upgrade to Pro to share contact details.', riskScore: 100, patterns: ['single_phone'] };
      }
    }

    for (const pattern of websitePatterns) {
      if (pattern.test(content)) {
        return { isBlocked: true, reason: 'Website links are not allowed for Free users. Upgrade to Pro to share links.', riskScore: 100, patterns: ['single_website'] };
      }
    }

    for (const pattern of emailPatterns) {
      if (pattern.test(content)) {
        return { isBlocked: true, reason: 'Email addresses are not allowed for Free users. Upgrade to Pro to share contact details.', riskScore: 100, patterns: ['single_email'] };
      }
    }

    for (const pattern of socialPatterns) {
      if (pattern.test(lowerContent)) {
        return { isBlocked: true, reason: 'Social media handles are not allowed for Free users. Upgrade to Pro for unlimited messaging access.', riskScore: 100, patterns: ['single_social'] };
      }
    }

    return { isBlocked: false, reason: undefined, riskScore: 0, patterns: [] };
  };

  return {
    filterMessage,
    lastFilterResult,
    updateConversationBuffer,
  };
};
