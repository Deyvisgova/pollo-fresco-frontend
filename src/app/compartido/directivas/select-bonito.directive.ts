import { AfterViewChecked, AfterViewInit, Directive, DoCheck, ElementRef, OnDestroy, Renderer2 } from '@angular/core';

@Directive({
  selector: 'select:not([multiple])',
  standalone: true
})
export class SelectBonitoDirective implements AfterViewInit, AfterViewChecked, DoCheck, OnDestroy {
  private readonly select: HTMLSelectElement;
  private wrapper?: HTMLDivElement;
  private trigger?: HTMLButtonElement;
  private menu?: HTMLDivElement;
  private observer?: MutationObserver;
  private abierto = false;
  private valorAnterior = '';
  private deshabilitadoAnterior = false;
  private cantidadOpcionesAnterior = -1;

  private readonly alCambiar = () => this.sincronizar();
  private readonly alRedimensionar = () => this.abierto && this.posicionarMenu();
  private readonly alDesplazar = () => this.cerrar();
  private readonly alPulsarDocumento = (event: MouseEvent) => {
    const objetivo = event.target as Node | null;
    if (objetivo && !this.wrapper?.contains(objetivo) && !this.menu?.contains(objetivo)) {
      this.cerrar();
    }
  };

  constructor(
    elementRef: ElementRef<HTMLSelectElement>,
    private readonly renderer: Renderer2
  ) {
    this.select = elementRef.nativeElement;
  }

  ngAfterViewInit(): void {
    queueMicrotask(() => this.inicializar());
  }

  ngDoCheck(): void {
    if (!this.trigger) return;
    if (
      this.valorAnterior !== this.select.value ||
      this.deshabilitadoAnterior !== this.select.disabled ||
      this.cantidadOpcionesAnterior !== this.select.options.length
    ) {
      this.sincronizar();
    }
  }

  ngAfterViewChecked(): void {
    // NgModel escribe el valor durante el mismo ciclo de deteccion. Se sincroniza
    // al finalizar para que el boton siempre muestre la opcion realmente activa.
    if (this.select.value !== this.valorAnterior || this.select.disabled !== this.deshabilitadoAnterior) {
      this.sincronizar();
    }
  }

  ngOnDestroy(): void {
    this.select.removeEventListener('change', this.alCambiar);
    window.removeEventListener('resize', this.alRedimensionar);
    window.removeEventListener('scroll', this.alDesplazar, true);
    document.removeEventListener('mousedown', this.alPulsarDocumento);
    this.observer?.disconnect();
    this.menu?.remove();
  }

