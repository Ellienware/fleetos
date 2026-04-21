import type { Metadata } from 'next';
import Link from 'next/link';
import { Bus } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Authentication',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-md">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Bus className="h-6 w-6" />
          </div>
          <span className="text-xl font-bold text-foreground">TaxiSaaS</span>
        </Link>
        {children}
      </div>
    </div>
  );
}
