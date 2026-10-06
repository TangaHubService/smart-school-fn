import { Mail, MapPin, Phone, Send } from 'lucide-react';
import { FormEvent, useState } from 'react';

import { useToast } from '../toast';
import { useAuth } from '../../features/auth/auth.context';
import { uploadFileToCloudinary } from '../../features/sprint4/cloudinary-upload';
import {
  createPublicTicketApi,
  uploadTicketFiles,
  validateTicketFiles,
} from '../../features/support/support.api';

interface FormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
  files?: string;
}

export function ContactForm() {
  const { showToast } = useToast();
  const auth = useAuth();
  const [loading, setLoading] = useState(false);
  const [ticketNumber, setTicketNumber] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.subject.trim()) {
      newErrors.subject = 'Subject is required';
    }

    if (!formData.message.trim() || formData.message.trim().length < 10) {
      newErrors.message = 'Message must be at least 10 characters';
    }

    const fileError = validateTicketFiles(files);
    if (fileError) newErrors.files = fileError;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading || !validateForm()) {
      return;
    }

    setLoading(true);
    try {
      // Authenticated users get secure Cloudinary uploads (purpose 'support')
      // linked as file URLs. Anonymous messages carry file metadata so the
      // help desk can request the files when following up.
      const attachments = files.length
        ? auth.accessToken
          ? await uploadTicketFiles(auth.accessToken, files, uploadFileToCloudinary)
          : files.map((f) => ({
              originalName: f.name,
              mimeType: f.type || undefined,
              sizeBytes: f.size,
            }))
        : undefined;
      const ticket = await createPublicTicketApi({
        name: formData.name.trim(),
        email: formData.email.trim(),
        subject: formData.subject.trim(),
        message: formData.message.trim(),
        attachments,
      });
      setTicketNumber(ticket.ticketNumber);
      setFormData({ name: '', email: '', subject: '', message: '' });
      setFiles([]);
      showToast({
        type: 'success',
        title: 'Message sent',
        message: `Ticket ${ticket.ticketNumber} created. We will respond within 24 hours.`,
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Send failed',
        message: err instanceof Error ? err.message : 'Could not send your message. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <h2 className="text-xl font-bold text-slate-900">Send us a Message</h2>
      <p className="mt-1 text-sm text-slate-500">
        Fill out the form below and we will get back to you within 24 hours.
      </p>

      {ticketNumber && (
        <p className="mt-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
          Ticket <span className="font-semibold">{ticketNumber}</span> created. Save this number to
          track your request.
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-6 grid gap-5">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-1.5">
            <label
              htmlFor="name"
              className="text-xs font-semibold uppercase tracking-wide text-slate-600"
            >
              Full Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              placeholder="John Doe"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="text-xs font-semibold uppercase tracking-wide text-slate-600"
            >
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="john@example.com"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
          </div>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="subject"
            className="text-xs font-semibold uppercase tracking-wide text-slate-600"
          >
            Subject
          </label>
          <input
            id="subject"
            name="subject"
            type="text"
            value={formData.subject}
            onChange={handleChange}
            placeholder="How can we help you?"
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          {errors.subject && <p className="text-xs text-red-500">{errors.subject}</p>}
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="message"
            className="text-xs font-semibold uppercase tracking-wide text-slate-600"
          >
            Message
          </label>
          <textarea
            id="message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            rows={5}
            placeholder="Tell us more about what you need..."
            className="w-full resize-none rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          {errors.message && <p className="text-xs text-red-500">{errors.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="attachments"
            className="text-xs font-semibold uppercase tracking-wide text-slate-600"
          >
            Attachments (optional, max 5, 10MB each: PDF, Word, PNG, JPG, TXT, CSV)
          </label>
          <input
            id="attachments"
            type="file"
            multiple
            onChange={(e) => {
              setFiles(Array.from(e.target.files ?? []).slice(0, 5));
              setErrors((prev) => ({ ...prev, files: undefined }));
            }}
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-700"
          />
          {files.length > 0 && (
            <ul className="space-y-1 text-xs text-slate-600">
              {files.map((f) => (
                <li key={`${f.name}-${f.size}`}>
                  {f.name} ({(f.size / 1024).toFixed(1)} KB)
                </li>
              ))}
            </ul>
          )}
          {errors.files && <p className="text-xs text-red-500">{errors.files}</p>}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? (
            <>
              <Send className="h-4 w-4 animate-spin" />
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
  );
}
