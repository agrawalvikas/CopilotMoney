import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * Encrypts and decrypts sensitive strings (e.g. bank access tokens) using
 * AES-256-GCM — an authenticated encryption scheme that provides both
 * confidentiality and tamper detection via the auth tag.
 *
 * Stored format (all packed into a single hex string):
 *   [ IV (16 bytes) | AuthTag (16 bytes) | Ciphertext (variable) ]
 *
 * A fresh random IV is generated on every encrypt() call so that encrypting
 * the same plaintext twice produces different ciphertexts, preventing
 * pattern analysis of stored tokens.
 *
 * IMPORTANT: The ENCRYPTION_KEY must never change after accounts are
 * connected — changing it makes all stored tokens permanently unreadable.
 */
@Injectable()
export class EncryptionService {
  private readonly key: Buffer;
  private readonly algorithm = 'aes-256-gcm';
  private readonly ivLength = 16;       // 16-byte IV (128-bit)
  private readonly authTagLength = 16;  // 16-byte GCM authentication tag

  constructor(private configService: ConfigService) {
    const encryptionKey = this.configService.get<string>('ENCRYPTION_KEY');
    if (!encryptionKey) {
      throw new Error('ENCRYPTION_KEY is not defined in the environment variables.');
    }
    // The key is expected as a 64-character hex string = 32 bytes = 256-bit key.
    this.key = Buffer.from(encryptionKey, 'hex');
  }

  /**
   * Encrypts `text` and returns a hex string containing the IV, auth tag,
   * and ciphertext concatenated for single-column storage in the database.
   */
  encrypt(text: string): string {
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    // Pack: IV + AuthTag + Ciphertext → single hex string
    return Buffer.concat([iv, authTag, encrypted]).toString('hex');
  }

  /**
   * Reverses encrypt().  Throws if the auth tag doesn't match, which means
   * the ciphertext was tampered with or the wrong key was used.
   */
  decrypt(encryptedText: string): string {
    const data = Buffer.from(encryptedText, 'hex');

    // Unpack using fixed-length offsets (IV and authTag are always the same size)
    const iv        = data.slice(0, this.ivLength);
    const authTag   = data.slice(this.ivLength, this.ivLength + this.authTagLength);
    const encrypted = data.slice(this.ivLength + this.authTagLength);

    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  }
}
