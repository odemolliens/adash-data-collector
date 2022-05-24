import {
  BitriseHelper,
  BitriseStatusHelper,
  BrowserStackHelper,
  BrowserStackStatusHelper,
  CocoaPodsStatusHelper,
  CodeMagicHelper,
  FileHelper,
  GitLabHelper,
  GitLabHelperModule,
  GitlabStatusHelper,
  GradleStatusHelper,
  notificator,
  NPMStatusHelper,
  simpleDb,
  simpleLogger,
  slack,
  teams,
} from 'adash-ts-helper';
import jsonpack from 'jsonpack';
import { omit } from 'lodash';

import { getLast1MonthDate, getYesterdayDate } from '../lib/utils';
import { Config } from '../types/config';

type Entry = {
  readonly createdAt: number;
};

const CANCELLED = 4;
const logger = simpleLogger();
const last1Month = getLast1MonthDate();
const createdAt = Date.now();

export type CollectorOptions = {
  readonly config: Config;
  readonly resetdb?: boolean;
};

const collectStatus = async (options: CollectorOptions) => {
  const { config, resetdb } = options;

  const row = {
    createdAt,
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
    path: `${config.dataDir}/status.db`,
    logger,
    compress: true
  });

  await db.init();

  if (resetdb) {
    await db.reset();
  }

  await rotateDb(
    `${config.dataDir}/status.db`,
    (row) => new Date(row.createdAt) < last1Month
  );

  // filter out rows older than 7 days ago
  await db.filter((row) => new Date(row.createdAt) >= last1Month);
  await db.insert(row);
  await db.commit();
};

async function rotateDb(dbPath: string, filterFn: (row: any) => void) {
  const db = simpleDb<Partial<Entry>>({
    path: dbPath,
    logger,
    compress: true
  });

  await db.init();

  const filtered = db.data().filter(filterFn);
  const dbBkp = simpleDb<Partial<Entry>>({
    path: `${dbPath.replace(
      '.db',
      ''
    )}_${last1Month.getMonth()}-${last1Month.getFullYear()}.bkp.db`,
  });
  await dbBkp.init();
  await dbBkp.insertAll(filtered);
  await dbBkp.commit();
}

const collectGitLab = async (options: CollectorOptions) => {
  const { config, resetdb } = options;

  const gitlabHelper = GitLabHelper({
    projectId: config.collector.GitLab.projectId,
    defaultHeaders: {
      'PRIVATE-TOKEN': config.collector.GitLab.token,
    },
  });

  const GitLabOpenMergeRequests = await gitlabHelper.getMergeRequests({
    state: GitLabHelperModule.MERGE_REQUEST_STATE_OPENED,
    per_page: 100,
  });

  const GitLabClosedMergeRequests = await gitlabHelper.getMergeRequests({
    state: GitLabHelperModule.MERGE_REQUEST_STATE_CLOSED,
    updated_after: getYesterdayDate(),
    per_page: 100,
  });

  const GitlabPipelineQueue = await gitlabHelper.getPipelineQueue({
    per_page: 100,
  });
  const GitlabJobQueue = await gitlabHelper.getJobQueue();

  const row = {
    createdAt,
    GitlabPipelineQueue,
    GitlabPipelineQueueSize: GitlabPipelineQueue.length,
    GitlabPipelineSchedules: await gitlabHelper.getPipelineSchedules(),
    GitlabJobQueue,
    GitlabJobQueueSize: GitlabJobQueue.length,
    GitLabOpenMergeRequests,
    GitlabOpenMergeRequestsCount: GitLabOpenMergeRequests.length,
    GitLabClosedMergeRequests,
    GitlabClosedMergeRequestsCount: GitLabClosedMergeRequests.length,
  };

  // collect Status
  const db = simpleDb<Partial<Entry>>({
    path: `${config.dataDir}/gitlab.db`,
    logger,
    compress: true
  });

  await db.init();

  if (resetdb) {
    await db.reset();
  }

  await rotateDb(
    `${config.dataDir}/gitlab.db`,
    (row) => new Date(row.createdAt) < last1Month
  );

  // filter out rows older than 1 months ago
  await db.filter((row) => new Date(row.createdAt) >= last1Month);
  await db.insert(row);
  await db.commit();

  const packed = jsonpack.pack(db.data());
  await FileHelper.writeFile(packed, `${config.dataDir}/gitlab.txt`);
};

