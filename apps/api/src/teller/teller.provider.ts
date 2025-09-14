import { ConfigService } from '@nestjs/config';
import { Axios } from 'axios';
import * as fs from 'fs';
import * as https from 'https';
import * as os from 'os';
import * as path from 'path';

// Manually import the modules from the library
import TellerAccountModule from '@maxint/teller/dist/modules/account.js';
import TellerTransactionModule from '@maxint/teller/dist/modules/transaction.js';

// This function will be called on process exit to clean up temporary files.
const cleanupTempFiles = (files: string[]) => {
  files.forEach(file => {
    try {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
        console.log(`Cleaned up temporary file: ${file}`);
      }
    } catch (err) {
      console.error(`Error cleaning up temporary file ${file}:`, err);
    }
  });
};

export const TellerClientProvider = {
  provide: 'TellerClient',
  useFactory: (configService: ConfigService) => {
    const certContent = configService.get<string>('TELLER_CERTIFICATE');
    const privateKeyContent = configService.get<string>('TELLER_PRIVATE_KEY');

    if (!certContent || !privateKeyContent) {
      throw new Error('Teller certificate or private key not found in environment variables. Please check your .env file.');
    }

    const certPath = path.join(os.tmpdir(), `teller_cert_${process.pid}.pem`);
    const privateKeyPath = path.join(os.tmpdir(), `teller_key_${process.pid}.pem`);

    const formattedCert = certContent.replace(/\\n/g, '\n');
    const formattedPrivateKey = privateKeyContent.replace(/\\n/g, '\n');

    fs.writeFileSync(certPath, formattedCert);
    fs.writeFileSync(privateKeyPath, formattedPrivateKey);

    const cleanup = () => cleanupTempFiles([certPath, privateKeyPath]);
    process.on('exit', cleanup);
    process.on('SIGINT', () => process.exit());
    process.on('SIGTERM', () => process.exit());
    process.on('uncaughtException', (err) => {
        console.error('Uncaught exception, shutting down:', err);
        process.exit(1);
    });

    // Manually create the HTTPS agent, same as the library does.
    const httpsAgent = new https.Agent({
      cert: fs.readFileSync(certPath),
      key: fs.readFileSync(privateKeyPath),
    });

    // Manually create the Axios instance.
    // We DO NOT set a default `auth` token here. It will be provided per-request.
    const axios = new Axios({
      baseURL: 'https://api.teller.io', // This is the correct URL for all environments
      httpsAgent,
      responseType: 'json',
    });

    console.log('Custom TellerClient initialized successfully.');

    // Manually construct the object that will be injected.
    // This bypasses the TellerClient class entirely.
    return {
      account: new TellerAccountModule(axios),
      transactions: new TellerTransactionModule(axios),
    };
  },
  inject: [ConfigService],
};
