import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { Auth } from '@angular/fire/auth';
import { CanActivateFn, Router } from '@angular/router';
import { filter, map, take } from 'rxjs';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const authService = inject(AuthService);
  const router = inject(Router);

  // Fast path: auth.currentUser es sincrono e inmediato (lo setea el SDK
  // antes de resolver signIn/signUp). El signal `user` pasa por Observable
  // -> Signal -> Observable y puede ir un tick atras justo despues de un
  // signup/login recien hecho, causando un falso redirect a login.
  if (auth.currentUser) {
    return true;
  }

  return toObservable(authService.user).pipe(
    filter((user) => user !== undefined),
    take(1),
    map((user) => (user ? true : router.createUrlTree(['/auth/login']))),
  );
};
