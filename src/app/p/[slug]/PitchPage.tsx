'use client'

import { useEffect, useRef } from 'react'
import type {
  PitchModuleType,
  HeroContent,
  ManifestContent,
  TextContent,
  StatsGridContent,
  TeamGridContent,
  FunFactsContent,
  ServicesGridContent,
  ServiceDetailContent,
  VideoContent,
  ImageContent,
  OutroContent,
} from '@/lib/pitch-types'
import type { Person } from '@/lib/team'
import styles from './pitch.module.css'

interface PitchModuleSnapshot {
  instanceId: string
  moduleId: string | null
  type: PitchModuleType
  name: string
  content: unknown
  sourceUpdatedAt: string | null
  sortOrder: number
}

interface PitchContact {
  slug: string
  name: string
  role: string
  email: string
  phone: string
  avatarUrl: string | null
}

interface Pitch {
  id: string
  slug: string
  status: 'DRAFT' | 'SENT' | 'ARCHIVED'
  clientCompany: string
  occasion: string | null
  contactSlug: string
  contact: PitchContact
  editToken: string
  archivedAt: string | null
  modules: PitchModuleSnapshot[]
  createdAt: string
  updatedAt: string
}

interface Props {
  pitch: Pitch
  team: Person[]
  mode: 'view' | 'edit'
}

export function PitchPage({ pitch, team }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)

  // Scroll reveal animations (same pattern as OfferPage2)
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const els = root.querySelectorAll(`.${styles.reveal}`)
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const delay = parseInt(
              (entry.target as HTMLElement).dataset.delay || '0',
              10
            )
            setTimeout(() => entry.target.classList.add(styles.visible), delay)
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -50px 0px' }
    )
    els.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  const sortedModules = [...pitch.modules].sort(
    (a, b) => a.sortOrder - b.sortOrder
  )

  return (
    <div ref={rootRef} className={styles.page}>
      <nav className={styles.nav}>
        <div className={styles.navLeft}>
          <span className={styles.navLogo}>
            <PulpLogo />
          </span>
          <span className={styles.navClient}>
            Pulpmedia × {pitch.clientCompany}
          </span>
        </div>
        {pitch.occasion && (
          <span className={styles.navOccasion}>{pitch.occasion}</span>
        )}
      </nav>

      {sortedModules.length === 0 && (
        <div className={styles.emptyState}>
          Diese Pitch enthält noch keine Module.
        </div>
      )}

      {sortedModules.map((module) => (
        <ModuleRenderer key={module.instanceId} module={module} team={team} />
      ))}

      <footer className={styles.footer}>
        Pulpmedia × {pitch.clientCompany}
        <div className={styles.footerContact}>
          Fragen? Schreib an{' '}
          <a href={`mailto:${pitch.contact.email}`}>{pitch.contact.email}</a>
          {' oder ruf '}
          <a href={`tel:${pitch.contact.phone.replace(/\s/g, '')}`}>
            {pitch.contact.name}
          </a>
          {' an.'}
        </div>
      </footer>
    </div>
  )
}

// =========================================================
// Module-Renderer
// =========================================================

function ModuleRenderer({
  module,
  team,
}: {
  module: PitchModuleSnapshot
  team: Person[]
}) {
  const c = module.content
  switch (module.type) {
    case 'hero':
      return <HeroModule content={c as HeroContent} />
    case 'manifest':
      return <ManifestModule content={c as ManifestContent} />
    case 'text':
      return <TextModule content={c as TextContent} />
    case 'stats-grid':
      return <StatsGridModule content={c as StatsGridContent} />
    case 'team-grid':
      return <TeamGridModule content={c as TeamGridContent} team={team} />
    case 'fun-facts':
      return <FunFactsModule content={c as FunFactsContent} />
    case 'services-grid':
      return <ServicesGridModule content={c as ServicesGridContent} />
    case 'service-detail':
      return <ServiceDetailModule content={c as ServiceDetailContent} />
    case 'video':
      return <VideoModule content={c as VideoContent} />
    case 'image':
      return <ImageModule content={c as ImageContent} />
    case 'outro':
      return <OutroModule content={c as OutroContent} />
    default:
      return null
  }
}