const collectBrowserStack = async (options: CollectorOptions) => {
  const { config, resetdb } = options;
  const [username, password] = config.collector.BrowserStack.token.split(':');
  const browserstackHelperInstance = BrowserStackHelper({
    auth: {
      username,
      password,
    },
  });

  const row = {
    createdAt,
    BrowserStackAppAutomateBuilds: (
      await browserstackHelperInstance.getBuilds()
    ).slice(0, 15), // last 15 recent builds
  };

  // collect Status
  const db = simpleDb<Partial<Entry>>({
    path: `${config.dataDir}/browserstack.db`,
    logger,
    compress: true
  });

  await db.init();

  if (resetdb) {
    await db.reset();
  }

  await rotateDb(
    `${config.dataDir}/browserstack.db`,
    (row) => new Date(row.createdAt) < last1Month
  );

  // filter out rows older than 7 days ago
  await db.filter((row) => new Date(row.createdAt) >= last1Month);
  await db.insert(row);
  await db.commit();
};

const collectBitrise = async (options: CollectorOptions) => {
  const { config, resetdb } = options;
  const bitriseHelperInstance = BitriseHelper({
    defaultHeaders: {
      authorization: `token ${config.collector.Bitrise.token}`,
    },
  });

  const row = {
    createdAt,
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
    path: `${config.dataDir}/bitrise.db`,
    logger,
    compress: true
  });

  await db.init();

  if (resetdb) {
    await db.reset();
  }

  await rotateDb(
    `${config.dataDir}/bitrise.db`,
    (row) => new Date(row.createdAt) < last1Month
  );

  // filter out rows older than 7 days ago
  await db.filter((row) => new Date(row.createdAt) >= last1Month);
  await db.insert(row);
  await db.commit();
};

const collectCodeMagic = async (options: CollectorOptions) => {
  const { config, resetdb } = options;
  const codeMagicHelperInstance = CodeMagicHelper({
    defaultHeaders: { 'x-auth-token': config.collector.CodeMagic.token },
  });

  const builds = ((await codeMagicHelperInstance.getBuilds()) as any).builds;
  const STATUS_IN_QUEUE = [
    'building',
    'finishing',
    'fetching',
    'preparing',
    'publishing',
    'queued',
    'testing',
  ];

  const CodeMagicBuildQueue = builds
    .filter((b: any) => STATUS_IN_QUEUE.includes(b.status))
    .map((b: any) =>
      omit(b, ['config', 'artefacts', 'buildActions', 'commit'])
    );
  const CodeMagicBuildQueueSize = CodeMagicBuildQueue.length;
  const CodeMagicRecentBuilds = builds
    .map((b: any) => omit(b, ['config', 'artefacts', 'buildActions', 'commit']))
    .slice(0, 15); // last 15 recent builds

  // collect CodeMagic metrics
  const row = {
    createdAt,
    CodeMagicBuildQueue,
    CodeMagicRecentBuilds,
    CodeMagicBuildQueueSize,
  };
  const db = simpleDb<Partial<Entry>>({
    path: `${config.dataDir}/codemagic.db`,
    logger,
    compress: true
  });

  await db.init();

  if (resetdb) {
    await db.reset();
  }

  await rotateDb(
    `${config.dataDir}/codemagic.db`,
    (row) => new Date(row.createdAt) < last1Month
  );

  // filter out rows older than 7 days ago
  await db.filter((row) => new Date(row.createdAt) >= last1Month);
  await db.insert(row);
  await db.commit();
};

export default async (options: CollectorOptions) => {
  const { config } = options;
  const { TEAMS_WEBHOOK_URL, SLACK_WEBHOOK_URL } = process.env;
  const logger = simpleLogger();

  notificator.registerMultiple(
    [
      TEAMS_WEBHOOK_URL && teams({ webhookURL: TEAMS_WEBHOOK_URL }),
      SLACK_WEBHOOK_URL &&
      slack({
        webhookURL: SLACK_WEBHOOK_URL,
        username: 'adash-data-collector script',
      }),
    ].filter(Boolean)
  );

  try {
    // collect data
    await collectStatus(options);

    config.collector.Bitrise.metrics && (await collectBitrise(options));

    config.collector.GitLab.metrics && (await collectGitLab(options));

    config.collector.CodeMagic.metrics && (await collectCodeMagic(options));

    config.collector.BrowserStack.metrics &&
      (await collectBrowserStack(options));
  } catch (e) {
    logger.error('An errore occurred:', e.message);
    await notificator.notify(
      'Error',
      'adash-data-collector: ' + JSON.stringify(e)
    );
  }
};
