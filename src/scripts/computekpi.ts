import {
  notificator,
  simpleDb,
  simpleLogger,
  slack,
  teams,
} from 'adash-ts-helper';
import { getLast6MonthsDate } from '../lib/utils';
import { Config } from '../types/config';
import fs from 'fs/promises';
import { FileHelper } from 'adash-ts-helper';

const last6Months = getLast6MonthsDate();

export default async (config: Config) => {
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
    // collect Status
    const db = simpleDb<Partial<any>>({
      path: `${config.dataDir}/kpie2e.json`,
      logger,
    });
    await db.init();
    //await db.reset();

    const row = { createdAt: null, stats: { ios: [], android: [] } };

    const teams = (
      await fs.readdir(`./kpie2edata/teams`, { withFileTypes: true })
    )
      .filter((dir) => dir.isDirectory())
      .map((dir) => dir.name);

    for (const team of teams) {
      const teamStats = await FileHelper.readJSONFile(
        `./kpie2edata/teams/${team}/wdio-ma-merged.json`
      );


      let createdAt = new Date(teamStats.stats.start)
      createdAt.setMinutes(new Date().getMinutes()) // TODO remove me later
      row.createdAt = createdAt.getTime()

      const ios = [];
      const android = [];

      for (const s of teamStats.suites.suites) {
        const minifiedSuite = { title: s.title, duration: s.duration, tests: s.tests.map(t => ({ title: t.title, pass: t.pass, duration: t.duration })) }

        if (minifiedSuite.title.includes('ios')) {
          ios.push(minifiedSuite);
        } else if (s.title.includes('android')) {
          android.push(minifiedSuite);
        }
      }

      const iOSTotalTests = ios.reduce((prev, curr) => prev + curr.tests.length, 0)
      const iOSPass = ios.reduce((prev, curr) => prev + curr.tests.filter(t => t.pass).length, 0)
      const iOSFail = iOSTotalTests - iOSPass

      row.stats.ios.push({
        teamName: team,
        totalTests: iOSTotalTests,
        pass: iOSPass,
        fail: iOSFail,
        passPercentage: parseFloat((iOSPass / iOSTotalTests * 100).toFixed(2)),
        suites: ios,
      });

      const androidTotalTests = android.reduce((prev, curr) => prev + curr.tests.length, 0)
      const androidPass = android.reduce((prev, curr) => prev + curr.tests.filter(t => t.pass).length, 0)
      const androidFail = androidTotalTests - androidPass

      row.stats.android.push({
        teamName: team,
        totalTests: androidTotalTests,
        pass: androidPass,
        fail: androidFail,
        passPercentage: parseFloat((androidPass / androidTotalTests * 100).toFixed(2)),
        suites: android,
      });
    }

    // filter out rows older than 7 days ago
    await db.filter((row) => new Date(row.createdAt) >= last6Months);
    await db.insert(row);
    await db.commit();
  } catch (e) {
    logger.error('An errore occurred:', e.message);
    await notificator.notify('Error', 'adash-data-collector: ' + e);
  }
};
