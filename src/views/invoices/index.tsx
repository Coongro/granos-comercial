/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, max-lines-per-function, complexity */
import { getHostReact, getHostUI, usePlugin, useSettings, actions } from '@coongro/plugin-sdk';

const React = getHostReact();
const UI = getHostUI();
const { useState, useEffect, useCallback, useRef, useMemo } = React;

interface Invoice {
  id: string;
  invoiceNumber: number;
  invoiceDate: string;
  clientId: string;
  maniType: string;
  invoiceType: string;
  remito: string;
  kg: number;
  unitPrice: number;
  subtotal: number;
  ivaAmount: number;
  total: number;
  paid: boolean;
  paymentMethod: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

interface FormData {
  invoiceNumber: number;
  invoiceDate: string;
  clientId: string;
  maniType: string;
  invoiceType: string;
  remito: string;
  kg: number;
  unitPrice: number;
  subtotal: number;
  ivaAmount: number;
  total: number;
  paid: boolean;
  paymentMethod: string;
  notes: string;
}

const EMPTY_FORM: FormData = {
  invoiceNumber: 0,
  invoiceDate: '',
  clientId: '',
  maniType: 'confiteria',
  invoiceType: 'fc',
  remito: '',
  kg: 0,
  unitPrice: 0,
  subtotal: 0,
  ivaAmount: 0,
  total: 0,
  paid: false,
  paymentMethod: 'efectivo',
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

const IVA_DEFAULTS: Record<string, number> = { fc: 21, lsg: 0, lsg_industria: 0 };

function getIvaRate(invoiceType: string, settingsValues: Record<string, unknown>): number {
  const key = `granos-comercial.iva.${invoiceType}`;
  const val = settingsValues[key];
  if (val != null && !isNaN(Number(val))) return Number(val) / 100;
  return (IVA_DEFAULTS[invoiceType] ?? 21) / 100;
}

export function InvoicesView() {
  const { toast } = usePlugin();
  const { values: ivaSettings } = useSettings('granos-comercial.iva.');

  // --- Estado principal ---
  const [items, setItems] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Record<string, unknown>[]>([]);

  // --- Busqueda, filtros, sort, paginacion ---
  const [localSearch, setLocalSearch] = useState('');
  const [filterManitype, setFilterManitype] = useState<string>('');
  const [filterInvoicetype, setFilterInvoicetype] = useState<string>('');

  const [sortKey, setSortKey] = useState<string | null>('invoiceNumber');
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | null>('desc');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // --- Modal ---
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Invoice | null>(null);
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
        actions.execute<Invoice[]>('granos-comercial.invoices.list'),
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
    if (filterManitype) result = result.filter((item) => String(item.maniType) === filterManitype);
    if (filterInvoicetype)
      result = result.filter((item) => String(item.invoiceType) === filterInvoicetype);

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
  }, [items, localSearch, filterManitype, filterInvoicetype, sortKey, sortDir]);

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

