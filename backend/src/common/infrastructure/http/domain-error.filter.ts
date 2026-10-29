import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { ForbiddenError, InvalidCredentialsError, NotLoggedInError, UserNotFoundError } from '../../../auth/domain/auth.errors.js';
import { ConflictError } from '../../domain/errors/conflict.error.js';
import { CrossSiteRequestError } from '../../domain/errors/cross-site-request.error.js';
import { DomainError } from '../../domain/errors/domain.error.js';

@Catch(DomainError)
export class DomainErrorFilter implements ExceptionFilter {
  catch(error: DomainError, host: ArgumentsHost) {
    const status =
      error instanceof ConflictError
        ? HttpStatus.CONFLICT
        : error instanceof CrossSiteRequestError || error instanceof ForbiddenError
          ? HttpStatus.FORBIDDEN
          : error instanceof NotLoggedInError || error instanceof InvalidCredentialsError
            ? HttpStatus.UNAUTHORIZED
            : error instanceof UserNotFoundError
              ? HttpStatus.NOT_FOUND
              : HttpStatus.BAD_REQUEST;
    host.switchToHttp().getResponse<Response>().status(status).json({ statusCode: status, message: error.message });
  }
}
