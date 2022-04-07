import {
  FileHelper,
  GitLabHelper,
  GitLabHelperModule,
  notificator,
  simpleDb,
  simpleLogger,
  slack,
  teams,
} from 'adash-ts-helper';
import { get, isEmpty, last } from 'lodash';

import { getLastWeekDate, shorthash } from '../lib/utils';
import { Config, Severity } from '../types/config';

type Notification = {
  readonly createdAt: number;
  readonly title: string;
  readonly type: Severity | 'monitor';
};

const createdAt = Date.now();
const logger = simpleLogger();
const NOTIFICATION_USER = 'Adash Notification TEST';
const FILES = {};
let DB: any;
let CONFIG: Config;
let adashGitlabHelper: GitLabHelperModule.IGitLabHelper;

const getDataFromFile = async (filename: string) => {
  if (isEmpty(FILES[filename])) {
    FILES[filename] = last(
      await FileHelper.readJSONFile(`${CONFIG.dataDir}/${filename}`)
    )!;
  }
  return FILES[filename];
};

const notifyMonitor = async () => {
  try {
    for (const [name, provider] of Object.entries(CONFIG.notificator.monitor)) {
      const data = await getDataFromFile(provider.filename);
      const current = get(data, provider.key);

      const notification = {
        createdAt,
        title: `ℹ️ ${name} monitor: ${current}`,
        type: 'monitor' as const,
      };

      if (provider.notification) {
        await createNotificationAndNotifyChannels(
          notification,
          provider.channels
        );
      }
    }
  } catch (e) {
    logger.error('An errore occurred:', e.message);
    await notificator.notify('Error', 'adash-data-collector notificator: ' + e);
  }
};

const notifyThresholds = async () => {
  try {
    for (const [name, provider] of Object.entries(
      CONFIG.notificator.thresholds
    )) {
      const data = await getDataFromFile(provider.filename);
      const current = get(data, provider.key);

      if (current > provider.max) {
        const notification = {
          createdAt,
          title: `🔥 ${name} threshold reached: ${current} > ${provider.max}`,
          type: provider.severity,
        };

        if (provider.notification) {
          await createNotificationAndNotifyChannels(
            notification,
            provider.channels
          );
        }

        if (provider.incident) {
          await createIncident(notification);
        }
      }
    }
  } catch (e) {
    logger.error('An errore occurred:', e.message);
    await notificator.notify('Error', 'adash-data-collector notificator: ' + e);
  }
};

const notifyStatus = async () => {
  try {
    for (const [name, provider] of Object.entries(CONFIG.notificator.status)) {
      const data = await getDataFromFile(provider.filename);
      const current = get(data, provider.key);

      if (!provider.success.includes(current)) {
        const notification = {
          createdAt,
          title: `${name} status ${current}`,
          type: provider.severity,
        };

        if (provider.notification) {
          await createNotificationAndNotifyChannels(
            notification,
            provider.channels
          );
        }

        if (provider.incident) {
          await createIncident(notification);
        }
      }
    }
  } catch (e) {
    logger.error('An errore occurred:', e.message);
    await notificator.notify('Error', 'adash-data-collector notificator: ' + e);
  }
};

async function createNotificationAndNotifyChannels(
  notification: Notification,
  channels: readonly string[]
) {
  logger.info('Creating notification:', notification);

  await DB.insert(notification);

  channels?.forEach(async (channel) => {
    if (CONFIG.notificator.channels.slack[channel]) {
      logger.info(`Sending msg to Slack: ${channel}`);
      await slack(CONFIG.notificator.channels.slack[channel]).notify(
        NOTIFICATION_USER,
        notification.title
      );
    } else if (CONFIG.notificator.channels.teams[channel]) {
      logger.info(`Sending msg to Teams: ${channel}`);
      await teams(CONFIG.notificator.channels.teams[channel]).notify(
        NOTIFICATION_USER,
        notification.title
      );
    }
  });
}

async function createIncident(notification: Notification) {
  const id = shorthash(notification.title.toLowerCase());

  const { data: issues } = await adashGitlabHelper.listIssues({
    search: id,
    state: 'opened',
  });

  if (!issues.length) {
    logger.info('Creating incident:', notification);

    await adashGitlabHelper.newIssueWithLabels(
      `${id}: ${notification.title}`,
      [notification.type],
      { issue_type: 'incident' }
    );
  }
}

export default async (config: Config) => {
  const {
    TEAMS_WEBHOOK_URL,
    SLACK_WEBHOOK_URL,
    ADASH_GITLAB_PROJECTID_TOKEN,
    ADASH_GITLAB_TOKEN,
  } = process.env;

  adashGitlabHelper = GitLabHelper({
    projectId: ADASH_GITLAB_PROJECTID_TOKEN,
    defaultHeaders: {
      'PRIVATE-TOKEN': ADASH_GITLAB_TOKEN,
    },
  });

  notificator.registerMultiple([
    teams({ webhookURL: TEAMS_WEBHOOK_URL }),
    slack({
      webhookURL: SLACK_WEBHOOK_URL,
      username: 'adash-data-collector script',
    }),
  ]);

  try {
    DB = simpleDb<Notification>({
      path: `${config.dataDir}/notifications.json`,
    });

    CONFIG = config;

    await DB.init();
    //await DB.reset();

    logger.debug('Config', CONFIG);

    await notifyMonitor();
    await notifyStatus();
    await notifyThresholds();

    // filter out rows older than 7 days ago
    const lastWeekDate = getLastWeekDate();
    await DB.filter((row) => new Date(row.createdAt) >= lastWeekDate);
    await DB.commit();
    await FileHelper.writeFile(
      config.notificator.thresholds,
      `${config.dataDir}/thresholds.json`
    );
  } catch (e) {
    logger.error('An errore occurred:', e.message);
    await notificator.notify('Error', 'adash-data-collector notificator: ' + e);
  }
};
