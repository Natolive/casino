import { DomainError } from './domain.error.js';

export class CrossSiteRequestError extends DomainError {
  constructor() {
    super('Requête refusée : elle ne vient pas du casino.');
  }
}
