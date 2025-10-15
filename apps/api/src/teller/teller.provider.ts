
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as https from 'node:https';
import * as fs from 'node:fs/promises';
import * as path from 'path';

// This provider creates a custom, environment-aware Axios instance for calling the Teller API.
export const TellerApiProvider = {
  provide: 'TellerApi',
  useFactory: async (configService: ConfigService): Promise<AxiosInstance> => {
    const certContent = configService.get<string>('TELLER_CERTIFICATE');
    const privateKeyContent = configService.get<string>('TELLER_PRIVATE_KEY');
    const tellerEnv = configService.get<string>('TELLER_ENV', 'sandbox');

    if (!certContent || !privateKeyContent) {
      throw new Error('Teller certificate or private key not found in environment variables.');
    }

    // Use stable paths within the project directory.
    const certPath = path.join(process.cwd(), 'teller.cert.pem');
    const privateKeyPath = path.join(process.cwd(), 'teller.key.pem');

    const formattedCert = certContent.replace(/\\n/g, '\n');
    const formattedPrivateKey = privateKeyContent.replace(/\\n/g, '\n');

    // Write the credentials to files.
    await fs.writeFile(certPath, formattedCert);
    await fs.writeFile(privateKeyPath, formattedPrivateKey);

    const httpsAgent = new https.Agent({
      cert: await fs.readFile(certPath),
      key: await fs.readFile(privateKeyPath),
    });

    const baseURL = tellerEnv === 'sandbox' ? 'https://api.sandbox.teller.io' : 'https://api.teller.io';

    console.log(`Initializing Teller API client for environment: ${tellerEnv} (URL: ${baseURL})`);

    const tellerApi = axios.create({
      baseURL,
      httpsAgent,
    });

    return tellerApi;
  },
  inject: [ConfigService],
};
