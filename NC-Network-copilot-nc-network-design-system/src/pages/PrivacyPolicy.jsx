export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-nc-dark pt-2 pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl sm:text-4xl font-black text-white mb-8">Privacy Policy</h1>
        
        <div className="bg-nc-surface border border-nc-border rounded-2xl p-6 sm:p-10 space-y-8 text-nc-secondary leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-white mb-4">1. Information We Collect</h2>
            <p>At NepalCasts, we collect primary data explicitly provided by our talent including email addresses, phone numbers, location data, roles, skills, and portfolio media. We also collect usage data (IP addresses, browser types) automatically to improve the platform experience.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4">2. How We Use Your Information</h2>
            <p>Your personal information is used directly to facilitate connections between casting directors, producers, and talents. Key data such as contact details are only visible to verified parties when you apply or explicitly allow visibility.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4">3. Data Sharing and Third Parties</h2>
            <p>We do not sell your personal data to advertisers. Information may be shared with trusted third-party services that assist in securely operating our website (e.g., cloud hosting, secure payment processors), and as required by law.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4">4. Security</h2>
            <p>We implement a variety of security measures including SSL encryption and secure databases to maintain the safety of your personal information when you enter, submit, or access that information.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4">5. Contact Us</h2>
            <p>If you have any questions regarding this privacy policy, you may contact us using the information on our main contact page or email us at privacy@nepalcasts.com.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
