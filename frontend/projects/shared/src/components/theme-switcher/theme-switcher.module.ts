import { NgModule } from '@angular/core'
import { IonicModule } from '@ionic/angular'
import { TuiButtonModule } from '@taiga-ui/core'

import { ThemeSwitcherComponent } from './theme-switcher.component'

@NgModule({
  imports: [IonicModule, TuiButtonModule],
  declarations: [ThemeSwitcherComponent],
  exports: [ThemeSwitcherComponent],
})
export class ThemeSwitcherModule {}
