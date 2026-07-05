import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import fr from './fr.json';
import rw from './rw.json';
export function initI18n(locale = 'en') {
    if (!i18n.isInitialized) {
        void i18n.use(initReactI18next).init({
            resources: {
                en: { translation: en },
                fr: { translation: fr },
                rw: { translation: rw },
            },
            lng: locale,
            fallbackLng: 'en',
            interpolation: { escapeValue: false },
        });
    }
    return i18n;
}
export { i18n };
