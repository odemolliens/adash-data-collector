import {
  FileHelper, notificator,
  shell,
  simpleDb,
  simpleLogger,
  slack,
  teams
} from 'adash-ts-helper';
import fs from 'fs/promises';
import { getLast6MonthsDate } from '../lib/utils';
import { Config } from '../types/config';

const last6Months = getLast6MonthsDate();

export default async (config: Config) => {
  const { TEAMS_WEBHOOK_URL, SLACK_WEBHOOK_URL } = process.env;
  const logger = simpleLogger();
  const sh = shell();

  notificator.registerMultiple([
    teams({ webhookURL: TEAMS_WEBHOOK_URL }),
    slack({
      webhookURL: SLACK_WEBHOOK_URL,
      username: 'adash-data-collector script',
    }),
  ]);

  try {
    // collect KPI
    const db = simpleDb<Partial<any>>({
      path: `${config.dataDir}/kpie2e.json`,
      logger,
    });
    await db.init();
    //await db.reset();

    const row = { createdAt: null, stats: { ios: [], android: [] } };

    const teams = (
      await fs.readdir(`${config.kpiDataDir}/teams`, { withFileTypes: true })
    )
      .filter((dir) => dir.isDirectory() && !dir.name.startsWith("."))
      .map((dir) => dir.name);

    for (const team of teams) {
      const teamStats = await FileHelper.readJSONFile(
        `${config.kpiDataDir}/teams/${team}/wdio-ma-merged.json`
      );

      const results = (
        await fs.readdir(`${config.kpiDataDir}/teams/${team}/`, { withFileTypes: true })
      ).filter((f) => f.name.includes('html'))[0];

      sh`cp ${config.kpiDataDir}/teams/${team}/${results.name} ./data/kpi-${team}.html`;

      row.createdAt = new Date(teamStats.stats.start).getTime();

      const ios = [];
      const android = [];

      for (const s of teamStats.suites.suites) {
        const minifiedSuite = {
          title: s.title,
          duration: s.duration,
          tests: s.tests.length,
          pass: s.tests.filter((t) => t.pass).length,
        };

        if (minifiedSuite.title.includes('ios')) {
          ios.push(minifiedSuite);
        } else if (s.title.includes('android')) {
          android.push(minifiedSuite);
        }
      }

      const iOSTotalTests = ios.reduce((prev, curr) => prev + curr.tests, 0);
      const iOSPass = ios.reduce((prev, curr) => prev + curr.pass, 0);
      const iOSFail = iOSTotalTests - iOSPass;

      row.stats.ios.push({
        teamName: team.toUpperCase(),
        totalTests: iOSTotalTests,
        pass: iOSPass,
        fail: iOSFail,
        passPercentage: parseFloat(
          ((iOSPass / iOSTotalTests) * 100).toFixed(2)
        ),
      });

      const androidTotalTests = android.reduce(
        (prev, curr) => prev + curr.tests,
        0
      );
      const androidPass = android.reduce((prev, curr) => prev + curr.pass, 0);
      const androidFail = androidTotalTests - androidPass;

      row.stats.android.push({
        teamName: team.toUpperCase(),
        totalTests: androidTotalTests,
        pass: androidPass,
        fail: androidFail,
        passPercentage: parseFloat(
          ((androidPass / androidTotalTests) * 100).toFixed(2)
        ),
      });
    }

    // filter out rows older than 6 months
    await db.filter((row) => new Date(row.createdAt) >= last6Months);
    await db.insert(row);
    await db.commit();
  } catch (e) {
    logger.error('An errore occurred:', e.message);
    await notificator.notify('Error', 'adash-data-collector: ' + e);
  }
};
