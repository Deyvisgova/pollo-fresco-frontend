import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaginaPublicaServicio } from '../../../servicios/pagina-publica.servicio';

@Component({
  selector: 'app-pie-pagina',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pie-pagina.html',
  styleUrl: './pie-pagina.css'
})
export class PiePagina {
  readonly currentYear = new Date().getFullYear();
  readonly contenido;
  constructor(servicio: PaginaPublicaServicio) { this.contenido = servicio.contenido; }
}