  const openEdit = useCallback((item: Invoice) => {
    setEditing(item);
    setForm({
      invoiceNumber: item.invoiceNumber ?? 0,
      invoiceDate: item.invoiceDate ?? '',
      clientId: item.clientId ?? '',
      maniType: item.maniType ?? '',
      invoiceType: item.invoiceType ?? '',
      remito: item.remito ?? '',
      kg: item.kg ?? 0,
      unitPrice: item.unitPrice ?? 0,
      subtotal: item.subtotal ?? 0,
      ivaAmount: item.ivaAmount ?? 0,
      total: item.total ?? 0,
      paid: item.paid ?? false,
      paymentMethod: item.paymentMethod ?? '',
      notes: item.notes ?? '',
    });
    setDialogOpen(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (saving) return;
    const rate = getIvaRate(form.invoiceType, ivaSettings);
    const subtotal = form.kg * form.unitPrice;
    const ivaAmount = subtotal * rate;
    const total = subtotal + ivaAmount;
    const payload = {
      invoiceNumber: form.invoiceNumber,
      invoiceDate: form.invoiceDate,
      clientId: form.clientId,
      maniType: form.maniType,
      invoiceType: form.invoiceType,
      remito: form.remito,
      kg: form.kg,
      unitPrice: form.unitPrice,
      subtotal,
      ivaAmount,
      total,
      paid: form.paid,
      paymentMethod: form.paymentMethod,
      notes: form.notes,
    };
    setSaving(true);
    try {
      if (editing) {
        await actions.execute('granos-comercial.invoices.update', {
          id: editing.id,
          data: { ...payload, updatedAt: new Date().toISOString() },
        });
        toast.success('Guardado', 'Factura actualizada correctamente');
      } else {
        await actions.execute('granos-comercial.invoices.create', {
          data: {
            id: crypto.randomUUID(),
            ...payload,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        });
        toast.success('Creado', 'Factura registrada correctamente');
      }
      setDialogOpen(false);
      void fetchItems();
    } catch {
      toast.error('Error', 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }, [editing, saving, form, fetchItems, toast, ivaSettings]);

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
          React.createElement(
            'h1',
            { className: 'text-2xl font-bold text-cg-text' },
            'Facturación'
          ),
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
            key: 'invoiceNumber',
            header: 'Nº Factura',
            sortable: true,
            render: (item: Invoice) => String(item.invoiceNumber ?? 0),
          },
          {
            key: 'invoiceDate',
            header: 'Fecha',
            sortable: true,
            render: (item: Invoice) => formatDate(item.invoiceDate),
            className: 'whitespace-nowrap',
          },
          {
            key: 'clientId',
            header: 'Cliente',
            sortable: true,
            render: (item: Invoice) => getContactsName(item.clientId),
            className: 'max-w-[200px] truncate',
          },
          {
            key: 'maniType',
            header: 'Tipo Maní',
            sortable: true,
            render: (item: Invoice) =>
              item.maniType
                ? React.createElement(UI.Badge, { variant: 'default', size: 'sm' }, item.maniType)
                : '—',
          },
          {
            key: 'invoiceType',
            header: 'Tipo Factura',
            sortable: true,
            render: (item: Invoice) =>
              item.invoiceType
                ? React.createElement(
                    UI.Badge,
                    { variant: 'default', size: 'sm' },
                    item.invoiceType
                  )
                : '—',
          },
          { key: 'remito', header: 'Remito', sortable: true, className: 'max-w-[200px] truncate' },
          {
            key: 'kg',
            header: 'Kg',
            sortable: true,
            render: (item: Invoice) => Number(item.kg ?? 0).toLocaleString('es-AR'),
          },
          {
            key: 'unitPrice',
            header: 'Precio Unit.',
            sortable: true,
            render: (item: Invoice) => Number(item.unitPrice ?? 0).toLocaleString('es-AR'),
          },
          {
            key: 'subtotal',
            header: 'Subtotal',
            sortable: true,
            render: (item: Invoice) => Number(item.subtotal ?? 0).toLocaleString('es-AR'),
          },
          {
            key: 'ivaAmount',
            header: 'IVA',
            sortable: true,
            render: (item: Invoice) => Number(item.ivaAmount ?? 0).toLocaleString('es-AR'),
          },
          {
            key: 'total',
            header: 'Total',
            sortable: true,
            render: (item: Invoice) => Number(item.total ?? 0).toLocaleString('es-AR'),
          },
          {
            key: 'paid',
            header: 'Cobrado',
            sortable: true,
            render: (item: Invoice) => (item.paid ? 'Sí' : 'No'),
          },
          {
            key: 'paymentMethod',
            header: 'Medio de Pago',
            sortable: true,
            render: (item: Invoice) =>
              item.paymentMethod
                ? React.createElement(
                    UI.Badge,
                    { variant: 'default', size: 'sm' },
                    item.paymentMethod
                  )
                : '—',
          },
        ],

        // Busqueda
        searchPlaceholder: 'Buscar...',
        searchValue: localSearch,
        onSearchChange: handleSearchChange,

        // Filtros (ButtonGroup sections)
        filterSections: [
          {
            key: 'maniType',
            label: 'Tipo de Maní',
            value: filterManitype,
            onChange: (v: string) => {
              setFilterManitype(v);
              setPage(1);
            },
            options: [
              { value: 'confiteria', label: 'Confitería' },
              { value: 'industria', label: 'Industria' },
              { value: 'en_caja', label: 'En Caja' },
            ],
          },
          {
            key: 'invoiceType',
            label: 'Tipo de Factura',
            value: filterInvoicetype,
            onChange: (v: string) => {
              setFilterInvoicetype(v);
              setPage(1);
            },
            options: [
              { value: 'fc', label: 'FC' },
              { value: 'lsg', label: 'LSG' },
              { value: 'lsg_industria', label: 'LSG Industria' },
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
            onClick: (item: Invoice) => {
              const text = `Factura Nº ${item.invoiceNumber ?? ''} | Fecha: ${formatDate(item.invoiceDate)} | Cliente: ${getContactsName(item.clientId)} | Tipo: ${item.invoiceType ?? ''} | Kg: ${Number(item.kg ?? 0).toLocaleString('es-AR')} | Total: $${Number(item.total ?? 0).toLocaleString('es-AR')} | Cobrado: ${item.paid ? 'Sí' : 'No'}`;
              void navigator.clipboard.writeText(text);
              toast.success('Copiado', 'Datos copiados al portapapeles');
            },
          },
          {
            label: 'Marcar Cobrada',
            onClick: (item: Invoice) => {
              void actions.execute('granos-comercial.invoices.update', {
                id: item.id,
                data: { paid: true, updatedAt: new Date().toISOString() },
              });
              void fetchItems();
            },
          },
          { label: 'Editar', onClick: openEdit },
        ],

        // Empty state
        emptyState: {
          title: 'Aún no hay facturas registradas',
          description: 'Registrá la primera factura con el botón de arriba.',
          icon: React.createElement(UI.DynamicIcon, { icon: 'Receipt', size: 40, className: 'text-cg-text-muted' }),
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
          title: editing ? 'Editar factura' : 'Nueva factura',
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

            // ── Sección 1: Datos de factura ──
            React.createElement('h3', { className: 'text-sm font-semibold text-cg-text-muted uppercase tracking-wide border-b border-cg-border pb-2' }, 'Datos de factura'),
            React.createElement(
              'div',
              { className: 'grid grid-cols-2 gap-4' },
              React.createElement(
                'div',
                { className: 'flex flex-col gap-1' },
                React.createElement(UI.Label, null, 'Nº Factura *'),
                React.createElement(UI.Input, {
                  type: 'number',
                  value: form.invoiceNumber,
                  onChange: (e: { target: { value: string } }) =>
                    setForm((prev: FormData) => ({ ...prev, invoiceNumber: Number(e.target.value) })),
                })
              ),
              React.createElement(
                'div',
                { className: 'flex flex-col gap-1' },
                React.createElement(UI.Label, null, 'Fecha de Factura *'),
                React.createElement(UI.Input, {
                  type: 'date',
                  value: form.invoiceDate,
                  onChange: (e: { target: { value: string } }) =>
                    setForm((prev: FormData) => ({ ...prev, invoiceDate: e.target.value })),
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
                React.createElement(UI.Label, null, 'Tipo de Maní *'),
                React.createElement(
                  UI.Select,
                  {
                    value: form.maniType,
                    onValueChange: (v: string) =>
                      setForm((prev: FormData) => ({ ...prev, maniType: v })),
                  },
                  React.createElement(UI.SelectItem, { key: 'confiteria', value: 'confiteria' }, 'Confitería'),
                  React.createElement(UI.SelectItem, { key: 'industria', value: 'industria' }, 'Industria'),
                  React.createElement(UI.SelectItem, { key: 'en_caja', value: 'en_caja' }, 'En Caja')
                )
              ),
              React.createElement(
                'div',
                { className: 'flex flex-col gap-1' },
                React.createElement(UI.Label, null, 'Tipo de Factura *'),
                React.createElement(
                  UI.Select,
                  {
                    value: form.invoiceType,
                    onValueChange: (v: string) =>
                      setForm((prev: FormData) => {
                        const rate = getIvaRate(v, ivaSettings);
                        const subtotal = prev.kg * prev.unitPrice;
                        const ivaAmount = subtotal * rate;
                        const total = subtotal + ivaAmount;
                        return { ...prev, invoiceType: v, subtotal, ivaAmount, total };
                      }),
                  },
                  React.createElement(UI.SelectItem, { key: 'fc', value: 'fc' }, 'FC'),
                  React.createElement(UI.SelectItem, { key: 'lsg', value: 'lsg' }, 'LSG'),
                  React.createElement(UI.SelectItem, { key: 'lsg_industria', value: 'lsg_industria' }, 'LSG Industria')
                )
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
              )
            ),

            // ── Sección 2: Importes ──
            React.createElement('h3', { className: 'text-sm font-semibold text-cg-text-muted uppercase tracking-wide border-b border-cg-border pb-2' }, 'Importes'),
            React.createElement(
              'div',
              { className: 'grid grid-cols-2 gap-4' },
              React.createElement(
                'div',
                { className: 'flex flex-col gap-1' },
                React.createElement(UI.Label, null, 'Kg *'),
                React.createElement(UI.Input, {
                  type: 'number',
                  value: form.kg,
                  onChange: (e: { target: { value: string } }) => {
                    const kg = Number(e.target.value);
                    setForm((prev: FormData) => {
                      const rate = getIvaRate(prev.invoiceType, ivaSettings);
                      const subtotal = kg * prev.unitPrice;
                      const ivaAmount = subtotal * rate;
                      const total = subtotal + ivaAmount;
                      return { ...prev, kg, subtotal, ivaAmount, total };
                    });
                  },
                })
              ),
              React.createElement(
                'div',
                { className: 'flex flex-col gap-1' },
                React.createElement(UI.Label, null, 'Precio Unitario *'),
                React.createElement(UI.Input, {
                  type: 'number',
                  value: form.unitPrice,
                  onChange: (e: { target: { value: string } }) => {
                    const unitPrice = Number(e.target.value);
                    setForm((prev: FormData) => {
                      const rate = getIvaRate(prev.invoiceType, ivaSettings);
                      const subtotal = prev.kg * unitPrice;
                      const ivaAmount = subtotal * rate;
                      const total = subtotal + ivaAmount;
                      return { ...prev, unitPrice, subtotal, ivaAmount, total };
                    });
                  },
                })
              ),
              React.createElement(
                'div',
                { className: 'flex flex-col gap-1' },
                React.createElement(UI.Label, null, 'Subtotal'),
                React.createElement(UI.Input, {
                  type: 'number',
                  value: form.subtotal,
                  readOnly: true,
                  className: 'bg-cg-bg-secondary',
                })
              ),
              React.createElement(
                'div',
                { className: 'flex flex-col gap-1' },
                React.createElement(UI.Label, null, 'IVA'),
                React.createElement(UI.Input, {
                  type: 'number',
                  value: form.ivaAmount,
                  readOnly: true,
                  className: 'bg-cg-bg-secondary',
                })
              ),
              React.createElement(
                'div',
                { className: 'flex flex-col gap-1 col-span-2' },
                React.createElement(UI.Label, null, 'Total'),
                React.createElement(UI.Input, {
                  type: 'number',
                  value: form.total,
                  readOnly: true,
                  className: 'bg-cg-bg-secondary font-semibold',
                })
              )
            ),

            // ── Sección 3: Cobro ──
            React.createElement('h3', { className: 'text-sm font-semibold text-cg-text-muted uppercase tracking-wide border-b border-cg-border pb-2' }, 'Cobro'),
            React.createElement(
              'div',
              { className: 'grid grid-cols-2 gap-4' },
              React.createElement(
                'div',
                { className: 'flex flex-col gap-1' },
                React.createElement(UI.Label, null, 'Medio de Pago'),
                React.createElement(
                  UI.Select,
                  {
                    value: form.paymentMethod,
                    onValueChange: (v: string) =>
                      setForm((prev: FormData) => ({ ...prev, paymentMethod: v })),
                  },
                  React.createElement(UI.SelectItem, { key: 'efectivo', value: 'efectivo' }, 'Efectivo'),
                  React.createElement(UI.SelectItem, { key: 'cheque', value: 'cheque' }, 'Cheque'),
                  React.createElement(UI.SelectItem, { key: 'transferencia', value: 'transferencia' }, 'Transferencia')
                )
              ),
              React.createElement(
                'div',
                { className: 'flex items-center gap-2 self-end pb-2' },
                React.createElement(UI.Checkbox, {
                  checked: form.paid,
                  onCheckedChange: (checked: boolean) =>
                    setForm((prev: FormData) => ({ ...prev, paid: checked })),
                }),
                React.createElement(UI.Label, { className: 'cursor-pointer' }, 'Cobrado')
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

    )
  );
}
