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

export type MediaInsight = {
  id: string;
  caption: string;
  permalink: string;
  timestamp: string;
  mediaUrl?: string;
  likeCount: number;
  commentsCount: number;
  metrics: InsightMetric[];
};
