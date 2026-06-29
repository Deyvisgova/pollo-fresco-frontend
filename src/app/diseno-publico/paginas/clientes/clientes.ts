import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { PaginaPublicaServicio } from '../../../servicios/pagina-publica.servicio';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule],
  templateUrl: './clientes.html',
  styleUrl: './clientes.css'
})
export class Clientes {
  readonly contenido;
  constructor(servicio: PaginaPublicaServicio) { this.contenido = servicio.contenido; }
}
