import { AfterViewInit, Component, ElementRef, Input, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { getMessage } from '../../config/messages.es';

/**
 * Layout común a las seis pantallas del flujo (T11): título único por pantalla con
 * foco programático, y "¿Necesitas ayuda?" visible siempre, en un solo lugar de
 * mantenimiento.
 */
@Component({
  selector: 'app-payment-shell',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payment-shell.component.html',
  styleUrl: './payment-shell.component.css'
})
export class PaymentShellComponent implements AfterViewInit {
  @Input({ required: true }) title = '';
  @ViewChild('heading') private headingRef?: ElementRef<HTMLHeadingElement>;

  readonly helpLabel = getMessage('help.label');
  readonly helpMessage = getMessage('help.message');
  showHelp = false;

  ngAfterViewInit(): void {
    this.headingRef?.nativeElement.focus();
  }

  toggleHelp(): void {
    this.showHelp = !this.showHelp;
  }
}
