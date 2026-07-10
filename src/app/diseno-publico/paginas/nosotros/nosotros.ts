import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { CommonModule } from '@angular/common';
import { PaginaPublicaServicio } from '../../../servicios/pagina-publica.servicio';

@Component({
  selector: 'app-nosotros',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  templateUrl: './nosotros.html',
  styleUrl: './nosotros.css'
})
export class Nosotros {
  readonly contenido;
  constructor(servicio: PaginaPublicaServicio) { this.contenido = servicio.contenido; }
  usarBannerFallback(evento: Event): void {
    const imagen = evento.target as HTMLImageElement;
    imagen.onerror = null;
    imagen.src = 'assets/images/banners-paginas/nosotros.svg';
  }
}
