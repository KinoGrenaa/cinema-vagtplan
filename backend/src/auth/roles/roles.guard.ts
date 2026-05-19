import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private allowedRoles: string[]) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Ingen bruger fundet');
    }

    if (!this.allowedRoles.includes(user.role)) {
      throw new ForbiddenException('Du har ikke adgang til denne funktion');
    }

    return true;
  }
}
