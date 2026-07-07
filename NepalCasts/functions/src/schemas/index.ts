import { z } from "zod";

export const ProfileUpdateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  firstName: z.string().max(120).optional(),
  lastName: z.string().max(120).optional(),
  username: z.string().max(60).optional(),
  phone: z.string().max(30).optional(),
  gender: z.string().max(30).optional(),
  bio: z.string().max(500).optional(),
  role: z.string().max(60).optional(),
  location: z.string().max(120).optional(),
  languages: z.array(z.string().max(60)).max(20).optional(),
  skills: z.array(z.union([z.string().max(80), z.record(z.string(), z.unknown())])).max(50).optional(),
  experience: z.array(z.unknown()).max(50).optional(),
  openToWork: z.boolean().optional(),
  height: z.string().max(20).optional().nullable(),
  weight: z.string().max(20).optional().nullable(),
  eyeColor: z.string().max(40).optional(),
  hairColor: z.string().max(40).optional(),
  image: z.string().url().optional().nullable(),
  coverImage: z.string().url().optional().nullable(),
  email: z.string().email().optional(),
  media: z.array(z.string().url()).max(20).optional(),
});

export const BootstrapUserSchema = z.object({
  name: z.string().min(1).max(120),
  role: z.string().max(60).optional(),
  gender: z.string().max(30).optional(),
  email: z.string().email().optional(),
});

export const ConversationSchema = z.object({
  participants: z.array(z.string().min(1)).min(2).max(10),
});

export const MessageSendSchema = z.object({
  conversationId: z.string().min(1),
  text: z.string().min(1).max(2000),
  type: z.enum(["text", "image", "file"]).optional().default("text"),
  isSystem: z.boolean().optional().default(false),
  replyTo: z
    .object({
      id: z.string().min(1),
      text: z.string().max(2000),
      senderId: z.string().min(1),
    })
    .optional(),
});

export const MessageUpdateSchema = z.object({
  conversationId: z.string().min(1),
  messageId: z.string().min(1),
  text: z.string().min(1).max(2000),
});

export const MessageDeleteSchema = z.object({
  conversationId: z.string().min(1),
  messageId: z.string().min(1),
});

export const MessageReactionSchema = z.object({
  conversationId: z.string().min(1),
  messageId: z.string().min(1),
  emoji: z.string().min(1).max(16),
});

export const MessagePinSchema = z.object({
  conversationId: z.string().min(1),
  messageId: z.string().min(1),
  pinned: z.boolean(),
});

export const NotificationTokenSchema = z.object({
  token: z.string().min(50).max(4096),
});

export const BlockUserSchema = z.object({
  targetId: z.string().min(1),
});

export const AdminCastingSchema = z.object({
  title: z.string().min(5).max(140),
  description: z.string().min(20).max(5000),
  type: z.enum(["Film", "Commercial", "Web Series", "Theatre"]),
  budget: z.string().max(120).optional(),
  location: z.string().min(2).max(120),
  highPriority: z.boolean().optional().default(false),
});

export const AdminCastingUpdateSchema = AdminCastingSchema.partial().extend({
  id: z.string().min(1),
});

export const AdminCastingDeleteSchema = z.object({
  id: z.string().min(1),
});

export const AdminCastingPrioritySchema = z.object({
  id: z.string().min(1),
  highPriority: z.boolean(),
});

export const AdminUserActionSchema = z.object({
  userId: z.string().min(1),
});

export const AdminBanUserSchema = z.object({
  userId: z.string().min(1),
  reason: z.string().optional(),
  duration: z.string().optional(),
});

export const AdminUpdateUserRoleSchema = z.object({
  userId: z.string().min(1),
  makeAdmin: z.boolean(),
});

export const AdminDataRequestSchema = z.object({
  requestId: z.string().min(1),
  reason: z.string().optional(),
});
