import { Pricing2 } from '../components/ui/pricing-cards';

export default function Premium({ onNavigate }: { onNavigate: any }) {
  const ncPlans = [
    {
      id: "starter",
      name: "Basic Talent",
      description: "Perfect for getting started",
      monthlyPrice: "Free",
      yearlyPrice: "Free",
      features: [
        { text: "Basic public profile" },
        { text: "3 casting calls per month" },
        { text: "Standard search visibility" },
        { text: "Community access" },
      ],
      button: {
        text: "Current Plan",
        url: "#",
      },
    },
    {
      id: "growth", // Use 'growth' to trigger the "Everything in Starter" logic in the component
      name: "PRO Member",
      description: "For serious professionals",
      monthlyPrice: "Rs 499",
      yearlyPrice: "Rs 399",
      features: [
        { text: "Verified PRO Badge" },
        { text: "Homepage Spotlight visibility" },
        { text: "Unlimited casting calls" },
        { text: "Priority search ranking" },
        { text: "Direct DM to directors" },
        { text: "Advanced Analytics" },
      ],
      button: {
        text: "Upgrade Now",
        url: "#",
      },
    },
  ];

  return (
    <div className="bg-zinc-950 min-h-screen">
      <Pricing2 
        heading="Elevate Your Career"
        description="Join thousands of professionals on NC Network and unlock exclusive opportunities."
        plans={ncPlans}
      />
      

    </div>
  );
}
