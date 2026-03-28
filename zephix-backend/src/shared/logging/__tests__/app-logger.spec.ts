/**
 * Phase 3D: AppLogger Tests
 */
import { AppLogger } from '../app-logger';

describe('AppLogger', () => {
  let logger: AppLogger;
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  let debugSpy: jest.SpyInstance;

  beforeEach(() => {
    logger = new AppLogger('TestContext');
    // Suppress actual log output
    logSpy = jest.spyOn((logger as any).logger, 'log').mockImplementation();
    warnSpy = jest.spyOn((logger as any).logger, 'warn').mockImplementation();
    errorSpy = jest.spyOn((logger as any).logger, 'error').mockImplementation();
    debugSpy = jest.spyOn((logger as any).logger, 'debug').mockImplementation();
  });

  it('info() calls logger.log with structured context', () => {
    logger.info({ action: 'test_action', orgId: 'org-1' });
    expect(logSpy).toHaveBeenCalledWith({ action: 'test_action', orgId: 'org-1' });
  });

  it('warn() calls logger.warn with structured context', () => {
    logger.warn({ action: 'test_warn', threshold: 0.9 });
    expect(warnSpy).toHaveBeenCalledWith({ action: 'test_warn', threshold: 0.9 });
  });

  it('error() calls logger.error with structured context and stack', () => {
    logger.error({ action: 'test_error', message: 'fail' }, 'stack trace');
    expect(errorSpy).toHaveBeenCalledWith({ action: 'test_error', message: 'fail' }, 'stack trace');
  });

  it('debug() calls logger.debug with structured context', () => {
    logger.debug({ action: 'debug_action', value: 42 });
    expect(debugSpy).toHaveBeenCalledWith({ action: 'debug_action', value: 42 });
  });

  it('requires action field in context (type enforcement)', () => {
    // TypeScript enforces LogContext has action:string
    // Runtime check: verify it passes through
    logger.info({ action: 'required_field' });
    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'required_field' }),
    );
  });
});
