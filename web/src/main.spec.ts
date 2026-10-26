import '@angular/compiler';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  bootstrapApplication: vi.fn().mockResolvedValue(undefined),
  provideHttpClient: vi.fn(() => 'http-client-provider'),
  provideRouter: vi.fn(() => 'router-provider')
}));

vi.mock('@angular/platform-browser', () => ({
  bootstrapApplication: mocks.bootstrapApplication
}));

vi.mock('@angular/common/http', () => ({
  provideHttpClient: mocks.provideHttpClient
}));

vi.mock('@angular/router', () => ({
  provideRouter: mocks.provideRouter
}));

vi.mock('./app/app.component', () => ({
  AppComponent: class AppComponent {}
}));

vi.mock('./app/app.routes', () => ({
  routes: []
}));

describe('application bootstrap', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('provides the HTTP client and application routes', async () => {
    await import('./main');

    expect(mocks.provideHttpClient).toHaveBeenCalledOnce();
    expect(mocks.provideRouter).toHaveBeenCalledWith([]);
    expect(mocks.bootstrapApplication).toHaveBeenCalledWith(
      expect.any(Function),
      { providers: ['http-client-provider', 'router-provider'] }
    );
  });
});
