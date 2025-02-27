export type WorkspaceConfig = {
  packageArch: 'aarch64' | 'x86_64'
  osArch: 'aarch64' | 'x86_64' | 'raspberrypi'
  gitHash: string
  useMocks: boolean
  // each key corresponds to a project and values adjust settings for that project, eg: ui, install-wizard, setup-wizard, diagnostic-ui
  ui: {
    api: {
      url: string
      version: string
    }
    marketplace: {
      start9: 'https://registry.start9.com/'
      community: 'https://community-registry.start9.com/'
    }
    mocks: {
      maskAs: 'tor' | 'lan'
      skipStartupAlerts: boolean
    }
  }
}
