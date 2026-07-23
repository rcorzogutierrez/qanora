import { Injectable, Injector, computed, inject, runInInjectionContext } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Firestore, collection, collectionData, query, where } from '@angular/fire/firestore';
import { Observable, of, switchMap } from 'rxjs';
import type { Project } from '@qanora/shared';
import { AccountService } from '../account/account.service';

export type ProjectWithId = Project & { id: string };

/**
 * MVP: cada cuenta tiene un unico proyecto "Default" (creado por
 * onUserCreate). Fase 2.1 agrega CRUD real de multiples proyectos.
 */
@Injectable({ providedIn: 'root' })
export class ProjectService {
  private readonly firestore = inject(Firestore);
  private readonly injector = inject(Injector);
  private readonly accountService = inject(AccountService);

  private readonly projects = toSignal(
    toObservable(this.accountService.accountId).pipe(
      switchMap((accountId) =>
        accountId
          ? runInInjectionContext(
              this.injector,
              () =>
                collectionData(
                  query(collection(this.firestore, 'projects'), where('accountId', '==', accountId)),
                  { idField: 'id' },
                ) as Observable<ProjectWithId[]>,
            )
          : of([]),
      ),
    ),
    { initialValue: [] as ProjectWithId[] },
  );

  readonly defaultProject = computed(() => this.projects()[0]);
}
