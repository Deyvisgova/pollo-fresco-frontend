import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PaginaPublicaServicio } from '../../../servicios/pagina-publica.servicio';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  templateUrl: './productos.html',
  styleUrl: './productos.css'
})
export class Productos {
  readonly contenido;
  readonly lineas = [
    {
      clase: 'pollo',
      icono: 'restaurant',
      etiqueta: 'Venta diaria',
      imagen: 'assets/images/productos/pollo-gallina.svg',
      nombre: 'Pollo y gallina',
      descripcion: 'Pollo fresco, gallina y cortes preparados para hogares, restaurantes y pollerias.',
      ejemplos: ['Pollo entero', 'Gallina', 'Pechuga', 'Filete', 'Piernas', 'Alitas'],
      destacado: 'Cortes frescos por pedido'
    },
    {
      clase: 'congelados',
      icono: 'ac_unit',
      etiqueta: 'Listos para preparar',
      imagen: 'assets/images/productos/congelados.svg',
      nombre: 'Congelados',
      descripcion: 'Productos congelados con control de stock y venta por kilo o presentacion.',
      ejemplos: ['Pavita', 'Mollejitas', 'Patitas', 'Mondonguito'],
      destacado: 'Disponibilidad por lote'
    },
    {
      clase: 'huevos',
      icono: 'egg_alt',
      etiqueta: 'Por tipo y cantidad',
      imagen: 'assets/images/productos/huevos.svg',
      nombre: 'Huevos',
      descripcion: 'Huevos pequenos, medianos y extra para compra por unidad, casillero o java.',
      ejemplos: ['Huevo pequeno', 'Huevo mediano', 'Huevo extra', 'Unidad', 'Casillero', 'Java'],
      destacado: 'Venta flexible'
    }
  ];

  constructor(servicio: PaginaPublicaServicio) { this.contenido = servicio.contenido; }
  pedir(nombre: string): void { window.open(`https://wa.me/${this.contenido().whatsapp.replace(/\D/g,'')}?text=${encodeURIComponent('Hola, deseo consultar por '+nombre)}`,'_blank'); }
  usarImagenFallback(evento: Event, tipo: 'banner' | 'producto'): void {
    const imagen = evento.target as HTMLImageElement;
    imagen.onerror = null;
    imagen.src = tipo === 'banner'
      ? 'assets/images/banners-paginas/productos.svg'
      : 'assets/images/productos/pollo-gallina.svg';
  }
}
