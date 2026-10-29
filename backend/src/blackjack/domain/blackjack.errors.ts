import { ConflictError } from '../../common/domain/errors/conflict.error.js';

export class NotYourSeatError extends ConflictError {
  constructor() {
    super('Cette case n’est pas la vôtre.');
  }
}

export class SeatTakenError extends ConflictError {
  constructor(message = 'Cette case vient d’être prise.') {
    super(message);
  }
}

export class SeatInPlayError extends ConflictError {
  constructor() {
    super('Une main se joue sur cette case : attendez la fin du tour pour vous lever.');
  }
}

export class NotYourTurnError extends ConflictError {
  constructor() {
    super('Ce n’est pas à vous de jouer.');
  }
}

export class IllegalMoveError extends ConflictError {
  constructor() {
    super('Coup impossible sur cette main.');
  }
}
