import { ConflictError } from '../../common/domain/errors/conflict.error.js';

export class InsufficientFundsError extends ConflictError {
  constructor() {
    super('Pas assez de jetons pour cette mise.');
  }
}
