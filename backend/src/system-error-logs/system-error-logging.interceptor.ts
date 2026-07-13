import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

import { createSystemErrorRequestContext } from './system-error-request-context';
import { SystemErrorLogsService } from './system-error-logs.service';

function getStatusCode(error: unknown) {
  if (error instanceof HttpException) {
    return error.getStatus();
  }

  return 500;
}

function shouldLogStatusCode(statusCode: number) {
  return statusCode >= 400;
}

@Injectable()
export class SystemErrorLoggingInterceptor
  implements NestInterceptor
{
  constructor(
    private systemErrorLogs: SystemErrorLogsService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    return next.handle().pipe(
      catchError((error) => {
        const statusCode = getStatusCode(error);

        if (shouldLogStatusCode(statusCode)) {
          const httpContext = context.switchToHttp();
          const request = httpContext.getRequest();
          const response = httpContext.getResponse();
          const requestContext =
            createSystemErrorRequestContext(request);

          response?.setHeader?.(
            'x-correlation-id',
            requestContext.correlationId,
          );

          void this.systemErrorLogs
            .createFromRequestError({
              error,
              request: requestContext.request,
              statusCode,
            })
            .catch(() => undefined);
        }

        return throwError(() => error);
      }),
    );
  }
}
