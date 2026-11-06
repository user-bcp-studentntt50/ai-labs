import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { getMessage } from '../../config/messages.es';
import { DemoContact, searchContacts } from '../../config/contacts.config';
import { maskAlias } from '../../domain/alias-mask';
import { PaymentFlowStore } from '../../application/payment-flow.store';
import { PaymentShellComponent } from '../shell/payment-shell.component';

/** T2: selección de contacto de demostración, con búsqueda simple por nombre o alias. */
@Component({
  selector: 'app-payments-contact-selection',
  standalone: true,
  imports: [CommonModule, FormsModule, PaymentShellComponent],
  templateUrl: './contact-selection.component.html',
  styleUrl: './contact-selection.component.css'
})
export class ContactSelectionComponent {
  readonly title = getMessage('contact.title');
  readonly searchLabel = getMessage('contact.searchLabel');
  readonly searchPlaceholder = getMessage('contact.searchPlaceholder');
  readonly emptyResultsMessage = getMessage('contact.emptyResults');

  query = '';

  constructor(
    private readonly router: Router,
    private readonly flowStore: PaymentFlowStore
  ) {}

  get visibleContacts(): readonly DemoContact[] {
    return searchContacts(this.query);
  }

  maskedAlias(contact: DemoContact): string {
    return maskAlias(contact.alias);
  }

  async selectContact(contact: DemoContact): Promise<void> {
    this.flowStore.setContact(contact);
    await this.router.navigate(['/pagos/monto']);
  }
}
