import { ChangeDetectorRef, Component, OnDestroy, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DataService } from '../../_services/data.service';
import { forkJoin, Observable, of, Subject } from 'rxjs';
import { filter, map, switchMap, take, takeUntil, tap } from 'rxjs/operators';
import { UniformSubscription } from '../../_models/uniform-subscription';
import { DtFilterFieldDefaultDataSource } from '@dynatrace/barista-components/filter-field';
import { Project } from '../../_models/project';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { DtFilterFieldDefaultDataSourceAutocomplete } from '@dynatrace/barista-components/filter-field/src/filter-field-default-data-source';
import { EventTypes } from '../../../../shared/interfaces/event-types';
import { UniformRegistration } from '../../_models/uniform-registration';
import { KtbWebhookSettingsComponent } from '../ktb-webhook-settings/ktb-webhook-settings.component';
import { WebhookConfig } from '../../../../shared/models/webhook-config';
import { AppUtils } from '../../_utils/app.utils';
import { PreviousWebhookConfig } from '../../../../shared/interfaces/webhook-config';

@Component({
  selector: 'ktb-modify-uniform-subscription',
  templateUrl: './ktb-modify-uniform-subscription.component.html',
})
export class KtbModifyUniformSubscriptionComponent implements OnDestroy {
  private readonly unsubscribe$: Subject<void> = new Subject<void>();
  private taskControl = new FormControl('', [Validators.required]);
  private taskSuffixControl = new FormControl('', [Validators.required]);
  private isGlobalControl = new FormControl();
  public data$: Observable<{ taskNames: string[], subscription: UniformSubscription, project: Project, integrationId: string }>;
  public _dataSource = new DtFilterFieldDefaultDataSource();
  public editMode = false;
  public updating = false;
  public subscriptionForm = new FormGroup({
    taskPrefix: this.taskControl,
    taskSuffix: this.taskSuffixControl,
    isGlobal: this.isGlobalControl,
  });
  private webhookSettings?: KtbWebhookSettingsComponent;
  private _previousFilter?: PreviousWebhookConfig;
  public uniformRegistration?: UniformRegistration;
  public isWebhookService = false;
  public suffixes: { value: string, displayValue: string }[] = [
    {
      value: '>',
      displayValue: '*',
    },
    {
      value: 'triggered',
      displayValue: 'triggered',
    },
    {
      value: 'started',
      displayValue: 'started',
    },
    {
      value: 'finished',
      displayValue: 'finished',
    }];

  @ViewChild('webhookSettings', {static: false}) set webhookSettingsElement(webhookSettings: KtbWebhookSettingsComponent) {
    if (webhookSettings) { // initially setter gets called with undefined
      this.webhookSettings = webhookSettings;
      this._changeDetectorRef.detectChanges(); // prevent "Expression has changed after it was checked"-error at isWebhookFormValid
    }
  }

  public get isWebhookFormValid(): boolean {
    return this.webhookSettings?.webhookConfigForm.valid ?? true;
  }

