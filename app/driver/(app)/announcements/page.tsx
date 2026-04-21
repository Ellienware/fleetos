'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Bell, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';

interface Announcement {
  $id: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  $createdAt: string;
}

function getPriorityIcon(priority: string) {
  switch (priority) {
    case 'high':
      return AlertCircle;
    case 'medium':
      return AlertTriangle;
    case 'low':
    default:
      return Info;
  }
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case 'high':
      return 'text-destructive';
    case 'medium':
      return 'text-warning';
    case 'low':
    default:
      return 'text-muted-foreground';
  }
}

function getTypeBadgeVariant(type: string) {
  switch (type) {
    case 'announcement':
      return 'default';
    case 'compliance':
      return 'destructive';
    case 'payment':
      return 'secondary';
    case 'system':
      return 'outline';
    default:
      return 'outline';
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    if (hours === 0) {
      const minutes = Math.floor(diffMs / (1000 * 60));
      return minutes <= 1 ? 'Just now' : `${minutes} min ago`;
    }
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString('en-ZA', {
      day: 'numeric',
      month: 'short',
    });
  }
}

export default function DriverAnnouncementsPage() {
  const searchParams = useSearchParams();
  const tenantId = searchParams.get('tenant') || '';
  
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchAnnouncements() {
      const token = localStorage.getItem('driver_token');
      if (!token) return;

      try {
        const response = await fetch('/api/driver/announcements', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          setAnnouncements(data.announcements || []);
        }
      } catch (error) {
        console.error('Failed to fetch announcements:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchAnnouncements();
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <div>
        <h1 className="text-2xl font-bold">Announcements</h1>
        <p className="text-sm text-muted-foreground">
          Important updates from your association
        </p>
      </div>

      {announcements.length > 0 ? (
        <div className="space-y-4">
          {announcements.map((announcement) => {
            const PriorityIcon = getPriorityIcon(announcement.priority);
            const priorityColor = getPriorityColor(announcement.priority);
            
            return (
              <Card 
                key={announcement.$id} 
                className={announcement.priority === 'high' ? 'border-destructive/50' : ''}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <PriorityIcon className={`h-4 w-4 shrink-0 ${priorityColor}`} />
                      <CardTitle className="text-base leading-tight">
                        {announcement.title}
                      </CardTitle>
                    </div>
                    <Badge variant={getTypeBadgeVariant(announcement.type)} className="shrink-0">
                      {announcement.type}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(announcement.$createdAt)}
                  </p>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {announcement.message}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <Bell className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">No announcements</h3>
            <p className="text-center text-sm text-muted-foreground">
              There are no announcements at this time.
              <br />
              Check back later for updates.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
