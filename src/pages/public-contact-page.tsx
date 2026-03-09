import { Clock, Mail, Map, MapPin, Phone, Send } from 'lucide-react';
import { FormEvent, useState } from 'react';

import backgroundImage from '../asset/background.jpg';
import { useToast } from '../components/toast';

const contactInfo = [
  {
    title: 'Address',
    value: 'JQX4+W7R Nyanza, Rwanda',
    link: 'https://maps.app.goo.gl/b5DKTVxiYmGCc6ud6',
    linkLabel: 'View on map',
    icon: MapPin,
    accent: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  {
    title: 'Phone',
    value: '+250 781 212 252',
    link: 'tel:+250781212252',
    linkLabel: 'Call us',
    icon: Phone,
    accent: 'text-brand-600',
    bg: 'bg-brand-50',
  },
  {
    title: 'Email',
    value: 'smartschoolrwanda@gmail.com',
    link: 'mailto:smartschoolrwanda@gmail.com',
    linkLabel: 'Email us',
    icon: Mail,
    accent: 'text-teal-600',
    bg: 'bg-teal-50',
  },
  {
    title: 'Business Hours',
    value: 'Monday - Sunday (24/7)',
    icon: Clock,
    accent: 'text-orange-600',
    bg: 'bg-orange-50',
  },
];

export function PublicContactPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) {
      return;
    }

    const form = event.currentTarget;
    setLoading(true);

    window.setTimeout(() => {
      setLoading(false);
      form.reset();
      showToast({
        type: 'success',
        title: 'Message sent',
        message: 'Your message has been received. We will get back to you soon.',
      });
    }, 750);
  };

  return (
    <main className="bg-white">
      <section
        className="relative flex h-[60vh] items-center justify-center bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      >
        <div className="absolute inset-0 bg-black/65" />
        <div className="relative mx-auto w-full max-w-6xl px-4 text-center sm:px-6 lg:px-8">
          <p className="mb-4 text-[11px] font-black uppercase tracking-[0.28em] text-brand-200">Get In Touch</p>
          <h1 className="text-3xl font-bold uppercase tracking-tight text-white sm:text-5xl">Contact Us</h1>
          <p className="mx-auto mt-6 hidden max-w-2xl text-lg font-medium text-gray-200 md:block">
            Have questions or need assistance? Our team is ready to support your learning journey.
          </p>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-12 lg:px-8">
        <article className="lg:col-span-7">
          <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-[0_30px_80px_rgba(0,0,0,0.06)] md:p-10">
            <h2 className="text-2xl font-bold uppercase tracking-tight text-slate-900">Send us a message</h2>
            <form onSubmit={handleSubmit} className="mt-8 grid gap-6">
              <div className="grid gap-6 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="ml-4 text-[11px] font-black uppercase tracking-[0.14em] text-brand-600">Full Name</span>
                  <input
                    name="name"
                    required
                    placeholder="John Doe"
                    className="rounded-full bg-slate-50 px-5 py-3.5 text-sm font-medium text-slate-700 outline-none ring-1 ring-transparent transition focus:ring-brand-300"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="ml-4 text-[11px] font-black uppercase tracking-[0.14em] text-brand-600">Email Address</span>
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="john@example.com"
                    className="rounded-full bg-slate-50 px-5 py-3.5 text-sm font-medium text-slate-700 outline-none ring-1 ring-transparent transition focus:ring-brand-300"
                  />
                </label>
              </div>

              <label className="grid gap-2">
                <span className="ml-4 text-[11px] font-black uppercase tracking-[0.14em] text-brand-600">Subject</span>
                <input
                  name="subject"
                  required
                  placeholder="How can we help?"
                  className="rounded-full bg-slate-50 px-5 py-3.5 text-sm font-medium text-slate-700 outline-none ring-1 ring-transparent transition focus:ring-brand-300"
                />
              </label>

              <label className="grid gap-2">
                <span className="ml-4 text-[11px] font-black uppercase tracking-[0.14em] text-brand-600">Your Message</span>
                <textarea
                  name="message"
                  required
                  rows={5}
                  placeholder="Tell us what you need..."
                  className="resize-none rounded-2xl bg-slate-50 px-5 py-4 text-sm font-medium text-slate-700 outline-none ring-1 ring-transparent transition focus:ring-brand-300"
                />
              </label>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-500 px-6 py-4 text-xs font-black uppercase tracking-[0.14em] text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <Clock className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    Send Message
                    <Send className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </article>

        <aside className="space-y-8 lg:col-span-5">
          <h3 className="text-2xl font-bold uppercase tracking-tight text-slate-900">Contact Link</h3>
          <div className="grid gap-5">
            {contactInfo.map((item) => (
              <article
                key={item.title}
                className="group flex items-center gap-5 rounded-3xl border border-transparent bg-slate-50 p-5 transition hover:border-brand-100 hover:bg-white hover:shadow-[0_20px_50px_rgba(0,0,0,0.04)]"
              >
                <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${item.bg}`}>
                  <item.icon className={`h-5 w-5 ${item.accent}`} />
                </div>
                <div>
                  <h4 className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">{item.title}</h4>
                  <p className="mt-1 text-sm font-semibold text-slate-800">{item.value}</p>
                  {item.link ? (
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-brand-600 hover:text-brand-700"
                    >
                      {item.linkLabel}
                      <Map className="h-3.5 w-3.5" />
                    </a>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </aside>
      </section>
    </main>
  );
}
