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
  icon?: string
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
  // Recurring offers: priceUnit shows next to the price ("/ Monat", "/ Jahr"),
  // termMonths renders a "Laufzeit · X Monate" hint below the price.
  // Both optional — leave empty for one-off packages.
  priceUnit?: string
  termMonths?: number | null
  // Moco-Anbindung: ID des in Moco angelegten Offers, falls vorhanden
  mocoOfferId?: number | null
}

export interface AddOnItem {
  name: string
  description: string
  price: number | null
}

export interface PackagesSection {
  headline?: string
  intro: string
  showPrices: boolean
  items: PackageItem[]
  addOns?: AddOnItem[]
  addOnsHidden?: boolean
}

export interface NotIncludedItem {
  title: string
}

export interface NotIncludedSection {
  hidden?: boolean
  headline: string  // e.g. "Was nicht enthalten ist"
  items: NotIncludedItem[]
  note?: string     // closing sentence, e.g. "Diese Posten rechnen wir separat ab..."
}

export const DEFAULT_NOT_INCLUDED: NotIncludedSection = {
  hidden: false,
  headline: 'Was nicht enthalten ist',
  items: [
    { title: 'Darsteller:innen-Gagen, Castings und Buyouts' },
    { title: 'Locations und Drehgenehmigungen' },
    { title: 'Reisespesen außerhalb von Linz' },
    { title: 'Sonderausstattung und Sonderanfertigungen' },
    { title: 'Mediabudget (AdSpend) für bezahlte Werbung' },
  ],
  note: 'Diese Posten rechnen wir separat ab oder ihr stellt sie direkt bei.',
}

export interface TimelineStep {
  label: string
  description?: string
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
  icon?: string
}

export interface LegalSection {
  paymentTerms: string
}

export type OfferTemplate = 'TEMPLATE1' | 'TEMPLATE2'

export type OfferStatus = 'DRAFT' | 'PRICED' | 'ACCEPTED' | 'DECLINED'

// Display labels for offer status. Internal enum values stay in English (DRAFT etc.)
// to avoid a destructive schema migration, German labels live in the UI.
export const STATUS_LABELS: Record<OfferStatus, string> = {
  DRAFT: 'Optionsfindung',
  PRICED: 'Angebot',
  ACCEPTED: 'Gewonnen',
  DECLINED: 'Abgelehnt',
}

export const STATUS_OPTIONS: OfferStatus[] = ['DRAFT', 'PRICED', 'ACCEPTED', 'DECLINED']

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
  notIncluded?: NotIncludedSection
  timeline?: TimelineSection
  stats?: StatItem[]
  referenceIds?: string[]
  channelIds?: string[]
  legal?: LegalSection
  template?: OfferTemplate
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
  notIncluded?: NotIncludedSection
  timeline?: TimelineSection
  stats?: StatItem[]
  referenceIds?: string[]
  channelIds?: string[]
  legal?: LegalSection
  changedBy?: string
  template?: OfferTemplate
}