  constructor(private route: ActivatedRoute, private dataService: DataService, private router: Router, private _changeDetectorRef: ChangeDetectorRef) {
    const subscription$ = this.route.paramMap.pipe(
      map(paramMap => {
        return {
          integrationId: paramMap.get('integrationId'),
          subscriptionId: paramMap.get('subscriptionId'),
          projectName: paramMap.get('projectName'),
        };
      }),
      filter((params): params is  { integrationId: string, subscriptionId: string | null, projectName: string } => !!(params.integrationId && params.projectName)),
      switchMap(params => {
        this.editMode = !!params.subscriptionId;
        if (params.subscriptionId) {
          return this.dataService.getUniformSubscription(params.integrationId, params.subscriptionId);
        } else {
          return of(new UniformSubscription(params.projectName));
        }
      }),
      tap(subscription => {
        if (this.editMode) {
          this._previousFilter = {
            filter: AppUtils.copyObject(subscription.filter),
            type: subscription.event,
          };
        }
        this.taskControl.setValue(subscription.prefix);
        this.taskSuffixControl.setValue(subscription.suffix);
        this.isGlobalControl.setValue(subscription.isGlobal);
      }),
      take(1),
    );

    const integrationId$ = this.route.paramMap
      .pipe(
        map(paramMap => paramMap.get('integrationId')),
        filter((integrationId: string | null): integrationId is string => !!integrationId),
        take(1),
      );

    integrationId$.pipe(
      switchMap(integrationId => this.dataService.getUniformRegistrationInfo(integrationId)),
      takeUntil(this.unsubscribe$),
    ).subscribe(info => {
      if (!info.isControlPlane) {
        this.suffixes = [
          {
            value: 'triggered',
            displayValue: 'triggered',
          },
        ];
      }
      this.isWebhookService = info.isWebhookService;
    });

    const projectName$ = this.route.paramMap
      .pipe(
        map(paramMap => paramMap.get('projectName')),
        filter((projectName: string | null): projectName is string => !!projectName),
      );

    const taskNames$ = projectName$
      .pipe(
        switchMap(projectName => this.dataService.getTaskNames(projectName)),
        take(1),
      );
    const project$ = projectName$
      .pipe(
        switchMap(projectName => this.dataService.getProject(projectName)),
        filter((project?: Project): project is Project => !!project),
        tap(project => this.updateDataSource(project)),
        take(1),
      );

    this.data$ = forkJoin({
      taskNames: taskNames$,
      subscription: subscription$,
      project: project$,
      integrationId: integrationId$,
    });
  }

  private updateDataSource(project: Project): void {
    this._dataSource.data = {
      autocomplete: [
        {
          name: 'Stage',
          autocomplete: project.stages.map(stage => {
            return {
              name: stage.stageName,
            };
          }),
        },
        {
          name: 'Service',
          autocomplete: project.getServices().map(service => {
            return {
              name: service.serviceName,
            };
          }),
        },
      ],
    } as DtFilterFieldDefaultDataSourceAutocomplete;
  }

  public updateSubscription(projectName: string, integrationId: string, subscription: UniformSubscription): void {
    this.updating = true;
    const updates = [];
    subscription.event = `${EventTypes.PREFIX}${this.taskControl.value}.${this.taskSuffixControl.value}`;
    subscription.setIsGlobal(this.isGlobalControl.value, projectName);

    if (this.editMode) {
      updates.push(this.dataService.updateUniformSubscription(integrationId, subscription));
    } else {
      updates.push(this.dataService.createUniformSubscription(integrationId, subscription));
    }

    if (this.webhookSettings) {
      const webhookConfig: WebhookConfig = new WebhookConfig();
      webhookConfig.type = subscription.event;
      webhookConfig.filter = subscription.filter;
      webhookConfig.prevConfiguration = this._previousFilter;
      webhookConfig.method = this.webhookSettings.getFormControl('method').value;
      webhookConfig.url = this.webhookSettings.getFormControl('url').value;
      webhookConfig.payload = this.webhookSettings.getFormControl('payload').value;
      webhookConfig.proxy = this.webhookSettings.getFormControl('proxy').value;
      for (const header of this.webhookSettings.headerControls) {
        webhookConfig.header.push({
          name: header.get('name')?.value,
          value: header.get('value')?.value,
        });
      }
      updates.push(this.dataService.saveWebhookConfig(webhookConfig));
    }

    forkJoin(
      updates,
    ).subscribe(() => {
      this.updating = false;
      this.router.navigate(['/', 'project', projectName, 'uniform', 'services', integrationId]);
    }, () => {
      this.updating = false;
    });
  }

  public isFormValid(subscription: UniformSubscription): boolean {
    return this.subscriptionForm.valid && (!!subscription.filter.stages?.length || !subscription.filter.services?.length) && this.isWebhookFormValid && !this.updating;
  }

  public ngOnDestroy(): void {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }
}
