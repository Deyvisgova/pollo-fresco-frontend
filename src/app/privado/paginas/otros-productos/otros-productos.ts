import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { SesionServicio } from '../../../servicios/sesion.servicio';

@Component({
  selector: 'app-privado-otros-productos',
  // Componente informativo para la seccion de otros-productos.
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './otros-productos.html',
  styleUrl: './otros-productos.css'
})
export class PrivadoOtrosProductos implements OnInit {
  constructor(
    private readonly router: Router,
    private readonly sesionServicio: SesionServicio
  ) {}

  ngOnInit(): void {
    if (this.esVendedor && !this.router.url.includes('/privado/otros-productos/ventas-diarias')) {
      void this.router.navigate(['/privado/otros-productos/ventas-diarias']);
    }
  }

  get esVendedor(): boolean {
    return this.sesionServicio.usuarioEsRol('vendedor');
  }
}
