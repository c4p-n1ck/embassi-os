import { ChangeDetectionStrategy, Component } from '@angular/core'

import { ThemeSwitcherService } from './theme-switcher.service'

@Component({
  selector: 'theme-switcher',
  templateUrl: './theme-switcher.component.html',
  styleUrls: ['./theme-switcher.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeSwitcherComponent {
  enabled = this.switcher.value

  constructor(private readonly switcher: ThemeSwitcherService) {}

  get icon(): string {
    return this.enabled ? 'sunny-outline' : 'moon-outline'
  }

  toggle(): void {
    this.enabled = !this.enabled
    this.switcher.toggle(this.enabled)
  }
}
