import {
  BitriseHelper,
  BitriseStatusHelper,
  BrowserStackHelper,
  BrowserStackStatusHelper,
  CocoaPodsStatusHelper,
  CodeMagicHelper, GitLabHelper,
  GitLabHelperModule,
  GitlabStatusHelper,
  GradleStatusHelper,
  notificator,
  NPMStatusHelper,
  simpleDb,
  simpleLogger,
  slack,
  teams
} from 'adash-ts-helper';
import { omit } from 'lodash';
import { getLast6MonthsDate, getYesterdayDate } from '../lib/utils';
import { Config } from '../types/config';

type Entry = {
  readonly createdAt: number;
};

const CANCELLED = 4;
const logger = simpleLogger();
const last6Months = getLast6MonthsDate();

const collectStatus = async (config: Config) => {
  const row = {
    createdAt: Date.now(),
  };

  if (config.collector.GitLab.status) {
    row['Gitlab'] = {
      ...(await GitlabStatusHelper.getStatus()),
      url: 'https://status.gitlab.com',
    };
  }

  if (config.collector.Bitrise.status) {
    row['Bitrise Build Processing'] = {
      ...(await BitriseStatusHelper.getBuildProcessingStatus()),
      url: 'https://status.bitrise.io',
    };
    row['Bitrise Step Issue'] = {
      ...(await BitriseStatusHelper.getStepIssueStatus()),
      url: 'https://status.bitrise.io',
    };
  }

  if (config.collector.NPM.status) {
    row['NPM Package Publishing'] = {
      ...(await NPMStatusHelper.getPackagePublishingStatus()),
      url: 'https://status.npmjs.org',
    };
  }

  if (config.collector.Gradle.status) {
    row['Gradle'] = {
      ...(await GradleStatusHelper.getStatus()),
      url: 'https://status.gradle.com',
    };
  }

  if (config.collector.CocoaPods.status) {
    row['CocoaPods CDN'] = {
      ...(await CocoaPodsStatusHelper.getCDNStatus()),
      url: 'https://status.cocoapods.org',
    };
  }

  if (config.collector.BrowserStack.status) {
    row['BrowserStack Live'] = {
      ...(await BrowserStackStatusHelper.getLiveStatus()),
      url: 'https://status.browserstack.com',
    };
    row['BrowserStack AppAutomate'] = {
      ...(await BrowserStackStatusHelper.getAutomateStatus()),
      url: 'https://status.browserstack.com',
    };
  }

  // collect Status
  const db = simpleDb<Partial<Entry>>({
    path: `${config.dataDir}/status.json`,
    logger,
  });
  await db.init();
  //await db.reset();

  // filter out rows older than 7 days ago
  await db.filter((row) => new Date(row.createdAt) >= last6Months);
  await db.insert(row);
  await db.commit();
};

const collectGitLab = async (config: Config) => {
  const gitlabHelper = GitLabHelper({
    projectId: config.collector.GitLab.projectId,
    defaultHeaders: {
      'PRIVATE-TOKEN': config.collector.GitLab.token,
    },
  });

  const GitLabOpenMergeRequests = await gitlabHelper.getMergeRequests({
    state: GitLabHelperModule.MERGE_REQUEST_STATE_OPENED,
  });

  const GitLabClosedMergeRequests = await gitlabHelper.getMergeRequests({
    state: GitLabHelperModule.MERGE_REQUEST_STATE_CLOSED,
    updated_after: getYesterdayDate(),
  });

  const row = {
    createdAt: Date.now(),
    GitlabPipelineQueue: await gitlabHelper.getPipelineQueue(),
    GitlabPipelineQueueSize: (await gitlabHelper.getPipelineQueue()).length,
    GitlabPipelineSchedules: await gitlabHelper.getPipelineSchedules(),
    GitlabJobQueue: await gitlabHelper.getJobQueue(),
    GitlabJobQueueSize: (await gitlabHelper.getJobQueue()).length,
    GitLabOpenMergeRequests,
    GitlabOpenMergeRequestsCount: GitLabOpenMergeRequests.length,
    GitLabClosedMergeRequests,
    GitlabClosedMergeRequestsCount: GitLabClosedMergeRequests.length,
  };

  // collect Status
  const db = simpleDb<Partial<Entry>>({
    path: `${config.dataDir}/gitlab.json`,
    logger,
  });
  await db.init();
  //await db.reset();

  // filter out rows older than 6 months ago
  await db.filter((row) => new Date(row.createdAt) >= last6Months);
  await db.insert(row);
  await db.commit();
};

