import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, HostListener, OnDestroy, computed } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AutenticacionServicio } from '../../servicios/autenticacion.servicio';
import { ConfirmacionServicio } from '../../servicios/confirmacion.servicio';
import { ConfiguracionEmpresaServicio } from '../../servicios/configuracion-empresa.servicio';
import { SesionServicio } from '../../servicios/sesion.servicio';
import { TemaServicio } from '../../servicios/tema.servicio';

interface ItemMenu {
  etiqueta: string;
  ruta: string;
  icono: string;
}

interface AccesoVendedor {
  etiqueta: string;
  descripcion: string;
  ruta: string;
  icono: string;
}

@Component({
  selector: 'app-privado-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './privado-layout.html',
  styleUrl: './privado-layout.css'
})
export class PrivadoLayout implements AfterViewInit, OnDestroy {
  menuPrincipal: ItemMenu[] = [
    { etiqueta: 'Inicio', ruta: 'inicio', icono: 'inicio' },
    { etiqueta: 'Proveedores', ruta: 'proveedores', icono: 'proveedores' },
    { etiqueta: 'Clientes', ruta: 'clientes', icono: 'clientes' }
  ];

  menuPosterior: ItemMenu[] = [
    { etiqueta: 'Pedidos', ruta: 'pedidos', icono: 'pedidos' },
    { etiqueta: 'Otros productos', ruta: 'otros-productos', icono: 'productos' },
    { etiqueta: 'Usuarios', ruta: 'usuarios', icono: 'usuarios' },
    { etiqueta: 'Gastos', ruta: 'gastos', icono: 'gastos' },
    { etiqueta: 'Pagina publica', ruta: 'pagina-publica', icono: 'pagina-publica' },
    { etiqueta: 'Configuracion', ruta: 'configuracion', icono: 'configuracion' },
    { etiqueta: 'Reportes', ruta: 'reportes', icono: 'reportes' }
  ];

  ventaMenuAbierto = false;
  sidebarMovilAbierto = false;
  sidebarColapsadoDesktop = false;
  menuUsuarioAbierto = false;
  readonly accesosVendedor: AccesoVendedor[] = [
    {
      etiqueta: 'Pollos',
      descripcion: 'Entregas del proveedor',
      ruta: '/privado/proveedores/registros',
      icono: 'proveedores'
    },
    {
      etiqueta: 'Comprobante',
      descripcion: 'Boleta o factura',
      ruta: '/privado/venta',
      icono: 'venta'
    },
    {
      etiqueta: 'Pedido',
      descripcion: 'Mesa o delivery',
      ruta: '/privado/pedidos',
      icono: 'pedidos'
    },
    {
      etiqueta: 'Ventas diarias',
      descripcion: 'Congelados y huevos',
      ruta: '/privado/otros-productos/ventas-diarias',
      icono: 'productos'
    }
  ];
  private observadorTablas: MutationObserver | null = null;
  private actualizacionTablasTimer: ReturnType<typeof setTimeout> | null = null;

  readonly configuracionEmpresa;
  readonly mostrarLogo;
  readonly nombreUsuario;
  readonly temaActual;
  readonly confirmacionActiva;

