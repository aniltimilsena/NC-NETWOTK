import { z } from 'zod';

export const ProfileSchema = z.object({
  name: z.string().min(2).optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  username: z.string().optional(),
  phone: z.string().optional(),
  gender: z.string().optional(),
  bio: z.string().max(500).optional(),
  role: z.enum([
    'Actor', 'Director', 'Model', 'Dancer', 'Musician', 'Voice Over', 'VFX', 'Writer',
    'Actors', 'Directors', 'Models', 'Dancers', 'Musicians', 'Writers'
  ]).optional(),
  location: z.string().optional(),
  languages: z.array(z.string()).optional(),
  skills: z.array(z.union([z.string(), z.record(z.string(), z.unknown())])).optional(),
  experience: z.array(z.any()).optional(),
  openToWork: z.boolean().optional(),
  openToAudition: z.boolean().optional(),
  category: z.string().optional(),
  height: z.string().optional(),
  weight: z.string().optional(),
  eyeColor: z.string().optional(),
  hairColor: z.string().optional(),
  image: z.string().nullable().optional(),
  photoURL: z.string().nullable().optional(),
  coverImage: z.string().nullable().optional(),
  email: z.union([z.string().email(), z.literal(''), z.null()]).optional(),
  showContactInfo: z.boolean().optional(),
});


export const CastingCallSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional().or(z.string().min(0)),
  type: z.string(),
  budget: z.string().optional(),
  location: z.string(),
  thumbnail: z.string().optional(),
  requirements: z.array(z.string()).optional(),
  deadline: z.string().optional(),
  production: z.string().optional(),
  creatorName: z.string().optional(),
  creatorEmail: z.string().optional(),
  roles: z.array(z.any()).optional(),
  id: z.string().optional(),
});

export const MessageSchema = z.object({
  text: z.string().min(1).max(2000),
  type: z.enum(['text', 'image', 'file', 'video']).optional().default('text'),
  isSystem: z.boolean().optional().default(false),
  replyTo: z.object({
    id: z.string(),
    text: z.string(),
    senderId: z.string(),
  }).nullable().optional(),
  clientMsgId: z.string().optional().nullable(),
});

export const NotificationTokenSchema = z.object({
  token: z.string().min(50).max(4096),
});

export const ConversationSchema = z.object({
  participants: z.array(z.string()).min(2),
  initialMessage: z.string().optional(),
});

export const AdminLogSchema = z.object({
  action: z.string().min(1).max(200),
  targetId: z.string().max(200).optional(),
  details: z.union([z.string(), z.record(z.string(), z.unknown())]).optional(),
});

export const AdminSettingsSchema = z.object({
  maintenanceMode: z.boolean().optional(),
  registrationOpen: z.boolean().optional(),
  maxUploadSizeMB: z.number().min(1).max(100).optional(),
  allowedFileTypes: z.array(z.string().max(50)).max(20).optional(),
  siteName: z.string().max(200).optional(),
  supportEmail: z.string().email().optional(),
  maxMessageLength: z.number().min(1).max(10000).optional(),
});

