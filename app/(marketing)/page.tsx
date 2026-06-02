import Link from 'next/link';
import {
  Bus,
  Users,
  MapPin,
  CreditCard,
  Shield,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  Clock,
  Bell,
} from 'lucide-react';
import { SUBSCRIPTION_PLANS } from '@/types';

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const features = [
  {
    icon: Users,
    title: 'Owner management',
    description:
      'Register and manage taxi owners with complete profiles, membership status, and documentation tracking.',
  },
  {
    icon: Bus,
    title: 'Fleet oversight',
    description:
      'Track all vehicles in your fleet with registration details, permits, and insurance expiry alerts.',
  },
  {
    icon: MapPin,
    title: 'Route management',
    description:
      'Define and manage taxi routes, assign vehicles, and track route capacity utilisation.',
  },
  {
    icon: CreditCard,
    title: 'Membership billing',
    description:
      'Automated monthly membership fee collection with Paystack integration and payment tracking.',
  },
  {
    icon: Shield,
    title: 'Compliance tracking',
    description:
      'Never miss a permit renewal with automated compliance alerts and document management.',
  },
  {
    icon: BarChart3,
    title: 'Reports & analytics',
    description:
      'Comprehensive dashboards with revenue tracking, member activity, and operational insights.',
  },
];

const stats = [
  { value: '500+', label: 'Associations', sub: 'trust our platform' },
  { value: '50K+', label: 'Vehicles', sub: 'managed monthly' },
  { value: 'R10M+', label: 'Processed', sub: 'in membership fees' },
  { value: '99.9%', label: 'Uptime', sub: 'guaranteed' },
];

const steps = [
  {
    n: '1',
    title: 'Register your association',
    description:
      'Create your account with your association details. Takes less than 5 minutes.',
  },
  {
    n: '2',
    title: 'Add your members',
    description:
      'Import or manually add owners, vehicles, and routes to your system.',
  },
  {
    n: '3',
    title: 'Start managing',
    description:
      'Begin collecting fees, tracking compliance, and generating reports immediately.',
  },
];

const benefits = [
  'No setup fees or long-term contracts',
  'Free 14-day trial with full features',
  'Dedicated support team in South Africa',
  'Mobile-friendly for on-the-go access',
  'Bank-level security for your data',
  'Regular updates and new features',
];

const highlights = [
  {
    icon: Clock,
    title: 'Save time',
    description:
      'Automate repetitive tasks and reduce administrative burden by up to 70%.',
    accent: true,
  },
  {
    icon: CreditCard,
    title: 'Increase collections',
    description:
      'Automated reminders and easy payment options boost collection rates.',
    accent: true,
  },
  {
    icon: Shield,
    title: 'Stay compliant',
    description:
      'Never miss a permit renewal with automated compliance tracking.',
    accent: false,
  },
  {
    icon: Bell,
    title: 'Stay informed',
    description:
      'Real-time notifications keep you updated on important events.',
    accent: false,
  },
];

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

function PrimaryBtn({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-lg bg-foreground px-6 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
    >
      {children}
    </Link>
  );
}

