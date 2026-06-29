import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { PaginaPublicaServicio } from '../../../servicios/pagina-publica.servicio';

@Component({
  selector: 'app-carrusel',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatCardModule, MatChipsModule, MatIconModule],
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
