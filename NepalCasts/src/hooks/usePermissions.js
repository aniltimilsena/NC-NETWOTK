import { useState, useCallback, useMemo } from 'react';
import { logger } from '../utils/logger';
const getBrowserPermissionState = async (type) => {
    if (!navigator.permissions || !navigator.permissions.query) {
        logger.log("[Permissions] navigator.permissions.query is NOT supported in this browser.");
        return 'prompt';
    }
    try {
        const promises = [];
        if (type === 'video' || type === 'media') {
            promises.push(navigator.permissions.query({ name: 'camera' }));
        }
        if (type === 'audio' || type === 'video' || type === 'media') {
            promises.push(navigator.permissions.query({ name: 'microphone' }));
        }
        const results = await Promise.all(promises);
        if (type === 'video' || type === 'media') {
            const cam = results[0];
            logger.log("[Permissions] Camera permission query state:", cam?.state);
        }
        if (type === 'audio' || type === 'video' || type === 'media') {
            const idx = (type === 'video' || type === 'media') ? 1 : 0;
            const mic = results[idx];
            logger.log("[Permissions] Microphone permission query state:", mic?.state);
        }
        const states = results.map(r => r.state);
        if (states.includes('denied')) {
            return 'denied';
        }
        if (states.every(s => s === 'granted')) {
            return 'granted';
        }
        return 'prompt';
    }
    catch (e) {
        logger.warn("[Permissions] Failed to query permissions:", e);
        return 'prompt';
    }
};
export const usePermissions = () => {
    const [showModal, setShowModal] = useState(false);
    const [permissionType, setPermissionType] = useState('media');
    const [pendingAction, setPendingAction] = useState(null);
    const checkAndRequest = useCallback((type, action) => {
        const isMedia = type === 'media' || type === 'audio' || type === 'video';
        if (isMedia) {
            const hasHandled = localStorage.getItem('nc_perm_media');
            if (hasHandled === 'denied') {
                setPermissionType('media-blocked');
                setPendingAction(() => action);
                setShowModal(true);
                return;
            }
            if (hasHandled === 'granted' || hasHandled === 'skipped') {
                action();
                return;
            }
            getBrowserPermissionState(type).then((browserState) => {
                if (browserState === 'granted') {
                    localStorage.setItem('nc_perm_media', 'granted');
                    action();
                    return;
                }
                if (browserState === 'denied') {
                    localStorage.setItem('nc_perm_media', 'denied');
                    setPermissionType('media-blocked');
                    setPendingAction(() => action);
                    setShowModal(true);
                    return;
                }
                setPermissionType('media');
                setPendingAction(() => action);
                setShowModal(true);
            });
        }
        else {
            const hasHandled = localStorage.getItem(`nc_perm_${type}`);
            if (hasHandled) {
                action();
                return;
            }
            setPermissionType(type);
            setPendingAction(() => action);
            setShowModal(true);
        }
    }, []);
    const handleGrant = useCallback(async () => {
        setShowModal(false);
        const baseType = permissionType.startsWith('media') ? 'media' : permissionType;
        localStorage.setItem(`nc_perm_${baseType}`, 'granted');
        if (pendingAction) {
            pendingAction();
        }
    }, [permissionType, pendingAction]);
    const handleClose = useCallback(() => {
        setShowModal(false);
        const baseType = permissionType.startsWith('media') ? 'media' : permissionType;
        localStorage.setItem(`nc_perm_${baseType}`, 'skipped');
    }, [permissionType]);
    return useMemo(() => ({
        showPermissionModal: showModal,
        permissionType,
        requestPermission: checkAndRequest,
        handlePermissionGrant: handleGrant,
        handlePermissionClose: handleClose
    }), [showModal, permissionType, checkAndRequest, handleGrant, handleClose]);
};