  private inicializar(): void {
    if (this.select.dataset['selectBonito'] === 'true' || !this.select.parentNode) {
      return;
    }

    this.select.dataset['selectBonito'] = 'true';
    const wrapper = this.renderer.createElement('div') as HTMLDivElement;
    const trigger = this.renderer.createElement('button') as HTMLButtonElement;

    wrapper.className = 'select-bonito';
    trigger.type = 'button';
    trigger.className = 'select-bonito__trigger';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');

    this.select.parentNode.insertBefore(wrapper, this.select);
    wrapper.appendChild(this.select);
    wrapper.appendChild(trigger);
    this.select.classList.add('select-bonito__native');
    this.wrapper = wrapper;
    this.trigger = trigger;

    trigger.addEventListener('click', () => this.alternar());
    trigger.addEventListener('keydown', (event) => this.tecladoTrigger(event));
    this.select.addEventListener('change', this.alCambiar);
    window.addEventListener('resize', this.alRedimensionar);
    window.addEventListener('scroll', this.alDesplazar, true);
    document.addEventListener('mousedown', this.alPulsarDocumento);

    this.observer = new MutationObserver(() => this.sincronizar());
    this.observer.observe(this.select, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['disabled', 'selected', 'label']
    });
    this.sincronizar();
  }

  private sincronizar(): void {
    if (!this.trigger) return;
    const opcion = this.select.selectedOptions.item(0);
    this.trigger.textContent = opcion?.textContent?.trim() || 'Selecciona una opción';
    this.trigger.disabled = this.select.disabled;
    this.valorAnterior = this.select.value;
    this.deshabilitadoAnterior = this.select.disabled;
    this.cantidadOpcionesAnterior = this.select.options.length;
    this.trigger.setAttribute('aria-label', this.select.getAttribute('aria-label') || this.trigger.textContent);
    if (this.abierto) this.construirOpciones();
  }

  private alternar(): void {
    if (this.select.disabled) return;
    this.abierto ? this.cerrar() : this.abrir();
  }

  private abrir(): void {
    if (!this.trigger) return;
    this.construirOpciones();
    this.posicionarMenu();
    this.menu?.classList.add('select-bonito__menu--abierto');
    this.trigger.classList.add('select-bonito__trigger--abierto');
    this.trigger.setAttribute('aria-expanded', 'true');
    this.abierto = true;
  }

  private cerrar(): void {
    if (!this.abierto) return;
    this.menu?.classList.remove('select-bonito__menu--abierto');
    this.trigger?.classList.remove('select-bonito__trigger--abierto');
    this.trigger?.setAttribute('aria-expanded', 'false');
    this.abierto = false;
  }

  private construirOpciones(): void {
    if (!this.menu) {
      this.menu = document.createElement('div');
      this.menu.className = 'select-bonito__menu';
      this.menu.setAttribute('role', 'listbox');
      document.body.appendChild(this.menu);
    }

    this.menu.replaceChildren();
    this.menu.classList.toggle(
      'select-bonito__menu--oscuro',
      !!this.select.closest('.panel--tema-oscuro')
    );

    let grupoAnterior = '';
    Array.from(this.select.options).forEach((opcion, indice) => {
      const grupo = opcion.parentElement instanceof HTMLOptGroupElement
        ? opcion.parentElement.label
        : '';
      if (grupo && grupo !== grupoAnterior) {
        const etiqueta = document.createElement('div');
        etiqueta.className = 'select-bonito__grupo';
        etiqueta.textContent = grupo;
        this.menu?.appendChild(etiqueta);
        grupoAnterior = grupo;
      }

      const boton = document.createElement('button');
      boton.type = 'button';
      boton.className = 'select-bonito__opcion';
      boton.textContent = opcion.textContent?.trim() || opcion.value;
      boton.disabled = opcion.disabled || !!opcion.parentElement?.closest('optgroup[disabled]');
      boton.dataset['indice'] = String(indice);
      boton.setAttribute('role', 'option');
      boton.setAttribute('aria-selected', String(opcion.selected));
      if (opcion.selected) boton.classList.add('select-bonito__opcion--seleccionada');
      boton.addEventListener('click', () => this.seleccionar(indice));
      boton.addEventListener('keydown', (event) => this.tecladoOpcion(event));
      this.menu?.appendChild(boton);
    });
  }

  private seleccionar(indice: number): void {
    const opcion = this.select.options.item(indice);
    if (!opcion || opcion.disabled) return;
    this.select.value = opcion.value;
    this.select.dispatchEvent(new Event('change', { bubbles: true }));
    this.sincronizar();
    this.cerrar();
    this.trigger?.focus();
  }

  private posicionarMenu(): void {
    if (!this.trigger || !this.menu) return;
    const rect = this.trigger.getBoundingClientRect();
    const espacioAbajo = window.innerHeight - rect.bottom;
    const maximo = Math.min(320, Math.max(160, window.innerHeight - 24));
    this.menu.style.position = 'fixed';
    this.menu.style.left = `${Math.max(8, rect.left)}px`;
    this.menu.style.width = `${Math.min(rect.width, window.innerWidth - 16)}px`;
    this.menu.style.maxHeight = `${maximo}px`;
    if (espacioAbajo >= 190 || rect.top < espacioAbajo) {
      this.menu.style.top = `${rect.bottom + 6}px`;
      this.menu.style.bottom = 'auto';
    } else {
      this.menu.style.top = 'auto';
      this.menu.style.bottom = `${window.innerHeight - rect.top + 6}px`;
    }
  }

  private tecladoTrigger(event: KeyboardEvent): void {
    if (!['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) return;
    event.preventDefault();
    if (!this.abierto) this.abrir();
    const opciones = this.opcionesActivas();
    const seleccionada = opciones.find((item) => item.getAttribute('aria-selected') === 'true');
    (seleccionada || opciones[0])?.focus();
  }

  private tecladoOpcion(event: KeyboardEvent): void {
    const opciones = this.opcionesActivas();
    const actual = opciones.indexOf(event.currentTarget as HTMLButtonElement);
    if (event.key === 'Escape') {
      event.preventDefault();
      this.cerrar();
      this.trigger?.focus();
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      (event.currentTarget as HTMLButtonElement).click();
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const desplazamiento = event.key === 'ArrowDown' ? 1 : -1;
      opciones[(actual + desplazamiento + opciones.length) % opciones.length]?.focus();
    }
  }

  private opcionesActivas(): HTMLButtonElement[] {
    return Array.from(this.menu?.querySelectorAll<HTMLButtonElement>('.select-bonito__opcion:not(:disabled)') ?? []);
  }
}
