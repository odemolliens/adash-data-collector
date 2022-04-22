import { DebugHelper, FileHelper, simpleLogger } from 'adash-ts-helper';
import cac from 'cac';
import collector from './src/scripts/collector';
import computekpi from './src/scripts/computekpi';
import notificator from './src/scripts/notificator';
import packageJson from './package.json';

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
      codemagic: true,
    });
    logger.info('done');
  });

cli
  .command('collect:browserstack', 'Collect BrowserStack metrics')
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
  .command('collect:codemagic', 'Collect CodeMagic metrics')
  .option('--config <path>', 'Use config file')
  .action(async (options: any) => {
    const config = await FileHelper.readJSONFile(
      options.config || './config.json'
    );
    setupEnvs(config['envs']);

    await collector(config, {
      codemagic: true,
    });
    logger.info('done');
  });

cli
  .command('collect:gitlab', 'Collect GitLab metrics')
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
  .command('collect:bitrise', 'Collect BitRise metrics')
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

cli
  .command('collect:status', 'Collect third-parties services metrics')
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
