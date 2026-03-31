import pino from 'pino';
import fs from 'fs';
import path from 'path';
import YAML from 'yamljs';

// Load configuration
const CONFIG_PATH = path.resolve('./sync.config.yaml');
if (!fs.existsSync(CONFIG_PATH)) {
  console.error('⚠️ Config file not found at', CONFIG_PATH);
  process.exit(1);
}
const config = YAML.load(CONFIG_PATH);

// Initialize logger
const logDir = path.resolve('./logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);
const logger = pino({
  level: config.log_level || 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true, translateTime: true }
  }
}, pino.destination(path.join(logDir, `sync_${new Date().toISOString().split('T')[0]}.log`));

export { config, logger };
