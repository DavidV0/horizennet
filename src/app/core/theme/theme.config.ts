import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeConfig {
  // Hauptfarbpalette
  readonly primaryColor = '#000000';    // Schwarz - Hauptfarbe
  readonly accentColor = '#FFB700';     // Gold - Akzentfarbe
  readonly secondaryColor = '#2A2929';  // Dunkelgrau - Sekundärfarbe
  
  // Neutrale Farben
  readonly white = '#FFFFFF';
  readonly black = '#000000';
  
  // Zusätzliche Farbtöne für UI-Elemente
  readonly grayLight = '#F5F5F5';
  readonly grayMedium = '#E0E0E0';
  
  // Animations-Timing
  readonly animationDurationShort = '200ms';
  readonly animationDurationMedium = '400ms';
  readonly animationDurationLong = '600ms';
} 