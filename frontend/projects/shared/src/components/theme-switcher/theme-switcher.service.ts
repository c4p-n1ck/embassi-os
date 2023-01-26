import { Inject, Injectable } from '@angular/core'
import { LOCAL_STORAGE, WINDOW } from '@ng-web-apis/common'
import { BehaviorSubject } from 'rxjs'

const SELECTOR = 'night-mode-enabled'

@Injectable({
  providedIn: 'root',
})
export class ThemeSwitcherService extends BehaviorSubject<boolean> {
  constructor(
    @Inject(LOCAL_STORAGE) private readonly storage: Storage,
    @Inject(WINDOW) windowRef: Window,
  ) {
    super(
      storage.getItem(SELECTOR) === 'true' ||
        (storage.getItem(SELECTOR) === null &&
          windowRef.matchMedia('(prefers-color-scheme: dark)').matches),
    )
  }

  toggle(nightModeEnabled: boolean): void {
    this.next(nightModeEnabled)
    this.storage.setItem(SELECTOR, String(nightModeEnabled))
  }
}
