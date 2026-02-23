import { AuthController } from './auth.controller';

describe('AuthController CSRF contract', () => {
  it('getCsrfToken returns token payload and delegates cookie setting', () => {
    const csrfService = {
      generateToken: jest.fn().mockReturnValue('csrf-token-123'),
      setCsrfCookie: jest.fn(),
    };

    const controller = new AuthController(
      {} as any, // AuthService
      {} as any, // AuthRegistrationService
      {} as any, // EmailVerificationService
      {} as any, // userOrgRepository
      {} as any, // userRepository
      {} as any, // organizationRepository
      {} as any, // auditService
      csrfService as any,
    );

    const req = {
      headers: { host: 'zephix-backend-v2-staging.up.railway.app' },
      secure: true,
    } as any;
    const res = {
      json: jest.fn().mockImplementation((v) => v),
    } as any;

    const result = controller.getCsrfToken(req, res);

    expect(csrfService.generateToken).toHaveBeenCalledTimes(1);
    expect(csrfService.setCsrfCookie).toHaveBeenCalledWith(
      req,
      res,
      'csrf-token-123',
    );
    expect(res.json).toHaveBeenCalledWith({
      token: 'csrf-token-123',
      csrfToken: 'csrf-token-123',
    });
    expect(result).toEqual({
      token: 'csrf-token-123',
      csrfToken: 'csrf-token-123',
    });
  });
});
