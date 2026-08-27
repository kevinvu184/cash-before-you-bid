import { useTranslation } from 'react-i18next'
import type { Lang } from '../logic/lang'

interface LanguageSwitcherProps {
  lang: Lang
  setLang: (lang: Lang) => void
}

/**
 * Two plain buttons, each a 44px tap target, no hover required. The active
 * language is carried by aria-pressed and the ink fill. Language names keep
 * their own language (a vi speaker lost in the English UI must still be able
 * to read the way back).
 */
export function LanguageSwitcher({ lang, setLang }: LanguageSwitcherProps) {
  const { t } = useTranslation()
  return (
    <div className="lang-switch" role="group" aria-label={t('switcher.label')}>
      <button
        type="button"
        className="lang-option"
        aria-pressed={lang === 'vi'}
        aria-label={t('switcher.viName')}
        lang="vi"
        onClick={() => setLang('vi')}
      >
        {t('switcher.vi')}
      </button>
      <button
        type="button"
        className="lang-option"
        aria-pressed={lang === 'en'}
        aria-label={t('switcher.enName')}
        lang="en"
        onClick={() => setLang('en')}
      >
        {t('switcher.en')}
      </button>
    </div>
  )
}
