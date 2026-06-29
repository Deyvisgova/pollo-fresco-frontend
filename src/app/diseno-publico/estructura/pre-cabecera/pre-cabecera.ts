import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { PaginaPublicaServicio } from '../../../servicios/pagina-publica.servicio';

@Component({
  selector: 'app-pre-cabecera',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './pre-cabecera.html',
  styleUrl: './pre-cabecera.css'
})
export class PreCabecera {
  readonly contenido;
  constructor(servicio: PaginaPublicaServicio) { this.contenido = servicio.contenido; }
}
