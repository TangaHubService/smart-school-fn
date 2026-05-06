import { Clock, Mail, MapPin, Phone } from 'lucide-react';

const contactDetails = [
  {
    icon: MapPin,
    label: 'Address',
    value: 'JQX4+W7R Nyanza, Rwanda',
    href: 'https://maps.app.goo.gl/b5DKTVxiYmGCc6ud6',
    actionLabel: 'Get Directions',
  },
  {
    icon: Phone,
    label: 'Phone',
    value: '+250 781 212 252',
    href: 'tel:+250781212252',
    actionLabel: 'Call Now',
  },
  {
    icon: Mail,
    label: 'Email',
    value: 'smartschoolrwanda@gmail.com',
    href: 'mailto:smartschoolrwanda@gmail.com',
    actionLabel: 'Send Email',
  },
  {
    icon: Clock,
    label: 'Business Hours',
    value: 'Monday - Sunday (24/7)',
    href: null,
    actionLabel: null,
  },
];

export function ContactInfo() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold text-slate-900">Contact Information</h2>
      <p className="mt-1 text-sm text-slate-500">
        Reach out to us through any of these channels.
      </p>

      <div className="mt-6 space-y-4">
        {contactDetails.map((item) => (
          <div
            key={item.label}
            className="flex items-start gap-4 rounded-xl bg-slate-50 p-4 transition hover:bg-slate-100"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-100">
              <item.icon className="h-5 w-5 text-brand-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {item.label}
              </p>
              <p className="mt-1 font-medium text-slate-900">{item.value}</p>
              {item.href && item.actionLabel && (
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-sm font-medium text-brand-600 hover:text-brand-700"
                >
                  {item.actionLabel}
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}