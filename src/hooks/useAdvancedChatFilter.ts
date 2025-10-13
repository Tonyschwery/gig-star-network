import { useState, useCallback } from "react";
import { Message } from "@/contexts/ChatContext";

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

// Keywords that strongly suggest a user is about to share contact info.
const CONTACT_INTENT_PATTERNS = [
  /\b(contact|reach|call|text|phone|number|website|link|email|handle|find|follow|add|dm|message)\b/i,
  /\b(instagram|insta|ig|facebook|fb|twitter|x\.com|whatsapp|telegram|snapchat|tiktok|youtube)\b/i,
  /\b(outside|off)\s+(platform|app|site|here)\b/i,
  /\b(my|here is|check|visit|look|see)\b/i,
];

// Patterns for detecting fragments of contact info.
const SPLIT_PATTERNS = {
  phoneFragments: [/\b\d{3}\b/, /\b\d{3}[-.\s]*\d{4}\b/, /\b\d{4}\b/, /\b\d{2,3}[-.\s]*\d{2,4}\b/],
  domainFragments: [
    /\b\w+\s*(dot|\.)\s*(com|net|org|io|co|uk|app|dev)\b/i,
    /\bwww\s*\.\s*\w+/i,
    /\bhttps?\s*:\s*\/\s*\/\s*\w+/i,
  ],
  emailFragments: [/@\s*\w+/i, /\w+\s*@/i, /\b\w+\s*(at|@)\s*\w+\s*(dot|\.)\s*(com|net|org|gmail|yahoo|hotmail)/i],
  socialFragments: [/@\s*\w+/i, /\bhandle\s*[:@]?\s*\w+/i, /\b(instagram|ig|facebook|fb|twitter|x)\s*[:@]?\s*\w+/i],
};

