import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en/common.json';
import enAdmin from './locales/en/admin.json';
import enAuth from './locales/en/auth.json';
import enErrors from './locales/en/errors.json';
import enForms from './locales/en/forms.json';
import enParent from './locales/en/parent.json';
import enPublic from './locales/en/public.json';
import enStudent from './locales/en/student.json';
import enSuperAdmin from './locales/en/superAdmin.json';
import enTeacher from './locales/en/teacher.json';
import fr from './locales/fr/common.json';
import frAdmin from './locales/fr/admin.json';
import frAuth from './locales/fr/auth.json';
import frErrors from './locales/fr/errors.json';
import frForms from './locales/fr/forms.json';
import frParent from './locales/fr/parent.json';
import frPublic from './locales/fr/public.json';
import frStudent from './locales/fr/student.json';
import frSuperAdmin from './locales/fr/superAdmin.json';
import frTeacher from './locales/fr/teacher.json';
import rw from './locales/rw/common.json';
import rwAdmin from './locales/rw/admin.json';
import rwAuth from './locales/rw/auth.json';
import rwErrors from './locales/rw/errors.json';
import rwForms from './locales/rw/forms.json';
import rwParent from './locales/rw/parent.json';
import rwPublic from './locales/rw/public.json';
import rwStudent from './locales/rw/student.json';
import rwSuperAdmin from './locales/rw/superAdmin.json';
import rwTeacher from './locales/rw/teacher.json';

void i18n.use(initReactI18next).init({
  resources: {
    en: {
      common: en,
      public: enPublic,
      auth: enAuth,
      student: enStudent,
      teacher: enTeacher,
      parent: enParent,
      admin: enAdmin,
      superAdmin: enSuperAdmin,
      forms: enForms,
      errors: enErrors,
    },
    rw: {
      common: rw,
      public: rwPublic,
      auth: rwAuth,
      student: rwStudent,
      teacher: rwTeacher,
      parent: rwParent,
      admin: rwAdmin,
      superAdmin: rwSuperAdmin,
      forms: rwForms,
      errors: rwErrors,
    },
    fr: {
      common: fr,
      public: frPublic,
      auth: frAuth,
      student: frStudent,
      teacher: frTeacher,
      parent: frParent,
      admin: frAdmin,
      superAdmin: frSuperAdmin,
      forms: frForms,
      errors: frErrors,
    },
  },
  lng: localStorage.getItem('ss_lang') ?? 'en',
  fallbackLng: 'en',
  defaultNS: 'common',
  ns: ['common', 'public', 'auth', 'student', 'teacher', 'parent', 'admin', 'superAdmin', 'forms', 'errors'],
  interpolation: { escapeValue: false },
});

export default i18n;
