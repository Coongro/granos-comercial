/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, max-lines-per-function, complexity */
import { getHostReact, getHostUI, usePlugin, actions } from '@coongro/plugin-sdk';

const React = getHostReact();
const UI = getHostUI();
const { useState, useEffect, useCallback, useRef, useMemo } = React;

interface Order {
  id: string;
  orderDate: string;
  clientId: string;
  packageType: string;
  packageQuantity: number;
  caliber: string;
  product: string;
  loadDate: string;
  delivered: boolean;
  remito: string;
  kg: number;
  pallets: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

interface FormData {
  orderDate: string;
  clientId: string;
  packageType: string;
  packageQuantity: number;
  pallets: number;
  caliber: string;
  product: string;
  loadDate: string;
  kg: number;
  delivered: boolean;
  remito: string;
  notes: string;
}

const EMPTY_FORM: FormData = {
  orderDate: '',
  clientId: '',
  packageType: 'bolsas',
  packageQuantity: 0,
  pallets: 0,
  caliber: 'c_40_50',
  product: 'crudo',
  loadDate: '',
  kg: 0,
  delivered: false,
  remito: '',
  notes: '',
};

const formatDate = (dateStr: string): string => {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('es-AR');
  } catch {
    return dateStr;
  }
};

export function OrdersView() {
  const { toast } = usePlugin();

  // --- Estado principal ---
  const [items, setItems] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Record<string, unknown>[]>([]);

  // --- Busqueda, filtros, sort, paginacion ---
  const [localSearch, setLocalSearch] = useState('');
  const [filterProduct, setFilterProduct] = useState<string>('');
  const [filterCaliber, setFilterCaliber] = useState<string>('');
  const [filterPackagetype, setFilterPackagetype] = useState<string>('');

  const [sortKey, setSortKey] = useState<string | null>('orderDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | null>('desc');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // --- Modal ---
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Order | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Order | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const mountedRef = useRef(false);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // --- Carga de datos ---
  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const [result, ...related] = await Promise.all([
        actions.execute<Order[]>('granos-comercial.orders.list'),
        actions.execute<Record<string, unknown>[]>('contacts.list').catch(() => []),
      ]);
      if (mountedRef.current) {
        setItems(Array.isArray(result) ? result : []);
        if (mountedRef.current)
          setContacts(Array.isArray(related[0]) ? (related[0] as Record<string, unknown>[]) : []);
        setError(null);
      }
    } catch (err) {
      if (mountedRef.current) setError((err as Error).message);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  const getContactsName = (id: string): string => {
    const found = contacts.find((c) => String(c.id) === id);
    return found ? String(found.name ?? id) : id;
  };

  // --- Filtrado y sort local ---
  const filtered = useMemo(() => {
    let result = [...items];
    if (localSearch.trim()) {
      const q = localSearch.toLowerCase();
      result = result.filter(
        (item) =>
          String(item.clientId ?? '')
            .toLowerCase()
            .includes(q) ||
          String(item.remito ?? '')
            .toLowerCase()
            .includes(q)
      );
    }
    if (filterProduct) result = result.filter((item) => String(item.product) === filterProduct);
    if (filterCaliber) result = result.filter((item) => String(item.caliber) === filterCaliber);
    if (filterPackagetype)
      result = result.filter((item) => String(item.packageType) === filterPackagetype);

    if (sortKey && sortDir) {
      result.sort((a, b) => {
        const aRaw = (a as Record<string, unknown>)[sortKey];
        const bRaw = (b as Record<string, unknown>)[sortKey];
        const aNum = Number(aRaw);
        const bNum = Number(bRaw);
        const cmp = !isNaN(aNum) && !isNaN(bNum) ? aNum - bNum : String(aRaw ?? '').localeCompare(String(bRaw ?? ''));
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return result;
  }, [items, localSearch, filterProduct, filterCaliber, filterPackagetype, sortKey, sortDir]);

  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  // --- Handlers ---
  const handleSearchChange = useCallback((value: string) => {
    setLocalSearch(value);
    setPage(1);
  }, []);

  const handleSortChange = useCallback((key: string, direction: 'asc' | 'desc' | null) => {
    setSortKey(direction ? key : null);
    setSortDir(direction);
    setPage(1);
  }, []);

  const openCreate = useCallback(() => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }, []);

  const openEdit = useCallback((item: Order) => {
    setEditing(item);
    setForm({
      orderDate: item.orderDate ?? '',
      clientId: item.clientId ?? '',
      packageType: item.packageType ?? '',
      packageQuantity: item.packageQuantity ?? 0,
      pallets: item.pallets ?? 0,
      caliber: item.caliber ?? '',
      product: item.product ?? '',
      loadDate: item.loadDate ?? '',
      kg: item.kg ?? 0,
      delivered: item.delivered ?? false,
      remito: item.remito ?? '',
      notes: item.notes ?? '',
    });
    setDialogOpen(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (saving) return;
    const payload = {
      orderDate: form.orderDate,
      clientId: form.clientId,
      packageType: form.packageType,
      packageQuantity: form.packageQuantity,
      pallets: form.pallets,
      caliber: form.caliber,
      product: form.product,
      loadDate: form.loadDate,
      kg: form.kg,
      delivered: form.delivered,
      remito: form.remito,
      notes: form.notes,
    };
    setSaving(true);
    try {
      if (editing) {
        await actions.execute('granos-comercial.orders.update', {
          id: editing.id,
          data: { ...payload, updatedAt: new Date().toISOString() },
        });
        toast.success('Guardado', 'Pedido actualizado correctamente');
      } else {
        await actions.execute('granos-comercial.orders.create', {
          data: {
            id: crypto.randomUUID(),
            ...payload,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        });
        toast.success('Creado', 'Pedido registrado correctamente');
      }
      setDialogOpen(false);
      void fetchItems();
    } catch {
      toast.error('Error', 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }, [editing, saving, form, fetchItems, toast]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget || saving) return;
    setSaving(true);
    try {
      await actions.execute('granos-comercial.orders.delete', { id: deleteTarget.id });
      toast.success('Eliminado', 'Pedido eliminado correctamente');
    } catch {
      toast.error('Error', 'No se pudo eliminar');
    } finally {
      setSaving(false);
    }
    setDeleteTarget(null);
    void fetchItems();
  }, [deleteTarget, saving, fetchItems, toast]);

  // --- Boton crear para el header y empty state ---
  const createButton = React.createElement(
    UI.Button,
    { onClick: openCreate },
    React.createElement(UI.DynamicIcon, { icon: 'Plus', size: 16 }),
    'Nuevo'
  );

  return React.createElement(
    'div',
    { className: 'font-inter min-h-screen bg-cg-bg-secondary p-6' },
    React.createElement(
      'div',
      { className: 'max-w-full flex flex-col gap-6' },

      // ── Header ──
      React.createElement(
        'div',
        { className: 'flex items-center justify-between' },
        React.createElement(
          'div',
          null,
          React.createElement('h1', { className: 'text-2xl font-bold text-cg-text' }, 'Pedidos'),
          React.createElement(
            'p',
            { className: 'text-sm text-cg-text-muted mt-1' },
            loading
              ? 'Cargando...'
              : `${filtered.length} registro${filtered.length === 1 ? '' : 's'}`
          )
        ),
        createButton
      ),

      // ── DataTable ──
      React.createElement(UI.DataTable, {
        data: paged,
        loading,
        error,
        onRetry: () => {
          void fetchItems();
        },
        className: 'bg-cg-bg rounded-xl border border-cg-border shadow-sm p-6',

        // Columnas
        columns: [
          {
            key: 'orderDate',
            header: 'Fecha Pedido',
            sortable: true,
            render: (item: Order) => formatDate(item.orderDate),
            className: 'whitespace-nowrap',
          },
          {
            key: 'clientId',
            header: 'Cliente',
            sortable: true,
            render: (item: Order) => getContactsName(item.clientId),
            className: 'max-w-[200px] truncate',
          },
          {
            key: 'packageType',
            header: 'Envase',
            sortable: true,
            render: (item: Order) =>
              item.packageType
                ? React.createElement(
                    UI.Badge,
                    { variant: 'default', size: 'sm' },
                    item.packageType
                  )
                : '—',
          },
          {
            key: 'packageQuantity',
            header: 'Cantidad Envases',
            sortable: true,
            render: (item: Order) => String(item.packageQuantity ?? 0),
          },
          {
            key: 'caliber',
            header: 'Calibre',
            sortable: true,
            render: (item: Order) =>
              item.caliber
                ? React.createElement(UI.Badge, { variant: 'default', size: 'sm' }, item.caliber)
                : '—',
          },
          {
            key: 'product',
            header: 'Producto',
            sortable: true,
            render: (item: Order) =>
              item.product
                ? React.createElement(UI.Badge, { variant: 'default', size: 'sm' }, item.product)
                : '—',
          },
          {
            key: 'loadDate',
            header: 'Fecha Carga',
            sortable: true,
            render: (item: Order) => formatDate(item.loadDate),
            className: 'whitespace-nowrap',
          },
          {
            key: 'delivered',
            header: 'Entregado',
            sortable: true,
            render: (item: Order) => (item.delivered ? 'Sí' : 'No'),
          },
          { key: 'remito', header: 'Remito', sortable: true, className: 'max-w-[200px] truncate' },
          {
            key: 'kg',
            header: 'Kg',
            sortable: true,
            render: (item: Order) => Number(item.kg ?? 0).toLocaleString('es-AR'),
          },
        ],

        // Busqueda
        searchPlaceholder: 'Buscar...',
        searchValue: localSearch,
        onSearchChange: handleSearchChange,

        // Filtros (ButtonGroup sections)
        filterSections: [
          {
            key: 'product',
            label: 'Producto',
            value: filterProduct,
            onChange: (v: string) => {
              setFilterProduct(v);
              setPage(1);
            },
            options: [
              { value: 'crudo', label: 'Crudo' },
              { value: 'tostado', label: 'Tostado' },
              { value: 'tostado_con_sal', label: 'Tostado c/Sal' },
              { value: 'blancheado', label: 'Blancheado' },
            ],
          },
          {
            key: 'caliber',
            label: 'Calibre',
            value: filterCaliber,
            onChange: (v: string) => {
              setFilterCaliber(v);
              setPage(1);
            },
            options: [
              { value: 'vaina', label: 'Vaina' },
              { value: 'c_38_42', label: '38/42' },
              { value: 'c_40_50', label: '40/50' },
              { value: 'c_50_60', label: '50/60' },
              { value: 'c_80_100', label: '80/100' },
              { value: 'split', label: 'Split' },
              { value: 'industry', label: 'Industria' },
              { value: 'pasta', label: 'Pasta' },
              { value: 'grana', label: 'Grana' },
              { value: 'grueso', label: 'Grueso' },
            ],
          },
          {
            key: 'packageType',
            label: 'Tipo de Envase',
            value: filterPackagetype,
            onChange: (v: string) => {
              setFilterPackagetype(v);
              setPage(1);
            },
            options: [
              { value: 'big_bag', label: 'Big Bag' },
              { value: 'bolsas', label: 'Bolsas' },
              { value: 'baldes', label: 'Baldes' },
            ],
          },
        ],

        // Sort
        sortKey,
        sortDirection: sortDir,
        onSortChange: handleSortChange,

        // Paginacion
        pagination: { page, pageSize, total: filtered.length },
        onPageChange: setPage,

        // Acciones por fila
        actions: [
          {
            label: 'Copiar',
            onClick: (item: Order) => {
              const text = `Pedido: ${formatDate(item.orderDate)} | Cliente: ${getContactsName(item.clientId)} | Calibre: ${item.caliber ?? ''} | Producto: ${item.product ?? ''} | Kg: ${Number(item.kg ?? 0).toLocaleString('es-AR')} | Entregado: ${item.delivered ? 'Sí' : 'No'}`;
              void navigator.clipboard.writeText(text);
              toast.success('Copiado', 'Datos copiados al portapapeles');
            },
          },
          {
            label: 'Marcar Entregado',
            onClick: (item: Order) => {
              void actions.execute('granos-comercial.orders.update', {
                id: item.id,
                data: { delivered: true, updatedAt: new Date().toISOString() },
              });
              void fetchItems();
            },
          },
          { label: 'Editar', onClick: openEdit },
          {
            label: 'Eliminar',
            onClick: (item: Order) => setDeleteTarget(item),
            variant: 'destructive' as const,
          },
        ],

        // Empty state
        emptyState: {
          title: 'Aún no hay pedidos registrados',
          description: 'Registrá el primer pedido con el botón de arriba.',
          icon: React.createElement(UI.DynamicIcon, { icon: 'ClipboardList', size: 40, className: 'text-cg-text-muted' }),
          filteredTitle: 'No se encontraron resultados con esos filtros',
        },
      }),

      // ── FormDialog crear/editar ──
      dialogOpen &&
        React.createElement(UI.FormDialog, {
          open: dialogOpen,
          onOpenChange: (open: boolean) => {
            if (!open) setDialogOpen(false);
          },
          title: editing ? 'Editar pedido' : 'Nuevo pedido',
          size: 'lg',
          footer: React.createElement(
            React.Fragment,
            null,
            React.createElement(
              UI.Button,
              { variant: 'outline', onClick: () => setDialogOpen(false) },
              'Cancelar'
            ),
            React.createElement(
              UI.Button,
              {
                onClick: () => {
                  void handleSave();
                },
                disabled: saving,
              },
              saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear'
            )
          ),
          children: React.createElement(
            'div',
            { className: 'flex flex-col gap-6' },

            // ── Sección 1: Datos del pedido ──
            React.createElement('h3', { className: 'text-sm font-semibold text-cg-text-muted uppercase tracking-wide border-b border-cg-border pb-2' }, 'Datos del pedido'),
            React.createElement(
              'div',
              { className: 'grid grid-cols-2 gap-4' },
              React.createElement(
                'div',
                { className: 'flex flex-col gap-1' },
                React.createElement(UI.Label, null, 'Fecha del Pedido *'),
                React.createElement(UI.Input, {
                  type: 'date',
                  value: form.orderDate,
                  onChange: (e: { target: { value: string } }) =>
                    setForm((prev: FormData) => ({ ...prev, orderDate: e.target.value })),
                })
              ),
              React.createElement(
                'div',
                { className: 'flex flex-col gap-1 col-span-2' },
                React.createElement(UI.Label, null, 'Cliente *'),
                React.createElement(
                  UI.Combobox,
                  {
                    value: form.clientId,
                    onValueChange: (v: string) =>
                      setForm((prev: FormData) => ({ ...prev, clientId: v })),
                  },
                  React.createElement(UI.ComboboxChipTrigger, {
                    placeholder: 'Buscar cliente...',
                    renderChip: (val: string, onRemove: () => void) => {
                      const c = contacts.find((x: Record<string, unknown>) => String(x.id) === val);
                      return React.createElement(UI.Chip, { size: 'sm', onRemove }, String(c?.name ?? val));
                    },
                  }),
                  React.createElement(
                    UI.ComboboxContent,
                    null,
                    ...contacts.map((c: Record<string, unknown>) =>
                      React.createElement(
                        UI.ComboboxItem,
                        { key: String(c.id), value: String(c.id) },
                        String(c.name ?? c.id)
                      )
                    ),
                    React.createElement(UI.ComboboxEmpty, null, 'Sin clientes encontrados'),
                    React.createElement(UI.ComboboxCreate, {
                      label: 'Crear cliente "{search}"',
                      onCreate: async (name: string) => {
                        const newId = crypto.randomUUID();
                        try {
                          await actions.execute('contacts.create', {
                            data: {
                              id: newId,
                              name,
                              type: 'client',
                              is_active: true,
                              createdAt: new Date().toISOString(),
                              updatedAt: new Date().toISOString(),
                            },
                          });
                          setForm((prev: FormData) => ({ ...prev, clientId: newId }));
                          await fetchItems();
                          toast.success('Cliente creado', `Se creó "${name}"`);
                        } catch {
                          toast.error('Error', 'No se pudo crear el cliente');
                        }
                      },
                    })
                  )
                )
              ),
              React.createElement(
                'div',
                { className: 'flex flex-col gap-1' },
                React.createElement(UI.Label, null, 'Calibre *'),
                React.createElement(
                  UI.Select,
                  {
                    value: form.caliber,
                    onValueChange: (v: string) =>
                      setForm((prev: FormData) => ({ ...prev, caliber: v })),
                  },
                  React.createElement(UI.SelectItem, { key: 'vaina', value: 'vaina' }, 'Vaina'),
                  React.createElement(UI.SelectItem, { key: 'c_38_42', value: 'c_38_42' }, '38/42'),
                  React.createElement(UI.SelectItem, { key: 'c_40_50', value: 'c_40_50' }, '40/50'),
                  React.createElement(UI.SelectItem, { key: 'c_50_60', value: 'c_50_60' }, '50/60'),
                  React.createElement(UI.SelectItem, { key: 'c_80_100', value: 'c_80_100' }, '80/100'),
                  React.createElement(UI.SelectItem, { key: 'split', value: 'split' }, 'Split'),
                  React.createElement(UI.SelectItem, { key: 'industry', value: 'industry' }, 'Industria'),
                  React.createElement(UI.SelectItem, { key: 'pasta', value: 'pasta' }, 'Pasta'),
                  React.createElement(UI.SelectItem, { key: 'grana', value: 'grana' }, 'Grana'),
                  React.createElement(UI.SelectItem, { key: 'grueso', value: 'grueso' }, 'Grueso')
                )
              ),
              React.createElement(
                'div',
                { className: 'flex flex-col gap-1' },
                React.createElement(UI.Label, null, 'Producto *'),
                React.createElement(
                  UI.Select,
                  {
                    value: form.product,
                    onValueChange: (v: string) =>
                      setForm((prev: FormData) => ({ ...prev, product: v })),
                  },
                  React.createElement(UI.SelectItem, { key: 'crudo', value: 'crudo' }, 'Crudo'),
                  React.createElement(UI.SelectItem, { key: 'tostado', value: 'tostado' }, 'Tostado'),
                  React.createElement(UI.SelectItem, { key: 'tostado_con_sal', value: 'tostado_con_sal' }, 'Tostado c/Sal'),
                  React.createElement(UI.SelectItem, { key: 'blancheado', value: 'blancheado' }, 'Blancheado')
                )
              ),
              React.createElement(
                'div',
                { className: 'flex flex-col gap-1' },
                React.createElement(UI.Label, null, 'Tipo de Envase *'),
                React.createElement(
                  UI.Select,
                  {
                    value: form.packageType,
                    onValueChange: (v: string) =>
                      setForm((prev: FormData) => ({ ...prev, packageType: v })),
                  },
                  React.createElement(UI.SelectItem, { key: 'big_bag', value: 'big_bag' }, 'Big Bag'),
                  React.createElement(UI.SelectItem, { key: 'bolsas', value: 'bolsas' }, 'Bolsas'),
                  React.createElement(UI.SelectItem, { key: 'baldes', value: 'baldes' }, 'Baldes')
                )
              ),
              React.createElement(
                'div',
                { className: 'flex flex-col gap-1' },
                React.createElement(UI.Label, null, 'Cantidad Envases'),
                React.createElement(UI.Input, {
                  type: 'number',
                  value: form.packageQuantity,
                  onChange: (e: { target: { value: string } }) =>
                    setForm((prev: FormData) => ({ ...prev, packageQuantity: Number(e.target.value) })),
                })
              ),
              React.createElement(
                'div',
                { className: 'flex flex-col gap-1' },
                React.createElement(UI.Label, null, 'Pallets'),
                React.createElement(UI.Input, {
                  type: 'number',
                  value: form.pallets,
                  onChange: (e: { target: { value: string } }) =>
                    setForm((prev: FormData) => ({ ...prev, pallets: Number(e.target.value) })),
                })
              ),
              React.createElement(
                'div',
                { className: 'flex flex-col gap-1' },
                React.createElement(UI.Label, null, 'Kg'),
                React.createElement(UI.Input, {
                  type: 'number',
                  value: form.kg,
                  onChange: (e: { target: { value: string } }) =>
                    setForm((prev: FormData) => ({ ...prev, kg: Number(e.target.value) })),
                })
              )
            ),

            // ── Sección 2: Entrega ──
            React.createElement('h3', { className: 'text-sm font-semibold text-cg-text-muted uppercase tracking-wide border-b border-cg-border pb-2' }, 'Entrega'),
            React.createElement(
              'div',
              { className: 'grid grid-cols-2 gap-4' },
              React.createElement(
                'div',
                { className: 'flex flex-col gap-1' },
                React.createElement(UI.Label, null, 'Fecha de Carga'),
                React.createElement(UI.Input, {
                  type: 'date',
                  value: form.loadDate,
                  onChange: (e: { target: { value: string } }) =>
                    setForm((prev: FormData) => ({ ...prev, loadDate: e.target.value })),
                })
              ),
              React.createElement(
                'div',
                { className: 'flex flex-col gap-1' },
                React.createElement(UI.Label, null, 'Remito'),
                React.createElement(UI.Input, {
                  value: form.remito,
                  placeholder: 'Remito...',
                  onChange: (e: { target: { value: string } }) =>
                    setForm((prev: FormData) => ({ ...prev, remito: e.target.value })),
                })
              ),
              React.createElement(
                'div',
                { className: 'flex items-center gap-2 col-span-2' },
                React.createElement(UI.Checkbox, {
                  checked: form.delivered,
                  onCheckedChange: (checked: boolean) =>
                    setForm((prev: FormData) => ({ ...prev, delivered: checked })),
                }),
                React.createElement(UI.Label, { className: 'cursor-pointer' }, 'Entregado')
              )
            ),

            // ── Notas ──
            React.createElement(
              'div',
              { className: 'flex flex-col gap-1' },
              React.createElement(UI.Label, null, 'Notas'),
              React.createElement(UI.Textarea, {
                value: form.notes,
                rows: 2,
                placeholder: 'Notas...',
                onChange: (e: { target: { value: string } }) =>
                  setForm((prev: FormData) => ({ ...prev, notes: e.target.value })),
              })
            )
          ),
        }),

      // ── Dialog confirmar eliminacion ──
      !!deleteTarget &&
        React.createElement(
          UI.Dialog,
          { open: !!deleteTarget, onOpenChange: () => setDeleteTarget(null) },
          React.createElement(
            UI.DialogContent,
            { size: 'sm' },
            React.createElement(
              UI.DialogHeader,
              null,
              React.createElement(UI.DialogTitle, null, 'Confirmar eliminacion')
            ),
            React.createElement(
              UI.DialogBody,
              null,
              React.createElement(
                'p',
                { className: 'text-cg-text' },
                'Vas a eliminar "',
                deleteTarget?.orderDate,
                '". Esta accion no se puede deshacer.'
              )
            ),
            React.createElement(
              UI.DialogFooter,
              null,
              React.createElement(
                UI.Button,
                { variant: 'outline', onClick: () => setDeleteTarget(null) },
                'Cancelar'
              ),
              React.createElement(
                UI.Button,
                {
                  variant: 'destructive',
                  onClick: () => {
                    void handleDelete();
                  },
                  disabled: saving,
                },
                saving ? 'Eliminando...' : 'Eliminar'
              )
            )
          )
        )
    )
  );
}
