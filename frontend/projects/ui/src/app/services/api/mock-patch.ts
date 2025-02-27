import {
  DataModel,
  DependencyErrorType,
  DockerIoFormat,
  HealthResult,
  Manifest,
  PackageMainStatus,
  PackageState,
} from 'src/app/services/patch-db/data-model'
import { Mock } from './api.fixures'

export const mockPatchData: DataModel = {
  ui: {
    name: `Matt's Embassy`,
    'ack-welcome': '1.0.0',
    marketplace: {
      'selected-url': 'https://registry.start9.com/',
      'known-hosts': {
        'https://registry.start9.com/': {
          name: 'Start9 Registry',
        },
        'https://community-registry.start9.com/': {},
        'https://beta-registry.start9.com/': {
          name: 'Dark9',
        },
      },
    },
    dev: {},
    gaming: {
      snake: {
        'high-score': 0,
      },
    },
    'ack-instructions': {},
  },
  'server-info': {
    id: 'abcdefgh',
    version: '0.3.3',
    'last-backup': new Date(new Date().valueOf() - 604800001).toISOString(),
    'lan-address': 'https://embassy-abcdefgh.local',
    'tor-address': 'http://myveryownspecialtoraddress.onion',
    'ip-info': {
      eth0: {
        ipv4: '10.0.0.1',
        ipv6: null,
      },
      wlan0: {
        ipv4: '10.0.90.12',
        ipv6: 'FE80:CD00:0000:0CDE:1257:0000:211E:729CD',
      },
    },
    'last-wifi-region': null,
    'unread-notification-count': 4,
    // password is asdfasdf
    'password-hash':
      '$argon2d$v=19$m=1024,t=1,p=1$YXNkZmFzZGZhc2RmYXNkZg$Ceev1I901G6UwU+hY0sHrFZ56D+o+LNJ',
    'eos-version-compat': '>=0.3.0 <=0.3.0.1',
    'status-info': {
      'backup-progress': null,
      updated: false,
      'update-progress': null,
    },
    hostname: 'random-words',
    pubkey: 'npub1sg6plzptd64u62a878hep2kev88swjh3tw00gjsfl8f237lmu63q0uf63m',
    'ca-fingerprint': 'SHA-256: 63 2B 11 99 44 40 17 DF 37 FC C3 DF 0F 3D 15',
    'system-start-time': new Date(new Date().valueOf() - 360042).toUTCString(),
  },
  'package-data': {
    bitcoind: {
      state: PackageState.Installed,
      'static-files': {
        license: '/public/package-data/bitcoind/0.20.0/LICENSE.md',
        icon: '/assets/img/service-icons/bitcoind.png',
        instructions: '/public/package-data/bitcoind/0.20.0/INSTRUCTIONS.md',
      },
      manifest: {
        id: 'bitcoind',
        title: 'Bitcoin Core',
        version: '0.20.0',
        'git-hash': 'abcdefgh',
        description: {
          short: 'A Bitcoin full node by Bitcoin Core.',
          long: 'Bitcoin is a decentralized consensus protocol and settlement network.',
        },
        'release-notes': 'Taproot, Schnorr, and more.',
        assets: {
          icon: 'icon.png',
          license: 'LICENSE.md',
          instructions: 'INSTRUCTIONS.md',
          docker_images: 'image.tar',
          assets: './assets',
          scripts: './scripts',
        },
        license: 'MIT',
        'wrapper-repo': 'https://github.com/start9labs/bitcoind-wrapper',
        'upstream-repo': 'https://github.com/bitcoin/bitcoin',
        'support-site': 'https://bitcoin.org',
        'marketing-site': 'https://bitcoin.org',
        'donation-url': 'https://start9.com',
        alerts: {
          install: 'Bitcoin can take over a week to sync.',
          uninstall:
            'Chain state will be lost, as will any funds stored on your Bitcoin Core waller that have not been backed up.',
          restore: null,
          start: 'Starting Bitcoin is good for your health.',
          stop: null,
        },
        main: {
          type: 'docker',
          image: '',
          system: true,
          entrypoint: '',
          args: [],
          mounts: {},
          'io-format': DockerIoFormat.Yaml,
          inject: false,
          'shm-size': '',
          'sigterm-timeout': '.49m',
        },
        'health-checks': {
          'chain-state': {
            name: 'Chain State',
          },
          'ephemeral-health-check': {
            name: 'Ephemeral Health Check',
          },
          'p2p-interface': {
            name: 'P2P Interface',
            'success-message': 'the health check ran succesfully',
          },
          'rpc-interface': {
            name: 'RPC Interface',
          },
          'unnecessary-health-check': {
            name: 'Unneccessary Health Check',
          },
        } as any,
        config: {
          get: {},
          set: {},
        } as any,
        volumes: {},
        'min-os-version': '0.2.12',
        interfaces: {
          ui: {
            name: 'Node Visualizer',
            description:
              'Web application for viewing information about your node and the Bitcoin network.',
            ui: true,
            'tor-config': {
              'port-mapping': {},
            },
            'lan-config': {},
            protocols: [],
          },
          rpc: {
            name: 'RPC',
            description:
              'Used by wallets to interact with your Bitcoin Core node.',
            ui: false,
            'tor-config': {
              'port-mapping': {},
            },
            'lan-config': {},
            protocols: [],
          },
          p2p: {
            name: 'P2P',
            description:
              'Used by other Bitcoin nodes to communicate and interact with your node.',
            ui: false,
            'tor-config': {
              'port-mapping': {},
            },
            'lan-config': {},
            protocols: [],
          },
        },
        backup: {
          create: {
            type: 'docker',
            image: '',
            system: true,
            entrypoint: '',
            args: [],
            mounts: {},
            'io-format': DockerIoFormat.Yaml,
            inject: false,
            'shm-size': '',
            'sigterm-timeout': null,
          },
          restore: {
            type: 'docker',
            image: '',
            system: true,
            entrypoint: '',
            args: [],
            mounts: {},
            'io-format': DockerIoFormat.Yaml,
            inject: false,
            'shm-size': '',
            'sigterm-timeout': null,
          },
        },
        migrations: null,
        actions: {
          resync: {
            name: 'Resync Blockchain',
            description:
              'Use this to resync the Bitcoin blockchain from genesis',
            warning: 'This will take a couple of days.',
            'allowed-statuses': [
              PackageMainStatus.Running,
              PackageMainStatus.Stopped,
            ],
            implementation: {
              type: 'docker',
              image: '',
              system: true,
              entrypoint: '',
              args: [],
              mounts: {},
              'io-format': DockerIoFormat.Yaml,
              inject: false,
              'shm-size': '',
              'sigterm-timeout': null,
            },
            'input-spec': {
              reason: {
                type: 'string',
                name: 'Re-sync Reason',
                description:
                  'Your reason for re-syncing. Why are you doing this?',
                nullable: false,
                masked: false,
                copyable: false,
                pattern: '^[a-zA-Z]+$',
                'pattern-description': 'Must contain only letters.',
              },
              name: {
                type: 'string',
                name: 'Your Name',
                description: 'Tell the class your name.',
                nullable: true,
                masked: false,
                copyable: false,
                warning: 'You may loose all your money by providing your name.',
              },
              notifications: {
                name: 'Notification Preferences',
                type: 'list',
                subtype: 'enum',
                description: 'how you want to be notified',
                range: '[1,3]',
                default: ['email'],
                spec: {
                  'value-names': {
                    email: 'Email',
                    text: 'Text',
                    call: 'Call',
                    push: 'Push',
                    webhook: 'Webhook',
                  },
                  values: ['email', 'text', 'call', 'push', 'webhook'],
                },
              },
              'days-ago': {
                type: 'number',
                name: 'Days Ago',
                description: 'Number of days to re-sync.',
                nullable: false,
                default: 100,
                range: '[0, 9999]',
                integral: true,
              },
              'top-speed': {
                type: 'number',
                name: 'Top Speed',
                description: 'The fastest you can possibly run.',
                nullable: false,
                range: '[-1000, 1000]',
                integral: false,
                units: 'm/s',
              },
              testnet: {
                name: 'Testnet',
                type: 'boolean',
                description:
                  '<ul><li>determines whether your node is running on testnet or mainnet</li></ul><script src="fake"></script>',
                warning: 'Chain will have to resync!',
                default: false,
              },
              randomEnum: {
                name: 'Random Enum',
                type: 'enum',
                'value-names': {
                  null: 'Null',
                  good: 'Good',
                  bad: 'Bad',
                  ugly: 'Ugly',
                },
                default: 'null',
                description: 'This is not even real.',
                warning: 'Be careful changing this!',
                values: ['null', 'good', 'bad', 'ugly'],
              },
              'emergency-contact': {
                name: 'Emergency Contact',
                type: 'object',
                description: 'The person to contact in case of emergency.',
                spec: {
                  name: {
                    type: 'string',
                    name: 'Name',
                    nullable: false,
                    masked: false,
                    copyable: false,
                    pattern: '^[a-zA-Z]+$',
                    'pattern-description': 'Must contain only letters.',
                  },
                  email: {
                    type: 'string',
                    name: 'Email',
                    nullable: false,
                    masked: false,
                    copyable: true,
                  },
                },
              },
              ips: {
                name: 'Whitelist IPs',
                type: 'list',
                subtype: 'string',
                description:
                  'external ip addresses that are authorized to access your Bitcoin node',
                warning:
                  'Any IP you allow here will have RPC access to your Bitcoin node.',
                range: '[1,10]',
                default: ['192.168.1.1'],
                spec: {
                  pattern: '^[0-9]{1,3}([,.][0-9]{1,3})?$',
                  'pattern-description': 'Must be a valid IP address',
                  masked: false,
                  copyable: false,
                },
              },
              bitcoinNode: {
                type: 'union',
                default: 'internal',
                tag: {
                  id: 'type',
                  'variant-names': {
                    internal: 'Internal',
                    external: 'External',
                  },
                  name: 'Bitcoin Node Settings',
                  description: 'The node settings',
                  warning: 'Careful changing this',
                },
                variants: {
                  internal: {
                    'lan-address': {
                      name: 'LAN Address',
                      type: 'pointer',
                      subtype: 'package',
                      target: 'lan-address',
                      'package-id': 'bitcoind',
                      description: 'the lan address',
                      interface: '',
                    },
                    'friendly-name': {
                      name: 'Friendly Name',
                      type: 'string',
                      description: 'the lan address',
                      nullable: true,
                      masked: false,
                      copyable: false,
                    },
                  },
                  external: {
                    'public-domain': {
                      name: 'Public Domain',
                      type: 'string',
                      description: 'the public address of the node',
                      nullable: false,
                      default: 'bitcoinnode.com',
                      pattern: '.*',
                      'pattern-description': 'anything',
                      masked: false,
                      copyable: true,
                    },
                  },
                },
              },
            },
          },
        },
        dependencies: {},
      },
      installed: {
        manifest: {
          ...Mock.MockManifestBitcoind,
          version: '0.20.0',
        },
        'last-backup': null,
        status: {
          configured: true,
          main: {
            status: PackageMainStatus.Running,
            started: '2021-06-14T20:49:17.774Z',
            health: {
              'ephemeral-health-check': {
                result: HealthResult.Starting,
              },
              'chain-state': {
                result: HealthResult.Loading,
                message: 'Bitcoin is syncing from genesis',
              },
              'p2p-interface': {
                result: HealthResult.Success,
              },
              'rpc-interface': {
                result: HealthResult.Failure,
                error: 'RPC interface unreachable.',
              },
              'unnecessary-health-check': {
                result: HealthResult.Disabled,
              },
            },
          },
          'dependency-errors': {},
        },
        'interface-addresses': {
          ui: {
            'tor-address': 'bitcoind-ui-address.onion',
            'lan-address': 'bitcoind-ui-address.local',
          },
          rpc: {
            'tor-address': 'bitcoind-rpc-address.onion',
            'lan-address': 'bitcoind-rpc-address.local',
          },
          p2p: {
            'tor-address': 'bitcoind-p2p-address.onion',
            'lan-address': 'bitcoind-p2p-address.local',
          },
        },
        'system-pointers': [],
        'current-dependents': {
          lnd: {
            pointers: [],
            'health-checks': [],
          },
        },
        'current-dependencies': {},
        'dependency-info': {},
        'marketplace-url': 'https://registry.start9.com/',
        'developer-key': 'developer-key',
      },
    },
    lnd: {
      state: PackageState.Installed,
      'static-files': {
        license: '/public/package-data/lnd/0.11.1/LICENSE.md',
        icon: '/assets/img/service-icons/lnd.png',
        instructions: '/public/package-data/lnd/0.11.1/INSTRUCTIONS.md',
      },
      manifest: {
        id: 'lnd',
        title: 'Lightning Network Daemon',
        version: '0.11.1',
        description: {
          short: 'A bolt spec compliant client.',
          long: 'More info about LND. More info about LND. More info about LND.',
        },
        'release-notes': 'Dual funded channels!',
        assets: {
          icon: 'icon.png',
          license: 'LICENSE.md',
          instructions: 'INSTRUCTIONS.md',
          docker_images: 'image.tar',
          assets: './assets',
          scripts: './scripts',
        },
        license: 'MIT',
        'wrapper-repo': 'https://github.com/start9labs/lnd-wrapper',
        'upstream-repo': 'https://github.com/lightningnetwork/lnd',
        'support-site': 'https://lightning.engineering/',
        'marketing-site': 'https://lightning.engineering/',
        'donation-url': null,
        alerts: {
          install: null,
          uninstall: null,
          restore:
            'If this is a duplicate instance of the same LND node, you may loose your funds.',
          start: 'Starting LND is good for your health.',
          stop: null,
        },
        main: {
          type: 'docker',
          image: '',
          system: true,
          entrypoint: '',
          args: [],
          mounts: {},
          'io-format': DockerIoFormat.Yaml,
          inject: false,
          'shm-size': '',
          'sigterm-timeout': '0.5s',
        },
        'health-checks': {},
        config: {
          get: null,
          set: null,
        },
        volumes: {},
        'min-os-version': '0.2.12',
        interfaces: {
          rpc: {
            name: 'RPC interface',
            description: 'Good for connecting to your node at a distance.',
            ui: true,
            'tor-config': {
              'port-mapping': {},
            },
            'lan-config': {
              '44': {
                ssl: true,
                mapping: 33,
              },
            },
            protocols: [],
          },
          grpc: {
            name: 'GRPC',
            description: 'Certain wallet use grpc.',
            ui: false,
            'tor-config': {
              'port-mapping': {},
            },
            'lan-config': {
              '66': {
                ssl: true,
                mapping: 55,
              },
            },
            protocols: [],
          },
        },
        backup: {
          create: {
            type: 'docker',
            image: '',
            system: true,
            entrypoint: '',
            args: [],
            mounts: {},
            'io-format': DockerIoFormat.Yaml,
            inject: false,
            'shm-size': '',
            'sigterm-timeout': null,
          },
          restore: {
            type: 'docker',
            image: '',
            system: true,
            entrypoint: '',
            args: [],
            mounts: {},
            'io-format': DockerIoFormat.Yaml,
            inject: false,
            'shm-size': '',
            'sigterm-timeout': null,
          },
        },
        migrations: null,
        actions: {
          resync: {
            name: 'Resync Network Graph',
            description: 'Your node will resync its network graph.',
            warning: 'This will take a couple hours.',
            'allowed-statuses': [PackageMainStatus.Running],
            implementation: {
              type: 'docker',
              image: '',
              system: true,
              entrypoint: '',
              args: [],
              mounts: {},
              'io-format': DockerIoFormat.Yaml,
              inject: false,
              'shm-size': '',
              'sigterm-timeout': null,
            },
            'input-spec': null,
          },
        },
        dependencies: {
          bitcoind: {
            version: '=0.21.0',
            description: 'LND needs bitcoin to live.',
            requirement: {
              type: 'opt-out',
              how: 'You can use an external node from your Embassy if you prefer.',
            },
            config: null,
          },
          'btc-rpc-proxy': {
            version: '>=0.2.2',
            description:
              'As long as Bitcoin is pruned, LND needs Bitcoin Proxy to fetch block over the P2P network.',
            requirement: {
              type: 'opt-in',
              how: `To use Proxy's user management system, go to LND config and select Bitcoin Proxy under Bitcoin config.`,
            },
            config: null,
          },
        },
      },
      installed: {
        manifest: {} as Manifest,
        'last-backup': null,
        status: {
          configured: true,
          main: {
            status: PackageMainStatus.Stopped,
          },
          'dependency-errors': {
            'btc-rpc-proxy': {
              type: DependencyErrorType.ConfigUnsatisfied,
              error: 'This is a config unsatisfied error',
            },
          },
        },
        'interface-addresses': {
          rpc: {
            'tor-address': 'lnd-rpc-address.onion',
            'lan-address': 'lnd-rpc-address.local',
          },
          grpc: {
            'tor-address': 'lnd-grpc-address.onion',
            'lan-address': 'lnd-grpc-address.local',
          },
        },
        'system-pointers': [],
        'current-dependents': {},
        'current-dependencies': {
          bitcoind: {
            pointers: [],
            'health-checks': [],
          },
          'btc-rpc-proxy': {
            pointers: [],
            'health-checks': [],
          },
        },
        'dependency-info': {
          bitcoind: {
            manifest: {
              title: 'Bitcoin Core',
            } as Manifest,
            icon: 'assets/img/service-icons/bitcoind.png',
          },
          'btc-rpc-proxy': {
            manifest: {
              title: 'Bitcoin Proxy',
            } as Manifest,
            icon: 'assets/img/service-icons/btc-rpc-proxy.png',
          },
        },
        'marketplace-url': 'https://registry.start9.com/',
        'developer-key': 'developer-key',
      },
    },
  },
}
