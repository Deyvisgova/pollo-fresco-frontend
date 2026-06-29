import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PaginaPublicaContenido, PaginaPublicaServicio } from '../../../servicios/pagina-publica.servicio';

@Component({ selector: 'app-pagina-publica-admin', standalone: true, imports: [CommonModule, FormsModule], templateUrl: './pagina-publica.html', styleUrls: ['./pagina-publica.css', './imagenes.css'] })
export class PaginaPublicaAdmin {
  form: PaginaPublicaContenido;
  seccion: 'slider' | 'paginas' | 'contacto' = 'slider';
  guardando = false; subiendo = false; mensaje = ''; error = '';
  constructor(private servicio: PaginaPublicaServicio) { this.form = { ...servicio.contenido() }; servicio.obtener().subscribe({ next: r => this.form = { ...r } }); }
  guardar(): void { this.guardando = true; this.error = ''; this.servicio.guardar(this.form).subscribe({ next: () => { this.guardando = false; this.mensaje = 'Contenido publico guardado correctamente.'; }, error: e => { this.guardando = false; this.error = e?.error?.message || 'No se pudo guardar.'; } }); }
  subirA(e: Event, destino: 'banner_nosotros_url'|'banner_productos_url'|'banner_clientes_url'|'banner_contacto_url', slide?: number): void {
    const archivo = (e.target as HTMLInputElement).files?.[0]; if (!archivo) return; this.subiendo = true;
    this.servicio.subirImagen(archivo, slide === undefined ? 'banners' : 'slider').subscribe({ next: r => { if (slide === undefined) this.form[destino] = r.imagen_url; else this.form.slides[slide].imagen_url = r.imagen_url; this.subiendo = false; }, error: () => { this.subiendo = false; this.error = 'No se pudo cargar la imagen.'; } });
  }
  subirProducto(e: Event, indice: number): void { const archivo=(e.target as HTMLInputElement).files?.[0]; if(!archivo)return; this.subiendo=true; this.servicio.subirImagen(archivo, 'productos').subscribe({next:r=>{this.form.productos_destacados[indice].imagen_url=r.imagen_url;this.subiendo=false;},error:()=>{this.subiendo=false;this.error='No se pudo cargar la imagen.';}}); }
  agregarSlide(): void {
    this.form.slides.push({ titulo: 'Nueva promocion', resumen: 'Resumen de la promocion.', detalle: '', imagen_url: 'assets/images/carusel/carousel-2.svg' });
  }
  quitarSlide(indice: number): void { if (this.form.slides.length > 1) this.form.slides.splice(indice, 1); }
  agregarProducto(): void {
    this.form.productos_destacados.push({ nombre: 'Nuevo producto', descripcion: 'Descripcion del producto.', precio: '', imagen_url: 'assets/images/carusel/carousel-2.svg' });
  }
  quitarProducto(indice: number): void { if (this.form.productos_destacados.length > 1) this.form.productos_destacados.splice(indice, 1); }
  agregarTestimonio(): void { this.form.testimonios.push({ autor: 'Cliente o negocio', texto: 'Escribe aqui su experiencia.' }); }
  quitarTestimonio(indice: number): void { if (this.form.testimonios.length > 1) this.form.testimonios.splice(indice, 1); }
}
