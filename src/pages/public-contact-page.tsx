import { ContactForm, ContactInfo, HeroSection, MapSection } from '../components/contact';

export function PublicContactPage() {
  return (
    <main className="bg-slate-50">
      <HeroSection />

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-2">
          <ContactForm />
          <ContactInfo />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
        <MapSection />
      </section>
    </main>
  );
}
