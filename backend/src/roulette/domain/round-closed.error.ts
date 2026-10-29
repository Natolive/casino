import { ConflictError } from '../../common/domain/errors/conflict.error.js';

export class RoundClosedError extends ConflictError {
  constructor() {
    super('Rien ne va plus : les jeux sont faits pour ce tour.');
  }
}