  constructor(
    private readonly autenticacionServicio: AutenticacionServicio,
    private readonly configuracionEmpresaServicio: ConfiguracionEmpresaServicio,
    private readonly confirmacionServicio: ConfirmacionServicio,
    private readonly sesionServicio: SesionServicio,
    private readonly temaServicio: TemaServicio,
    private readonly router: Router
  ) {
    if (this.usuarioEsDelivery()) {
      this.menuPrincipal = [];
      this.menuPosterior = [
        { etiqueta: 'Pedidos', ruta: 'pedidos', icono: 'pedidos' }
      ];
    }

    if (this.usuarioEsVendedor()) {
      this.menuPrincipal = [
        { etiqueta: 'Proveedores', ruta: 'proveedores', icono: 'proveedores' }
      ];
      this.menuPosterior = [
        { etiqueta: 'Pedidos', ruta: 'pedidos', icono: 'pedidos' },
        { etiqueta: 'Otros productos', ruta: 'otros-productos', icono: 'productos' }
      ];
    }

    this.configuracionEmpresa = this.configuracionEmpresaServicio.configuracion;
    this.mostrarLogo = computed(() => Boolean(this.configuracionEmpresa().logoUrl));
    this.nombreUsuario = computed(() => {
      const usuario = this.sesionServicio.obtenerUsuario();
      return usuario?.name || usuario?.usuario || 'Usuario';
    });
    this.temaActual = this.temaServicio.temaActual();
    this.confirmacionActiva = this.confirmacionServicio.dialogo;

    this.sincronizarMenuVenta(this.router.url);
    this.redirigirDeliverySiCorresponde(this.router.url);
    this.redirigirVendedorSiCorresponde(this.router.url);
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event) => {
        const url = (event as NavigationEnd).urlAfterRedirects;
        this.sincronizarMenuVenta(url);
        this.redirigirDeliverySiCorresponde(url);
        this.redirigirVendedorSiCorresponde(url);
        this.actualizarDataLabelsTablas();
        this.menuUsuarioAbierto = false;
      });
  }

  get esMovilOTablet(): boolean {
    return window.innerWidth <= 900;
  }

  @HostListener('window:resize')
  onResize(): void {
    if (!this.esMovilOTablet) {
      this.sidebarMovilAbierto = false;
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(evento: MouseEvent): void {
    const target = evento.target as HTMLElement;
    if (!target.closest('.panel__usuario')) {
      this.menuUsuarioAbierto = false;
    }
  }

  ngAfterViewInit(): void {
    this.actualizarDataLabelsTablas();
    this.iniciarObservadorTablas();
  }

  ngOnDestroy(): void {
    this.observadorTablas?.disconnect();

    if (this.actualizacionTablasTimer) {
      clearTimeout(this.actualizacionTablasTimer);
    }
  }

  get rutaVentaActiva(): boolean {
    return this.esRutaVenta(this.router.url);
  }

  get esDelivery(): boolean {
    return this.usuarioEsDelivery();
  }

  get esVendedor(): boolean {
    return this.usuarioEsVendedor();
  }

  toggleVentaMenu(): void {
    this.ventaMenuAbierto = !this.ventaMenuAbierto;
  }

  toggleSidebar(): void {
    if (this.esVendedor) {
      return;
    }

    if (this.esMovilOTablet) {
      this.sidebarMovilAbierto = !this.sidebarMovilAbierto;
      return;
    }

    this.sidebarColapsadoDesktop = !this.sidebarColapsadoDesktop;
  }

  toggleMenuUsuario(evento: MouseEvent): void {
    evento.stopPropagation();
    this.menuUsuarioAbierto = !this.menuUsuarioAbierto;
  }

  toggleTema(): void {
    this.temaServicio.alternarTema();
  }

  cerrarSidebarEnMovil(): void {
    if (this.esMovilOTablet) {
      this.sidebarMovilAbierto = false;
    }
  }

  irACambiarContrasena(): void {
    this.menuUsuarioAbierto = false;
    void this.router.navigate(['/privado/usuarios']);
  }

  cerrarSesion(): void {
    this.menuUsuarioAbierto = false;
    this.autenticacionServicio.cerrarSesion().subscribe({
      next: () => this.router.navigate(['/ingresar']),
      error: () => this.router.navigate(['/ingresar'])
    });
  }

  private sincronizarMenuVenta(url: string): void {
    if (this.esRutaVenta(url)) {
      this.ventaMenuAbierto = true;
    }
  }

  private esRutaVenta(url: string): boolean {
    return url.includes('/privado/venta');
  }

  aceptarConfirmacion(): void {
    this.confirmacionServicio.aceptar();
  }

  cancelarConfirmacion(): void {
    this.confirmacionServicio.cancelar();
  }

  private usuarioEsDelivery(): boolean {
    return this.sesionServicio.usuarioEsRol('delivery');
  }

  private usuarioEsVendedor(): boolean {
    return this.sesionServicio.usuarioEsRol('vendedor');
  }

  private redirigirDeliverySiCorresponde(url: string): void {
    if (!this.usuarioEsDelivery()) {
      return;
    }

    if (!url.includes('/privado/pedidos')) {
      void this.router.navigate(['/privado/pedidos']);
    }
  }

  private redirigirVendedorSiCorresponde(url: string): void {
    if (!this.usuarioEsVendedor()) {
      return;
    }

    const rutasPermitidas = [
      '/privado/proveedores',
      '/privado/venta',
      '/privado/pedidos',
      '/privado/otros-productos'
    ];

    if (!rutasPermitidas.some((ruta) => url.includes(ruta)) || url.includes('/privado/venta-registros')) {
      void this.router.navigate(['/privado/pedidos']);
    }
  }

  private actualizarDataLabelsTablas(): void {
    if (this.actualizacionTablasTimer) {
      clearTimeout(this.actualizacionTablasTimer);
    }

    this.actualizacionTablasTimer = setTimeout(() => {
      const contenedor = document.querySelector('.panel__rutas');
      if (!contenedor) {
        return;
      }

      const tablas = Array.from(contenedor.querySelectorAll('table'));

      tablas.forEach((tabla) => {
        if (tabla.closest('.tabla-sin-estilo')) {
          return;
        }

        tabla.classList.add('tabla-sistema');

        let encabezados = Array.from(tabla.querySelectorAll('thead th')).map((th) =>
          (th.textContent || '').trim()
        );

        if (!encabezados.length) {
          const primeraFilaConTh = tabla.querySelector('tr');
          encabezados = Array.from(primeraFilaConTh?.querySelectorAll('th') || []).map((th) =>
            (th.textContent || '').trim()
          );
        }

        if (!encabezados.length) {
          return;
        }

        const filas = Array.from(tabla.querySelectorAll('tbody tr'));
        filas.forEach((fila) => {
          Array.from(fila.children).forEach((celda, indice) => {
            if (!(celda instanceof HTMLElement)) {
              return;
            }

            const labelExistente = (celda.getAttribute('data-label') || '').trim();
            if (labelExistente) {
              return;
            }

            const nuevoLabel = encabezados[indice] || `Columna ${indice + 1}`;
            celda.setAttribute('data-label', nuevoLabel);
          });
        });
      });

      this.actualizarBotonesSistema();
    }, 60);
  }

  private actualizarBotonesSistema(): void {
    const contenedor = document.querySelector('.panel__rutas');
    if (!contenedor) {
      return;
    }

    const controles = Array.from(
      contenedor.querySelectorAll('button, a')
    );

    controles.forEach((control) => {
      if (!(control instanceof HTMLElement) || control.closest('.tabla-sin-estilo')) {
        return;
      }

      const texto = this.normalizarTextoAccion(
        [
          control.textContent || '',
          control.getAttribute('title') || '',
          control.getAttribute('aria-label') || ''
        ].join(' ')
      );

      const clases = control.className.toString().toLowerCase();
      const esBotonComun =
        clases.includes('boton') ||
        clases.includes('btn') ||
        clases.includes('formulario__boton');
      const esIcono =
        texto.length <= 2 ||
        clases.includes('boton-icono') ||
        clases.includes('icono-accion');

      let tipo: string | null = null;

      if (/\b(editar|edicion)\b/.test(texto)) {
        tipo = 'accion-editar';
      } else if (/\b(eliminar|quitar|borrar|remover)\b/.test(texto) || texto === 'x') {
        tipo = 'accion-eliminar';
      } else if (/\b(guardar|crear|registrar|agregar|actualizar|emitir|cerrar dia|cerrar mes)\b/.test(texto)) {
        tipo = 'accion-primaria';
      } else if (/\b(buscar|consultar)\b/.test(texto)) {
        tipo = 'accion-buscar';
      } else if (/\b(limpiar|cancelar|cerrar|volver)\b/.test(texto)) {
        tipo = 'accion-secundaria';
      }

      if (!tipo && !esBotonComun) {
        return;
      }

      const clasesEsperadas = new Set<string>(['accion-sistema']);
      if (tipo) {
        clasesEsperadas.add(tipo);
      }
      if (esIcono && (tipo === 'accion-eliminar' || tipo === 'accion-editar')) {
        clasesEsperadas.add('accion-icono');
      }

      this.sincronizarClasesAccion(control, clasesEsperadas);
    });
  }

  private sincronizarClasesAccion(control: HTMLElement, clasesEsperadas: Set<string>): void {
    const clasesAccion = [
      'accion-sistema',
      'accion-editar',
      'accion-eliminar',
      'accion-primaria',
      'accion-secundaria',
      'accion-buscar',
      'accion-icono'
    ];

    const estaSincronizado = clasesAccion.every((clase) =>
      control.classList.contains(clase) === clasesEsperadas.has(clase)
    );

    if (estaSincronizado) {
      return;
    }

    control.classList.remove(...clasesAccion);
    control.classList.add(...Array.from(clasesEsperadas));
  }

  private normalizarTextoAccion(valor: string): string {
    return valor
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  private iniciarObservadorTablas(): void {
    const contenedor = document.querySelector('.panel__rutas');
    if (!contenedor) {
      return;
    }

    this.observadorTablas = new MutationObserver(() => this.actualizarDataLabelsTablas());
    this.observadorTablas.observe(contenedor, {
      childList: true,
      subtree: true
    });
  }
}
