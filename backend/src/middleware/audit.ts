import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { db } from '../database/connection';
import { AuthenticatedRequest } from './auth';

export interface AuditLogData {
  userId: string | undefined;
  clinicId: string | undefined;
  action: string;
  resourceType: string;
  resourceId: string | undefined;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress: string | undefined;
  userAgent: string | undefined;
}
export const auditLog = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const originalSend = res.send;

  res.send = function (data: unknown) {
    // Log the response for audit purposes
    const auditData: AuditLogData = {
      userId: (req as AuthenticatedRequest).user?.id,
      clinicId: (req as AuthenticatedRequest).user?.clinicId,
      action: req.method,
      resourceType: req.path,
      resourceId: undefined,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    };

    // Log to database asynchronously (don't block response)
    logAuditEvent(auditData).catch(error => {
      logger.error('Failed to log audit event:', error);
    });

    return originalSend.call(this, data);
  };

  next();
};

export const logAuditEvent = async (auditData: AuditLogData) => {
  try {
    const query = `
      INSERT INTO audit_log (
        user_id, clinic_id, action, resource_type, resource_id,
        old_values, new_values, ip_address, user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;

    await db.query(query, [
      auditData.userId,
      auditData.clinicId,
      auditData.action,
      auditData.resourceType,
      auditData.resourceId,
      auditData.oldValues ? JSON.stringify(auditData.oldValues) : null,
      auditData.newValues ? JSON.stringify(auditData.newValues) : null,
      auditData.ipAddress,
      auditData.userAgent
    ]);

    logger.info('Audit event logged', auditData);
  } catch (error) {
    logger.error('Failed to log audit event:', error);
    throw error;
  }
};

export const logDataAccess = (resourceType: string, resourceId?: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const auditData: AuditLogData = {
      userId: (req as AuthenticatedRequest).user?.id,
      clinicId: (req as AuthenticatedRequest).user?.clinicId,
      action: 'READ',
      resourceType,
      resourceId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    };

    await logAuditEvent(auditData);
    next();
  };
};

export const logDataModification = (resourceType: string, resourceId?: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const auditData: AuditLogData = {
      userId: (req as AuthenticatedRequest).user?.id,
      clinicId: (req as AuthenticatedRequest).user?.clinicId,
      action: req.method,
      resourceType,
      resourceId,
      oldValues: req.body.oldValues,
      newValues: req.body,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    };

    await logAuditEvent(auditData);
    next();
  };
}; 