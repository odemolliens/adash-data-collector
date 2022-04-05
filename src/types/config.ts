export type Severity = 'low' | 'medium' | 'high';

export type Threshold = {
  readonly key: string;
  readonly filename: string;
  readonly max: number;
  readonly incident: boolean;
  readonly notification: boolean;
  readonly severity: Severity;
  readonly channels: readonly string[];
};

export type Status = {
  readonly key: string;
  readonly filename: string;
  readonly success: string | readonly string[];
  readonly incident: boolean;
  readonly notification: boolean;
  readonly severity: Severity;
  readonly channels: readonly string[];
};

export type Monitor = {
  readonly key: string;
  readonly filename: string;
  readonly notification: boolean;
  readonly channels: readonly string[];
};

export type Slack = {
  readonly username: string;
  readonly webhookURL: string;
};

export type Teams = {
  readonly webhookURL: string;
};

export type Config = {
  readonly dataDir: string;
  readonly kpiDataDir: string;
  readonly envs: Record<string, string>;
  readonly collector: {
    readonly GitLab?: {
      readonly status: boolean;
      readonly projectId: string;
      readonly token: string;
    };
    readonly BrowserStack?: {
      readonly status: boolean;
      readonly token: string;
    };
    readonly Bitrise?: {
      readonly status: boolean;
      readonly appSlug: string;
      readonly token: string;
      readonly workflows: readonly string[];
    };
    readonly NPM: { readonly status: boolean };
    readonly Gradle: { readonly status: boolean };
    readonly CocoaPods: { readonly status: boolean };
  };
  readonly notificator: {
    readonly monitor: Record<string, Monitor>;
    readonly status: Record<string, Status>;
    readonly thresholds: Record<string, Threshold>;
    readonly channels: {
      readonly slack: Record<string, Slack>;
      readonly teams: Record<string, Teams>;
    };
  };
};
