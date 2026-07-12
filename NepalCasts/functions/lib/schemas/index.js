"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminDataRequestSchema = exports.AdminUpdateUserRoleSchema = exports.AdminBanUserSchema = exports.AdminUserActionSchema = exports.AdminCastingPrioritySchema = exports.AdminCastingDeleteSchema = exports.AdminCastingUpdateSchema = exports.AdminCastingSchema = exports.BlockUserSchema = exports.NotificationTokenSchema = exports.MessagePinSchema = exports.MessageReactionSchema = exports.MessageDeleteSchema = exports.MessageUpdateSchema = exports.MessageSendSchema = exports.ConversationSchema = exports.BootstrapUserSchema = exports.ProfileUpdateSchema = void 0;
const zod_1 = require("zod");
exports.ProfileUpdateSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(120).optional(),
    firstName: zod_1.z.string().max(120).optional(),
    lastName: zod_1.z.string().max(120).optional(),
    username: zod_1.z.string().max(60).optional(),
    phone: zod_1.z.string().max(30).optional(),
    gender: zod_1.z.string().max(30).optional(),
    bio: zod_1.z.string().max(500).optional(),
    role: zod_1.z.string().max(60).optional(),
    location: zod_1.z.string().max(120).optional(),
    languages: zod_1.z.array(zod_1.z.string().max(60)).max(20).optional(),
    skills: zod_1.z.array(zod_1.z.union([zod_1.z.string().max(80), zod_1.z.record(zod_1.z.string(), zod_1.z.unknown())])).max(50).optional(),
    experience: zod_1.z.array(zod_1.z.unknown()).max(50).optional(),
    openToWork: zod_1.z.boolean().optional(),
    height: zod_1.z.string().max(20).optional().nullable(),
    weight: zod_1.z.string().max(20).optional().nullable(),
    eyeColor: zod_1.z.string().max(40).optional(),
    hairColor: zod_1.z.string().max(40).optional(),
    image: zod_1.z.string().url().optional().nullable(),
    coverImage: zod_1.z.string().url().optional().nullable(),
    email: zod_1.z.string().email().optional(),
    media: zod_1.z.array(zod_1.z.string().url()).max(20).optional(),
});
exports.BootstrapUserSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(120),
    role: zod_1.z.string().max(60).optional(),
    gender: zod_1.z.string().max(30).optional(),
    email: zod_1.z.string().email().optional(),
});
exports.ConversationSchema = zod_1.z.object({
    participants: zod_1.z.array(zod_1.z.string().min(1)).min(2).max(10),
});
exports.MessageSendSchema = zod_1.z.object({
    conversationId: zod_1.z.string().min(1),
    text: zod_1.z.string().min(1).max(2000),
    type: zod_1.z.enum(["text", "image", "file"]).optional().default("text"),
    isSystem: zod_1.z.boolean().optional().default(false),
    replyTo: zod_1.z
        .object({
        id: zod_1.z.string().min(1),
        text: zod_1.z.string().max(2000),
        senderId: zod_1.z.string().min(1),
    })
        .optional(),
});
exports.MessageUpdateSchema = zod_1.z.object({
    conversationId: zod_1.z.string().min(1),
    messageId: zod_1.z.string().min(1),
    text: zod_1.z.string().min(1).max(2000),
});
exports.MessageDeleteSchema = zod_1.z.object({
    conversationId: zod_1.z.string().min(1),
    messageId: zod_1.z.string().min(1),
});
exports.MessageReactionSchema = zod_1.z.object({
    conversationId: zod_1.z.string().min(1),
    messageId: zod_1.z.string().min(1),
    emoji: zod_1.z.string().min(1).max(16),
});
exports.MessagePinSchema = zod_1.z.object({
    conversationId: zod_1.z.string().min(1),
    messageId: zod_1.z.string().min(1),
    pinned: zod_1.z.boolean(),
});
exports.NotificationTokenSchema = zod_1.z.object({
    token: zod_1.z.string().min(50).max(4096),
});
exports.BlockUserSchema = zod_1.z.object({
    targetId: zod_1.z.string().min(1),
});
exports.AdminCastingSchema = zod_1.z.object({
    title: zod_1.z.string().min(5).max(140),
    description: zod_1.z.string().min(20).max(5000),
    type: zod_1.z.enum(["Film", "Commercial", "Web Series", "Theatre"]),
    budget: zod_1.z.string().max(120).optional(),
    location: zod_1.z.string().min(2).max(120),
    highPriority: zod_1.z.boolean().optional().default(false),
});
exports.AdminCastingUpdateSchema = exports.AdminCastingSchema.partial().extend({
    id: zod_1.z.string().min(1),
});
exports.AdminCastingDeleteSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
});
exports.AdminCastingPrioritySchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    highPriority: zod_1.z.boolean(),
});
exports.AdminUserActionSchema = zod_1.z.object({
    userId: zod_1.z.string().min(1),
});
exports.AdminBanUserSchema = zod_1.z.object({
    userId: zod_1.z.string().min(1),
    reason: zod_1.z.string().optional(),
    duration: zod_1.z.string().optional(),
});
exports.AdminUpdateUserRoleSchema = zod_1.z.object({
    userId: zod_1.z.string().min(1),
    makeAdmin: zod_1.z.boolean(),
});
exports.AdminDataRequestSchema = zod_1.z.object({
    requestId: zod_1.z.string().min(1),
    reason: zod_1.z.string().optional(),
});
//# sourceMappingURL=index.js.map