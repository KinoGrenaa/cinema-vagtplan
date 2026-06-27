import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
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
export class SystemErrorLoggingInterceptor implements NestInterceptor {
  constructor(private systemErrorLogs: SystemErrorLogsService) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    return next.handle().pipe(
      catchError((error) => {
        const statusCode = getStatusCode(error);

        if (shouldLogStatusCode(statusCode)) {
          const request = context.switchToHttp().getRequest();

          void this.systemErrorLogs
            .createFromRequestError({
              error,
              request,
              statusCode,
            })
            .catch(() => undefined);
        }

        return throwError(() => error);
      }),
    );
  }
}
