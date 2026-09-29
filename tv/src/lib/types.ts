export type Section = 'welcome' | 'services_hours' | 'media' | 'notices' | 'cashier';

export type TvDevice = {
  id: string;
  auth_user_id: string;
  hotel_id: string;
  name: string;
  location: string | null;
};

export type ScreenState = {
  tv_id: string;
  hotel_id: string;
  section: Section | null;
  welcome_id: string | null;
  media_id: string | null;
  updated_at: string;
};

export type Service = {
  id: string;
  name: string;
  location: string | null;
  icon_storage_path: string | null;
  icon_url?: string | null;
  display_order: number;
};

export type ServiceHour = {
  id: string;
  service_id: string;
  weekday: number;
  opens_at: string;
  closes_at: string;
};

export type Notice = {
  id: string;
  title: string;
  body: string;
  display_order: number;
  created_at: string;
};

export type DisplayContent =
  | { kind: 'welcome'; body: string }
  | { kind: 'services_hours'; services: Service[]; hours: ServiceHour[] }
  | { kind: 'media'; id: string; mediaKind: 'image' | 'video'; title: string | null; url: string; filePath: string; updatedAt: string; urlExpiresAt: number }
  | { kind: 'notices'; notices: Notice[] }
  | { kind: 'cashier'; status: 'active' | 'pending'; employeeName: string | null; scheduleLabel: string | null };
