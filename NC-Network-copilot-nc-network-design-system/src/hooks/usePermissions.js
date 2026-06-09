import { useState, useCallback } from 'react';

export const usePermissions = () => {
  const [showModal, setShowModal] = useState(false);
  const [permissionType, setPermissionType] = useState('media');
  const [pendingAction, setPendingAction] = useState(null);

  const checkAndRequest = useCallback(async (type, action) => {
    // Check if we've already granted/handled this on this device
    const hasHandled = localStorage.getItem(`nc_perm_${type}`);
    
    if (hasHandled) {
      // Just run the action, browser will handle if it's denied
      return action();
    }

    // Show our premium modal first
    setPermissionType(type);
    setPendingAction(() => action);
    setShowModal(true);
  }, []);

  const handleGrant = useCallback(async () => {
    setShowModal(false);
    localStorage.setItem(`nc_perm_${permissionType}`, 'granted');
    
    if (pendingAction) {
      // Trigger the actual browser permission request by running the action
      pendingAction();
    }
  }, [permissionType, pendingAction]);

  const handleClose = useCallback(() => {
    setShowModal(false);
    // Even if they skip, we mark it so we don't nag them immediately every time
    // But we could also leave it null to ask again later
    localStorage.setItem(`nc_perm_${permissionType}`, 'skipped');
  }, [permissionType]);

  return {
    showPermissionModal: showModal,
    permissionType,
    requestPermission: checkAndRequest,
    handlePermissionGrant: handleGrant,
    handlePermissionClose: handleClose
  };
};
