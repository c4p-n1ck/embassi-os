import { Component, Inject } from '@angular/core'
import {
  AlertController,
  LoadingController,
  NavController,
  ModalController,
  ToastController,
} from '@ionic/angular'
import { ApiService } from 'src/app/services/api/embassy-api.service'
import { ActivatedRoute } from '@angular/router'
import { PatchDB } from 'patch-db-client'
import { ServerNameService } from 'src/app/services/server-name.service'
import { combineLatest, firstValueFrom, map, Observable, of } from 'rxjs'
import { ErrorToastService } from '@start9labs/shared'
import { EOSService } from 'src/app/services/eos.service'
import { ClientStorageService } from 'src/app/services/client-storage.service'
import { OSUpdatePage } from 'src/app/modals/os-update/os-update.page'
import { getAllPackages } from '../../../util/get-package-data'
import { AuthService } from 'src/app/services/auth.service'
import { DataModel } from 'src/app/services/patch-db/data-model'
import {
  GenericInputComponent,
  GenericInputOptions,
} from 'src/app/modals/generic-input/generic-input.component'
import { ConfigService } from 'src/app/services/config.service'
import { DOCUMENT } from '@angular/common'
import { getServerInfo } from 'src/app/util/get-server-info'

@Component({
  selector: 'server-show',
  templateUrl: 'server-show.page.html',
  styleUrls: ['server-show.page.scss'],
})
export class ServerShowPage {
  manageClicks = 0
  powerClicks = 0

  readonly server$ = this.patch.watch$('server-info')
  readonly showUpdate$ = this.eosService.showUpdate$
  readonly showDiskRepair$ = this.ClientStorageService.showDiskRepair$

  readonly secure = this.config.isSecure()

  constructor(
    private readonly alertCtrl: AlertController,
    private readonly modalCtrl: ModalController,
    private readonly loadingCtrl: LoadingController,
    private readonly errToast: ErrorToastService,
    private readonly embassyApi: ApiService,
    private readonly navCtrl: NavController,
    private readonly route: ActivatedRoute,
    private readonly patch: PatchDB<DataModel>,
    private readonly eosService: EOSService,
    private readonly ClientStorageService: ClientStorageService,
    private readonly serverNameService: ServerNameService,
    private readonly authService: AuthService,
    private readonly toastCtrl: ToastController,
    private readonly config: ConfigService,
    @Inject(DOCUMENT) private readonly document: Document,
  ) {}

  async presentModalName(): Promise<void> {
    const name = await firstValueFrom(this.serverNameService.name$)

    const options: GenericInputOptions = {
      title: 'Set Device Name',
      message: 'This will be displayed in your browser tab',
      label: 'Device Name',
      useMask: false,
      placeholder: name.default,
      nullable: true,
      initialValue: name.current,
      buttonText: 'Save',
      submitFn: (value: string) =>
        this.setDbValue('name', value || name.default),
    }

    const modal = await this.modalCtrl.create({
      componentProps: { options },
      cssClass: 'alertlike-modal',
      presentingElement: await this.modalCtrl.getTop(),
      component: GenericInputComponent,
    })

    await modal.present()
  }

