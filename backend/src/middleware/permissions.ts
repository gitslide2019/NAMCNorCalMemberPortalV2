import { Request, Response, NextFunction } from 'express'

interface AuthRequest extends Request {
  user?: {
    id: string
    email: string
    memberType: string
  }
}

// Define permission levels
export enum Permission {
  // User management
  VIEW_USERS = 'view_users',
  EDIT_USERS = 'edit_users',
  DELETE_USERS = 'delete_users',
  MANAGE_USER_ROLES = 'manage_user_roles',
  
  // Event management
  VIEW_EVENTS = 'view_events',
  CREATE_EVENTS = 'create_events',
  EDIT_EVENTS = 'edit_events',
  DELETE_EVENTS = 'delete_events',
  
  // Content management
  VIEW_ANNOUNCEMENTS = 'view_announcements',
  CREATE_ANNOUNCEMENTS = 'create_announcements',
  EDIT_ANNOUNCEMENTS = 'edit_announcements',
  DELETE_ANNOUNCEMENTS = 'delete_announcements',
  
  // Resource management
  VIEW_RESOURCES = 'view_resources',
  UPLOAD_RESOURCES = 'upload_resources',
  DELETE_RESOURCES = 'delete_resources',
  
  // System administration
  VIEW_AUDIT_LOGS = 'view_audit_logs',
  MANAGE_SYSTEM_SETTINGS = 'manage_system_settings',
  VIEW_ANALYTICS = 'view_analytics',
  
  // Financial management
  VIEW_FINANCIAL_DATA = 'view_financial_data',
  MANAGE_PAYMENTS = 'manage_payments',
}

// Define role-based permissions
const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  REGULAR: [
    Permission.VIEW_EVENTS,
    Permission.VIEW_ANNOUNCEMENTS,
    Permission.VIEW_RESOURCES,
  ],
  PREMIUM: [
    Permission.VIEW_EVENTS,
    Permission.CREATE_EVENTS,
    Permission.VIEW_ANNOUNCEMENTS,
    Permission.VIEW_RESOURCES,
    Permission.UPLOAD_RESOURCES,
  ],
  BOARD_MEMBER: [
    Permission.VIEW_EVENTS,
    Permission.CREATE_EVENTS,
    Permission.EDIT_EVENTS,
    Permission.VIEW_ANNOUNCEMENTS,
    Permission.CREATE_ANNOUNCEMENTS,
    Permission.EDIT_ANNOUNCEMENTS,
    Permission.VIEW_RESOURCES,
    Permission.UPLOAD_RESOURCES,
    Permission.VIEW_USERS,
    Permission.VIEW_ANALYTICS,
  ],
  ADMIN: [
    Permission.VIEW_USERS,
    Permission.EDIT_USERS,
    Permission.MANAGE_USER_ROLES,
    Permission.VIEW_EVENTS,
    Permission.CREATE_EVENTS,
    Permission.EDIT_EVENTS,
    Permission.DELETE_EVENTS,
    Permission.VIEW_ANNOUNCEMENTS,
    Permission.CREATE_ANNOUNCEMENTS,
    Permission.EDIT_ANNOUNCEMENTS,
    Permission.DELETE_ANNOUNCEMENTS,
    Permission.VIEW_RESOURCES,
    Permission.UPLOAD_RESOURCES,
    Permission.DELETE_RESOURCES,
    Permission.VIEW_AUDIT_LOGS,
    Permission.VIEW_ANALYTICS,
    Permission.VIEW_FINANCIAL_DATA,
  ],
  SUPER_ADMIN: Object.values(Permission), // All permissions
  LIFETIME: [ // Legacy support
    Permission.VIEW_EVENTS,
    Permission.CREATE_EVENTS,
    Permission.EDIT_EVENTS,
    Permission.VIEW_ANNOUNCEMENTS,
    Permission.CREATE_ANNOUNCEMENTS,
    Permission.VIEW_RESOURCES,
    Permission.UPLOAD_RESOURCES,
    Permission.VIEW_USERS,
    Permission.VIEW_ANALYTICS,
  ],
  HONORARY: [ // Legacy support
    Permission.VIEW_EVENTS,
    Permission.CREATE_EVENTS,
    Permission.VIEW_ANNOUNCEMENTS,
    Permission.CREATE_ANNOUNCEMENTS,
    Permission.VIEW_RESOURCES,
    Permission.VIEW_USERS,
  ],
}

// Check if user has specific permission
export const hasPermission = (userRole: string, permission: Permission): boolean => {
  const rolePermissions = ROLE_PERMISSIONS[userRole] || []
  return rolePermissions.includes(permission)
}

// Check if user has any of the specified permissions
export const hasAnyPermission = (userRole: string, permissions: Permission[]): boolean => {
  return permissions.some(permission => hasPermission(userRole, permission))
}

// Check if user has all of the specified permissions
export const hasAllPermissions = (userRole: string, permissions: Permission[]): boolean => {
  return permissions.every(permission => hasPermission(userRole, permission))
}

// Middleware factory for permission checking
export const requirePermission = (permission: Permission) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' })
      return
    }

    if (!hasPermission(req.user.memberType, permission)) {
      res.status(403).json({ 
        message: 'Insufficient permissions',
        required: permission,
        userRole: req.user.memberType
      })
      return
    }

    next()
  }
}

// Middleware factory for checking any of multiple permissions
export const requireAnyPermission = (permissions: Permission[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' })
      return
    }

    if (!hasAnyPermission(req.user.memberType, permissions)) {
      res.status(403).json({ 
        message: 'Insufficient permissions',
        required: permissions,
        userRole: req.user.memberType
      })
      return
    }

    next()
  }
}

// Middleware factory for checking all of multiple permissions
export const requireAllPermissions = (permissions: Permission[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' })
      return
    }

    if (!hasAllPermissions(req.user.memberType, permissions)) {
      res.status(403).json({ 
        message: 'Insufficient permissions',
        required: permissions,
        userRole: req.user.memberType
      })
      return
    }

    next()
  }
}

// Get all permissions for a user role
export const getUserPermissions = (userRole: string): Permission[] => {
  return ROLE_PERMISSIONS[userRole] || []
}

// Check if role is admin-level
export const isAdmin = (userRole: string): boolean => {
  return ['ADMIN', 'SUPER_ADMIN', 'BOARD_MEMBER'].includes(userRole)
}

// Check if role is super admin
export const isSuperAdmin = (userRole: string): boolean => {
  return userRole === 'SUPER_ADMIN'
}

export default {
  Permission,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  getUserPermissions,
  isAdmin,
  isSuperAdmin,
}