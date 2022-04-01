import { notificator, simpleLogger, slack, teams } from "adash-ts-helper";
import simpleGit, { SimpleGit } from "simple-git";

const logger = simpleLogger();
const git: SimpleGit = simpleGit('data');

export default async () => {
  const {
    TEAMS_WEBHOOK_URL,
    SLACK_WEBHOOK_URL,
    //ADASH_GITLAB_TOKEN,
  } = process.env;

  //const REMOTE = `https://gitlab-ci-token:${ADASH_GITLAB_TOKEN}@gitlab.com/proximus.com/myproximus/adash/adash-rn-web.git`;

  notificator.registerMultiple([
    teams({ webhookURL: TEAMS_WEBHOOK_URL }),
    slack({
      webhookURL: SLACK_WEBHOOK_URL,
      username: 'adash-data-collector script',
    }),
  ]);

  try {
    await git.init()
    logger.debug(await git.status())
    /*logger.debug(
      await git.raw(
        'add',
        'data')
    );

    logger.debug(
      await git.raw(
        'commit',
        '-m',
        `New Data`
      )
    );*/

    //await git.raw('push', REMOTE, '--force');

  } catch (e) {
    logger.error('An errore occurred:', e.message);
    await notificator.notify('Error', 'adash-data-collector senddata: ' + e);
  }
};
