import {
  ChangeDetectionStrategy,
  Component,
  Input,
  Pipe,
  PipeTransform,
} from '@angular/core'
import { ConfigService } from 'src/app/services/config.service'
import { sameUrl } from '@start9labs/shared'

@Component({
  selector: 'store-icon',
  templateUrl: './store-icon.component.html',
  styleUrls: ['./store-icon.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StoreIconComponent {
  @Input() url: string = ''
  @Input() size?: string
}

@Pipe({
  name: 'getIcon',
})
export class GetIconPipe implements PipeTransform {
  constructor(private readonly config: ConfigService) {}

  transform(url: string): string | null {
    const { start9, community } = this.config.marketplace

    if (sameUrl(url, start9)) {
      return 'assets/img/icon.png'
    } else if (sameUrl(url, community)) {
      return 'assets/img/community-store.png'
    }
    return null
  }
}
