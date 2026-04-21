'use client';

import { useState, useEffect, useTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2, AlertCircle } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { getAnnouncementAction, updateAnnouncementAction } from '../../../actions';

type AnnouncementType = 'announcement' | 'compliance' | 'system' | 'payment';
type Priority = 'low' | 'medium' | 'high';

export default function EditAnnouncementPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.tenantId as string;
  const announcementId = params.announcementId as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'announcement' as AnnouncementType,
    priority: 'medium' as Priority,
  });

  useEffect(() => {
    async function fetchAnnouncement() {
      try {
        const result = await getAnnouncementAction(announcementId);
        if (result.success && result.data) {
          const a = result.data;
          setFormData({
            title: a.title,
            message: a.message,
            type: a.type as AnnouncementType,
            priority: a.priority as Priority,
          });
        } else {
          setFetchError(result.error || 'Announcement not found');
        }
      } catch {
        setFetchError('Failed to load announcement');
      } finally {
        setIsLoading(false);
      }
    }
    fetchAnnouncement();
  }, [announcementId]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.message) {
      setError('Title and message are required');
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const result = await updateAnnouncementAction(
          tenantId,
          announcementId,
          formData
        );
        if (result.success) {
          toast.success('Announcement updated successfully');
          router.push(`/tenant/${tenantId}/announcements`);
        } else {
          setError(result.error || 'Failed to update announcement');
        }
      } catch {
        setError('An unexpected error occurred');
      }
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-md" />
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3.5 w-32" />
          </div>
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-5">
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  // Fetch error state
  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-lg font-medium">Announcement not found</p>
        <p className="mt-1 text-sm text-muted-foreground">{fetchError}</p>
        <Link
          href={`/tenant/${tenantId}/announcements`}
          className="mt-4 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
        >
          Back to announcements
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/tenant/${tenantId}/announcements`}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit announcement</h1>
          <p className="text-sm text-muted-foreground">
            Update your broadcast message
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-5 lg:grid-cols-3">
          {/* Main content */}
          <div className="space-y-5 lg:col-span-2">
            <div className="rounded-xl border bg-card p-5">
              <p className="mb-0.5 text-sm font-medium">Announcement details</p>
              <p className="mb-4 text-xs text-muted-foreground">
                Modify the content of your announcement
              </p>

              {error && (
                <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3.5 py-3 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="title" className="text-xs font-medium text-muted-foreground">
                    Title <span className="text-destructive">*</span>
                  </label>
                  <input
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    required
                    className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="message" className="text-xs font-medium text-muted-foreground">
                    Message <span className="text-destructive">*</span>
                  </label>
                  <Textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    rows={8}
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="rounded-xl border bg-card p-5">
              <p className="mb-3 text-sm font-medium">Settings</p>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Type
                  </label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="announcement">Announcement</option>
                    <option value="compliance">Compliance</option>
                    <option value="payment">Payment</option>
                    <option value="system">System</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Priority
                  </label>
                  <select
                    name="priority"
                    value={formData.priority}
                    onChange={handleChange}
                    className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-5 space-y-2">
              <button
                type="submit"
                disabled={isPending}
                className="flex w-full items-center justify-center gap-1.5 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    Save changes
                  </>
                )}
              </button>
              <Link href={`/tenant/${tenantId}/announcements`}>
                <button
                  type="button"
                  className="w-full rounded-md border border-border px-4 py-2 text-sm hover:bg-muted"
                >
                  Cancel
                </button>
              </Link>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}