  async updateEos(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: OSUpdatePage,
    })
    modal.present()
  }

  async presentAlertLogout() {
    const alert = await this.alertCtrl.create({
      header: 'Confirm',
      message: 'Are you sure you want to log out?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Logout',
          handler: () => this.logout(),
          cssClass: 'enter-click',
        },
      ],
    })

    await alert.present()
  }

  async presentAlertRestart() {
    const alert = await this.alertCtrl.create({
      header: 'Restart',
      message:
        'Are you sure you want to restart your Embassy? It can take several minutes to come back online.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Restart',
          handler: () => {
            this.restart()
          },
          cssClass: 'enter-click',
        },
      ],
    })
    await alert.present()
  }

  async presentAlertShutdown() {
    const alert = await this.alertCtrl.create({
      header: 'Warning',
      message:
        'Are you sure you want to power down your Embassy? This can take several minutes, and your Embassy will not come back online automatically. To power on again, You will need to physically unplug your Embassy and plug it back in',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Shutdown',
          handler: () => {
            this.shutdown()
          },
          cssClass: 'enter-click',
        },
      ],
      cssClass: 'alert-warning-message',
    })
    await alert.present()
  }

  async presentAlertSystemRebuild() {
    const localPkgs = await getAllPackages(this.patch)
    const minutes = Object.keys(localPkgs).length * 2
    const alert = await this.alertCtrl.create({
      header: 'Warning',
      message: `This action will tear down all service containers and rebuild them from scratch. No data will be deleted. This action is useful if your system gets into a bad state, and it should only be performed if you are experiencing general performance or reliability issues. It may take up to ${minutes} minutes to complete. During this time, you will lose all connectivity to your Embassy.`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Rebuild',
          handler: () => {
            this.systemRebuild()
          },
          cssClass: 'enter-click',
        },
      ],
      cssClass: 'alert-warning-message',
    })
    await alert.present()
  }

  async presentAlertRepairDisk() {
    const alert = await this.alertCtrl.create({
      header: 'Warning',
      message: `<p>This action should only be executed if directed by a Start9 support specialist. We recommend backing up your device before preforming this action.</p><p>If anything happens to the device during the reboot, such as losing power or unplugging the drive, the filesystem <i>will</i> be in an unrecoverable state. Please proceed with caution.</p>`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Repair',
          handler: () => {
            try {
              this.embassyApi.repairDisk({}).then(_ => {
                this.restart()
              })
            } catch (e: any) {
              this.errToast.present(e)
            }
          },
          cssClass: 'enter-click',
        },
      ],
      cssClass: 'alert-warning-message',
    })
    await alert.present()
  }

  async launchHttps() {
    const { 'lan-address': lanAddress } = await getServerInfo(this.patch)
    window.open(lanAddress)
  }

  addClick(title: string) {
    switch (title) {
      case 'Manage':
        this.addManageClick()
        break
      case 'Power':
        this.addPowerClick()
        break
      default:
        return
    }
  }

  private async setDbValue(key: string, value: string): Promise<void> {
    const loader = await this.loadingCtrl.create({
      message: 'Saving...',
    })
    await loader.present()

    try {
      await this.embassyApi.setDbValue<string>([key], value)
    } finally {
      loader.dismiss()
    }
  }

  // should wipe cache independent of actual BE logout
  private logout() {
    this.embassyApi.logout({}).catch(e => console.error('Failed to log out', e))
    this.authService.setUnverified()
  }

  private async restart() {
    const action = 'Restart'

    const loader = await this.loadingCtrl.create({
      message: `Beginning ${action}...`,
    })
    await loader.present()

    try {
      await this.embassyApi.restartServer({})
      this.presentAlertInProgress(action, ` until ${action} completes.`)
    } catch (e: any) {
      this.errToast.present(e)
    } finally {
      loader.dismiss()
    }
  }

  private async shutdown() {
    const action = 'Shutdown'

    const loader = await this.loadingCtrl.create({
      message: `Beginning ${action}...`,
    })
    await loader.present()

    try {
      await this.embassyApi.shutdownServer({})
      this.presentAlertInProgress(
        action,
        '.<br /><br /><b>You will need to physically power cycle the device to regain connectivity.</b>',
      )
    } catch (e: any) {
      this.errToast.present(e)
    } finally {
      loader.dismiss()
    }
  }

  private async systemRebuild() {
    const action = 'System Rebuild'

    const loader = await this.loadingCtrl.create({
      message: `Beginning ${action}...`,
    })
    await loader.present()

    try {
      await this.embassyApi.systemRebuild({})
      this.presentAlertInProgress(action, ` until ${action} completes.`)
    } catch (e: any) {
      this.errToast.present(e)
    } finally {
      loader.dismiss()
    }
  }

  private async checkForEosUpdate(): Promise<void> {
    const loader = await this.loadingCtrl.create({
      message: 'Checking for updates',
    })
    await loader.present()

    try {
      await this.eosService.loadEos()

      await loader.dismiss()

      if (this.eosService.updateAvailable$.value) {
        this.updateEos()
      } else {
        this.presentAlertLatest()
      }
    } catch (e: any) {
      await loader.dismiss()
      this.errToast.present(e)
    }
  }

  private async presentAlertLatest() {
    const alert = await this.alertCtrl.create({
      header: 'Up to date!',
      message: 'You are on the latest version of embassyOS.',
      buttons: [
        {
          text: 'OK',
          role: 'cancel',
          cssClass: 'enter-click',
        },
      ],
      cssClass: 'alert-success-message',
    })
    alert.present()
  }

  private async presentAlertInProgress(verb: string, message: string) {
    const alert = await this.alertCtrl.create({
      header: `${verb} In Progress...`,
      message: `Stopping all services gracefully. This can take a while.<br /><br />If you have a speaker, your Embassy will <b>♫ play a melody ♫</b> before shutting down. Your Embassy will then become unreachable${message}`,
      buttons: [
        {
          text: 'OK',
          role: 'cancel',
          cssClass: 'enter-click',
        },
      ],
    })
    alert.present()
  }

  settings: ServerSettings = {
    Backups: [
      {
        title: 'Create Backup',
        description: 'Back up your Embassy and service data',
        icon: 'duplicate-outline',
        action: () =>
          this.navCtrl.navigateForward(['backup'], { relativeTo: this.route }),
        detail: true,
        disabled$: of(!this.secure),
      },
      {
        title: 'Restore From Backup',
        description: 'Restore one or more services from backup',
        icon: 'color-wand-outline',
        action: () =>
          this.navCtrl.navigateForward(['restore'], { relativeTo: this.route }),
        detail: true,
        disabled$: combineLatest([
          this.eosService.updatingOrBackingUp$,
          of(this.secure),
        ]).pipe(map(([updating, secure]) => updating || !secure)),
      },
    ],
    Manage: [
      {
        title: 'Software Update',
        description: 'Get the latest version of embassyOS',
        icon: 'cloud-download-outline',
        action: () =>
          this.eosService.updateAvailable$.getValue()
            ? this.updateEos()
            : this.checkForEosUpdate(),
        detail: false,
        disabled$: this.eosService.updatingOrBackingUp$,
      },
      {
        title: 'Set Device Name',
        description: 'Give your device a name for easy identification',
        icon: 'pricetag-outline',
        action: () => this.presentModalName(),
        detail: false,
        disabled$: of(false),
      },
      {
        title: 'LAN',
        description: `Download and trust your Embassy's certificate for a secure local connection`,
        icon: 'home-outline',
        action: () =>
          this.navCtrl.navigateForward(['lan'], { relativeTo: this.route }),
        detail: true,
        disabled$: of(false),
      },
      {
        title: 'SSH',
        description:
          'Manage your SSH keys to access your Embassy from the command line',
        icon: 'terminal-outline',
        action: () =>
          this.navCtrl.navigateForward(['ssh'], { relativeTo: this.route }),
        detail: true,
        disabled$: of(false),
      },
      {
        title: 'WiFi',
        description: 'Add or remove WiFi networks',
        icon: 'wifi',
        action: () =>
          this.navCtrl.navigateForward(['wifi'], { relativeTo: this.route }),
        detail: true,
        disabled$: of(false),
      },
      {
        title: 'Sideload Service',
        description: `Manually install a service`,
        icon: 'push-outline',
        action: () =>
          this.navCtrl.navigateForward(['sideload'], {
            relativeTo: this.route,
          }),
        detail: true,
        disabled$: of(false),
      },
    ],
    Insights: [
      {
        title: 'About',
        description: 'Basic information about your Embassy',
        icon: 'information-circle-outline',
        action: () =>
          this.navCtrl.navigateForward(['specs'], { relativeTo: this.route }),
        detail: true,
        disabled$: of(false),
      },
      {
        title: 'Monitor',
        description: 'CPU, disk, memory, and other useful metrics',
        icon: 'pulse',
        action: () =>
          this.navCtrl.navigateForward(['metrics'], { relativeTo: this.route }),
        detail: true,
        disabled$: of(false),
      },
      {
        title: 'Active Sessions',
        description: 'View and manage device access',
        icon: 'desktop-outline',
        action: () =>
          this.navCtrl.navigateForward(['sessions'], {
            relativeTo: this.route,
          }),
        detail: true,
        disabled$: of(false),
      },
      {
        title: 'OS Logs',
        description: 'Raw, unfiltered operating system logs',
        icon: 'newspaper-outline',
        action: () =>
          this.navCtrl.navigateForward(['logs'], { relativeTo: this.route }),
        detail: true,
        disabled$: of(false),
      },
      {
        title: 'Kernel Logs',
        description:
          'Diagnostic log stream for device drivers and other kernel processes',
        icon: 'receipt-outline',
        action: () =>
          this.navCtrl.navigateForward(['kernel-logs'], {
            relativeTo: this.route,
          }),
        detail: true,
        disabled$: of(false),
      },
    ],
    Support: [
      {
        title: 'User Manual',
        description: 'Discover what your Embassy can do',
        icon: 'map-outline',
        action: () =>
          window.open(
            'https://docs.start9.com/latest/user-manual',
            '_blank',
            'noreferrer',
          ),
        detail: true,
        disabled$: of(false),
      },
      {
        title: 'Contact Support',
        description: 'Get help from the Start9 team and community',
        icon: 'chatbubbles-outline',
        action: () =>
          window.open(
            'https://docs.start9.com/latest/support/contact',
            '_blank',
            'noreferrer',
          ),
        detail: true,
        disabled$: of(false),
      },
      {
        title: 'Donate to Start9',
        description: `Support embassyOS development`,
        icon: 'logo-bitcoin',
        action: () =>
          this.document.defaultView?.open(
            'https://donate.start9.com',
            '_blank',
            'noreferrer',
          ),
        detail: true,
        disabled$: of(false),
      },
    ],
    Power: [
      {
        title: 'Log Out',
        description: '',
        icon: 'log-out-outline',
        action: () => this.presentAlertLogout(),
        detail: false,
        disabled$: of(false),
      },
      {
        title: 'Restart',
        description: '',
        icon: 'reload',
        action: () => this.presentAlertRestart(),
        detail: false,
        disabled$: of(false),
      },
      {
        title: 'Shutdown',
        description: '',
        icon: 'power',
        action: () => this.presentAlertShutdown(),
        detail: false,
        disabled$: of(false),
      },
      {
        title: 'System Rebuild',
        description: '',
        icon: 'construct-outline',
        action: () => this.presentAlertSystemRebuild(),
        detail: false,
        disabled$: of(false),
      },
      {
        title: 'Repair Disk',
        description: '',
        icon: 'medkit-outline',
        action: () => this.presentAlertRepairDisk(),
        detail: false,
        disabled$: of(false),
      },
    ],
  }

  private async addManageClick() {
    this.manageClicks++
    if (this.manageClicks === 5) {
      this.manageClicks = 0
      const newVal = this.ClientStorageService.toggleShowDevTools()
      const toast = await this.toastCtrl.create({
        header: newVal ? 'Dev tools unlocked' : 'Dev tools hidden',
        position: 'bottom',
        duration: 1000,
      })

      await toast.present()
    }
  }

  private addPowerClick() {
    this.powerClicks++
    if (this.powerClicks === 5) {
      this.powerClicks = 0
      this.ClientStorageService.toggleShowDiskRepair()
    }
  }

  asIsOrder() {
    return 0
  }
}

interface ServerSettings {
  [key: string]: SettingBtn[]
}

interface SettingBtn {
  title: string
  description: string
  icon: string
  action: Function
  detail: boolean
  disabled$: Observable<boolean>
}
