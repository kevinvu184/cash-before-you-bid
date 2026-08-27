import { useTranslation } from 'react-i18next'

const ROADMAP_URL = 'https://claude.ai/code/artifact/de316b0d-babe-464d-91c1-c5c12d735ed3'

export function RulesNotes() {
  const { t } = useTranslation()
  return (
    <section className="notes">
      <h3>{t('notes.heading')}</h3>
      <ul className="small">
        <li>
          <strong>{t('notes.dutyTerm')}</strong>
          {t('notes.dutyBody')}
        </li>
        <li>
          <strong>{t('notes.feesTerm')}</strong>
          {t('notes.feesBody')}
        </li>
        <li>
          <strong>{t('notes.lmiTerm')}</strong>
          {t('notes.lmiBody')}
        </li>
        <li>
          <strong>{t('notes.schemeTerm')}</strong>
          {t('notes.schemeBody')}
          <strong>{t('notes.htbTerm')}</strong>
          {t('notes.htbBody')}
        </li>
        <li>
          <strong>{t('notes.grantTerm')}</strong>
          {t('notes.grantBody')}
        </li>
        <li>
          <strong>{t('notes.repaymentTerm')}</strong>
          {t('notes.repaymentBody')}
        </li>
      </ul>
      <p className="small">
        {t('notes.sourcesBefore')}
        <a href={ROADMAP_URL}>{t('notes.sourcesLink')}</a>
        {t('notes.sourcesAfter')}
      </p>
    </section>
  )
}
