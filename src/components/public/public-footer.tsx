import { Facebook, Instagram, Linkedin, Mail, MapPin, Phone, Twitter } from 'lucide-react';
import { Link } from 'react-router-dom';

import logo from '../../asset/logo.jpg';

export function PublicFooter() {
  return (
    <footer className="border-t border-white/5 bg-slate-950 py-16 text-slate-300">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-6">
            <Link to="/" className="flex items-center gap-3">
              <img src={logo} alt="SmartSchool logo" className="h-10 w-10 rounded-lg shadow-lg" />
              <span className="text-xl font-bold tracking-tight text-white">Smart school</span>
            </Link>
            <p className="max-w-xs text-[13px] leading-relaxed text-slate-400">
              Empowering the next generation of leaders in Rwanda through practical digital education.
            </p>
            <div className="flex gap-3">
              {[Facebook, Twitter, Instagram, Linkedin].map((Icon, index) => (
                <a
                  key={index}
                  href="#"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 transition-all hover:bg-brand-500 hover:text-white"
                >
                  <Icon className="h-3.5 w-3.5" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="mb-6 text-[11px] font-bold uppercase tracking-[0.2em] text-brand-300">Platform</h4>
            <ul className="space-y-3 text-[13px]">
              <li>
                <Link to="/courses" className="transition-colors hover:text-brand-300">
                  Courses
                </Link>
              </li>
              <li>
                <Link to="/tuition" className="transition-colors hover:text-brand-300">
                  Pricing & Tuition
                </Link>
              </li>
              <li>
                <Link to="/job-listing" className="transition-colors hover:text-brand-300">
                  Career Portal
                </Link>
              </li>
              <li>
                <Link to="/about" className="transition-colors hover:text-brand-300">
                  Our Mission
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-6 text-[11px] font-bold uppercase tracking-[0.2em] text-brand-300">Support</h4>
            <ul className="space-y-3 text-[13px]">
              <li>
                <Link to="/contact" className="transition-colors hover:text-brand-300">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link to="/login" className="transition-colors hover:text-brand-300">
                  Help Center
                </Link>
              </li>
              <li>
                <Link to="/login" className="transition-colors hover:text-brand-300">
                  Student Portal
                </Link>
              </li>
              <li>
                <Link to="/login" className="transition-colors hover:text-brand-300">
                  Exam Access
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-6 text-[11px] font-bold uppercase tracking-[0.2em] text-brand-300">Connect</h4>
            <ul className="space-y-4 text-[13px]">
              <li className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 text-brand-300" />
                <span>JQX4+W7R Nyanza, Rwanda</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-brand-300" />
                <span>smartschoolrwanda@gmail.com</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-brand-300" />
                <span>+250 781 212 252</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-8 md:flex-row">
          <p className="text-[11px] uppercase tracking-wider text-slate-500">
            © {new Date().getFullYear()} Smart school Learning Platform. All rights reserved.
          </p>
          <div className="flex gap-6 text-[11px] uppercase tracking-wider text-slate-500">
            <a href="#" className="transition-colors hover:text-brand-300">
              Privacy
            </a>
            <a href="#" className="transition-colors hover:text-brand-300">
              Terms
            </a>
            <a href="#" className="transition-colors hover:text-brand-300">
              Cookies
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
