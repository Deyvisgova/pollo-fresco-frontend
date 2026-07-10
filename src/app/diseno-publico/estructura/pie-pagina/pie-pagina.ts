import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaginaPublicaServicio } from '../../../servicios/pagina-publica.servicio';
import { ConfiguracionEmpresaServicio } from '../../../servicios/configuracion-empresa.servicio';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-pie-pagina',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './pie-pagina.html',
  styleUrl: './pie-pagina.css'
})
export class PiePagina {
  readonly currentYear = new Date().getFullYear();
  readonly contenido;
  readonly configuracionEmpresa;

  constructor(
    servicio: PaginaPublicaServicio,
    configuracionEmpresaServicio: ConfiguracionEmpresaServicio
  ) {
    this.contenido = servicio.contenido;
    this.configuracionEmpresa = configuracionEmpresaServicio.configuracion;
  }
}
