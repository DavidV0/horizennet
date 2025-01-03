import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { EventService } from '../../../shared/services/event.service';
import { Event } from '../../../shared/interfaces/event.interface';
import { Subscription } from 'rxjs';
import { EventDialogComponent } from '../../../admin/components/event-dialog/event-dialog.component';

@Component({
  selector: 'app-admin-events',
  templateUrl: './events.component.html',
  styleUrls: ['./events.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule
  ]
})
export class EventsComponent implements OnInit, OnDestroy {
  dataSource = new MatTableDataSource<Event>([]);
  displayedColumns: string[] = ['image', 'title', 'date', 'location', 'status', 'actions'];
  private subscription?: Subscription;

  constructor(
    private eventService: EventService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadEvents();
  }

  private loadEvents(): void {
    this.subscription = this.eventService.getAllEvents()
      .subscribe({
        next: (events) => {
          this.dataSource.data = events;
        },
        error: () => {
          this.dataSource.data = [];
        }
      });
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  async onDelete(id: string): Promise<void> {
    if (confirm('Are you sure you want to delete this event?')) {
      try {
        await this.eventService.deleteEvent(id);
        this.loadEvents();
      } catch (error) {
        // Handle error silently
      }
    }
  }

  onEdit(event: Event): void {
    const dialogRef = this.dialog.open(EventDialogComponent, {
      width: '600px',
      data: { event }
    });

    dialogRef.afterClosed().subscribe(async (result: Event) => {
      if (result) {
        try {
          await this.eventService.updateEvent(result.id, result);
          this.loadEvents();
        } catch (error) {
          // Handle error silently
        }
      }
    });
  }

  onAdd(): void {
    const dialogRef = this.dialog.open(EventDialogComponent, {
      width: '600px',
      data: { event: null }
    });

    dialogRef.afterClosed().subscribe(async (result: Event) => {
      if (result) {
        try {
          await this.eventService.createEvent(result);
          this.loadEvents();
        } catch (error) {
          // Handle error silently
        }
      }
    });
  }
}
