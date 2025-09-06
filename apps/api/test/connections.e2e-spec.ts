import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
const request = require('supertest');
import { AppModule } from '../src/app.module';
import { ClerkAuthGuard } from '../src/auth/clerk-auth.guard';

describe('ConnectionsController (e2e)', () => {
  let app: INestApplication;

  const mockUser = {
    id: 'user_2ikwGzV6a7y2FpYQ0A1B2C3D4E5', // A sample Clerk user ID
  };

  const mockClerkAuthGuard = {
    canActivate: (context) => {
      const req = context.switchToHttp().getRequest();
      req.auth = {
        userId: mockUser.id,
      };
      return true;
    },
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(ClerkAuthGuard)
      .useValue(mockClerkAuthGuard)
      .overrideProvider('ClerkClient')
      .useValue({
        users: {
          getUser: jest.fn().mockResolvedValue({
            id: mockUser.id,
            primaryEmailAddressId: 'email_1',
            emailAddresses: [{ id: 'email_1', emailAddress: 'test@example.com' }],
          }),
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    // Use a validation pipe to ensure DTOs are validated
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/connections', () => {
    it('should create a new connection for an authenticated user', async () => {
      const createConnectionDto = {
        accessToken: 'a-real-looking-access-token',
        tellerId: 'enr_123456789',
        institutionName: 'Test Bank',
      };

      return request(app.getHttpServer())
        .post('/api/v1/connections')
        .send(createConnectionDto)
        .expect(201)
        .then((res) => {
          expect(res.body).toBeDefined();
          expect(res.body.tellerId).toEqual(createConnectionDto.tellerId);
          expect(res.body.institutionName).toEqual(
            createConnectionDto.institutionName,
          );
          expect(res.body.accessToken).toBeUndefined(); // Ensure the token is not returned
        });
    });

    it('should return 400 for invalid data', async () => {
      const invalidDto = {
        // Missing accessToken
        tellerId: 'enr_123456789',
        institutionName: 'Test Bank',
      };

      return request(app.getHttpServer())
        .post('/api/v1/connections')
        .send(invalidDto)
        .expect(400);
    });
  });
});
