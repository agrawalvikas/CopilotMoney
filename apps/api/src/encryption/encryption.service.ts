import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly key: Buffer;
  private readonly algorithm = 'aes-256-gcm';
  private readonly ivLength = 16; // For GCM, the IV is typically 12 or 16 bytes.
  private readonly authTagLength = 16;

  constructor(private configService: ConfigService) {
    const encryptionKey = this.configService.get<string>('ENCRYPTION_KEY');
    if (!encryptionKey) {
      throw new Error('ENCRYPTION_KEY is not defined in the environment variables.');
    }
    this.key = Buffer.from(encryptionKey, 'hex');
  }

  encrypt(text: string): string {
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    // Combine iv, authTag, and encrypted data into a single string for storage.
    return Buffer.concat([iv, authTag, encrypted]).toString('hex');
  }

  decrypt(encryptedText: string): string {
    const data = Buffer.from(encryptedText, 'hex');
    const iv = data.slice(0, this.ivLength);
    const authTag = data.slice(this.ivLength, this.ivLength + this.authTagLength);
    const encrypted = data.slice(this.ivLength + this.authTagLength);

    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  }
}
