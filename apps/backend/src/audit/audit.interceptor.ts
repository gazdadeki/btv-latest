import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from './audit.service';
import { Request } from 'express';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const { user, method, url, body, params, query } = request;

    return next.handle().pipe(
      tap(() => {
        const action = this.getAction(method);
        if (action) {
          this.auditService.log({
            // @ts-expect-error user is injected by auth guard
            userId: user?.id || null,
            // @ts-expect-error user is injected by auth guard
            userEmail: user?.email || null,
            action,
            entityType: this.getEntityType(url),
            // @ts-expect-error route params are not typed on Request
            entityId: params?.id || query?.id || null,
            details: {
              method,
              url,
              body: this.sanitizeBody(body),
              params,
              query,
            },
            ipAddress: request.ip,
            userAgent: request.get('user-agent'),
          });
        }
      }),
    );
  }

  private getAction(method: string): string | null {
    const actionMap: Record<string, string> = {
      POST: 'CREATE',
      PUT: 'UPDATE',
      PATCH: 'UPDATE',
      DELETE: 'DELETE',
      GET: 'VIEW',
    };
    return actionMap[method] || null;
  }

  private getEntityType(url: string): string {
    const parts = url.split('/').filter(Boolean);
    if (parts.length >= 2) {
      return parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
    }
    return 'Unknown';
  }

  private sanitizeBody(body: any): any {
    if (!body) return null;
    const sanitized = { ...body };
    if (sanitized.password) sanitized.password = '***';
    if (sanitized.token) sanitized.token = '***';
    return sanitized;
  }
}
