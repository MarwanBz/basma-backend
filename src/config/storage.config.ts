export interface StorageConfig {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export const storageConfig: StorageConfig = {
  endpoint: process.env.HETZNER_ENDPOINT_URL || '',
  region: process.env.HETZNER_REGION || 'nbg1',
  bucket: process.env.HETZNER_BUCKET_NAME || 'basma-files',
  accessKeyId: process.env.HETZNER_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.HETZNER_SECRET_ACCESS_KEY || '',
};

// Validate required configuration
if (!storageConfig.endpoint || !storageConfig.accessKeyId || !storageConfig.secretAccessKey) {
  throw new Error('Missing required Hetzner Object Storage configuration. Please set HETZNER_ENDPOINT_URL, HETZNER_ACCESS_KEY_ID, and HETZNER_SECRET_ACCESS_KEY environment variables.');
}

