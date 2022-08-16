import { Deployment as dp, IStageDeployment, SubSequence } from '../../../shared/interfaces/deployment';
import { EvaluationResult } from '../../../shared/interfaces/evaluation-result';
import { Trace } from './trace';
import { SequenceStatus } from '../../../shared/interfaces/sequence';
import { ResultTypes } from '../../../shared/models/result-types';
import { isSequenceAborted, isSequenceLoading, SequenceState } from './sequenceState';
import { ServiceRemediationInformation } from './service-remediation-information';

export interface IStageDeploymentStateInfo {
  isLoading: boolean;
  isSuccessful: boolean;
  isWarning: boolean;
  isFaulty: boolean;
  isAborted: boolean;
}

export function createStageDeploymentStateInfo(stageDeployment: IStageDeployment): IStageDeploymentStateInfo {
  const isFaulty = stageDeployment.subSequences.some((seq) => seq.result === ResultTypes.FAILED);
  return {
    isLoading: stageDeployment.subSequences.some((seq) => isSequenceLoading(seq.state)),
    isSuccessful: stageDeployment.subSequences.every(
      (seq) => seq.state === SequenceStatus.FINISHED && seq.result === ResultTypes.PASSED
    ),
    isWarning: stageDeployment.subSequences.some((seq) => seq.result === ResultTypes.WARNING) && !isFaulty,
    isFaulty,
    isAborted: isSequenceAborted(stageDeployment.state),
  };
}

export class StageDeployment implements IStageDeployment {
  name!: string;
  state!: SequenceStatus;
  deploymentURL?: string;
  hasEvaluation!: boolean;
  lastTimeUpdated!: string;
  evaluationResult?: EvaluationResult;
  latestEvaluation?: Trace;
  openRemediations!: SequenceState[];
  approvalInformation?: {
    trace: Trace;
    deployedImage?: string;
  };
  subSequences!: SubSequence[];

  public static fromJSON(data: IStageDeployment): StageDeployment {
    const stage: StageDeployment = Object.assign(new this(), data);
    if (stage.latestEvaluation) {
      stage.latestEvaluation = Trace.fromJSON(stage.latestEvaluation);
    }
    if (stage.approvalInformation?.trace) {
      stage.approvalInformation.trace = Trace.fromJSON(stage.approvalInformation.trace);
    }
    stage.openRemediations = stage.openRemediations.map((seq) => SequenceState.fromJSON(seq));
    return stage;
  }

  public removeApproval(): void {
    this.approvalInformation = undefined;
    for (const subSequence of this.subSequences) {
      subSequence.hasPendingApproval = false;
    }
  }

  public update(stage: StageDeployment): void {
    this.lastTimeUpdated = stage.lastTimeUpdated;
    this.approvalInformation = stage.approvalInformation;
    this.openRemediations = stage.openRemediations;
    this.deploymentURL ??= stage.deploymentURL;
    this.evaluationResult ??= stage.evaluationResult;
    this.state = stage.state;

    if ((stage.hasEvaluation && !this.hasEvaluation) || !this.latestEvaluation) {
      this.latestEvaluation = stage.latestEvaluation;
    }
    this.hasEvaluation = stage.hasEvaluation;

    this.updateSubSequences(stage.subSequences);
  }

  private updateSubSequences(subSequences: SubSequence[]): void {
    if (!this.subSequences.length) {
      this.subSequences = subSequences;
    } else {
      for (let i = subSequences.length - 1; i >= 0; i--) {
        const subSequence = subSequences[i];
        const originalSubSequence = this.subSequences.find((seq) => seq.id === subSequence.id);
        if (originalSubSequence) {
          // update existing subSequence
          originalSubSequence.state = subSequence.state;
          originalSubSequence.result = subSequence.result;
          originalSubSequence.hasPendingApproval = subSequence.hasPendingApproval;
          originalSubSequence.message = subSequence.message;
        } else {
          // add new subSequences
          this.subSequences.unshift(subSequence);
        }
      }
    }
  }
}

export class Deployment implements dp {
  stages!: StageDeployment[];
  image?: string;
  keptnContext!: string;
  service!: string;
  labels!: { [p: string]: string };
  state!: SequenceStatus;

  public static fromJSON(data: unknown): Deployment {
    const deployment: Deployment = Object.assign(new this(), data);
    deployment.stages = deployment.stages.map((stage) => StageDeployment.fromJSON(stage));
    return deployment;
  }

  public isFinished(): boolean {
    return SequenceState.isFinished(this.state);
  }

  public getStage(stageName: string): StageDeployment | undefined {
    return this.stages.find((stage) => stage.name === stageName);
  }

  public get latestTimeUpdated(): Date | undefined {
    return this.stages.reduce((maxTime: undefined | Date, stage) => {
      const stageDate = new Date(stage.lastTimeUpdated);
      if (!maxTime || maxTime < stageDate) {
        maxTime = stageDate;
      }
      return maxTime;
    }, undefined);
  }

  public updateRemediations(remediationInfo: ServiceRemediationInformation): void {
    for (const stage of this.stages) {
      const newStage = remediationInfo.stages.find((st) => st.name === stage.name);
      if (newStage && stage.deploymentURL) {
        stage.openRemediations = newStage.remediations;
      } else {
        stage.openRemediations = [];
      }
    }
  }

  public update(deployment: Deployment): void {
    this.image = deployment.image;
    this.labels = deployment.labels;
    this.state = deployment.state;
    for (const stage of deployment.stages) {
      const originalStage = this.getStage(stage.name);
      if (!originalStage) {
        // new stage
        this.stages.push(stage);
      } else {
        // update existing stage
        originalStage.update(stage);
      }
    }
  }
}
