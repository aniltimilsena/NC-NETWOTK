import SEO from '../components/SEO';
export default function TrustSafety() {
    return (<div className="min-h-screen bg-nc-dark pt-2 pb-24">
      <SEO title="Trust & Safety | Scam Prevention on NepalCasts" description="Learn how NepalCasts protects actors from scams. Read our E-E-A-T verified trust and safety guidelines, how we verify casting directors, and tips for safe auditions."/>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 space-y-4">
          <h1 className="text-4xl sm:text-5xl font-black text-white px-2">Trust & Safety Center</h1>
          <p className="text-nc-secondary text-lg max-w-2xl mx-auto">
            Your safety is our top priority. We maintain strict verification standards to ensure a professional, scam-free casting environment.
          </p>
        </div>

        <div className="space-y-12">
          
          <section className="bg-nc-card border border-nc-border rounded-3xl p-8 sm:p-10">
            <div className="flex gap-4 items-start mb-6">
              <div className="w-12 h-12 rounded-full bg-nc-accent/10 flex items-center justify-center flex-shrink-0 text-nc-accent">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Our Casting Director Verification Protocol</h2>
                <p className="text-nc-muted leading-relaxed">
                  To establish high Experience, Expertise, Authoritativeness, and Trustworthiness (E-E-A-T), NepalCasts employs a rigorous manual verification process before any production house is allowed to post a job.
                </p>
              </div>
            </div>
            
            <div className="grid sm:grid-cols-2 gap-6 pl-0 sm:pl-16">
              <div className="space-y-2">
                <h3 className="font-bold text-white text-lg">1. Identity Verification</h3>
                <p className="text-nc-secondary text-sm">We require government-issued ID and company registration documents from all casting entities.</p>
              </div>
              <div className="space-y-2">
                <h3 className="font-bold text-white text-lg">2. Portfolio Review</h3>
                <p className="text-nc-secondary text-sm">Casting directors must provide verifiable links to previous projects (IMDb, official websites).</p>
              </div>
              <div className="space-y-2">
                <h3 className="font-bold text-white text-lg">3. Communication Check</h3>
                <p className="text-nc-secondary text-sm">Valid corporate email addresses are required. Free domains (e.g., Gmail) undergo extensive secondary checks.</p>
              </div>
              <div className="space-y-2">
                <h3 className="font-bold text-white text-lg">4. The "Verified" Badge</h3>
                <p className="text-nc-secondary text-sm">Only productions passing all checks receive the <span className="text-nc-blue font-black">Verified Check</span> badge on their profiles and listings.</p>
              </div>
            </div>
          </section>

          
          <section className="space-y-8">
            <h2 className="text-3xl font-black text-white border-b border-nc-border pb-4">Actor Scam Prevention Guide</h2>
            
            <div className="grid sm:grid-cols-3 gap-6">
              <div className="bg-nc-surface border border-nc-border rounded-xl p-6 hover:border-red-500/50 transition-colors group">
                <div className="text-nc-muted mb-4 group-hover:text-red-500 transition-colors">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                  </svg>
                </div>
                <h3 className="font-bold text-white mb-2">Never Pay to Audition</h3>
                <p className="text-nc-secondary text-sm">Legitimate casting directors will never ask you for an "audition fee," "registration cost," or require you to use specific paid photographic services.</p>
              </div>
              
              <div className="bg-nc-surface border border-nc-border rounded-xl p-6 hover:border-red-500/50 transition-colors group">
                <div className="text-nc-muted mb-4 group-hover:text-red-500 transition-colors">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                </div>
                <h3 className="font-bold text-white mb-2">Location Safety</h3>
                <p className="text-nc-secondary text-sm">Verified auditions will always take place in studios, offices, or public places. Never agree to audition in a hotel room or private residence.</p>
              </div>
              
              <div className="bg-nc-surface border border-nc-border rounded-xl p-6 hover:border-red-500/50 transition-colors group">
                <div className="text-nc-muted mb-4 group-hover:text-red-500 transition-colors">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
                  </svg>
                </div>
                <h3 className="font-bold text-white mb-2">Keep Comms On-Platform</h3>
                <p className="text-nc-secondary text-sm">Use NepalCasts Messages. Scammers often try to move the conversation immediately to WhatsApp or Telegram to bypass our security filters.</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>);
}
