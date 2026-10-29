import { WebSocketGateway } from '@nestjs/websockets';
import type { TableEvent } from '@casino/shared';
import { AuthService } from '../../../auth/application/auth.service.js';
import { LiveTableGateway, liveTableOptions } from '../../../common/infrastructure/ws/live-table.gateway.js';
import { TableService } from '../../application/table.service.js';

// La roulette en direct (voir TableEvent).
@WebSocketGateway(liveTableOptions('/ws/roulette'))
export class TableGateway extends LiveTableGateway<TableEvent> {
  constructor(auth: AuthService, table: TableService) {
    super(auth, table);
  }
}
