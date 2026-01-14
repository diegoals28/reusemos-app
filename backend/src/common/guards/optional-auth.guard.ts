// ============================================
// REUSA - Optional Auth Guard
// ============================================

import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any) {
    // Don't throw error if no user, just return null
    return user || null;
  }

  canActivate(context: ExecutionContext) {
    // Always allow, but try to authenticate
    return super.canActivate(context);
  }
}
