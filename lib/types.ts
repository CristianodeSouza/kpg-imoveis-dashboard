export type Property = {
  code: string;
  title: string;
  category: string;
  purpose: string;
  neighborhood: string;
  city: string;
  state: string;
  price: string;
  privateArea: string;
  bedrooms: string;
  suites: string;
  bathrooms: string;
  parking: string;
  profile: string;
  condoFee: string;
  propertyTax: string;
  facts: Array<{ label: string; value: string }>;
  description: string;
  features: string[];
  photos: string[];
  sourceUrl?: string;
  raw: unknown;
};

export type PublishPayload = {
  caption: string;
  imageUrls: string[];
};

export type InsightMetric = {
  name: string;
  value: number;
};

export type InstagramAccountSummary = {
  id: string;
  username: string;
  name: string;
  followersCount: number;
  mediaCount: number;
  profilePictureUrl?: string;
  website?: string;
  metrics: InsightMetric[];
};

export type MediaInsight = {
  id: string;
  caption: string;
  permalink: string;
  timestamp: string;
  mediaType: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  childrenCount?: number;
  likeCount: number;
  commentsCount: number;
  metrics: InsightMetric[];
};

export type LeadStatus = "novo" | "em_atendimento" | "corretor_acionado" | "ganho" | "perdido";

export type Lead = {
  id: string;
  name: string;
  phone: string;
  propertyInterest: string;
  propertyCode?: string;
  propertyUrl?: string;
  message: string;
  originalMessage: string;
  status: LeadStatus;
  stage?: string;
  source: string;
  conversationId?: string;
  chatLid?: string;
  direction: "cliente" | "automacao" | "humano" | "desconhecido";
  createdAt: string;
  lastMessageAt: string;
  interactions: number;
  notes?: string;
  raw?: unknown;
};
