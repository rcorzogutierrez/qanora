import { Injectable, Injector, computed, inject, runInInjectionContext } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Auth, authState } from '@angular/fire/auth';
import { Firestore, doc, docData } from '@angular/fire/firestore';
import { Observable, from, of, switchMap } from 'rxjs';
import type { Account } from '@qanora/shared';

/**
 * accountId viaja como custom claim en el ID token (seteado por la Function
 * onUserCreate al momento de crear la cuenta). Nunca se resuelve leyendo
 * request.auth.uid como dueno directo de un recurso — ver CLAUDE.md.
 */
@Injectable({ providedIn: 'root' })
export class AccountService {
  private readonly auth = inject(Auth);
  private readonly firestore = inject(Firestore);
  private readonly injector = inject(Injector);

  private readonly idTokenResult = toSignal(
    authState(this.auth).pipe(
      switchMap((user) => (user ? from(user.getIdTokenResult()) : of(null))),
    ),
  );

  readonly accountId = computed(() => this.idTokenResult()?.claims['accountId'] as string | undefined);

  readonly account = toSignal(
    toObservable(this.accountId).pipe(
      switchMap((accountId) =>
        accountId
          ? runInInjectionContext(
              this.injector,
              () => docData(doc(this.firestore, 'accounts', accountId)) as Observable<Account>,
            )
          : of(undefined),
      ),
    ),
  );
}
