import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import {
  FormObjectComponent,
  FormUnionComponent,
  FormLabelComponent,
} from './form-object.component'
import {
  GetErrorPipe,
  ToWarningTextPipe,
  ToElementIdPipe,
  GetControlPipe,
  ToEnumListDisplayPipe,
  ToRangePipe,
} from './form-object.pipes'
import { IonicModule } from '@ionic/angular'
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { ElasticContainerModule, SharedPipesModule } from '@start9labs/shared'
import { EnumListPageModule } from 'src/app/modals/enum-list/enum-list.module'

@NgModule({
  declarations: [
    FormObjectComponent,
    FormUnionComponent,
    FormLabelComponent,
    ToWarningTextPipe,
    GetErrorPipe,
    ToEnumListDisplayPipe,
    ToElementIdPipe,
    GetControlPipe,
    ToRangePipe,
  ],
  imports: [
    CommonModule,
    IonicModule,
    FormsModule,
    ReactiveFormsModule,
    SharedPipesModule,
    EnumListPageModule,
    ElasticContainerModule,
  ],
  exports: [FormObjectComponent, FormLabelComponent],
})
export class FormObjectComponentModule {}
