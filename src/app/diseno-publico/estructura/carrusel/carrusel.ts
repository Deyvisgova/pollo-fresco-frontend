import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PaginaPublicaServicio } from '../../../servicios/pagina-publica.servicio';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-carrusel',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, RouterLink],
  templateUrl: './carrusel.html',
  styleUrl: './carrusel.css'
})
export class Carrusel implements OnInit, OnDestroy {
  constructor(private pagina: PaginaPublicaServicio) {}
  get slides() { return this.pagina.contenido().slides.map(s => ({ title: s.titulo, summary: s.resumen, detail: s.detalle, image: s.imagen_url })); }

  activeIndex = 0;
  private readonly autoSlideIntervalMs = 5000;
  private autoSlideTimer?: ReturnType<typeof setInterval>;

  get activeSlide() {
    return this.slides[this.activeIndex];
  }

  ngOnInit(): void {
    this.startAutoSlide();
  }

  ngOnDestroy(): void {
    this.stopAutoSlide();
  }

  nextSlide(): void {
    this.activeIndex = (this.activeIndex + 1) % this.slides.length;
  }

  previousSlide(): void {
    this.activeIndex = (this.activeIndex - 1 + this.slides.length) % this.slides.length;
  }

  goToSlide(index: number): void {
    this.activeIndex = index;
    this.restartAutoSlide();
  }

  abrirWhatsApp(): void {
    const numero = this.pagina.contenido().whatsapp.replace(/\D/g, '');
    const mensaje = `Hola, quiero consultar por ${this.activeSlide.title}.`;
    window.open(`https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`, '_blank');
  }

  usarSlideFallback(evento: Event): void {
    const imagen = evento.target as HTMLImageElement;
    imagen.onerror = null;
    imagen.src = 'assets/images/carusel/carousel-2.svg';
  }

  private startAutoSlide(): void {
    this.autoSlideTimer = setInterval(() => this.nextSlide(), this.autoSlideIntervalMs);
  }

  private stopAutoSlide(): void {
    if (!this.autoSlideTimer) {
      return;
    }

    clearInterval(this.autoSlideTimer);
    this.autoSlideTimer = undefined;
  }

  private restartAutoSlide(): void {
    this.stopAutoSlide();
    this.startAutoSlide();
  }
}
