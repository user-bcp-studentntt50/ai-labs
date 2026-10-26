import { HttpErrorResponse } from '@angular/common/http';
import { TimeoutError } from 'rxjs';

export function isRequestError(error: unknown): boolean {
  return error instanceof HttpErrorResponse || error instanceof TimeoutError;
}
