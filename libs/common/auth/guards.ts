import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as casbin from 'casbin';
import * as path from 'path';

export interface PermissionRequirement {
  resource: string;
  action: string;
  possession?: 'own' | 'any';
}

export const PERMISSIONS_KEY = 'permissions';

/**
 * Decorator to define required permissions for an endpoint
 */
export function RequirePermissions(...permissions: PermissionRequirement[]) {
  return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    if (descriptor) {
      Reflect.defineMetadata(PERMISSIONS_KEY, permissions, descriptor.value);
    } else {
      Reflect.defineMetadata(PERMISSIONS_KEY, permissions, target);
    }
    return descriptor || target;
  };
}

@Injectable()
export class PermissionGuard implements CanActivate {
  private enforcer: casbin.Enforcer | null = null;

  constructor(private reflector: Reflector) {}

  async getEnforcer(): Promise<casbin.Enforcer> {
    if (!this.enforcer) {
      const modelPath = path.join(__dirname, 'model.conf');
      const policyPath = path.join(__dirname, 'policy.csv');
      this.enforcer = await casbin.newEnforcer(modelPath, policyPath);
    }
    return this.enforcer;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permissions = this.reflector.get<PermissionRequirement[]>(
      PERMISSIONS_KEY,
      context.getHandler(),
    );

    // If no permissions defined, allow access
    if (!permissions || permissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // If no user, deny access
    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const userRole = user.role?.toLowerCase() || 'customer';
    const userId = user.id;

    const enforcer = await this.getEnforcer();

    for (const permission of permissions) {
      const { resource, action, possession = 'own' } = permission;
      const fullAction = `${action}:${possession}`;

      // Check if user has permission
      const hasPermission = await enforcer.enforce(userRole, resource, fullAction);

      if (!hasPermission) {
        // For 'own' possession, also check if it's the user's own resource
        if (possession === 'own') {
          const resourceId = request.params?.id || request.params?.customerId;
          if (resourceId && resourceId === userId) {
            continue; // Allow access to own resource
          }
        }

        throw new ForbiddenException(
          `Bạn không có quyền ${action} trên ${resource}`,
        );
      }
    }

    return true;
  }
}

/**
 * Simple role-based guard for microservices
 */
@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const hasRole = requiredRoles.some((role) =>
      user.role?.toLowerCase() === role.toLowerCase(),
    );

    if (!hasRole) {
      throw new ForbiddenException('Bạn không có quyền truy cập');
    }

    return true;
  }
}

/**
 * Decorator to require specific roles
 */
export function Roles(...roles: string[]) {
  return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    if (descriptor) {
      Reflect.defineMetadata('roles', roles, descriptor.value);
    } else {
      Reflect.defineMetadata('roles', roles, target);
    }
    return descriptor || target;
  };
}

