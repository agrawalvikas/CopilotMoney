import { ConfigService } from '@nestjs/config';
import { TellerClient } from '@maxint/teller';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

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

    // Using process.pid makes the filenames unique per process, avoiding conflicts.
    const certPath = path.join(os.tmpdir(), `teller_cert_${process.pid}.pem`);
    const privateKeyPath = path.join(os.tmpdir(), `teller_key_${process.pid}.pem`);

    // The .env file might store newlines as the literal string "\\n". Replace them with actual newlines.
    const formattedCert = certContent.replace(/\\n/g, '\n');
    const formattedPrivateKey = privateKeyContent.replace(/\\n/g, '\n');

    // Write the credentials to temporary files.
    fs.writeFileSync(certPath, formattedCert);
    fs.writeFileSync(privateKeyPath, formattedPrivateKey);

    // Register a cleanup hook for when the Node.js process exits.
    // This handles graceful shutdowns, Ctrl+C (SIGINT), and termination signals.
    const cleanup = () => cleanupTempFiles([certPath, privateKeyPath]);
    process.on('exit', cleanup);
    // Ensure cleanup runs on termination signals
    process.on('SIGINT', () => process.exit());
    process.on('SIGTERM', () => process.exit());
    process.on('uncaughtException', (err) => {
        console.error('Uncaught exception, shutting down:', err);
        process.exit(1);
    });

    // Instantiate the TellerClient with the paths to the temporary files.
    const tellerClient = new TellerClient({
      certificatePath: certPath,
      privateKeyPath: privateKeyPath,
      environment: configService.get<string>('TELLER_ENV', 'sandbox'),
    });

    console.log('TellerClient initialized successfully.');

    return tellerClient;
  },
  inject: [ConfigService],
};
