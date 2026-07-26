import React, { createContext, useContext } from 'react';
import { usePermissions } from '../hooks/usePermissions';
import PermissionModal from '../components/ui/PermissionModal';
const PermissionContext = createContext(null);
export const PermissionProvider = ({ children }) => {
    const perms = usePermissions();
    return (<PermissionContext.Provider value={perms}>
      {children}
      <PermissionModal isOpen={perms.showPermissionModal} type={perms.permissionType} onGrant={perms.handlePermissionGrant} onClose={perms.handlePermissionClose}/>
    </PermissionContext.Provider>);
};
export const usePermissionContext = () => {
    const context = useContext(PermissionContext);
    if (!context) {
        throw new Error('usePermissionContext must be used within a PermissionProvider');
    }
    return context;
};
