import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { PaginaPublicaServicio } from '../../../servicios/pagina-publica.servicio';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatCardModule],
  templateUrl: './productos.html',
  styleUrl: './productos.css'
})
export class Productos {
  readonly contenido;
  constructor(servicio: PaginaPublicaServicio) { this.contenido = servicio.contenido; }
  pedir(nombre: string): void { window.open(`https://wa.me/${this.contenido().whatsapp.replace(/\D/g,'')}?text=${encodeURIComponent('Hola, deseo consultar por '+nombre)}`,'_blank'); }
}
