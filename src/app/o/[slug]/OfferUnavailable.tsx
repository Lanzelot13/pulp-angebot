import type { Contact } from '@prisma/client'
import styles from './offer2.module.css'

type Reason = 'blocked' | 'expired'

interface Props {
  reason: Reason
  contact: Contact | null
  clientCompany?: string
}

// Wird gezeigt, wenn ein Angebot für Kunden nicht mehr erreichbar ist —
// entweder weil validUntil überschritten wurde oder weil der Admin es
// manuell gesperrt hat. Statt 404 kriegt der Kunde eine erklärende Seite
// mit Pulpmedia-Branding und dem/der Ansprechpartner:in.
export function OfferUnavailable({ reason, contact, clientCompany }: Props) {
  const title =
    reason === 'expired'
      ? 'Dieses Angebot ist nicht mehr gültig'
      : 'Dieses Angebot ist momentan nicht verfügbar'

  const message =
    reason === 'expired'
      ? 'Die Gültigkeit dieses Angebots ist abgelaufen. Melde dich gerne bei uns, dann verlängern wir es oder erstellen ein aktualisiertes.'
      : 'Wir arbeiten gerade daran. Sobald die Version steht, findest du das Angebot wieder hier. Bei Fragen: unten stehen unsere Kontaktdaten.'

  return (
    <div className={styles.page}>
      <div className={styles.unavailableWrap}>
        <div className={styles.unavailableCard}>
          <div className={styles.unavailableEyebrow}>Pulpmedia</div>
          <h1 className={styles.unavailableTitle}>{title}</h1>
          <p className={styles.unavailableText}>{message}</p>

          {clientCompany && (
            <div className={styles.unavailableMeta}>
              Für: <strong>{clientCompany}</strong>
            </div>
          )}

          {contact && (
            <div className={styles.unavailableContact}>
              <div className={styles.unavailableContactLabel}>
                Deine Ansprechperson
              </div>
              <div className={styles.unavailableContactName}>{contact.name}</div>
              {contact.role && (
                <div className={styles.unavailableContactRole}>{contact.role}</div>
              )}
              <div className={styles.unavailableContactLinks}>
                {contact.email && (
                  <a href={`mailto:${contact.email}`}>{contact.email}</a>
                )}
                {contact.phone && (
                  <a href={`tel:${contact.phone.replace(/\s+/g, '')}`}>
                    {contact.phone}
                  </a>
                )}
              </div>
            </div>
          )}

          <div className={styles.unavailableFooter}>
            <a href="https://pulpmedia.at" target="_blank" rel="noopener noreferrer">
              pulpmedia.at
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
