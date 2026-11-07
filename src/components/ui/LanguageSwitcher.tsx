import { Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../i18n/useLanguage';

// Shows the other language in its own script, so someone who can't read the current one can still find it.
export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { t } = useTranslation();
  const { lang, toggle } = useLanguage();
  const other = lang === 'en' ? 'ar-SA' : 'en';
  return (
    <button type="button" className={`lang-sw ${className}`} onClick={toggle} aria-label={t('common.switchLanguage')}>
      <Languages size={17} aria-hidden="true" />
      <span lang={other} dir={other === 'en' ? 'ltr' : 'rtl'}>{other === 'en' ? 'English' : 'العربية'}</span>
    </button>
  );
}
