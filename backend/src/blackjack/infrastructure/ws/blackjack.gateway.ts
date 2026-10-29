import { WebSocketGateway } from '@nestjs/websockets';
import type { BlackjackEvent } from '@casino/shared';
import { AuthService } from '../../../auth/application/auth.service.js';
import { LiveTableGateway, liveTableOptions } from '../../../common/infrastructure/ws/live-table.gateway.js';
import { BlackjackTableService } from '../../application/blackjack-table.service.js';

// La table de blackjack en direct (voir BlackjackEvent).
@WebSocketGateway(liveTableOptions('/ws/blackjack'))
export class BlackjackGateway extends LiveTableGateway<BlackjackEvent> {
  constructor(auth: AuthService, table: BlackjackTableService) {
    super(auth, table);
  }
}
