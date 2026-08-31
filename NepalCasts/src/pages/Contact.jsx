import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';
import { Mail, Phone, MapPin, Send, CheckCircle2, ChevronLeft, MessageSquare } from 'lucide-react';

export default function Contact() {
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#141414] pt-4 pb-16 text-white text-left">
      <SEO
        title="Contact Us | NepalCasts Support & Inquiries"
        description="Get in touch with the NepalCasts support team for casting director verification, technical help, partnerships, or general inquiries."
      />
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12 space-y-12">
        {/* Navigation Bar */}
        <div className="flex items-center pt-2">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white transition-all active:scale-95 cursor-pointer shrink-0 shadow-sm"
            title="Go Back"
            aria-label="Go Back"
          >
            <ChevronLeft className="w-5 h-5 text-white" strokeWidth={2.5} />
          </button>
        </div>

        {/* Hero Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 text-white text-xs font-bold uppercase tracking-wider">
            <MessageSquare className="w-4 h-4 text-white" />
            <span>Direct Communication</span>
          </div>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-sans font-black tracking-tight text-white leading-tight">
            Get in <span className="text-[#ffb400]">Touch</span>
          </h1>
          <p className="text-gray-400 text-sm sm:text-base lg:text-lg max-w-lg mx-auto leading-relaxed">
            Have questions about casting calls, account verification, or partnerships? Reach out to our team anytime.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Contact Details */}
          <div className="space-y-4">
            {[
              { icon: Mail, title: 'Email Support', detail: 'support@nepalcasts.com', sub: 'Response within 24 hours' },
              { icon: Phone, title: 'Phone / Inquiries', detail: '+977 980-0000000', sub: 'Sun - Fri, 10am - 6pm' },
              { icon: MapPin, title: 'Studio Office', detail: 'Kathmandu, Nepal', sub: 'Media & Cinema Hub' },
            ].map((info, idx) => (
              <div key={idx} className="p-6 sm:p-7 rounded-2xl bg-[#181818] space-y-2.5 shadow-lg hover:bg-[#1c1c1c] transition-colors">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white">
                  <info.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-sm font-bold text-white">{info.title}</h3>
                <p className="text-sm font-bold text-[#ffb400]">{info.detail}</p>
                <p className="text-xs text-gray-400">{info.sub}</p>
              </div>
            ))}
          </div>

          {/* Form */}
          <div className="lg:col-span-2 p-6 sm:p-10 rounded-2xl bg-[#181818] shadow-xl">
            {submitted ? (
              <div className="py-16 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-white">Message Sent Successfully!</h3>
                <p className="text-sm text-gray-400 max-w-sm mx-auto">
                  Thank you for contacting NepalCasts. Our support team will get back to you shortly.
                </p>
                <button
                  onClick={() => {
                    setSubmitted(false);
                    setFormData({ name: '', email: '', subject: '', message: '' });
                  }}
                  className="mt-2 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-all cursor-pointer"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-300">Your Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Aarav Sharma"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-[#141414] text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#ffb400]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-300">Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="name@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-[#141414] text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#ffb400]"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-300">Subject</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Director Account Verification"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-[#141414] text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#ffb400]"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-300">Message</label>
                  <textarea
                    required
                    rows={5}
                    placeholder="Describe your inquiry in detail..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-[#141414] text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#ffb400] resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#ffb400] hover:bg-[#ffa000] text-black font-bold text-xs uppercase tracking-wider transition-all inline-flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-95"
                >
                  <Send className="w-4 h-4 text-black" />
                  <span>Send Message</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
