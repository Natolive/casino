import { ConflictError } from '../../common/domain/errors/conflict.error.js';
import { DomainError } from '../../common/domain/errors/domain.error.js';

export class EmailTakenError extends ConflictError {
  constructor() {
    super('Un compte existe déjà avec cet email.');
  }
}

export class InvalidCredentialsError extends DomainError {
  constructor() {
    super('Email ou mot de passe incorrect.');
  }
}

export class NotLoggedInError extends DomainError {
  constructor() {
    super('Connecte-toi pour jouer.');
  }
}

export class ForbiddenError extends DomainError {
  constructor(message = 'Réservé aux admins.') {
    super(message);
  }
}

export class UserNotFoundError extends DomainError {
  constructor() {
    super('Joueur introuvable.');
  }
}
