import { DebugHelper, FileHelper, simpleLogger } from 'adash-ts-helper';
import cac from 'cac';
import collector from './src/scripts/collector';
import computekpi from './src/scripts/computekpi';
import notificator from './src/scripts/notificator';

const cli = cac();
const logger = simpleLogger();

if (process.env.DEBUG_NETWORK) {
  DebugHelper.activateDebugNetwork();
}

async function setupEnvs(envs: Record<string, string>) {
  for (const [key, value] of Object.entries(envs)) {
    if (!(key in process.env)) {
      process.env[key] = value as string;
      logger.info(`Configure ENV ${key}: ${value}`);
    }
  }
}

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

cli
  .command('notificator')
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
  .command('notificator:monitor')
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
  .command('notificator:status')
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
  .command('notificator:thresholds')
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
  .command('collect')
  .option('--config <path>', 'Use config file')
  .action(async (options: any) => {
    const config = await FileHelper.readJSONFile(
      options.config || './config.json'
    );
    setupEnvs(config['envs']);

    await collector(config, {
      browserstack: true,
      gitlab: true,
      status: true,
      bitrise: true,
    });
    logger.info('done');
  });

cli
  .command('collect:browserstack')
  .option('--config <path>', 'Use config file')
  .action(async (options: any) => {
    const config = await FileHelper.readJSONFile(
      options.config || './config.json'
    );
    setupEnvs(config['envs']);

    await collector(config, {
      browserstack: true,
    });
    logger.info('done');
  });

cli
  .command('collect:gitlab')
  .option('--config <path>', 'Use config file')
  .action(async (options: any) => {
    const config = await FileHelper.readJSONFile(
      options.config || './config.json'
    );
    setupEnvs(config['envs']);

    await collector(config, {
      gitlab: true,
    });
    logger.info('done');
  });

cli
  .command('collect:status')
  .option('--config <path>', 'Use config file')
  .action(async (options: any) => {
    const config = await FileHelper.readJSONFile(
      options.config || './config.json'
    );
    setupEnvs(config['envs']);

    await collector(config, {
      status: true,
    });
    logger.info('done');
  });

cli
  .command('collect:bitrise')
  .option('--config <path>', 'Use config file')
  .action(async (options: any) => {
    const config = await FileHelper.readJSONFile(
      options.config || './config.json'
    );
    setupEnvs(config['envs']);

    await collector(config, {
      bitrise: true,
    });
    logger.info('done');
  });

cli.command('').action(cli.outputHelp);

cli.help();
cli.version('0.0.0');
cli.parse();
