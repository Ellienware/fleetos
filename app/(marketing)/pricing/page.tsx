import type { Metadata } from 'next';
import Link from 'next/link';
import { Check, ArrowRight } from 'lucide-react';
import { SUBSCRIPTION_PLANS } from '@/types';

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'Simple, transparent pricing for taxi associations of all sizes.',
};

const faqs = [
  {
    q: 'Can I try before I buy?',
    a: 'Yes! Every plan comes with a free 14-day trial. No credit card required to get started.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept all major South African bank cards, EFT payments, and mobile money through Paystack.',
  },
  {
    q: 'Can I change plans later?',
    a: 'Absolutely. You can upgrade or downgrade your plan at any time. Changes take effect on your next billing cycle.',
  },
  {
    q: "What happens if I exceed my plan limits?",
    a: "We'll notify you when you're approaching your limits. You can either upgrade your plan or we'll work with you to find a solution.",
  },
  {
    q: 'Do you offer discounts for yearly billing?',
    a: 'Yes! Pay annually and get 2 months free on any plan. Contact us for yearly pricing.',
  },
  {
    q: 'Is my data secure?',
    a: 'Absolutely. We use bank-level encryption and our servers are hosted in South Africa for data sovereignty compliance.',
  },
];

const planDescriptions: Record<string, string> = {
  starter: 'Perfect for small associations',
  growth: 'For growing associations',
  enterprise: 'For large associations',
};

export default function PricingPage() {
  return (
    <div className="py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mx-auto max-w-xl text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Simple, transparent pricing
          </h1>
          <p className="mt-4 text-muted-foreground">
            Choose the perfect plan for your association. All plans include a
            free 14-day trial.
          </p>
        </div>

        {/* Plans */}
        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {SUBSCRIPTION_PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-xl border p-6 ${
                plan.recommended
                  ? 'border-2 border-foreground'
                  : 'bg-muted/30'
              }`}
            >
              {plan.recommended && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-foreground px-3 py-1 text-xs font-medium text-background">
                    Most popular
                  </span>
                </div>
              )}

              <div className={plan.recommended ? 'mt-3' : ''}>
                <p className="font-semibold">{plan.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {planDescriptions[plan.id]}
                </p>
                <div className="mt-4">
                  <span className="text-3xl font-bold">
                    R{plan.price.toLocaleString('en-ZA')}
                  </span>
                  <span className="text-sm text-muted-foreground">/month</span>
                </div>
              </div>

              <ul className="my-6 flex-1 space-y-2.5">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/register"
                className={`flex w-full items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90 ${
                  plan.recommended
                    ? 'bg-foreground text-background'
                    : 'border border-border hover:bg-muted'
                }`}
              >
                Start free trial
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ))}
        </div>

        {/* All-plan note */}
        <p className="mt-8 text-center text-sm text-muted-foreground">
          All plans include: secure data storage · email support · mobile access · regular updates
        </p>

        {/* FAQ */}
        <div className="mt-24">
          <h2 className="text-center text-2xl font-bold">
            Frequently asked questions
          </h2>
          <div className="mt-10 grid gap-8 md:grid-cols-2">
            {faqs.map((faq) => (
              <div key={faq.q}>
                <p className="font-medium">{faq.q}</p>
                <p className="mt-1.5 text-sm text-muted-foreground">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Custom CTA */}
        <div className="mt-20 rounded-xl border bg-muted/40 p-8 text-center sm:p-12">
          <h2 className="text-2xl font-bold">Need a custom solution?</h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            For associations with special requirements or multiple branches, we
            offer custom enterprise solutions. Contact us to discuss your needs.
          </p>
          <a
            href="mailto:enterprise@taxisaas.co.za"
            className="mt-6 inline-flex items-center gap-1.5 rounded-lg border border-border px-5 py-2 text-sm font-medium hover:bg-muted"
          >
            Contact sales
          </a>
        </div>

      </div>
    </div>
  );
}