const collectBrowserStack = async (config: Config) => {
  const [username, password] = config.collector.BrowserStack.token.split(':');
  const browserstackHelperInstance = BrowserStackHelper({
    auth: {
      username,
      password,
    },
  });

  const row = {
    createdAt: Date.now(),
    BrowserStackAppAutomateBuilds: (
      await browserstackHelperInstance.getBuilds()
    )
      //.filter((d) => d.automation_build.name.includes('MyPXS'))
      .slice(0, 15), // last 10 recent builds
  };

  // collect Status
  const db = simpleDb<Partial<Entry>>({
    path: `${config.dataDir}/browserstack.json`,
    logger,
  });
  await db.init();
  //await db.reset()

  // filter out rows older than 7 days ago
  await db.filter((row) => new Date(row.createdAt) >= last6Months);
  await db.insert(row);
  await db.commit();
};

const collectBitrise = async (config: Config) => {
  const bitriseHelperInstance = BitriseHelper({
    defaultHeaders: {
      authorization: `token ${config.collector.Bitrise.token}`,
    },
  });

  const row = {
    createdAt: Date.now(),
    BitriseQueueSize: await bitriseHelperInstance.getBuildQueueSize(),
    workflows: {},
  };

  for (const workflow of config.collector.Bitrise.workflows) {
    row.workflows[workflow] = (
      await bitriseHelperInstance.getBuildsByAppSlug(
        config.collector.Bitrise.appSlug,
        {
          workflow,
        }
      )
    ).data.find((b) => b.status !== CANCELLED);
  }

  // collect Status
  const db = simpleDb<Partial<Entry>>({
    path: `${config.dataDir}/bitrise.json`,
    logger,
  });
  await db.init();
  //await db.reset();

  // filter out rows older than 7 days ago
  await db.filter((row) => new Date(row.createdAt) >= last6Months);
  await db.insert(row);
  await db.commit();
};

const collectCodeMagic = async (config: Config) => {
  const codeMagicHelperInstance = CodeMagicHelper({ defaultHeaders: { 'x-auth-token': config.collector.CodeMagic.token } })

  const builds = (await codeMagicHelperInstance.getBuilds() as any).builds;
  const STATUS_IN_QUEUE = ['building', 'finishing', 'fetching', 'preparing', 'publishing', 'queued', 'testing']

  const CodeMagicBuildQueue = builds.filter((b: any) => STATUS_IN_QUEUE.includes(b.status)).map((b: any) => omit(b, ["config", "artefacts", "buildActions", "commit"]))
  const CodeMagicBuildQueueSize = CodeMagicBuildQueue.length
  const CodeMagicRecentBuilds = builds.map((b: any) => omit(b, ["config", "artefacts", "buildActions", "commit"]))

  // collect CodeMagic metrics
  const row = { createdAt: Date.now(), CodeMagicBuildQueue, CodeMagicRecentBuilds, CodeMagicBuildQueueSize }
  const db = simpleDb<Partial<Entry>>({
    path: `${config.dataDir}/codemagic.json`,
    logger,
  });
  await db.init();
  //await db.reset();

  // filter out rows older than 7 days ago
  await db.filter((row) => new Date(row.createdAt) >= last6Months);
  await db.insert(row);
  await db.commit();
};

type CollectorProps = {
  readonly browserstack?: boolean;
  readonly gitlab?: boolean;
  readonly bitrise?: boolean;
  readonly status?: boolean;
  readonly codemagic?: boolean;
};

export default async (
  config: Config,
  { browserstack, gitlab, bitrise, status, codemagic }: CollectorProps
) => {
  const { TEAMS_WEBHOOK_URL, SLACK_WEBHOOK_URL } = process.env;
  const logger = simpleLogger();

  notificator.registerMultiple([
    teams({ webhookURL: TEAMS_WEBHOOK_URL }),
    slack({
      webhookURL: SLACK_WEBHOOK_URL,
      username: 'adash-data-collector script',
    }),
  ]);

  try {
    // collect data
    status && (await collectStatus(config));
    bitrise && config.collector.Bitrise && (await collectBitrise(config));
    gitlab && config.collector.GitLab && (await collectGitLab(config));
    codemagic && config.collector.CodeMagic && (await collectCodeMagic(config));
    browserstack &&
      config.collector.BrowserStack &&
      (await collectBrowserStack(config));
  } catch (e) {
    logger.error('An errore occurred:', e.message);
    await notificator.notify('Error', 'adash-data-collector: ' + e);
  }
};
