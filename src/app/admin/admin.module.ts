import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminRoutingModule } from './admin-routing.module';
import { EventDialogComponent } from './components/event-dialog/event-dialog.component';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    AdminRoutingModule,
    EventDialogComponent
  ]
})
export class AdminModule { }
