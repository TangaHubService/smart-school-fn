import { Mail, MessageSquare, Phone } from 'lucide-react';

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-16 md:py-24">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute left-10 top-10 h-32 w-32 rounded-full bg-brand-500 blur-3xl" />
        <div className="absolute bottom-10 right-10 h-40 w-40 rounded-full bg-teal-500 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 md:px-8">
        <div className="mb-6 flex justify-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/20">
            <MessageSquare className="h-6 w-6 text-brand-400" />
          </div>
        </div>

        <h1 className="text-4xl font-bold tracking-tight text-white md:text-5xl lg:text-6xl">
          Get in Touch
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-300 md:text-xl">
          Have questions or need assistance? Our team is here to help you with any inquiries about
          Smart School Rwanda.
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-6 md:gap-8">
          <div className="flex items-center gap-3 text-slate-300">
            <Mail className="h-5 w-5 text-brand-400" />
            <span className="text-sm font-medium">smartschoolrwanda@gmail.com</span>
          </div>
          <div className="flex items-center gap-3 text-slate-300">
            <Phone className="h-5 w-5 text-brand-400" />
            <span className="text-sm font-medium">+250 781 212 252</span>
          </div>
        </div>
      </div>
    </section>
  );
}
