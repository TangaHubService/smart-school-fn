import { MapPin } from 'lucide-react';

interface MapSectionProps {
  address?: string;
  embedUrl?: string;
}

export function MapSection({
  address = 'JQX4+W7R Nyanza, Rwanda',
  embedUrl = 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3989.815!2d29.75!3s-2.15!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2sNyanza%2C%20Rwanda!5e0!3m2!1sen!2srw!4v1',
}: MapSectionProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
        <MapPin className="h-5 w-5 text-brand-600" />
        <h2 className="text-lg font-bold text-slate-900">Find Us</h2>
      </div>

      <div className="relative h-64 w-full md:h-80">
        <iframe
          title="School Location Map"
          src={embedUrl}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="absolute inset-0 h-full w-full"
        />
      </div>

      <div className="bg-slate-50 px-6 py-4">
        <p className="text-sm font-medium text-slate-600">{address}</p>
        <a
          href="https://maps.app.goo.gl/b5DKTVxiYmGCc6ud6"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          Open in Google Maps →
        </a>
      </div>
    </div>
  );
}