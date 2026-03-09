import { Award, Eye, Heart, Lightbulb, Target, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

import aboutImage from '../asset/aboutimage.jpg';
import ceo from '../asset/Picture1.png';
import cto from '../asset/cto.jpeg';
import enock from '../asset/Enock.png';
import olive from '../asset/olive.png';

const team = [
  { name: 'Damascene Sibomana', role: 'Founder/CEO, BSC, MBA, CFA', phone: '+250781212252', image: ceo },
  { name: 'Olive Niyomurinzi', role: 'Customer Relations, BSC', phone: '+250780697816', image: olive },
  { name: 'Enock Iradukunda', role: 'Head of Content, BSC, CPA(R), MBA', phone: '+250788701837', image: enock },
  { name: 'Bertin Niyonkuru', role: 'Software Engineer', phone: '+250783021801', image: cto },
];

const values = [
  { icon: Heart, title: 'Lifelong Learning', description: 'Continuous growth beyond classroom and workplace boundaries.' },
  { icon: Lightbulb, title: 'Innovation', description: 'Practical, modern learning methods driven by technology.' },
  { icon: Users, title: 'Impact', description: 'Measurable transformation for learners, institutions, and communities.' },
  { icon: Award, title: 'Excellence', description: 'Consistent quality in educational delivery and outcomes.' },
];

export function PublicAboutPage() {
  return (
    <main className="bg-white">
      <section
        className="relative flex h-[70vh] items-center justify-center bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${aboutImage})` }}
      >
        <div className="absolute inset-0 bg-black/65" />
        <div className="relative mx-auto w-full max-w-6xl px-4 text-center sm:px-6 lg:px-8">
          <p className="mb-4 text-[11px] font-black uppercase tracking-[0.28em] text-brand-200">Elite Education</p>
          <h1 className="text-3xl font-bold uppercase tracking-tight text-white sm:text-5xl">About Smart School</h1>
          <p className="mx-auto mt-6 hidden max-w-3xl text-lg font-medium text-gray-100 md:block">
            The future of learning beyond classroom walls with practical, adaptive digital education.
          </p>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <div className="mx-auto mb-10 h-1 w-16 rounded-full bg-brand-500" />
          <p className="text-xl leading-relaxed text-slate-700 sm:text-2xl">
            Welcome to <span className="font-bold text-brand-600">Smart School</span>. Continuous learning is made accessible
            through flexible and personalized experiences designed for real life and career growth.
          </p>
        </div>
      </section>

      <section className="bg-slate-50 py-20">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 px-4 sm:px-6 lg:grid-cols-12 lg:px-8">
          <article className="rounded-3xl border border-slate-100 bg-white p-10 shadow-[0_20px_50px_rgba(0,0,0,0.05)] lg:col-span-7">
            <div className="mb-8 inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-brand-50 text-brand-600">
              <Target className="h-7 w-7" />
            </div>
            <h2 className="text-3xl font-bold uppercase tracking-tight text-slate-900">Our Mission</h2>
            <p className="mt-4 text-lg leading-relaxed text-slate-600">
              To close Rwanda’s skills gap by equipping graduates and employees with practical, market-relevant knowledge and
              continuous training that improves readiness, productivity, and national competitiveness.
            </p>
          </article>

          <article className="rounded-3xl bg-brand-600 p-10 text-white shadow-[0_20px_50px_rgba(30,90,168,0.24)] lg:col-span-5">
            <div className="mb-8 inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-white/10">
              <Eye className="h-7 w-7" />
            </div>
            <h2 className="text-3xl font-bold uppercase tracking-tight">Our Vision</h2>
            <p className="mt-4 text-lg leading-relaxed text-white/90">
              Build a future where every Rwandan learner accesses practical lifelong education that drives innovation and supports
              a thriving economy.
            </p>
          </article>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-14 text-center">
            <h2 className="text-2xl font-bold uppercase tracking-tight text-slate-900 sm:text-4xl">Our Core Values</h2>
            <div className="mx-auto mt-6 h-1 w-16 rounded-full bg-brand-500" />
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {values.map((item) => (
              <article
                key={item.title}
                className="group rounded-3xl border border-slate-100 bg-slate-50 p-8 transition hover:-translate-y-1 hover:bg-brand-500 hover:text-white"
              >
                <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-brand-600">
                  <item.icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold uppercase tracking-tight text-slate-900 transition-colors group-hover:text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600 transition-colors group-hover:text-white/85">{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-20">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-14 text-center">
            <h2 className="text-2xl font-bold uppercase tracking-tight text-slate-900 sm:text-4xl">Meet Our Team</h2>
            <p className="mt-4 text-lg text-slate-500">The people behind Smart School.</p>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {team.map((member) => (
              <article
                key={member.name}
                className="rounded-3xl border border-slate-100 bg-white p-6 text-center shadow-[0_20px_50px_rgba(0,0,0,0.03)]"
              >
                <div className="mx-auto mb-6 h-36 w-36 overflow-hidden rounded-full border-4 border-white shadow-md">
                  <img src={member.image} alt={member.name} className="h-full w-full object-cover" />
                </div>
                <h3 className="text-lg font-bold uppercase tracking-tight text-slate-900">{member.name}</h3>
                <p className="mt-2 text-[11px] font-black uppercase tracking-[0.14em] text-brand-600">{member.role}</p>
                <p className="mt-3 text-sm font-medium text-slate-500">{member.phone}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-brand-500 p-12 text-center text-white shadow-[0_30px_60px_rgba(30,90,168,0.30)]">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-500 via-brand-400 to-brand-500 opacity-70" />
            <div className="relative">
              <h2 className="text-2xl font-bold uppercase tracking-tight sm:text-4xl">Ready to Start Learning?</h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-white/90">
                Join thousands of learners already transforming their lives through our platform.
              </p>
              <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
                <Link
                  to="/courses"
                  className="rounded-full bg-white px-9 py-3 text-xs font-black uppercase tracking-[0.14em] text-brand-600"
                >
                  Browse courses
                </Link>
                <Link
                  to="/contact"
                  className="rounded-full border border-white/40 bg-white/10 px-9 py-3 text-xs font-black uppercase tracking-[0.14em] text-white"
                >
                  Contact us
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