// ------------------------- HERO -------------------------
function HeroModule({ content }: { content: HeroContent }) {
  return (
    <section className={styles.hero}>
      {content.eyebrow && (
        <div className={`${styles.heroEyebrow} ${styles.reveal}`}>
          {content.eyebrow}
        </div>
      )}
      <h1
        className={`${styles.heroTitle} ${styles.reveal}`}
        data-delay="100"
      >
        {content.title}
      </h1>
      {content.subtitle && (
        <p
          className={`${styles.heroSubtitle} ${styles.reveal}`}
          data-delay="200"
        >
          {content.subtitle}
        </p>
      )}
      {content.image && (
        <div className={`${styles.heroImage} ${styles.reveal}`} data-delay="300">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={content.image} alt="" />
        </div>
      )}
    </section>
  )
}

// ------------------------- MANIFEST -------------------------
function ManifestModule({ content }: { content: ManifestContent }) {
  return (
    <section className={styles.manifest}>
      <h2 className={`${styles.manifestStatement} ${styles.reveal}`}>
        {content.statement}
      </h2>
      {content.attribution && (
        <div
          className={`${styles.manifestAttribution} ${styles.reveal}`}
          data-delay="200"
        >
          — {content.attribution}
        </div>
      )}
    </section>
  )
}

// ------------------------- TEXT -------------------------
function TextModule({ content }: { content: TextContent }) {
  return (
    <section className={styles.section}>
      <div className={styles.textBlock}>
        {content.headline && (
          <h2 className={`${styles.sectionHeadline} ${styles.reveal}`}>
            {content.headline}
          </h2>
        )}
        <div
          className={`${styles.textBody} ${styles.reveal}`}
          data-delay="100"
        >
          {content.body}
        </div>
      </div>
    </section>
  )
}

