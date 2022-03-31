export type Severity = 'low' | 'medium' | 'high';

export type Threshold = {
  readonly key: string;
  readonly filename: string;
  readonly max: number;
  readonly incident: boolean;
  readonly notification: boolean;
  readonly severity: Severity;
  readonly channels: string[];
};

export type Status = {
  readonly key: string;
  readonly filename: string;
  readonly success: string;
  readonly incident: boolean;
  readonly notification: boolean;
  readonly severity: Severity;
  readonly channels: string[];
};

export type Monitor = {
  readonly key: string;
  readonly filename: string;
  readonly notification: boolean;
  readonly channels: string[];
};

export type Slack = {
  username: string;
  webhookURL: string;
};

export type Teams = {
  webhookURL: string;
};

export type Config = {
  readonly dataDir: string;
  readonly envs: Record<string, string>;
  collector: {
    GitLab?: { status: boolean; projectId: string; token: string };
    BrowserStack?: { status: boolean; token: string };
    Bitrise?: { status: boolean; appSlug: string; token: string };
    NPM: { status: boolean };
    Gradle: { status: boolean };
    CocoaPods: { status: boolean };
  };
  readonly notificator: {
    readonly monitor: Record<string, Monitor>;
    readonly status: Record<string, Status>;
    readonly thresholds: Record<string, Threshold>;
    readonly channels: {
      slack: Record<string, Slack>;
      teams: Record<string, Teams>;
    };
  };
};