function OutlineBtn({
  href,
  children,
  dark,
}: {
  href: string;
  children: React.ReactNode;
  dark?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 rounded-lg border px-6 py-2.5 text-sm font-medium transition-colors ${
        dark
          ? 'border-white/20 text-white hover:bg-white/10'
          : 'border-border hover:bg-muted'
      }`}
    >
      {children}
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function HomePage() {
  return (
    <>
      {/* ------------------------------------------------------------------ Hero */}
      <section className="relative overflow-hidden bg-foreground text-background">
        {/* Subtle grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff06_1px,transparent_1px),linear-gradient(to_bottom,#ffffff06_1px,transparent_1px)] bg-[size:4rem_4rem]" />

        <div className="relative mx-auto max-w-5xl px-4 py-28 text-center sm:px-6 sm:py-36 lg:px-8">
          {/* <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
            </span>
            Now accepting new associations
          </div> */}

          <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Modern management for{' '}
            <span className="text-green-400">taxi associations</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/70">
            Streamline your taxi association operations with our all-in-one
            platform. Manage owners, vehicles, routes, and membership fees —
            all in one place.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <PrimaryBtn href="/register">
              Start free trial <ArrowRight className="h-4 w-4" />
            </PrimaryBtn>
            <OutlineBtn href="/pricing" dark>
              View pricing
            </OutlineBtn>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      </section>

      {/* ------------------------------------------------------------------ Stats */}
      <section className="border-b bg-muted/30 py-14">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-3xl font-bold sm:text-4xl">{s.value}</p>
                <p className="mt-0.5 text-sm font-medium">{s.label}</p>
                <p className="text-xs text-muted-foreground">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ Features */}
      <section id="features" className="py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need to run your association
            </h2>
            <p className="mt-3 text-muted-foreground">
              All the tools taxi associations need to operate efficiently and
              grow.
            </p>
          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border bg-muted/40 p-5"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-background border">
                  <f.icon className="h-5 w-5 text-foreground" />
                </div>
                <p className="mb-1.5 font-medium">{f.title}</p>
                <p className="text-sm text-muted-foreground">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ How it works */}
      <section className="border-y bg-muted/30 py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Get started in minutes
            </h2>
            <p className="mt-3 text-muted-foreground">
              Our simple onboarding process gets your association up and running
              quickly.
            </p>
          </div>

          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {steps.map((s, i) => (
              <div key={s.n} className="relative">
                {i < steps.length - 1 && (
                  <div className="absolute left-5 top-5 hidden h-px w-full bg-border md:block" />
                )}
                <div className="relative mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background">
                  {s.n}
                </div>
                <p className="mb-1.5 font-medium">{s.title}</p>
                <p className="text-sm text-muted-foreground">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ Benefits */}
      <section className="py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-14 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Built for South African taxi associations
              </h2>
              <p className="mt-3 text-muted-foreground">
                We understand the unique challenges of managing a taxi
                association. Our platform is designed specifically for the South
                African transport industry.
              </p>

              <ul className="mt-7 space-y-3">
                {benefits.map((b) => (
                  <li key={b} className="flex items-start gap-2.5">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
                    <span className="text-sm">{b}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                <PrimaryBtn href="/register">
                  Start your free trial <ArrowRight className="h-4 w-4" />
                </PrimaryBtn>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {highlights.map((h) => (
                <div
                  key={h.title}
                  className={`rounded-xl p-5 ${
                    h.accent
                      ? 'bg-foreground text-background'
                      : 'border bg-muted/40'
                  }`}
                >
                  <h.icon
                    className={`mb-3 h-6 w-6 ${h.accent ? 'text-background/80' : 'text-foreground'}`}
                  />
                  <p className="mb-1 font-medium">{h.title}</p>
                  <p
                    className={`text-sm ${h.accent ? 'text-background/70' : 'text-muted-foreground'}`}
                  >
                    {h.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ CTA */}
      <section
        id="contact"
        className="border-t bg-foreground py-24 text-background"
      >
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to modernise your association?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-white/70">
            Join hundreds of taxi associations already using TaxiSaaS. Start
            your free 14-day trial today — no credit card required.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <PrimaryBtn href="/register">
              Start free trial <ArrowRight className="h-4 w-4" />
            </PrimaryBtn>
            <OutlineBtn href="/pricing" dark>
              Compare plans
            </OutlineBtn>
          </div>
          <p className="mt-6 text-sm text-white/50">
            Questions? Contact us at{' '}
            <a
              href="mailto:info@fleetos.co.za"
              className="text-white/70 underline-offset-4 hover:text-white hover:underline"
            >
              info@fleetos.co.za
            </a>
          </p>
        </div>
      </section>
    </>
  );
}