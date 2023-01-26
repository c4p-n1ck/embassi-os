import { CommonModule } from '@angular/common'
import { NgModule } from '@angular/core'
import { RouterModule } from '@angular/router'
import { IonicModule } from '@ionic/angular'
import { MenuComponent } from './menu.component'
import { SnekModule } from '../snek/snek.module'
import { ConnectionBarComponentModule } from 'src/app/components/connection-bar/connection-bar.component.module'
import { ThemeSwitcherModule } from '@start9labs/shared'

@NgModule({
  imports: [
    CommonModule,
    IonicModule,
    RouterModule,
    SnekModule,
    ConnectionBarComponentModule,
    ThemeSwitcherModule,
  ],
  declarations: [MenuComponent],
  exports: [MenuComponent],
})
export class MenuModule {}
