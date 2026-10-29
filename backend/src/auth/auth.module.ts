import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthService } from './application/auth.service.js';
import { ManageUsersService } from './application/manage-users.service.js';
import { UserRepository } from './domain/user.repository.js';
import { DrizzleUserRepository } from './infrastructure/drizzle-user.repository.js';
import { AdminUsersController } from './infrastructure/http/admin-users.controller.js';
import { AuthController } from './infrastructure/http/auth.controller.js';
import { AuthGuard } from './infrastructure/http/auth.guard.js';

@Module({
  controllers: [AuthController, AdminUsersController],
  providers: [
    AuthService,
    ManageUsersService,
    { provide: UserRepository, useClass: DrizzleUserRepository },
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
  exports: [AuthService],
})
export class AuthModule {}
