import { Book, Mail, Send } from 'lucide-react';
import { useState } from 'react';

import { SectionCard } from '../components/section-card';

// TODO: Replace with API call when backend is ready
// import { useMutation, useQuery } from '@tanstack/react-query';
// import { createSupportTicketApi, listFaqApi } from '../features/support/support.api';

const DUMMY_FAQ = [
  { id: '1', q: 'How do I add a new school?', a: 'Go to Schools Management and click Create School.' },
  { id: '2', q: 'How do I reset a user password?', a: 'Use User Management to send a password reset email.' },
  { id: '3', q: 'How do I export reports?', a: 'Go to Reports & Analytics and use the Export button.' },
  { id: '4', q: 'Who do I contact for billing?', a: 'Email billing@smartschool.rw for billing inquiries.' },
];

export function SupportCenterPage() {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // TODO: Integrate with backend when API is available
  // const { data: faq } = useQuery({ queryKey: ['faq'], queryFn: () => listFaqApi(accessToken) });
  // const createTicket = useMutation({ mutationFn: createSupportTicketApi });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setSubject('');
    setMessage('');
  };

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Support Center</h1>
        <p className="mt-1 text-sm text-slate-600">
          FAQs and contact support. Ready for backend integration.
        </p>
      </div>

      <SectionCard title="Frequently Asked Questions" subtitle="Quick answers">
        <div className="space-y-4">
          {DUMMY_FAQ.map((item) => (
            <details
              key={item.id}
              className="group rounded-lg border border-brand-100 bg-white"
            >
              <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 font-medium text-slate-900">
                <Book className="h-4 w-4 shrink-0 text-brand-500" />
                {item.q}
              </summary>
              <p className="border-t border-brand-50 px-4 py-3 text-sm text-slate-600">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Contact Support" subtitle="Submit a ticket">
        {submitted ? (
          <div className="rounded-lg bg-green-50 p-4 text-center text-green-700">
            <Mail className="mx-auto h-10 w-10" />
            <p className="mt-2 font-medium">Ticket submitted</p>
            <p className="text-sm">We will respond within 24 hours.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief description of your issue"
                className="mt-1 h-10 w-full rounded-lg border border-brand-200 px-3 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your issue in detail..."
                rows={4}
                className="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
                required
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
            >
              <Send className="h-4 w-4" />
              Submit Ticket
            </button>
          </form>
        )}
      </SectionCard>
    </section>
  );
}
