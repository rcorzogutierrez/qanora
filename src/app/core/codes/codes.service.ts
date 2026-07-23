import { Injectable, Injector, inject, runInInjectionContext } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { Firestore, collection, collectionData, orderBy, query, where } from '@angular/fire/firestore';
import { Observable, of, switchMap } from 'rxjs';
import type { Code, QrDesign } from '@qanora/shared';
import { ProjectService } from '../projects/project.service';

export type CodeWithId = Code & { id: string };

export interface CreateQrCodeInput {
  projectId: string;
  qrMode: 'static' | 'dynamic';
  destination: string;
  design: QrDesign;
  name?: string;
  description?: string;
}

export interface CreateQrCodeResult {
  codeId: string;
  shortUrl?: string;
}

export interface UpdateCodeDestinationInput {
  codeId: string;
  destination: string;
}

export interface UpdateCodeStatusInput {
  codeId: string;
  status: 'active' | 'paused';
}

export interface UpdateCodeMetaInput {
  codeId: string;
  name?: string;
  description?: string;
}

@Injectable({ providedIn: 'root' })
export class CodesService {
  private readonly functions = inject(Functions);
  private readonly firestore = inject(Firestore);
  private readonly injector = inject(Injector);
  private readonly projectService = inject(ProjectService);

  readonly codes = toSignal(
    toObservable(this.projectService.defaultProject).pipe(
      switchMap((project) =>
        project
          ? runInInjectionContext(
              this.injector,
              () =>
                collectionData(
                  query(
                    collection(this.firestore, 'codes'),
                    where('accountId', '==', project.accountId),
                    where('projectId', '==', project.id),
                    orderBy('createdAt', 'desc'),
                  ),
                  { idField: 'id' },
                ) as Observable<CodeWithId[]>,
            )
          : of([]),
      ),
    ),
    { initialValue: [] as CodeWithId[] },
  );

  async createQrCode(input: CreateQrCodeInput): Promise<CreateQrCodeResult> {
    const callable = httpsCallable<CreateQrCodeInput, CreateQrCodeResult>(
      this.functions,
      'createQrCode',
    );
    const result = await callable(input);
    return result.data;
  }

  async updateDestination(input: UpdateCodeDestinationInput): Promise<void> {
    const callable = httpsCallable<UpdateCodeDestinationInput, { ok: true }>(
      this.functions,
      'updateCodeDestination',
    );
    await callable(input);
  }

  async updateStatus(input: UpdateCodeStatusInput): Promise<void> {
    const callable = httpsCallable<UpdateCodeStatusInput, { ok: true }>(
      this.functions,
      'updateCodeStatus',
    );
    await callable(input);
  }

  async updateMeta(input: UpdateCodeMetaInput): Promise<void> {
    const callable = httpsCallable<UpdateCodeMetaInput, { ok: true }>(this.functions, 'updateCodeMeta');
    await callable(input);
  }
}
