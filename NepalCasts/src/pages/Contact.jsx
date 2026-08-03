import React, { useState } from 'react';
import SEO from '../components/SEO';
import { Mail, Phone, MapPin, Send, CheckCircle2 } from 'lucide-react';

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-nc-dark pt-4 pb-12 text-white">
      <SEO
        title="Contact Us | NepalCasts Support & Inquiries"
        description="Get in touch with the NepalCasts support team for casting director verification, technical help, partnerships, or general inquiries."
      />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="text-center space-y-3 pt-6">
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Get in <span className="text-[#00BFFF]">Touch</span>
          </h1>
          <p className="text-gray-400 text-sm max-w-lg mx-auto">
            Have questions about casting calls, account verification, or partnerships? Reach out to our team anytime.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Contact Details */}
          <div className="space-y-6">
            {[
              { icon: Mail, title: 'Email Support', detail: 'support@nepalcasts.com', sub: 'Response within 24 hours' },
              { icon: Phone, title: 'Phone / WhatsApp', detail: '+977 980-0000000', sub: 'Sun - Fri, 10am - 6pm' },
              { icon: MapPin, title: 'Studio Office', detail: 'Kathmandu, Nepal', sub: 'Media & Cinema Hub' },
            ].map((info, idx) => (
              <div key={idx} className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
                <div className="w-10 h-10 rounded-xl bg-[#00BFFF]/10 border border-[#00BFFF]/20 flex items-center justify-center text-[#00BFFF]">
                  <info.icon className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-white">{info.title}</h3>
                <p className="text-xs font-semibold text-[#00BFFF]">{info.detail}</p>
                <p className="text-[11px] text-gray-500">{info.sub}</p>
              </div>
            ))}
          </div>

          {/* Form */}
          <div className="md:col-span-2 p-6 sm:p-8 rounded-3xl bg-white/[0.02] border border-white/10">
            {submitted ? (
              <div className="py-12 text-center space-y-4">
                <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto" />
                <h3 className="text-xl font-bold text-white">Message Sent Successfully!</h3>
                <p className="text-xs text-gray-400 max-w-xs mx-auto">
                  Thank you for contacting NepalCasts. Our support team will get back to you shortly.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="px-6 py-2.5 rounded-full bg-white/10 text-white text-xs font-bold hover:bg-white/20 transition-all"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-300">Your Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Aarav Sharma"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-gray-600 focus:border-[#00BFFF] focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-300">Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="name@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-gray-600 focus:border-[#00BFFF] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-300">Subject</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Director Account Verification"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-gray-600 focus:border-[#00BFFF] focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-300">Message</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Describe your inquiry or question..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-gray-600 focus:border-[#00BFFF] focus:outline-none resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-full bg-[#00BFFF] text-black font-bold text-xs uppercase tracking-wider hover:brightness-110 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Submit Message</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
