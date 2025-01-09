import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { EventService } from '../../../shared/services/event.service';
import { Event } from '../../../shared/interfaces/event.interface';
import { EventDialogComponent } from '../../components/event-dialog/event-dialog.component';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-admin-events',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    EventDialogComponent
  ],
  templateUrl: './events.component.html',
  styleUrls: ['./events.component.scss']
})
export class AdminEventsComponent {
  events$: Observable<Event[]>;

  constructor(private eventService: EventService, private dialog: MatDialog) {
    this.events$ = this.eventService.getAllEvents();
  }

  openEventDialog(event?: Event) {
    const dialogRef = this.dialog.open(EventDialogComponent, {
      width: '600px',
      data: { event }
    });

    dialogRef.afterClosed().subscribe(async result => {
      if (result) {
        try {
          if (event?.id) {
            await this.eventService.updateEvent(event.id, result.event, result.file);
          } else {
            await this.eventService.createEvent(result.event, result.file);
          }
          this.events$ = this.eventService.getAllEvents();
        } catch (error) {
          console.error('Error saving event:', error);
        }
      }
    });
  }

  async deleteEvent(eventId: string) {
    if (confirm('Sind Sie sicher, dass Sie dieses Event löschen möchten?')) {
      try {
        await this.eventService.deleteEvent(eventId);
        this.events$ = this.eventService.getAllEvents();
      } catch (error) {
        console.error('Error deleting event:', error);
      }
    }
  }
}