// ------------------------- STATS -------------------------
function StatsGridModule({ content }: { content: StatsGridContent }) {
  return (
    <section className={styles.section}>
      {content.headline && (
        <h2 className={`${styles.sectionHeadline} ${styles.reveal}`}>
          {content.headline}
        </h2>
      )}
      <div className={styles.statsGrid}>
        {(content.items || []).map((item, i) => (
          <div
            key={i}
            className={`${styles.statItem} ${styles.reveal}`}
            data-delay={i * 80}
          >
            <div className={styles.statNumber}>{item.number}</div>
            <div className={styles.statLabel}>{item.label}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ------------------------- TEAM -------------------------
function TeamGridModule({
  content,
  team,
}: {
  content: TeamGridContent
  team: Person[]
}) {
  // Wir filtern in der Reihenfolge der personSlugs (so kann im Admin sortiert
  // werden). Personen, die in der personSlugs-Liste sind, aber nicht mehr im
  // Live-Team auftauchen (oder pulpmedia.at gerade nicht erreichbar war),
  // werden still verworfen.
  const slugs = content.personSlugs || []
  const selected = slugs
    .map((slug) => team.find((p) => p.slug === slug))
    .filter((p): p is Person => !!p)

  return (
    <section className={styles.section}>
      <h2 className={`${styles.sectionHeadline} ${styles.reveal}`}>
        {content.headline || 'Wer ist heute da'}
      </h2>
      {selected.length === 0 ? (
        <div className={`${styles.teamPlaceholder} ${styles.reveal}`}>
          Noch keine Personen ausgewählt
          {slugs.length > 0 && team.length === 0
            ? ' (Team-Daten konnten gerade nicht von pulpmedia.at geladen werden).'
            : '.'}
        </div>
      ) : (
        <div className={styles.teamGrid}>
          {selected.map((p, i) => (
            <div
              key={p.slug}
              className={`${styles.teamCard} ${styles.reveal}`}
              data-delay={i * 80}
            >
              <div className={styles.teamAvatar}>
                {p.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.imageUrl} alt={p.name} />
                ) : (
                  p.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                )}
              </div>
              <div className={styles.teamName}>{p.name}</div>
              {p.role && <div className={styles.teamRole}>{p.role}</div>}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

// ------------------------- FUN FACTS -------------------------
function FunFactsModule({ content }: { content: FunFactsContent }) {
  return (
    <section className={styles.section}>
      {content.headline && (
        <h2 className={`${styles.sectionHeadline} ${styles.reveal}`}>
          {content.headline}
        </h2>
      )}
      <div className={styles.funFactsGrid}>
        {(content.items || []).map((item, i) => (
          <div
            key={i}
            className={`${styles.funFactCard} ${styles.reveal}`}
            data-delay={i * 80}
          >
            {item.emoji && (
              <div className={styles.funFactEmoji}>{item.emoji}</div>
            )}
            <div className={styles.funFactText}>{item.text}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ------------------------- SERVICES GRID -------------------------
function ServicesGridModule({ content }: { content: ServicesGridContent }) {
  return (
    <section className={styles.section}>
      {content.headline && (
        <h2 className={`${styles.sectionHeadline} ${styles.reveal}`}>
          {content.headline}
        </h2>
      )}
      <div className={`${styles.servicesGrid} ${styles.reveal}`} data-delay="100">
        {(content.items || []).map((item, i) => (
          <div key={i} className={styles.serviceCell}>
            {item.icon && <div className={styles.serviceIcon}>{item.icon}</div>}
            <div className={styles.serviceTitle}>{item.title}</div>
            <div className={styles.serviceTagline}>{item.tagline}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ------------------------- SERVICE DETAIL -------------------------
function ServiceDetailModule({ content }: { content: ServiceDetailContent }) {
  return (
    <section className={styles.section}>
      <div className={styles.serviceDetail}>
        {content.eyebrow && (
          <div className={`${styles.serviceDetailEyebrow} ${styles.reveal}`}>
            {content.eyebrow}
          </div>
        )}
        <h2
          className={`${styles.serviceDetailHeadline} ${styles.reveal}`}
          data-delay="80"
        >
          {content.headline}
        </h2>
        {content.slogan && (
          <p
            className={`${styles.serviceDetailSlogan} ${styles.reveal}`}
            data-delay="160"
          >
            {content.slogan}
          </p>
        )}
        {content.body && (
          <div
            className={`${styles.serviceDetailBody} ${styles.reveal}`}
            data-delay="200"
          >
            {content.body}
          </div>
        )}
        {content.promises && content.promises.length > 0 && (
          <div className={styles.serviceDetailPromises}>
            {content.promises.map((p, i) => (
              <div
                key={i}
                className={`${styles.serviceDetailPromise} ${styles.reveal}`}
                data-delay={240 + i * 60}
              >
                {p}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

// ------------------------- VIDEO -------------------------
function VideoModule({ content }: { content: VideoContent }) {
  // Plain HTML5 video. Cloud-Hosted MP4 / WebM URLs.
  // YouTube/Vimeo Embeds machen wir in einer späteren Iteration.
  return (
    <section className={styles.section}>
      <div className={`${styles.mediaBlock} ${styles.reveal}`}>
        <video
          src={content.url}
          poster={content.poster}
          controls
          playsInline
        />
        {content.caption && (
          <div className={styles.mediaCaption}>{content.caption}</div>
        )}
      </div>
    </section>
  )
}

// ------------------------- IMAGE -------------------------
function ImageModule({ content }: { content: ImageContent }) {
  return (
    <section className={styles.section}>
      <div className={`${styles.mediaBlock} ${styles.reveal}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={content.url} alt={content.alt || ''} />
        {content.caption && (
          <div className={styles.mediaCaption}>{content.caption}</div>
        )}
      </div>
    </section>
  )
}

// ------------------------- OUTRO -------------------------
function OutroModule({ content }: { content: OutroContent }) {
  return (
    <section className={styles.outro}>
      {content.headline && (
        <h2 className={`${styles.outroHeadline} ${styles.reveal}`}>
          {content.headline}
        </h2>
      )}
      {content.text && (
        <p className={`${styles.outroText} ${styles.reveal}`} data-delay="100">
          {content.text}
        </p>
      )}
    </section>
  )
}

// ------------------------- LOGO -------------------------
function PulpLogo() {
  // Inline-Logo, damit wir keine Asset-Pfad-Sorgen haben.
  // Falls /pulp-logo.svg im public-Ordner existiert, kann das gegen ein <img>
  // getauscht werden.
  return (
    <svg viewBox="0 0 140 40" xmlns="http://www.w3.org/2000/svg" aria-label="Pulpmedia">
      <text
        x="0"
        y="28"
        fontFamily="Anton, sans-serif"
        fontSize="28"
        fill="#FF1900"
        letterSpacing="1"
      >
        PULP
      </text>
      <text
        x="68"
        y="28"
        fontFamily="Anton, sans-serif"
        fontSize="28"
        fill="#ffffff"
        letterSpacing="1"
      >
        MEDIA
      </text>
    </svg>
  )
}
