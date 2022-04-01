import { notificator, simpleLogger, slack, teams } from "adash-ts-helper";
import simpleGit, { SimpleGit } from "simple-git";

const logger = simpleLogger();
const git: SimpleGit = simpleGit('data');

export default async () => {
  const {
    TEAMS_WEBHOOK_URL,
    SLACK_WEBHOOK_URL,
    DATA_REPOSITORY
  } = process.env;

  const REMOTE = DATA_REPOSITORY;

  notificator.registerMultiple([
    teams({ webhookURL: TEAMS_WEBHOOK_URL }),
    slack({
      webhookURL: SLACK_WEBHOOK_URL,
      username: 'adash-data-collector script',
    }),
  ]);

  try {
    await git.init()

    try {
      logger.debug(
        await git.raw(
          'remote',
          'add',
          `origin`,
          REMOTE
        )
      );

      await git.fetch()
      await git.raw('checkout', '-b', 'data')
    } catch (e) { }

    logger.debug(
      await git.raw(
        'add',
        '.'
      )
    );

    logger.debug(
      await git.raw(
        'commit',
        '-m',
        `New Data`
      )
    );

    await git.raw('push', 'origin', 'data');

  } catch (e) {
    logger.error('An errore occurred:', e.message);
    await notificator.notify('Error', 'adash-data-collector senddata: ' + e);
  }
};
