export const govAuditingFeatureEnabled =
  (import.meta.env.VITE_FEATURE_GOV_AUDITING_ENABLED ?? 'true') !== 'false';

export const govConductMarksFeatureEnabled =
  (import.meta.env.VITE_FEATURE_CONDUCT_MARKS_ENABLED ?? 'true') !== 'false';