export const useAdvancedChatFilter = (
  channelInfo: { id: string; type: string } | null,
  senderId: string | undefined,
  bypassFilter: boolean = false,
  isSenderTalent: boolean = false, // Added to provide role-specific block messages
) => {
  const [conversationBuffers, setConversationBuffers] = useState<Map<string, ConversationBuffer>>(new Map());
  const [lastFilterResult, setLastFilterResult] = useState<FilterResult | null>(null);

  if (bypassFilter) {
    return {
      filterMessage: () => ({ isBlocked: false }),
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
    const senderMessages = messages.filter((msg) => msg.sender_id === senderId).slice(-10);
    const buffer: ConversationBuffer = { messages: senderMessages, riskScore: 0, lastAnalysis: Date.now() };
    setConversationBuffers((prev) => new Map(prev.set(bufferKey, buffer)));
  };

  const analyzeConversationPatterns = (newMessage: string): FilterResult => {
    const bufferKey = getBufferKey();
    if (!bufferKey) return { isBlocked: false };
    const buffer = conversationBuffers.get(bufferKey);
    if (!buffer) return { isBlocked: false };
    const recentContent = [...buffer.messages.slice(-5).map((msg) => msg.content), newMessage].join(" ").toLowerCase();
    let riskScore = 0;
    const detectedPatterns: string[] = [];

    // 1. Check for high-intent keywords
    let hasContactIntent = CONTACT_INTENT_PATTERNS.some((p) => p.test(recentContent));
    if (hasContactIntent) {
      riskScore += 15;
      detectedPatterns.push("contact_intent");
    }

    // 2. Check for suspicious fragments, giving them more weight if intent is present
    const phoneFragmentCount = SPLIT_PATTERNS.phoneFragments.filter((p) => p.test(recentContent)).length;
    if (phoneFragmentCount >= 2) {
      riskScore += hasContactIntent ? 30 : 20;
      detectedPatterns.push("split_phone");
    }

    const domainFragmentCount = SPLIT_PATTERNS.domainFragments.filter((p) => p.test(recentContent)).length;
    if (domainFragmentCount >= 1) {
      riskScore += 25;
      detectedPatterns.push("split_domain");
    }

    const socialFragmentCount = SPLIT_PATTERNS.socialFragments.filter((p) => p.test(recentContent)).length;
    if (socialFragmentCount >= 1 && hasContactIntent) {
      riskScore += 25; // Increased score to ensure block
      detectedPatterns.push("split_social");
    }

    // 3. ✅ NEW, STRICTER LOGIC: Block number sequences more aggressively.
    const numberSequences = recentContent.match(/\b\d{2,4}\b/g) || [];
    if (numberSequences.length >= 2) {
      // Changed from 3 to 2
      riskScore += 40; // High risk, enough to block on its own.
      detectedPatterns.push("number_sequence");
    } else if (numberSequences.length >= 1 && hasContactIntent) {
      // Changed from 2 to 1
      riskScore += 30; // High risk if intent is already present.
      detectedPatterns.push("number_sequence_with_intent");
    }

    // 4. Update and check the final risk score
    buffer.riskScore = riskScore;
    setConversationBuffers((prev) => new Map(prev.set(bufferKey, buffer)));
    const shouldBlock = riskScore >= 40;
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
    const isPhone =
      patterns.includes("split_phone") ||
      patterns.includes("number_sequence") ||
      patterns.includes("number_sequence_with_intent");
    const isDomain = patterns.includes("split_domain");
    const isSocial = patterns.includes("split_social");

    if (isSenderTalent) {
      if (isPhone) return "Phone numbers are not allowed. Upgrade to Pro to share contact details.";
      if (isDomain) return "Website links are not allowed. Upgrade to Pro to share links.";
      if (isSocial) return "Social media handles are not allowed. Upgrade to Pro for unlimited messaging access.";
      return "This message appears to contain contact information, which is a Pro feature.";
    } else {
      // Booker's messages
      if (isPhone) return "This talent is on a Free plan and cannot receive phone numbers.";
      if (isDomain) return "This talent is on a Free plan and cannot receive website links.";
      if (isSocial) return "This talent is on a Free plan and cannot receive social media handles.";
      return "This message contains contact details that this talent cannot receive on their current plan.";
    }
  };

  const filterMessage = (content: string): FilterResult => {
    const singleMessageResult = filterSingleMessage(content);
    if (singleMessageResult.isBlocked) {
      setLastFilterResult(singleMessageResult);
      return singleMessageResult;
    }
    return analyzeConversationPatterns(content);
  };

  const filterSingleMessage = (content: string): FilterResult => {
    const lowerContent = content.toLowerCase().trim();
    const phonePatterns = [
      /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/,
      /\b\d{10,}\b/,
      /\(\d{3}\)\s?\d{3}[-.\s]?\d{4}/,
      /\+\d{1,3}[-.\s]?\d{3,}/,
      /\b\d{7,15}\b/,
      /phone\s*:?\s*\d+/i,
      /number\s*:?\s*\d+/i,
      /call\s+me\s+at\s+\d+/i,
    ];
    const websitePatterns = [
      /https?:\/\/[^\s]+/,
      /www\.[^\s]+/,
      /\b[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.com\b/i,
      /\b[a-zA-Z0-Z0-9-]{0,61}[a-zA-Z0-9])?\.(net|org|io|app|dev)\b/i,
    ];
    const emailPatterns = [
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
      /\b[A-Za-z0-9._%+-]+\s*@\s*[A-Za-z0-9.-]+\s*\.\s*[A-Z|a-z]{2,}\b/,
    ];
    const socialPatterns = [
      /@\w+/,
      /\b(instagram|insta|ig|facebook|fb|twitter|x\.com|whatsapp|telegram|snapchat|tiktok|youtube|discord)\b/i,
    ];

    const talentReason = {
      phone: "Phone numbers are not allowed. Upgrade to Pro to share contact details.",
      website: "Website links are not allowed. Upgrade to Pro to share links.",
      email: "Email addresses are not allowed. Upgrade to Pro to share contact details.",
      social: "Social media handles are not allowed. Upgrade to Pro for unlimited messaging access.",
    };
    const bookerReason = {
      phone: "This talent's plan does not allow receiving phone numbers.",
      website: "This talent's plan does not allow receiving website links.",
      email: "This talent's plan does not allow receiving email addresses.",
      social: "This talent's plan does not allow receiving social media handles.",
    };
    const reason = isSenderTalent ? talentReason : bookerReason;

    for (const p of phonePatterns) if (p.test(content)) return { isBlocked: true, reason: reason.phone };
    for (const p of websitePatterns) if (p.test(content)) return { isBlocked: true, reason: reason.website };
    for (const p of emailPatterns) if (p.test(content)) return { isBlocked: true, reason: reason.email };
    for (const p of socialPatterns) if (p.test(lowerContent)) return { isBlocked: true, reason: reason.social };

    return { isBlocked: false };
  };

  return {
    filterMessage,
    lastFilterResult,
    updateConversationBuffer,
  };
};
