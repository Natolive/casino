import { ConflictError } from './conflict.error.js';

export class InsufficientFundsError extends ConflictError {
  constructor() {
    super('Pas assez de jetons pour cette mise.');
  }
}
