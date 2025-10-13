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

// Context clues that indicate contact sharing intent
const CONTACT_INTENT_PATTERNS = [
  /\b(contact|reach|call|text|phone|number|website|link|email|handle|find|follow|add|dm|message)\b/i,
  /\b(instagram|insta|ig|facebook|fb|twitter|x\.com|whatsapp|telegram|snapchat|tiktok|youtube)\b/i,
  /\b(outside|off)\s+(platform|app|site|here)\b/i,
  /\b(my|check|visit|look|see)\b/i,
];

// Split pattern detectors
const SPLIT_PATTERNS = {
  phoneFragments: [/\b\d{3}\b/, /\b\d{3}[-.\s]*\d{4}\b/, /\b\d{4}\b/, /\b\d{2,3}[-.\s]*\d{2,4}\b/],
  domainFragments: [
    /\b\w+\s*(dot|\.)\s*(com|net|org|io|co|uk|app|dev)\b/i,
    /\bwww\s*\.\s*\w+/i,
    /\bhttps?\s*:\s*\/\s*\/\s*\w+/i,
    /\b\w+\s*\.\s*\w+\s*\.\s*\w+/i,
  ],
  emailFragments: [/@\s*\w+/i, /\w+\s*@/i, /\b\w+\s*(at|@)\s*\w+\s*(dot|\.)\s*(com|net|org|gmail|yahoo|hotmail)/i],
  socialFragments: [/@\s*\w+/i, /\bhandle\s*[:@]?\s*\w+/i, /\b(instagram|ig|facebook|fb|twitter|x)\s*[:@]?\s*\w+/i],
};

export const useAdvancedChatFilter = (
  channelInfo: { id: string; type: string } | null,
  senderId: string | undefined,
  bypassFilter: boolean = false,
  isSenderTalent: boolean = false,
) => {
  const [conversationBuffers, setConversationBuffers] = useState<Map<string, ConversationBuffer>>(new Map());
  const [lastFilterResult, setLastFilterResult] = useState<FilterResult | null>(null);

  if (bypassFilter) {
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
    const senderMessages = messages.filter((msg) => msg.sender_id === senderId).slice(-10);
    const buffer: ConversationBuffer = { messages: senderMessages, riskScore: 0, lastAnalysis: Date.now() };
    setConversationBuffers((prev) => new Map(prev.set(bufferKey, buffer)));
  };

  const analyzeConversationPatterns = (newMessage: string): FilterResult => {
    const bufferKey = getBufferKey();
    if (!bufferKey) return { isBlocked: false, riskScore: 0, patterns: [] };
    const buffer = conversationBuffers.get(bufferKey);
    if (!buffer) return { isBlocked: false, riskScore: 0, patterns: [] };
    const recentContent = [...buffer.messages.slice(-5).map((msg) => msg.content), newMessage].join(" ").toLowerCase();
    let riskScore = 0;
    const detectedPatterns: string[] = [];
    let hasContactIntent = CONTACT_INTENT_PATTERNS.some((p) => p.test(recentContent));
    if (hasContactIntent) {
      riskScore += 15;
      detectedPatterns.push("contact_intent");
    }
    if (hasContactIntent) {
      if (SPLIT_PATTERNS.phoneFragments.filter((p) => p.test(recentContent)).length >= 2) {
        riskScore += 30;
        detectedPatterns.push("split_phone");
      }
      if (SPLIT_PATTERNS.domainFragments.filter((p) => p.test(recentContent)).length >= 1) {
        riskScore += 25;
        detectedPatterns.push("split_domain");
      }
      if (SPLIT_PATTERNS.emailFragments.filter((p) => p.test(recentContent)).length >= 1) {
        riskScore += 25;
        detectedPatterns.push("split_email");
      }
      if (SPLIT_PATTERNS.socialFragments.filter((p) => p.test(recentContent)).length >= 1) {
        riskScore += 20;
        detectedPatterns.push("split_social");
      }
    }
    const numberSequences = recentContent.match(/\b\d{2,4}\b/g) || [];
    if (numberSequences.length >= 2) {
      riskScore += 40;
      detectedPatterns.push("number_sequence");
    } else if (numberSequences.length >= 1 && hasContactIntent) {
      riskScore += 25;
      detectedPatterns.push("number_sequence_with_intent");
    }
    const suspiciousSpacing = [/\d\s+\d\s+\d/, /\w+\s+dot\s+\w+/i, /\w+\s+at\s+\w+/i];
    if (suspiciousSpacing.some((p) => p.test(recentContent))) {
      riskScore += 20;
      detectedPatterns.push("suspicious_spacing");
    }
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
    const isEmail = patterns.includes("split_email");
    const isSocial = patterns.includes("split_social");

    if (isSenderTalent) {
      if (isPhone) return "Phone numbers are not allowed. Upgrade to Pro to share contact details.";
      if (isDomain) return "Website links are not allowed. Upgrade to Pro to share links.";
      if (isEmail) return "Email addresses are not allowed. Upgrade to Pro to share contact details.";
      if (isSocial) return "Social media handles are not allowed. Upgrade to Pro for unlimited messaging access.";
      return "This message appears to contain contact information, which is a Pro feature.";
    } else {
      if (isPhone) return "This talent is on a Free plan and cannot receive phone numbers.";
      if (isDomain) return "This talent is on a Free plan and cannot receive website links.";
      if (isEmail) return "This talent is on a Free plan and cannot receive email addresses.";
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
      /\b[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.(net|org|io|app|dev)\b/i,
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

    for (const p of phonePatterns)
      if (p.test(content)) return { isBlocked: true, reason: reason.phone, riskScore: 100, patterns: ["single_phone"] };
    for (const p of websitePatterns)
      if (p.test(content))
        return { isBlocked: true, reason: reason.website, riskScore: 100, patterns: ["single_website"] };
    for (const p of emailPatterns)
      if (p.test(content)) return { isBlocked: true, reason: reason.email, riskScore: 100, patterns: ["single_email"] };
    for (const p of socialPatterns)
      if (p.test(lowerContent))
        return { isBlocked: true, reason: reason.social, riskScore: 100, patterns: ["single_social"] };

    return { isBlocked: false, riskScore: 0, patterns: [] };
  };

  return {
    filterMessage,
    lastFilterResult,
    updateConversationBuffer,
  };
};
