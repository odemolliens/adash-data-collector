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

import { createDailyNotificationID, getLastWeekDate } from '../lib/utils';
import { Config, Severity } from '../types/config';

type Notification = {
  readonly createdAt: number;
  readonly title: string;
  readonly type: Severity | 'monitor';
  readonly id: string;
};

type NotificatorProps = {
  readonly monitor?: boolean;
  readonly status?: boolean;
  readonly thresholds?: boolean;
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

      const title = `ℹ️ ${name} monitor: ${current}`;

      const notification = {
        id: createDailyNotificationID(title, createdAt),
        createdAt,
        title,
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
        const title = `🔥 ${name} threshold reached: ${current} > ${provider.max}`;

        const notification = {
          id: createDailyNotificationID(title, createdAt),
          createdAt,
          title,
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
        const title = `🔥 ${name} status ${current}`;

        const notification = {
          id: createDailyNotificationID(title, createdAt),
          createdAt,
          title,
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

  if (DB.data().find((n: Notification) => n.id === notification.id)) {
    return;
  }

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
  const title = notification.title;
  const id = createDailyNotificationID(title, createdAt);

  const { data: issues } = await adashGitlabHelper.listIssues({
    search: id,
    state: 'opened',
  });

  if (!issues.length) {
    logger.info('Creating incident:', notification);

    await adashGitlabHelper.newIssueWithLabels(
      `${id}: ${title}`,
      [notification.type],
      { issue_type: 'incident' }
    );
  }
}

export default async (
  config: Config,
  { monitor, status, thresholds }: NotificatorProps
) => {
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

    monitor && (await notifyMonitor());
    status && (await notifyStatus());
    thresholds && (await notifyThresholds());

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
