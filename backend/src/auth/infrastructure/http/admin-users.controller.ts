import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, UseGuards } from '@nestjs/common';
import { updateUserSchema, type AdminUserDto, type UpdateUserDto } from '@casino/shared';
import { PlayerId } from '../../../common/infrastructure/http/player.js';
import { ZodValidationPipe } from '../../../common/infrastructure/http/zod-validation.pipe.js';
import { ManageUsersService } from '../../application/manage-users.service.js';
import { AdminGuard } from './auth.guard.js';

@Controller('admin/users')
@UseGuards(AdminGuard)
export class AdminUsersController {
  constructor(private readonly users: ManageUsersService) {}

  @Get()
  list(): Promise<AdminUserDto[]> {
    return this.users.list();
  }

  @Patch(':id')
  update(
    @PlayerId() adminId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateUserSchema)) dto: UpdateUserDto,
  ): Promise<AdminUserDto> {
    return this.users.update(adminId, id, dto);
  }
}
