import { Router, type Response } from 'express';
import { verifyToken } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { messagingLimiter } from '../middleware/rateLimiter';
import { ConversationSchema, MessageSchema } from '../schemas';
import { db, admin } from '../config';
import { createConversation, getConversationsForUser, deleteConversationForUser, getMessagesInConversation, sendMessageInConversation, updateMessageText, deleteMessageText, reactToMessageId, removeReactionFromMessageId, pinMessageId, markConversationRead } from '../services/messaging.service';
import type { AuthedRequest } from '../types';
const router = Router();
router.post('/messaging/conversations', verifyToken, messagingLimiter, validateBody(ConversationSchema), async (req: AuthedRequest, res: Response): Promise<any> => {
    try {
        const uid = req.user?.uid;
        if (!uid) {
            return res.status(401).send('Unauthorized');
        }
        const { participants, initialMessage } = req.body as any;
        const conversationId = await createConversation(uid, participants, initialMessage);
        return res.json({ id: conversationId });
    }
    catch (error: any) {
        if (error.status) {
            return res.status(error.status).json({ error: error.message });
        }
        return res.status(500).json({ error: error.message || 'Failed to create conversation' });
    }
});
router.get('/messaging/conversations', verifyToken, async (req: AuthedRequest, res: Response): Promise<any> => {
    try {
        const uid = req.user?.uid;
        if (!uid) {
            return res.status(401).send('Unauthorized');
        }
        const convos = await getConversationsForUser(uid);
        return res.json(convos);
    }
    catch (error: any) {
        return res.status(500).json({ error: error.message || 'Failed to fetch conversations' });
    }
});
router.delete('/messaging/:conversationId', verifyToken, async (req: AuthedRequest<{
    conversationId: string;
}>, res: Response): Promise<any> => {
    try {
        const uid = req.user?.uid;
        if (!uid) {
            return res.status(401).send('Unauthorized');
        }
        await deleteConversationForUser(req.params.conversationId, uid);
        return res.json({ success: true });
    }
    catch (error: any) {
        if (error.status) {
            return res.status(error.status).json({ error: error.message });
        }
        return res.status(500).json({ error: error.message || 'Failed to delete conversation' });
    }
});
router.get('/messaging/:conversationId/messages', verifyToken, async (req: AuthedRequest<{
    conversationId: string;
}>, res: Response): Promise<any> => {
    try {
        const uid = req.user?.uid;
        if (!uid) {
            return res.status(401).send('Unauthorized');
        }
        const msgs = await getMessagesInConversation(req.params.conversationId, uid);
        return res.json(msgs);
    }
    catch (error: any) {
        if (error.status) {
            return res.status(error.status).json({ error: error.message });
        }
        return res.status(500).json({ error: error.message || 'Failed to fetch messages' });
    }
});
router.post('/messaging/:conversationId/messages', verifyToken, messagingLimiter, validateBody(MessageSchema), async (req: AuthedRequest<{
    conversationId: string;
}>, res: Response): Promise<any> => {
    try {
        const uid = req.user?.uid;
        if (!uid) {
            return res.status(401).send('Unauthorized');
        }
        const createdMessage = await sendMessageInConversation(req.params.conversationId, uid, req.body, req.user);
        return res.json({ success: true, message: createdMessage, messageId: createdMessage?.id });
    }
    catch (error: any) {
        console.error("Error in POST /api/messaging/:conversationId/messages:", error);
        if (error.status) {
            return res.status(error.status).json({ error: error.message });
        }
        return res.status(500).json({ error: error.message || 'Failed to send message' });
    }
});
router.put('/messaging/:conversationId/messages/:messageId', verifyToken, async (req: AuthedRequest<{
    conversationId: string;
    messageId: string;
}>, res: Response): Promise<any> => {
    try {
        const { text } = req.body as any;
        if (!text || typeof text !== 'string' || text.trim().length === 0) {
            return res.status(400).send('Message text is required');
        }
        if (text.length > 2000) {
            return res.status(400).send('Message text exceeds 2000 characters');
        }
        const uid = req.user?.uid;
        if (!uid) {
            return res.status(401).send('Unauthorized');
        }
        await updateMessageText(req.params.conversationId, req.params.messageId, uid, text);
        return res.json({ success: true });
    }
    catch (error: any) {
        if (error.status) {
            return res.status(error.status).json({ error: error.message });
        }
        return res.status(500).json({ error: error.message || 'Failed to update message' });
    }
});
router.delete('/messaging/:conversationId/messages/:messageId', verifyToken, async (req: AuthedRequest<{
    conversationId: string;
    messageId: string;
}>, res: Response): Promise<any> => {
    try {
        const uid = req.user?.uid;
        if (!uid) {
            return res.status(401).send('Unauthorized');
        }
        await deleteMessageText(req.params.conversationId, req.params.messageId, uid);
        return res.json({ success: true });
    }
    catch (error: any) {
        if (error.status) {
            return res.status(error.status).json({ error: error.message });
        }
        return res.status(500).json({ error: error.message || 'Failed to delete message' });
    }
});
router.post('/messaging/:conversationId/messages/:messageId/react', verifyToken, async (req: AuthedRequest<{
    conversationId: string;
    messageId: string;
}>, res: Response): Promise<any> => {
    try {
        const { emoji } = req.body as any;
        const uid = req.user?.uid;
        if (!uid) {
            return res.status(401).send('Unauthorized');
        }
        if (!emoji) {
            return res.status(400).send('Emoji is required');
        }
        const ALLOWED_EMOJIS = ['️', '', '', '', '', '', ''];
        if (!ALLOWED_EMOJIS.includes(emoji)) {
            return res.status(400).send('Invalid emoji');
        }
        await reactToMessageId(req.params.conversationId, req.params.messageId, uid, emoji);
        return res.json({ success: true });
    }
    catch (error: any) {
        if (error.status) {
            return res.status(error.status).json({ error: error.message });
        }
        return res.status(500).json({ error: error.message || 'Failed to react to message' });
    }
});
router.delete('/messaging/:conversationId/messages/:messageId/react', verifyToken, async (req: AuthedRequest<{
    conversationId: string;
    messageId: string;
}>, res: Response): Promise<any> => {
    try {
        const uid = req.user?.uid;
        if (!uid) {
            return res.status(401).send('Unauthorized');
        }
        await removeReactionFromMessageId(req.params.conversationId, req.params.messageId, uid);
        return res.json({ success: true });
    }
    catch (error: any) {
        if (error.status) {
            return res.status(error.status).json({ error: error.message });
        }
        return res.status(500).json({ error: error.message || 'Failed to remove reaction' });
    }
});
router.put('/messaging/:conversationId/messages/:messageId/pin', verifyToken, async (req: AuthedRequest<{
    conversationId: string;
    messageId: string;
}>, res: Response): Promise<any> => {
    try {
        const { pinned } = req.body as any;
        const uid = req.user?.uid;
        if (!uid) {
            return res.status(401).send('Unauthorized');
        }
        await pinMessageId(req.params.conversationId, req.params.messageId, uid, pinned);
        return res.json({ success: true });
    }
    catch (error: any) {
        if (error.status) {
            return res.status(error.status).json({ error: error.message });
        }
        return res.status(500).json({ error: error.message || 'Failed to pin message' });
    }
});
router.put('/messaging/:conversationId/read', verifyToken, async (req: AuthedRequest<{
    conversationId: string;
}>, res: Response): Promise<any> => {
    try {
        const uid = req.user?.uid;
        if (!uid) {
            return res.status(401).send('Unauthorized');
        }
        await markConversationRead(req.params.conversationId, uid);
        return res.json({ success: true });
    }
    catch (error: any) {
        if (error.status) {
            return res.status(error.status).json({ error: error.message });
        }
        return res.status(500).json({ error: error.message || 'Failed to mark conversation as read' });
    }
});
router.post('/users/block', verifyToken, async (req: AuthedRequest, res: Response): Promise<any> => {
    try {
        const { targetId } = req.body as any;
        const uid = req.user?.uid;
        if (!uid || !targetId) {
            return res.status(400).send('User ID and target ID are required');
        }
        if (uid === targetId) {
            return res.status(400).send('Cannot block yourself');
        }
        await db.collection('users').doc(uid).set({
            blockedUsers: admin.firestore.FieldValue.arrayUnion(targetId),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        return res.json({ success: true });
    }
    catch (error: any) {
        return res.status(500).json({ error: error.message || 'Failed to block user' });
    }
});
router.post('/users/unblock', verifyToken, async (req: AuthedRequest, res: Response): Promise<any> => {
    try {
        const { targetId } = req.body as any;
        const uid = req.user?.uid;
        if (!uid || !targetId) {
            return res.status(400).send('User ID and target ID are required');
        }
        await db.collection('users').doc(uid).set({
            blockedUsers: admin.firestore.FieldValue.arrayRemove(targetId),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        return res.json({ success: true });
    }
    catch (error: any) {
        return res.status(500).json({ error: error.message || 'Failed to unblock user' });
    }
});
export default router;
