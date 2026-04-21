'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Building2,
  CreditCard,
  Bell,
  Shield,
  Save,
  Upload,
  Globe,
  Clock,
  DollarSign,
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Tab = 'general' | 'billing' | 'notifications' | 'security';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'general', label: 'General', icon: <Building2 className="h-3.5 w-3.5" /> },
  { id: 'billing', label: 'Billing', icon: <CreditCard className="h-3.5 w-3.5" /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell className="h-3.5 w-3.5" /> },
  { id: 'security', label: 'Security', icon: <Shield className="h-3.5 w-3.5" /> },
];

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

function Field({
  label,
  children,
  span2,
}: {
  label: string;
  children: React.ReactNode;
  span2?: boolean;
}) {
  return (
    <div className={cn('space-y-1.5', span2 && 'md:col-span-2')}>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
    />
  );
}

function NativeSelect({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
    >
      {children}
    </select>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <p className="text-sm font-medium">{title}</p>
      {description && (
        <p className="mt-0.5 mb-4 text-xs text-muted-foreground">{description}</p>
      )}
      {!description && <div className="mb-4" />}
      {children}
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
  children,
}: {
  label: string;
  description?: string;
  checked?: boolean;
  onCheckedChange?: (v: boolean) => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between border-b py-3 last:border-none last:pb-0 first:pt-0">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      {children ?? (
        <Switch checked={checked} onCheckedChange={onCheckedChange} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [isSaving, setIsSaving] = useState(false);

  // General
  const [associationName, setAssociationName] = useState(
    'Gauteng United Taxi Association'
  );
  const [registrationNumber, setRegistrationNumber] = useState('REG-2020-001234');
  const [address, setAddress] = useState('123 Main Road, Johannesburg, 2000');
  const [phone, setPhone] = useState('+27 11 123 4567');
  const [email, setEmail] = useState('info@guta.co.za');
  const [timezone, setTimezone] = useState('africa/johannesburg');
  const [dateFormat, setDateFormat] = useState('dd/mm/yyyy');

  // Billing
  const [membershipFee, setMembershipFee] = useState('500');
  const [billingDay, setBillingDay] = useState('1');

  // Notifications
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [paymentReminders, setPaymentReminders] = useState(true);
  const [complianceAlerts, setComplianceAlerts] = useState(true);

  // Security
  const [twoFactor, setTwoFactor] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState('30');

  async function handleSave() {
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    setIsSaving(false);
    toast.success('Settings saved');
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Manage your association settings and preferences
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-1.5 rounded-md bg-foreground px-3.5 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-background border-t-transparent" />
              Saving…
            </>
          ) : (
            <>
              <Save className="h-3.5 w-3.5" />
              Save changes
            </>
          )}
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-lg bg-muted/50 p-1 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* General */}
      {activeTab === 'general' && (
        <div className="space-y-5">
          <SectionCard
            title="Association profile"
            description="Basic information about your taxi association"
          >
            {/* Logo */}
            <div className="mb-5 flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-muted text-lg font-semibold text-muted-foreground">
                GU
              </div>
              <div className="space-y-1">
                <button className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted">
                  <Upload className="h-3.5 w-3.5" />
                  Upload logo
                </button>
                <p className="text-xs text-muted-foreground">
                  Recommended: 200×200px, PNG or JPG
                </p>
              </div>
            </div>

            <div className="h-px bg-border mb-5" />

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Association name">
                <TextInput value={associationName} onChange={setAssociationName} />
              </Field>
              <Field label="Registration number">
                <TextInput
                  value={registrationNumber}
                  onChange={setRegistrationNumber}
                />
              </Field>
              <Field label="Address" span2>
                <Textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={2}
                />
              </Field>
              <Field label="Phone number">
                <TextInput value={phone} onChange={setPhone} type="tel" />
              </Field>
              <Field label="Email address">
                <TextInput value={email} onChange={setEmail} type="email" />
              </Field>
            </div>
          </SectionCard>

          <SectionCard
            title="Regional settings"
            description="Configure timezone and regional preferences"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Timezone">
                <div className="relative">
                  <Globe className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full rounded-md border border-border bg-background py-1.5 pl-8 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="africa/johannesburg">
                      Africa/Johannesburg (SAST)
                    </option>
                    <option value="africa/cairo">Africa/Cairo (EET)</option>
                    <option value="utc">UTC</option>
                  </select>
                </div>
              </Field>
              <Field label="Date format">
                <div className="relative">
                  <Clock className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <select
                    value={dateFormat}
                    onChange={(e) => setDateFormat(e.target.value)}
                    className="w-full rounded-md border border-border bg-background py-1.5 pl-8 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="dd/mm/yyyy">DD/MM/YYYY</option>
                    <option value="mm/dd/yyyy">MM/DD/YYYY</option>
                    <option value="yyyy-mm-dd">YYYY-MM-DD</option>
                  </select>
                </div>
              </Field>
            </div>
          </SectionCard>
        </div>
      )}

      {/* Billing */}
      {activeTab === 'billing' && (
        <div className="space-y-5">
          <SectionCard
            title="Subscription status"
            description="Your current plan and billing details"
          >
            <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3.5">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">Growth Plan</p>
                  <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-950 dark:text-green-200">
                    Active
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Up to 200 owners · 500 vehicles · 50 routes
                </p>
              </div>
              <div className="text-right">
                <p className="text-xl font-semibold">R 1,500</p>
                <p className="text-xs text-muted-foreground">per month</p>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted">
                Change plan
              </button>
              <button className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted">
                View invoices
              </button>
            </div>
          </SectionCard>

          <SectionCard
            title="Membership fee settings"
            description="Configure how owners pay their membership fees"
          >
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Monthly fee (ZAR)">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    R
                  </span>
                  <input
                    type="number"
                    value={membershipFee}
                    onChange={(e) => setMembershipFee(e.target.value)}
                    className="w-full rounded-md border border-border bg-background py-1.5 pl-7 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </Field>
              <Field label="Currency">
                <NativeSelect value="ZAR" onChange={() => {}}>
                  <option value="ZAR">ZAR — South African Rand</option>
                </NativeSelect>
              </Field>
              <Field label="Billing day">
                <NativeSelect value={billingDay} onChange={setBillingDay}>
                  <option value="1">1st of month</option>
                  <option value="15">15th of month</option>
                  <option value="last">Last day of month</option>
                </NativeSelect>
              </Field>
            </div>
          </SectionCard>

          <SectionCard
            title="Payment methods"
            description="Accepted payment methods for owner payments"
          >
            <div className="space-y-0">
              <div className="flex items-center justify-between border-b py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50 dark:bg-green-950">
                    <CreditCard className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Paystack</p>
                    <p className="text-xs text-muted-foreground">
                      Cards, Bank Transfer, USSD
                    </p>
                  </div>
                </div>
                <span className="rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300">
                  Connected
                </span>
              </div>
              <div className="flex items-center justify-between pt-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Cash payments</p>
                    <p className="text-xs text-muted-foreground">
                      Manual recording
                    </p>
                  </div>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
          </SectionCard>
        </div>
      )}

      {/* Notifications */}
      {activeTab === 'notifications' && (
        <div className="space-y-5">
          <SectionCard
            title="Notification channels"
            description="Choose how you want to receive notifications"
          >
            <div className="space-y-0">
              <ToggleRow
                label="Email notifications"
                description="Receive updates via email"
                checked={emailNotifications}
                onCheckedChange={setEmailNotifications}
              />
              <ToggleRow
                label="SMS notifications"
                description="Receive urgent alerts via SMS"
                checked={smsNotifications}
                onCheckedChange={setSmsNotifications}
              />
            </div>
          </SectionCard>

          <SectionCard
            title="Notification types"
            description="Configure which events trigger notifications"
          >
            <div className="space-y-0">
              <ToggleRow
                label="Payment reminders"
                description="Remind owners about upcoming and overdue payments"
                checked={paymentReminders}
                onCheckedChange={setPaymentReminders}
              />
              <ToggleRow
                label="Compliance alerts"
                description="Notify about expiring permits and documents"
                checked={complianceAlerts}
                onCheckedChange={setComplianceAlerts}
              />
            </div>
          </SectionCard>
        </div>
      )}

      {/* Security */}
      {activeTab === 'security' && (
        <div className="space-y-5">
          <SectionCard
            title="Access control"
            description="Manage who can access your association data"
          >
            <div className="space-y-0">
              <ToggleRow
                label="Two-factor authentication"
                description="Require 2FA for admin accounts"
                checked={twoFactor}
                onCheckedChange={setTwoFactor}
              />
              <ToggleRow
                label="Session timeout"
                description="Auto-logout after inactivity"
              >
                <NativeSelect
                  value={sessionTimeout}
                  onChange={setSessionTimeout}
                >
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="60">1 hour</option>
                  <option value="never">Never</option>
                </NativeSelect>
              </ToggleRow>
            </div>
          </SectionCard>

          <SectionCard
            title="Audit log"
            description="Track all administrative actions"
          >
            <p className="text-sm text-muted-foreground">
              Recent activity will be displayed here. Audit logging helps track
              changes made by administrators.
            </p>
            <button className="mt-4 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted">
              View full audit log
            </button>
          </SectionCard>
        </div>
      )}
    </div>
  );
}
