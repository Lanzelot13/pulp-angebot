// === Section types for offer JSON fields ===

export interface HeroSection {
  title: string
  subtitle: string
  headerImage?: string | null
  ctaHeadline?: string
  ctaText?: string
}

export interface UnderstandingCard {
  title: string
  text: string
}

export interface UnderstandingSection {
  headline: string
  text: string
  cards: UnderstandingCard[]
}

export interface ServiceItem {
  title: string
  description: string
  optional?: boolean
}

export interface ServicesSection {
  headline: string
  items: ServiceItem[]
}

export interface PackageFeature {
  text: string
  included: boolean
}

export interface PackageItem {
  name: string
  description: string
  price: number | null
  features: PackageFeature[]
  highlighted?: boolean
}

export interface AddOnItem {
  name: string
  description: string
  price: number | null
}

export interface PackagesSection {
  intro: string
  showPrices: boolean
  items: PackageItem[]
  addOns?: AddOnItem[]
  addOnsHidden?: boolean
}

export interface TimelineStep {
  label: string
  timeframe: string
  icon?: string
}

export interface TimelineSection {
  headline: string
  steps: TimelineStep[]
  hidden?: boolean
}

export interface StatItem {
  number: string
  label: string
  detail: string
}

export interface LegalSection {
  paymentTerms: string
}

// === API request/response types ===

export interface CreateOfferRequest {
  clientName: string
  clientCompany: string
  projectName: string
  offerNumber?: string
  contactSlug: string
  mocoRef?: string
  validUntil?: string
  hero?: HeroSection
  understanding?: UnderstandingSection
  services?: ServicesSection
  packages?: PackagesSection
  timeline?: TimelineSection
  stats?: StatItem[]
  referenceIds?: string[]
  channelIds?: string[]
  legal?: LegalSection
}

export interface UpdateOfferRequest {
  clientName?: string
  clientCompany?: string
  projectName?: string
  offerNumber?: string
  contactSlug?: string
  hero?: HeroSection
  understanding?: UnderstandingSection
  services?: ServicesSection
  packages?: PackagesSection
  timeline?: TimelineSection
  stats?: StatItem[]
  referenceIds?: string[]
  channelIds?: string[]
  legal?: LegalSection
  changedBy?: string
}
