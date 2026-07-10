import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { CommonModule } from '@angular/common';
import { PaginaPublicaServicio } from '../../../servicios/pagina-publica.servicio';

@Component({
  selector: 'app-contacto',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule],
  templateUrl: './contacto.html',
  styleUrl: './contacto.css'
})
export class Contacto {
  readonly contenido;
  constructor(servicio: PaginaPublicaServicio) { this.contenido = servicio.contenido; }
  abrirWhatsApp(): void { window.open(`https://wa.me/${this.contenido().whatsapp.replace(/\D/g, '')}`, '_blank'); }
  usarBannerFallback(evento: Event): void {
    const imagen = evento.target as HTMLImageElement;
    imagen.onerror = null;
    imagen.src = 'assets/images/banners-paginas/contacto.svg';
  }
}
