import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { Carrusel } from '../../estructura/carrusel/carrusel';
import { PaginaPublicaServicio } from '../../../servicios/pagina-publica.servicio';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule, Carrusel, MatCardModule, MatIconModule, RouterLink],
  templateUrl: './inicio.html',
  styleUrl: './inicio.css'
})
export class Inicio {
  readonly contenido;
  constructor(servicio: PaginaPublicaServicio) { this.contenido = servicio.contenido; }
  abrirWhatsApp(): void { window.open(`https://wa.me/${this.contenido().whatsapp.replace(/\D/g, '')}`, '_blank'); }
}
