import { Module, DynamicModule } from '@nestjs/common';
import { AuthZModule } from 'nest-authz';
import * as casbin from 'casbin';
import * as path from 'path';

export interface AuthorizationModuleOptions {
  modelPath?: string;
  policyPath?: string;
}

@Module({})
export class AuthorizationModule {
  static forRoot(options?: AuthorizationModuleOptions): DynamicModule {
    const modelPath = options?.modelPath || path.join(__dirname, 'model.conf');
    const policyPath = options?.policyPath || path.join(__dirname, 'policy.csv');

    return {
      module: AuthorizationModule,
      imports: [
        AuthZModule.register({
          model: modelPath,
          policy: policyPath,
          usernameFromContext: (ctx) => {
            const request = ctx.switchToHttp().getRequest();
            // Get user from request (set by auth middleware/guard)
            return request.user?.role || 'customer';
          },
        }),
      ],
      exports: [AuthZModule],
    };
  }

  static forRootAsync(): DynamicModule {
    return {
      module: AuthorizationModule,
      imports: [
        AuthZModule.register({
          enforcerProvider: {
            provide: 'AUTHZ_ENFORCER',
            useFactory: async () => {
              const modelPath = path.join(__dirname, 'model.conf');
              const policyPath = path.join(__dirname, 'policy.csv');
              return casbin.newEnforcer(modelPath, policyPath);
            },
          },
          usernameFromContext: (ctx) => {
            const request = ctx.switchToHttp().getRequest();
            return request.user?.role || 'customer';
          },
        }),
      ],
      exports: [AuthZModule],
    };
  }
}

