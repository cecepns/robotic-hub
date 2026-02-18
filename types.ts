
export type UserRole = 'ADMIN' | 'ANGGOTA';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  password?: string;
  avatar?: string;
}

export interface Achievement {
  id: string;
  title: string;
  year: string;
  description: string;
  photoUrl?: string;
}

export interface Activity {
  id: string;
  title: string;
  date: string;
  status: 'COMING' | 'COMPLETED';
  description: string;
}

export interface LearningMaterial {
  id: string;
  title: string;
  type: 'PDF' | 'VIDEO';
  url: string;
}

export interface AttendanceRecord {
  id: string;
  date: string;
  memberName: string;
  activityName: string;
  status: 'PRESENT' | 'ABSENT';
}

export interface ClubProfile {
  history: string;
  vision: string;
  mission: string[];
  structure: {
    id: string;
    role: string;
    name: string;
    photoUrl?: string;
    parentId?: string; // For diagram hierarchy
  }[];
}

export interface GalleryItem {
  id: string;
  url: string;
  title: string;
}
