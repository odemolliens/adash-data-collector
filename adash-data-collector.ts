import { DebugHelper, FileHelper, simpleLogger } from 'adash-ts-helper';
import cac from 'cac';
import packageJson from './package.json';
import collector, { CollectorOptions } from './src/scripts/collector';
import computekpi from './src/scripts/computekpi';
import notificator from './src/scripts/notificator';

const cli = cac();
const logger = simpleLogger();

if (process.env.DEBUG_NETWORK) {
  DebugHelper.activateDebugNetwork();
}

async function setupEnvs(envs: Record<string, string> = {}) {
  for (const [key, value] of Object.entries(envs)) {
    if (!(key in process.env)) {
      process.env[key] = value as string;
      logger.info(`Configure ENV ${key}: ${value}`);
    }
  }
}

cli
  .command('notificator', 'Check ALL metrics and send notifications')
  .option('--config <path>', 'Use config file')
  .action(async (options: any) => {
    const config = await FileHelper.readJSONFile(
      options.config || './config.json'
    );

    setupEnvs(config['envs']);

    await notificator(config, {
      monitor: true,
      status: true,
      thresholds: true,
    });
    logger.info('done');
  });

cli
  .command(
    'notificator:monitor',
    'Check the monitor section and send notifications'
  )
  .option('--config <path>', 'Use config file')
  .action(async (options: any) => {
    const config = await FileHelper.readJSONFile(
      options.config || './config.json'
    );

    setupEnvs(config['envs']);

    await notificator(config, { monitor: true });
    logger.info('done');
  });

cli
  .command(
    'notificator:status',
    'Check third-parties services status and send notifications'
  )
  .option('--config <path>', 'Use config file')
  .action(async (options: any) => {
    const config = await FileHelper.readJSONFile(
      options.config || './config.json'
    );

    setupEnvs(config['envs']);

    await notificator(config, { status: true });
    logger.info('done');
  });

cli
  .command(
    'notificator:thresholds',
    'Check the thresholds metrics and send notifications'
  )
  .option('--config <path>', 'Use config file')
  .action(async (options: any) => {
    const config = await FileHelper.readJSONFile(
      options.config || './config.json'
    );

    setupEnvs(config['envs']);

    await notificator(config, { thresholds: true });
    logger.info('done');
  });

cli
  .command('collect', 'Collect ALL metrics')
  .option('--config <path>', 'Use config file')
  .option('--resetdb', 'Remove the existing db entries')
  .action(async (options: any) => {
    options.config = await FileHelper.readJSONFile(
      options.config || './config.json'
    );
    setupEnvs(options.config['envs']);

    await collector(options as CollectorOptions);
    logger.info('done');
  });

cli
  .command('computekpi')
  .option('--config <path>', 'Use config file')
  .action(async (options: any) => {
    const config = await FileHelper.readJSONFile(
      options.config || './config.json'
    );
    setupEnvs(config['envs']);

    await computekpi(config);
    logger.info('done');
  });

cli.command('').action(cli.outputHelp);

cli.help();
cli.version(packageJson.version);
cli.parse();
