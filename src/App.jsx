import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Layers,
  CalendarClock,
  Calendar as CalendarIcon,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldCheck,
  CheckCircle2,
  X,
  SlidersHorizontal,
  Target,
  ShoppingBag,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  Calculator,
  ChevronDown,
  ChevronUp,
  CloudCheck,
  LogOut,
  User,
  Trash2,
  Edit2,
  RotateCcw,
  List,
  Info,
  Check,
  CalendarDays,
  Clock,
  CreditCard,
} from 'lucide-react';
import { supabase } from './supabase';
import Auth from './Auth';

// ─── Helpers de Moneda Mexicana y Agrupación de Miles ───────────────────────
const MES_ACTUAL = new Date().toLocaleString('es-MX', { month: 'long' });
const MES_CAPITALIZADO = MES_ACTUAL.charAt(0).toUpperCase() + MES_ACTUAL.slice(1);
const ANIO_ACTUAL = new Date().getFullYear();
const NUM_MES_ACTUAL = new Date().getMonth();
const HOY_DIA = new Date().getDate();

// Formato de Moneda Mexicana para Mostrar en Tarjetas y Textos
function formatMXN(n, showDecimals = false) {
  const num = typeof n === 'number' ? n : parseFloat(n) || 0;
  return num.toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  });
}

// Agrupar con comas en tiempo real mientras el usuario escribe en los inputs
function formatInputNumber(value) {
  if (!value && value !== 0) return '';
  const clean = value.toString().replace(/[^0-9.]/g, '');
  const parts = clean.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  if (parts.length > 1) {
    return parts[0] + '.' + parts[1].slice(0, 2);
  }
  return parts[0];
}

// Obtener valor numérico real desde un string con comas
function parseInputNumber(value) {
  if (!value) return 0;
  const clean = value.toString().replace(/,/g, '');
  return parseFloat(clean) || 0;
}

// Tipos de apartado
const TIPO_META = {
  objetivo: {
    label: 'Objetivo',
    desc: 'Meta de corto plazo con monto definido.',
    icon: Target,
    color: 'text-sky-400',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/30',
    barColor: 'bg-sky-500',
    completedText: '✓ Meta alcanzada',
    completedClass: 'text-sky-400',
  },
  compra: {
    label: 'Compra planificada',
    desc: 'Ahorro programado para adquirir un bien o herramienta.',
    icon: ShoppingBag,
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/30',
    barColor: 'bg-violet-500',
    completedText: '✓ Ahorro completo',
    completedClass: 'text-violet-400',
  },
  gasto_recurrente: {
    label: 'Gasto Recurrente',
    desc: 'Presupuesto mensual para gastos regulares (ej. terapia, consulta).',
    icon: RefreshCw,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    barColor: 'bg-amber-500',
    completedText: `✓ ${MES_CAPITALIZADO} cubierto`,
    completedClass: 'text-amber-400',
  },
  fondo: {
    label: 'Fondo de Seguridad',
    desc: 'Reserva intocable para emergencias e imprevistos.',
    icon: ShieldCheck,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    barColor: 'bg-emerald-500',
    completedText: '🛡️ Fondo activo',
    completedClass: 'text-emerald-400',
  },
};

const EMPTY_DATA = {
  totalMoney: 0,
  monthlyBaseBurn: 4000,
  apartados: [],
  compromisos: [],
  ingresosVariables: [],
  transactions: [],
};

export default function App() {
  const [session, setSession] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);

  const [data, setData] = useState(EMPTY_DATA);
  const [synced, setSynced] = useState(false);

  const [activeTab, setActiveTab] = useState('hoy'); // 'hoy' | 'apartados' | 'futuro' | 'calendario'

  // Modales
  const [isModalOpen, setIsModalOpen] = useState(false); // Modal Registro Rápido / Nuevo Movimiento
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isTxHistoryOpen, setIsTxHistoryOpen] = useState(false);
  const [isBaseBurnModalOpen, setIsBaseBurnModalOpen] = useState(false);

  // Modal Apartado
  const [isApartadoModalOpen, setIsApartadoModalOpen] = useState(false);
  const [editingApartadoId, setEditingApartadoId] = useState(null);
  const [apName, setApName] = useState('');
  const [apTarget, setApTarget] = useState('');
  const [apCategory, setApCategory] = useState('General');
  const [apType, setApType] = useState('objetivo');

  // Modal Fondeo (Abonar / Retirar)
  const [isFundModalOpen, setIsFundModalOpen] = useState(false);
  const [fundingApartado, setFundingApartado] = useState(null);
  const [fundAction, setFundAction] = useState('abonar');
  const [fundAmount, setFundAmount] = useState('');
  const [fundError, setFundError] = useState('');

  // Modal Ingreso Unificado (Crear / Editar / Proyectar)
  const [isIngresoModalOpen, setIsIngresoModalOpen] = useState(false);
  const [editingIngresoId, setEditingIngresoId] = useState(null);
  const [ingName, setIngName] = useState('');
  const [ingAmount, setIngAmount] = useState('');
  const [ingCertainty, setIngCertainty] = useState('posible');
  const [ingDate, setIngDate] = useState(new Date().toISOString().split('T')[0]);
  const [ingPeriod, setIngPeriod] = useState('unico');

  // Modal Compromiso (Crear / Editar)
  const [isCompromisoModalOpen, setIsCompromisoModalOpen] = useState(false);
  const [editingCompromisoId, setEditingCompromisoId] = useState(null);
  const [compName, setCompName] = useState('');
  const [compAmount, setCompAmount] = useState('');
  const [compDueDay, setCompDueDay] = useState('15');
  const [compCurrentMonth, setCompCurrentMonth] = useState('1');
  const [compTotalMonths, setCompTotalMonths] = useState('12');

  // Modal Registro Rápido Movimiento (+)
  const [txType, setTxType] = useState('gasto');
  const [txAmount, setTxAmount] = useState('');
  const [txConcept, setTxConcept] = useState('');
  const [txOrigin, setTxOrigin] = useState('disponible');
  const [txCertainty, setTxCertainty] = useState('confirmado');
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [txPeriod, setTxPeriod] = useState('unico');

  // Modal Ajuste Saldo
  const [realBalance, setRealBalance] = useState('');
  const [monthlyBurnInput, setMonthlyBurnInput] = useState('4,000');

  // Escenario manual
  const [scenarioInput, setScenarioInput] = useState('');
  const [showScenarioInput, setShowScenarioInput] = useState(false);

  // Guía de Certeza Colapsable
  const [showCertaintyGuide, setShowCertaintyGuide] = useState(false);

  // 1. Verificar Sesión de Usuario
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthChecking(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setAuthChecking(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Cargar datos específicos del usuario desde Supabase
  useEffect(() => {
    if (!session?.user) return;
    loadUserData();
  }, [session]);

  async function loadUserData() {
    if (!session?.user) return;
    const uid = session.user.id;
    try {
      const [sRes, aRes, cRes, iRes, tRes] = await Promise.all([
        supabase.from('settings').select('*').eq('user_id', uid),
        supabase.from('apartados').select('*').eq('user_id', uid).order('created_at', { ascending: true }),
        supabase.from('compromisos').select('*').eq('user_id', uid).order('created_at', { ascending: true }),
        supabase.from('ingresos_variables').select('*').eq('user_id', uid).order('created_at', { ascending: true }),
        supabase.from('transactions').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
      ]);

      const mainCfg = sRes.data?.find((s) => s.key === 'main_config')?.value || {};
      
      setData({
        totalMoney: Number(mainCfg.totalMoney) || 0,
        monthlyBaseBurn: Number(mainCfg.monthlyBaseBurn) >= 0 ? Number(mainCfg.monthlyBaseBurn) : 4000,
        apartados: (aRes.data || []).map((a) => ({
          id: a.id,
          name: a.name,
          current: Number(a.current) || 0,
          target: Number(a.target) || 0,
          category: a.category || 'General',
          type: a.type || 'objetivo',
          period: a.period || 'mensual',
        })),
        compromisos: (cRes.data || []).map((c) => ({
          id: c.id,
          name: c.name,
          amount: Number(c.amount) || 0,
          dueDay: Number(c.due_day) || 1,
          currentMonth: Number(c.current_month) || 1,
          totalMonths: Number(c.total_months) || 1,
        })),
        ingresosVariables: (iRes.data || []).map((i) => ({
          id: i.id,
          name: i.name,
          amount: Number(i.amount) || 0,
          certainty: i.certainty || 'posible',
          date: i.date || new Date().toISOString().split('T')[0],
          period: i.period || 'unico',
          isRecurring: i.is_recurring || false,
        })),
        transactions: (tRes.data || []).map((t) => ({
          id: t.id,
          type: t.type,
          amount: Number(t.amount) || 0,
          concept: t.concept,
          date: t.date,
          origin: t.origin,
        })),
      });
      setSynced(true);
    } catch (e) {
      console.error('Error al cargar datos del usuario:', e);
    }
  }

  // Cargar plantilla demo
  async function seedTemplateData() {
    if (!session?.user) return;
    const uid = session.user.id;
    try {
      const hoyISO = new Date().toISOString().split('T')[0];
      const proximaSemanaISO = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0];
      const finMesISO = new Date(ANIO_ACTUAL, NUM_MES_ACTUAL + 1, 0).toISOString().split('T')[0];

      await supabase.from('settings').upsert({ user_id: uid, key: 'main_config', value: { totalMoney: 25000, monthlyBaseBurn: 4000 } });
      await supabase.from('apartados').insert([
        { id: `ap1_${Date.now()}_1`, user_id: uid, name: 'Renovación Licencia', current: 2500, target: 2500, category: 'Trámites', type: 'objetivo' },
        { id: `ap2_${Date.now()}_2`, user_id: uid, name: 'Laptop Estudio', current: 6000, target: 12000, category: 'Educación', type: 'compra' },
        { id: `ap3_${Date.now()}_3`, user_id: uid, name: 'Terapia', current: 1500, target: 1500, category: 'Salud', type: 'gasto_recurrente', period: 'mensual' },
        { id: `ap4_${Date.now()}_4`, user_id: uid, name: 'Fondo de Emergencia', current: 5000, target: 5000, category: 'Seguridad', type: 'fondo' },
      ]);
      await supabase.from('compromisos').insert([
        { id: `c1_${Date.now()}_1`, user_id: uid, name: 'Laptop (MSI)', amount: 1000, due_day: 15, current_month: 2, total_months: 12 },
        { id: `c2_${Date.now()}_2`, user_id: uid, name: 'Pago mínimo / Servicios', amount: 800, due_day: 20, current_month: 1, total_months: 1 },
      ]);
      await supabase.from('ingresos_variables').insert([
        { id: `i1_${Date.now()}_1`, user_id: uid, name: 'Viaje de Flete (Compañero)', amount: 2500, certainty: 'esperado', date: proximaSemanaISO, period: 'unico', is_recurring: false },
        { id: `i2_${Date.now()}_2`, user_id: uid, name: 'Empleo Logística (Entrevista)', amount: 12000, certainty: 'posible', date: finMesISO, period: 'mensual', is_recurring: true },
      ]);
      await supabase.from('transactions').insert([
        { id: `t1_${Date.now()}_1`, user_id: uid, type: 'ingreso', amount: 25000, concept: 'Fondo inicial recibido', date: hoyISO, origin: 'Confirmado' },
      ]);
      await loadUserData();
    } catch (e) {
      console.error('Error al sembrar plantilla:', e);
    }
  }

  // Vaciar todos los datos
  async function handleResetUserData() {
    if (!session?.user) return;
    if (!window.confirm('¿Estás seguro de vaciar todos tus datos para empezar en cero? Esta acción borrará tus movimientos, apartados e ingresos.')) return;
    
    const uid = session.user.id;
    try {
      await Promise.all([
        supabase.from('settings').delete().eq('user_id', uid),
        supabase.from('apartados').delete().eq('user_id', uid),
        supabase.from('compromisos').delete().eq('user_id', uid),
        supabase.from('ingresos_variables').delete().eq('user_id', uid),
        supabase.from('transactions').delete().eq('user_id', uid),
      ]);
      setData(EMPTY_DATA);
    } catch (e) {
      console.error('Error al resetear datos:', e);
    }
  }

  const handleSignOut = () => {
    supabase.auth.signOut();
  };

  if (authChecking) {
    return (
      <div className="flex justify-center items-center bg-slate-900 min-h-screen text-slate-100 font-sans">
        <div className="flex items-center gap-3 text-slate-400 text-sm">
          <div className="w-5 h-5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
          <span>Verificando sesión...</span>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Auth onAuthSuccess={(sess) => setSession(sess)} />;
  }

  // ─── Cálculos Clave del Sistema ──────────────────────────────────────────
  const totalApartados = data.apartados.reduce((s, a) => s + a.current, 0);
  const totalCompromisosMes = data.compromisos.reduce((s, c) => s + c.amount, 0);
  const disponibleLibre = Math.max(0, data.totalMoney - totalApartados - totalCompromisosMes);

  const gastoSemanalEstimado = (data.monthlyBaseBurn + totalCompromisosMes) / 4;
  const semanasRunway = gastoSemanalEstimado > 0 ? Math.floor(data.totalMoney / gastoSemanalEstimado) : 0;

  const ingresoSeguro = data.ingresosVariables.filter((i) => i.certainty === 'confirmado').reduce((s, i) => s + i.amount, 0);
  const ingresoEsperado = data.ingresosVariables.filter((i) => i.certainty === 'esperado').reduce((s, i) => s + i.amount, 0);
  const ingresoPosible = data.ingresosVariables.filter((i) => i.certainty === 'posible').reduce((s, i) => s + i.amount, 0);
  const ingresoTotal = ingresoSeguro + ingresoEsperado + ingresoPosible;

  const gastosRecurrentesApartados = data.apartados
    .filter((a) => a.type === 'gasto_recurrente')
    .reduce((s, a) => s + a.target, 0);
  const minimoMensual = data.monthlyBaseBurn + totalCompromisosMes + gastosRecurrentesApartados;

  const totalObjetivosEnProceso = data.apartados
    .filter((a) => a.type === 'objetivo' || a.type === 'compra')
    .reduce((s, a) => s + Math.max(0, a.target - a.current), 0);

  let semaforo = 'riesgo';
  if (ingresoSeguro >= minimoMensual + totalObjetivosEnProceso / 12) {
    semaforo = 'estable';
  } else if (ingresoSeguro >= minimoMensual) {
    semaforo = 'transicion';
  }
  if (ingresoSeguro > minimoMensual * 1.4 && totalObjetivosEnProceso === 0) {
    semaforo = 'progreso';
  }

  const SEMAFORO_CONFIG = {
    riesgo: { emoji: '🔴', label: 'Riesgo', desc: 'Tus ingresos seguros no cubren tu supervivencia básica.', color: 'text-red-400', dot: 'bg-red-400' },
    transicion: { emoji: '🟡', label: 'Transición', desc: 'Cubres lo básico, pero tus metas aún dependen de ingresos variables.', color: 'text-amber-400', dot: 'bg-amber-400' },
    estable: { emoji: '🟢', label: 'Estable', desc: 'Tus ingresos seguros cubren tu supervivencia y compromisos.', color: 'text-emerald-400', dot: 'bg-emerald-400' },
    progreso: { emoji: '🔵', label: 'Progreso', desc: 'Tienes margen holgado para avanzar en tus metas.', color: 'text-sky-400', dot: 'bg-sky-400' },
  };
  const sc = SEMAFORO_CONFIG[semaforo] || SEMAFORO_CONFIG.riesgo;

  const scenarioAmount = parseInputNumber(scenarioInput);
  const scenarioMargen = scenarioAmount - minimoMensual;

  // ─── HANDLERS UNIFICADOS ─────────────────────────────────────────────────

  // 1. Apartados
  function handleOpenNewApartado() {
    setEditingApartadoId(null);
    setApName('');
    setApTarget('');
    setApCategory('General');
    setApType('objetivo');
    setIsApartadoModalOpen(true);
  }

  function handleOpenEditApartado(ap) {
    setEditingApartadoId(ap.id);
    setApName(ap.name);
    setApTarget(formatInputNumber(ap.target));
    setApCategory(ap.category || 'General');
    setApType(ap.type || 'objetivo');
    setIsApartadoModalOpen(true);
  }

  async function handleSaveApartado(e) {
    e.preventDefault();
    if (!session?.user) return;
    const uid = session.user.id;
    const targetNum = parseInputNumber(apTarget);
    if (targetNum <= 0) return;

    if (editingApartadoId) {
      const targetAp = data.apartados.find(a => a.id === editingApartadoId);
      const updatedAp = { name: apName, target: targetNum, current: targetAp?.current || 0, category: apCategory, type: apType };
      setData((prev) => ({
        ...prev,
        apartados: prev.apartados.map((a) => (a.id === editingApartadoId ? { ...a, ...updatedAp } : a)),
      }));
      await supabase.from('apartados').update(updatedAp).eq('id', editingApartadoId).eq('user_id', uid);
    } else {
      const newAp = {
        id: `ap_${Date.now()}`,
        user_id: uid,
        name: apName,
        target: targetNum,
        current: 0,
        category: apCategory,
        type: apType,
        period: apType === 'gasto_recurrente' ? 'mensual' : null,
      };
      setData((prev) => ({
        ...prev,
        apartados: [...prev.apartados, newAp],
      }));
      await supabase.from('apartados').insert(newAp);
    }
    setIsApartadoModalOpen(false);
  }

  async function handleDeleteApartado(id) {
    const ap = data.apartados.find(a => a.id === id);
    if (!ap) return;

    if (ap.current > 0) {
      if (!window.confirm(`Este apartado tiene ${formatMXN(ap.current)} asignados. Al eliminarlo, estos fondos regresarán a tu Disponible Libre. ¿Deseas continuar?`)) return;
    } else {
      if (!window.confirm(`¿Eliminar el apartado "${ap.name}"?`)) return;
    }

    const uid = session?.user?.id;
    setData((prev) => ({
      ...prev,
      apartados: prev.apartados.filter((a) => a.id !== id),
    }));
    await supabase.from('apartados').delete().eq('id', id).eq('user_id', uid);
  }

  // 2. Fondeo: Abonar o Retirar
  function handleOpenFunding(ap, action = 'abonar') {
    setFundingApartado(ap);
    setFundAction(action);
    setFundAmount('');
    setFundError('');
    setIsFundModalOpen(true);
  }

  async function handleExecuteFunding(e) {
    e.preventDefault();
    if (!fundingApartado || !session?.user) return;
    const uid = session.user.id;
    const amt = parseInputNumber(fundAmount);

    if (amt <= 0) {
      setFundError('Ingresa un monto válido mayor a $0.');
      return;
    }

    if (fundAction === 'abonar') {
      if (amt > disponibleLibre) {
        setFundError(`No tienes suficiente dinero libre. Tu disponible es ${formatMXN(disponibleLibre)}.`);
        return;
      }
      const newCurrent = fundingApartado.current + amt;
      setData((prev) => ({
        ...prev,
        apartados: prev.apartados.map((a) => (a.id === fundingApartado.id ? { ...a, current: newCurrent } : a)),
      }));
      await supabase.from('apartados').update({ current: newCurrent }).eq('id', fundingApartado.id).eq('user_id', uid);
    } else {
      if (amt > fundingApartado.current) {
        setFundError(`Solo puedes retirar hasta ${formatMXN(fundingApartado.current)} acumulados.`);
        return;
      }
      const newCurrent = Math.max(0, fundingApartado.current - amt);
      setData((prev) => ({
        ...prev,
        apartados: prev.apartados.map((a) => (a.id === fundingApartado.id ? { ...a, current: newCurrent } : a)),
      }));
      await supabase.from('apartados').update({ current: newCurrent }).eq('id', fundingApartado.id).eq('user_id', uid);
    }

    setIsFundModalOpen(false);
  }

  // 3. Liquidar / Usar Fondo de Apartado
  async function handleUseApartado(ap) {
    if (ap.current <= 0) return;
    if (!window.confirm(`¿Deseas liquidar el gasto de ${formatMXN(ap.current)} para "${ap.name}"? Se descontará de tu dinero y se registrará en tu historial.`)) return;

    const uid = session.user.id;
    const newTotal = Math.max(0, data.totalMoney - ap.current);
    const newTx = {
      id: `tx_${Date.now()}`,
      user_id: uid,
      type: 'gasto',
      amount: ap.current,
      concept: `Liquidación: ${ap.name}`,
      date: new Date().toISOString().split('T')[0],
      origin: `Apartado (${TIPO_META[ap.type]?.label || 'Meta'})`,
    };

    setData((prev) => ({
      ...prev,
      totalMoney: newTotal,
      apartados: prev.apartados.map((a) => (a.id === ap.id ? { ...a, current: 0 } : a)),
      transactions: [newTx, ...prev.transactions],
    }));

    await supabase.from('transactions').insert(newTx);
    await supabase.from('apartados').update({ current: 0 }).eq('id', ap.id).eq('user_id', uid);
    await supabase.from('settings').upsert({ user_id: uid, key: 'main_config', value: { totalMoney: newTotal, monthlyBaseBurn: data.monthlyBaseBurn } });
  }

  // 4. Ingresos (Lógica Unificada: Seguro entra a dinero real + se queda en el Embudo)
  function handleOpenNewIngreso() {
    setEditingIngresoId(null);
    setIngName('');
    setIngAmount('');
    setIngCertainty('posible');
    setIngDate(new Date().toISOString().split('T')[0]);
    setIngPeriod('unico');
    setIsIngresoModalOpen(true);
  }

  function handleOpenEditIngreso(ing) {
    setEditingIngresoId(ing.id);
    setIngName(ing.name);
    setIngAmount(formatInputNumber(ing.amount));
    setIngCertainty(ing.certainty);
    setIngDate(ing.date || new Date().toISOString().split('T')[0]);
    setIngPeriod(ing.period || 'unico');
    setIsIngresoModalOpen(true);
  }

  async function handleSaveIngreso(e) {
    e.preventDefault();
    if (!session?.user) return;
    const uid = session.user.id;
    const amtNum = parseInputNumber(ingAmount);
    if (amtNum <= 0) return;

    const isRec = ingPeriod !== 'unico';

    if (editingIngresoId) {
      const updatedIng = { name: ingName, amount: amtNum, certainty: ingCertainty, date: ingDate, period: ingPeriod, is_recurring: isRec };
      setData((prev) => ({
        ...prev,
        ingresosVariables: prev.ingresosVariables.map((i) => (i.id === editingIngresoId ? { ...i, ...updatedIng, isRecurring: isRec } : i)),
      }));
      await supabase.from('ingresos_variables').update(updatedIng).eq('id', editingIngresoId).eq('user_id', uid);
    } else {
      const newIngId = `ing_${Date.now()}`;
      const newIng = {
        id: newIngId,
        user_id: uid,
        name: ingName,
        amount: amtNum,
        certainty: ingCertainty,
        date: ingDate,
        period: ingPeriod,
        is_recurring: isRec,
      };

      // Si se crea como CONFIRMADO / SEGURO, entra de una vez al dinero real en mano
      let newTotal = data.totalMoney;
      let newTxList = data.transactions;

      if (ingCertainty === 'confirmado') {
        newTotal = data.totalMoney + amtNum;
        const newTx = {
          id: `tx_${Date.now()}`,
          user_id: uid,
          type: 'ingreso',
          amount: amtNum,
          concept: `Ingreso: ${ingName}`,
          date: ingDate,
          origin: 'Confirmado',
        };
        newTxList = [newTx, ...data.transactions];
        await supabase.from('transactions').insert(newTx);
        await supabase.from('settings').upsert({ user_id: uid, key: 'main_config', value: { totalMoney: newTotal, monthlyBaseBurn: data.monthlyBaseBurn } });
      }

      setData((prev) => ({
        ...prev,
        totalMoney: newTotal,
        transactions: newTxList,
        ingresosVariables: [...prev.ingresosVariables, { ...newIng, isRecurring: isRec }],
      }));

      await supabase.from('ingresos_variables').insert(newIng);
    }
    setIsIngresoModalOpen(false);
  }

  // Botón "¡Ya cobré!": Pasa de Esperado/Posible a Confirmado, suma al saldo y SE MANTIENE en el Embudo
  async function handleConfirmPayment(ing) {
    if (!session?.user) return;
    if (!window.confirm(`¿Confirmar que ya recibiste ${formatMXN(ing.amount)} por "${ing.name}"? Este dinero se sumará a tu saldo disponible real y pasará a la sección de Ingreso Seguro.`)) return;

    const uid = session.user.id;
    const newTotal = data.totalMoney + ing.amount;
    const hoyStr = new Date().toISOString().split('T')[0];

    const newTx = {
      id: `tx_${Date.now()}`,
      user_id: uid,
      type: 'ingreso',
      amount: ing.amount,
      concept: `Cobro: ${ing.name}`,
      date: hoyStr,
      origin: 'Confirmado',
    };

    // Actualizar certeza a confirmado para que suba a la sección de Ingreso Seguro
    const updatedIngresos = data.ingresosVariables.map((i) =>
      i.id === ing.id ? { ...i, certainty: 'confirmado', date: hoyStr } : i
    );

    setData((prev) => ({
      ...prev,
      totalMoney: newTotal,
      ingresosVariables: updatedIngresos,
      transactions: [newTx, ...prev.transactions],
    }));

    await supabase.from('transactions').insert(newTx);
    await supabase.from('settings').upsert({ user_id: uid, key: 'main_config', value: { totalMoney: newTotal, monthlyBaseBurn: data.monthlyBaseBurn } });
    await supabase.from('ingresos_variables').update({ certainty: 'confirmado', date: hoyStr }).eq('id', ing.id).eq('user_id', uid);
  }

  async function handleDeleteIngreso(id) {
    if (!window.confirm('¿Eliminar este ingreso?')) return;
    const uid = session?.user?.id;
    setData((prev) => ({
      ...prev,
      ingresosVariables: prev.ingresosVariables.filter((i) => i.id !== id),
    }));
    await supabase.from('ingresos_variables').delete().eq('id', id).eq('user_id', uid);
  }

  // 5. Compromisos a Plazos
  function handleOpenNewCompromiso() {
    setEditingCompromisoId(null);
    setCompName('');
    setCompAmount('');
    setCompDueDay('15');
    setCompCurrentMonth('1');
    setCompTotalMonths('12');
    setIsCompromisoModalOpen(true);
  }

  function handleOpenEditCompromiso(c) {
    setEditingCompromisoId(c.id);
    setCompName(c.name);
    setCompAmount(formatInputNumber(c.amount));
    setCompDueDay(c.dueDay.toString());
    setCompCurrentMonth(c.currentMonth.toString());
    setCompTotalMonths(c.totalMonths.toString());
    setIsCompromisoModalOpen(true);
  }

  async function handleSaveCompromiso(e) {
    e.preventDefault();
    if (!session?.user) return;
    const uid = session.user.id;
    const amtNum = parseInputNumber(compAmount);
    const dueNum = parseInt(compDueDay) || 1;
    const currMNum = parseInt(compCurrentMonth) || 1;
    const totMNum = parseInt(compTotalMonths) || 1;
    if (amtNum <= 0) return;

    if (editingCompromisoId) {
      const updatedComp = { name: compName, amount: amtNum, due_day: dueNum, current_month: currMNum, total_months: totMNum };
      setData((prev) => ({
        ...prev,
        compromisos: prev.compromisos.map((c) => (c.id === editingCompromisoId ? { ...c, name: compName, amount: amtNum, dueDay: dueNum, currentMonth: currMNum, totalMonths: totMNum } : c)),
      }));
      await supabase.from('compromisos').update(updatedComp).eq('id', editingCompromisoId).eq('user_id', uid);
    } else {
      const newComp = {
        id: `c_${Date.now()}`,
        user_id: uid,
        name: compName,
        amount: amtNum,
        due_day: dueNum,
        current_month: currMNum,
        total_months: totMNum,
      };
      setData((prev) => ({
        ...prev,
        compromisos: [...prev.compromisos, { id: newComp.id, name: compName, amount: amtNum, dueDay: dueNum, currentMonth: currMNum, totalMonths: totMNum }],
      }));
      await supabase.from('compromisos').insert(newComp);
    }
    setIsCompromisoModalOpen(false);
  }

  // Acción: Marcar Mensualidad Pagada de Compromiso
  async function handlePayCompromisoMonth(c) {
    if (!session?.user) return;
    if (!window.confirm(`¿Registrar el pago de ${formatMXN(c.amount)} del mes ${c.currentMonth} para "${c.name}"? Se registrará en tu historial de gastos.`)) return;

    const uid = session.user.id;
    const newTotal = Math.max(0, data.totalMoney - c.amount);
    const hoyStr = new Date().toISOString().split('T')[0];

    const newTx = {
      id: `tx_${Date.now()}`,
      user_id: uid,
      type: 'gasto',
      amount: c.amount,
      concept: `Pago compromiso: ${c.name} (${c.currentMonth}/${c.totalMonths})`,
      date: hoyStr,
      origin: 'Compromiso a plazos',
    };

    const nextMonth = c.currentMonth + 1;
    const isCompleted = nextMonth > c.totalMonths;

    const updatedComps = isCompleted
      ? data.compromisos.filter((item) => item.id !== c.id)
      : data.compromisos.map((item) => (item.id === c.id ? { ...item, currentMonth: nextMonth } : item));

    setData((prev) => ({
      ...prev,
      totalMoney: newTotal,
      compromisos: updatedComps,
      transactions: [newTx, ...prev.transactions],
    }));

    await supabase.from('transactions').insert(newTx);
    await supabase.from('settings').upsert({ user_id: uid, key: 'main_config', value: { totalMoney: newTotal, monthlyBaseBurn: data.monthlyBaseBurn } });

    if (isCompleted) {
      await supabase.from('compromisos').delete().eq('id', c.id).eq('user_id', uid);
    } else {
      await supabase.from('compromisos').update({ current_month: nextMonth }).eq('id', c.id).eq('user_id', uid);
    }
  }

  async function handleDeleteCompromiso(id) {
    if (!window.confirm('¿Eliminar este compromiso?')) return;
    const uid = session?.user?.id;
    setData((prev) => ({
      ...prev,
      compromisos: prev.compromisos.filter((c) => c.id !== id),
    }));
    await supabase.from('compromisos').delete().eq('id', id).eq('user_id', uid);
  }

  // 6. Transacciones (Eliminar / Revertir)
  async function handleDeleteTransaction(tx) {
    if (!window.confirm(`¿Eliminar la transacción "${tx.concept}"?`)) return;
    const uid = session?.user?.id;

    let newTotalMoney = data.totalMoney;
    if (tx.type === 'gasto') {
      newTotalMoney += tx.amount;
    } else if (tx.type === 'ingreso') {
      newTotalMoney = Math.max(0, newTotalMoney - tx.amount);
    }

    setData((prev) => ({
      ...prev,
      totalMoney: newTotalMoney,
      transactions: prev.transactions.filter((t) => t.id !== tx.id),
    }));

    await supabase.from('transactions').delete().eq('id', tx.id).eq('user_id', uid);
    await supabase.from('settings').upsert({ user_id: uid, key: 'main_config', value: { totalMoney: newTotalMoney, monthlyBaseBurn: data.monthlyBaseBurn } });
  }

  // 7. Registro Rápido Modal (+)
  const handleSaveQuickTransaction = async (e) => {
    e.preventDefault();
    const amt = parseInputNumber(txAmount);
    if (amt <= 0 || !session?.user) return;

    const uid = session.user.id;
    const newTxId = `tx_${Date.now()}`;
    const dateStr = txDate || new Date().toISOString().split('T')[0];

    if (txType === 'gasto') {
      if (txOrigin === 'disponible') {
        const newTotal = Math.max(0, data.totalMoney - amt);
        const newTx = { id: newTxId, user_id: uid, type: 'gasto', amount: amt, concept: txConcept || 'Gasto libre', date: dateStr, origin: 'Disponible Libre' };
        
        setData((prev) => ({
          ...prev,
          totalMoney: newTotal,
          transactions: [newTx, ...prev.transactions],
        }));

        supabase.from('transactions').insert(newTx).catch(console.error);
        supabase.from('settings').upsert({ user_id: uid, key: 'main_config', value: { totalMoney: newTotal, monthlyBaseBurn: data.monthlyBaseBurn } }).catch(console.error);
      } else {
        const newTotal = Math.max(0, data.totalMoney - amt);
        const targetAp = data.apartados.find((a) => a.id === txOrigin);
        const newCurrent = Math.max(0, (targetAp?.current || 0) - amt);
        const newTx = { id: newTxId, user_id: uid, type: 'gasto', amount: amt, concept: txConcept || 'Gasto de apartado', date: dateStr, origin: `Apartado: ${targetAp?.name || ''}` };

        setData((prev) => ({
          ...prev,
          totalMoney: newTotal,
          apartados: prev.apartados.map((ap) => (ap.id === txOrigin ? { ...ap, current: newCurrent } : ap)),
          transactions: [newTx, ...prev.transactions],
        }));

        supabase.from('transactions').insert(newTx).catch(console.error);
        supabase.from('apartados').update({ current: newCurrent }).eq('id', txOrigin).eq('user_id', uid).catch(console.error);
        supabase.from('settings').upsert({ user_id: uid, key: 'main_config', value: { totalMoney: newTotal, monthlyBaseBurn: data.monthlyBaseBurn } }).catch(console.error);
      }
    } else {
      // Ingreso
      const isRec = txPeriod !== 'unico';
      const newIng = {
        id: `ing_${Date.now()}`,
        user_id: uid,
        name: txConcept || 'Ingreso registrado',
        amount: amt,
        certainty: txCertainty,
        date: dateStr,
        period: txPeriod,
        is_recurring: isRec,
      };

      let newTotal = data.totalMoney;
      let newTxList = data.transactions;

      if (txCertainty === 'confirmado') {
        newTotal = data.totalMoney + amt;
        const newTx = { id: newTxId, user_id: uid, type: 'ingreso', amount: amt, concept: txConcept || 'Ingreso', date: dateStr, origin: 'Confirmado' };
        newTxList = [newTx, ...data.transactions];
        await supabase.from('transactions').insert(newTx);
        await supabase.from('settings').upsert({ user_id: uid, key: 'main_config', value: { totalMoney: newTotal, monthlyBaseBurn: data.monthlyBaseBurn } });
      }

      setData((prev) => ({
        ...prev,
        totalMoney: newTotal,
        transactions: newTxList,
        ingresosVariables: [...prev.ingresosVariables, { ...newIng, isRecurring: isRec }],
      }));

      await supabase.from('ingresos_variables').insert(newIng);
    }

    setTxAmount('');
    setTxConcept('');
    setIsModalOpen(false);
  };

  // 8. Ajustar Base de Supervivencia
  const handleSaveBaseBurn = async (e) => {
    e.preventDefault();
    if (!session?.user) return;
    const uid = session.user.id;
    const newBurn = parseInputNumber(monthlyBurnInput);
    if (newBurn >= 0) {
      setData((prev) => ({ ...prev, monthlyBaseBurn: newBurn }));
      await supabase.from('settings').upsert({ user_id: uid, key: 'main_config', value: { totalMoney: data.totalMoney, monthlyBaseBurn: newBurn } });
    }
    setIsBaseBurnModalOpen(false);
  };

  // 9. Ajustar Saldo Real
  const handleAdjustBalance = async (e) => {
    e.preventDefault();
    if (!session?.user) return;
    const uid = session.user.id;
    const newBal = parseInputNumber(realBalance);

    if (newBal >= 0) {
      const newTx = { id: `tx_${Date.now()}`, user_id: uid, type: 'ajuste', amount: newBal, concept: 'Ajuste manual de saldo', date: new Date().toISOString().split('T')[0], origin: 'Sistema' };
      setData((prev) => ({
        ...prev,
        totalMoney: newBal,
        transactions: [newTx, ...prev.transactions],
      }));
      await supabase.from('transactions').insert(newTx);
      await supabase.from('settings').upsert({ user_id: uid, key: 'main_config', value: { totalMoney: newBal, monthlyBaseBurn: data.monthlyBaseBurn } });
    }
    setRealBalance('');
    setIsAdjustModalOpen(false);
  };

  const daysInMonth = new Date(ANIO_ACTUAL, NUM_MES_ACTUAL + 1, 0).getDate();
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="flex justify-center bg-slate-900 min-h-screen text-slate-100 font-sans">
      <div className="w-full max-w-md bg-slate-950 flex flex-col min-h-screen relative pb-24 shadow-2xl border-x border-slate-800">

        {/* ── HEADER ─────────────────────────────────────────────────── */}
        <header className="p-4 border-b border-slate-800/80 flex justify-between items-center bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-sky-400">Control de Certeza</span>
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${sc.color} bg-slate-800 border border-slate-700`}
                  title={sc.desc}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${sc.dot} inline-block`} />
                  {sc.label}
                </span>
                {synced && (
                  <span className="text-[10px] text-emerald-400 flex items-center gap-0.5 ml-0.5" title={`Sincronizado: ${session.user.email}`}>
                    <CloudCheck size={12} />
                  </span>
                )}
              </div>
              <h1 className="text-lg font-bold text-slate-100 leading-tight">Mi Realidad Financiera</h1>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setRealBalance(formatInputNumber(data.totalMoney));
                setIsAdjustModalOpen(true);
              }}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-full transition"
              title="Ajustar saldo real en mano"
            >
              <SlidersHorizontal size={18} />
            </button>
            <button
              onClick={handleSignOut}
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-full transition"
              title={`Cerrar sesión (${session.user.email})`}
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* User bar sub-header */}
        <div className="bg-slate-900/80 px-4 py-1.5 border-b border-slate-800 flex justify-between items-center text-[11px] text-slate-400">
          <span className="truncate flex items-center gap-1">
            <User size={12} className="text-sky-400 shrink-0" />
            <span className="truncate">{session.user.email}</span>
          </span>
          <div className="flex items-center gap-2">
            {data.apartados.length === 0 && (
              <button
                onClick={seedTemplateData}
                className="text-[10px] text-sky-400 hover:underline font-semibold flex items-center gap-0.5"
                title="Cargar datos de ejemplo"
              >
                <RotateCcw size={10} /> Cargar Plantilla Demo
              </button>
            )}
            {data.apartados.length > 0 && (
              <button
                onClick={handleResetUserData}
                className="text-[10px] text-slate-500 hover:text-red-400 transition"
                title="Vaciar mis datos"
              >
                Limpiar datos
              </button>
            )}
          </div>
        </div>

        {/* ── MAIN CONTENT ───────────────────────────────────────────── */}
        <main className="flex-1 p-4 overflow-y-auto space-y-4">

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* PESTAÑA 1: HOY */}
          {/* ═══════════════════════════════════════════════════════════ */}
          {activeTab === 'hoy' && (
            <div className="space-y-4">

              {/* Tarjeta principal: Disponible Libre */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-sky-900/40 via-slate-900 to-slate-900 border border-sky-500/30 shadow-lg">
                <span className="text-xs font-medium text-sky-300">Disponible real para gastar hoy</span>
                <div className="text-3xl font-black text-white mt-1 tracking-tight">
                  {formatMXN(disponibleLibre)}
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-800 text-xs">
                  <div>
                    <span className="text-slate-400">Total en mano / banco:</span>
                    <p className="font-semibold text-slate-200">{formatMXN(data.totalMoney)}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Apartado / Comprometido:</span>
                    <p className="font-semibold text-indigo-300">-{formatMXN(totalApartados + totalCompromisosMes)}</p>
                  </div>
                </div>
              </div>

              {/* Semáforo de estabilidad */}
              <div className={`p-4 rounded-xl bg-slate-900 border ${
                semaforo === 'riesgo' ? 'border-red-500/30' :
                semaforo === 'transicion' ? 'border-amber-500/30' :
                semaforo === 'estable' ? 'border-emerald-500/30' : 'border-sky-500/30'
              } space-y-1.5`}>
                <div className="flex items-center gap-2">
                  <span className="text-base">{sc.emoji}</span>
                  <h4 className={`text-xs font-bold uppercase tracking-wider ${sc.color}`}>
                    Situación: {sc.label}
                  </h4>
                </div>
                <p className="text-xs text-slate-300">{sc.desc}</p>
                <p className="text-[10px] text-slate-500">
                  Ingreso seguro: <span className="font-semibold text-slate-400">{formatMXN(ingresoSeguro)}</span>
                  {' • '}
                  Mínimo de supervivencia: <span className="font-semibold text-slate-400">{formatMXN(minimoMensual)}/mes</span>
                </p>
              </div>

              {/* Runway */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Tranquilidad / Reserva</h4>
                  <p className="text-sm font-medium text-slate-200">
                    Cubres aprox. <span className="text-emerald-300 font-bold">{semanasRunway} semanas</span> de supervivencia básica.
                  </p>
                </div>
              </div>

              {/* Pagos comprometidos */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Pagos comprometidos del mes</span>
                  <span className="text-xs font-semibold text-orange-400">{formatMXN(totalCompromisosMes)}/mes</span>
                </div>
                <div className="space-y-2">
                  {data.compromisos.map((c) => (
                    <div key={c.id} className="flex justify-between items-center text-xs bg-slate-950 p-2.5 rounded-lg border border-slate-800/60">
                      <div>
                        <p className="font-medium text-slate-200">{c.name}</p>
                        <p className="text-[10px] text-slate-500">Vence día {c.dueDay} • Mes {c.currentMonth} de {c.totalMonths}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-300">-{formatMXN(c.amount)}</span>
                        <button
                          onClick={() => handlePayCompromisoMonth(c)}
                          className="py-1 px-2 bg-orange-500/20 text-orange-300 rounded text-[10px] font-bold border border-orange-500/30 hover:bg-orange-500/30"
                          title="Registrar pago de la mensualidad de este mes"
                        >
                          Pagar mes
                        </button>
                      </div>
                    </div>
                  ))}
                  {data.compromisos.length === 0 && (
                    <p className="text-[11px] text-slate-600 italic">No tienes compromisos a plazos cargados.</p>
                  )}
                </div>
              </div>

              {/* Últimos registros */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Últimos Registros</span>
                  {data.transactions.length > 0 && (
                    <button
                      onClick={() => setIsTxHistoryOpen(true)}
                      className="text-[10px] text-sky-400 hover:underline flex items-center gap-1 font-medium"
                    >
                      <List size={12} /> Ver historial ({data.transactions.length})
                    </button>
                  )}
                </div>
                <div className="space-y-1.5">
                  {data.transactions.slice(0, 3).map((t) => (
                    <div key={t.id} className="flex justify-between items-center text-xs p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/40">
                      <div className="flex items-center gap-2">
                        {t.type === 'ingreso' ? (
                          <ArrowDownLeft size={14} className="text-emerald-400 shrink-0" />
                        ) : (
                          <ArrowUpRight size={14} className="text-orange-400 shrink-0" />
                        )}
                        <div>
                          <p className="font-medium text-slate-200">{t.concept}</p>
                          <p className="text-[10px] text-slate-500">{t.origin} • {t.date}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${t.type === 'ingreso' ? 'text-emerald-400' : 'text-slate-300'}`}>
                          {t.type === 'ingreso' ? '+' : '-'}{formatMXN(t.amount)}
                        </span>
                        <button
                          onClick={() => handleDeleteTransaction(t)}
                          className="text-slate-600 hover:text-red-400 p-1 transition"
                          title="Eliminar registro"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {data.transactions.length === 0 && (
                    <p className="text-[11px] text-slate-600 italic">No hay registros recientes.</p>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* PESTAÑA 2: APARTADOS Y METAS */}
          {/* ═══════════════════════════════════════════════════════════ */}
          {activeTab === 'apartados' && (
            <div className="space-y-4">

              {/* Resumen Apartados */}
              <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/20 flex justify-between items-center">
                <div>
                  <span className="text-xs text-indigo-300 font-medium">Total Apartado y Protegido</span>
                  <p className="text-2xl font-bold text-white mt-0.5">{formatMXN(totalApartados)}</p>
                  <p className="text-[10px] text-indigo-300/70">
                    Dinero blindado de tus gastos por impulso.
                  </p>
                </div>
                <button
                  onClick={handleOpenNewApartado}
                  className="py-2 px-3 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1 transition shadow-lg shadow-sky-500/20 shrink-0"
                >
                  <Plus size={14} /> Nuevo Apartado
                </button>
              </div>

              {/* Lista de Apartados */}
              <div className="space-y-3">
                <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Mis Prioridades y Metas</span>

                {data.apartados.map((ap) => {
                  const tipo = TIPO_META[ap.type] || TIPO_META.objetivo;
                  const IconoTipo = tipo.icon;
                  const percent = Math.min(100, Math.round((ap.current / (ap.target || 1)) * 100));
                  const isCompleted = ap.current >= ap.target;
                  const isFondo = ap.type === 'fondo';

                  return (
                    <div key={ap.id} className={`p-4 rounded-xl bg-slate-900 border ${isCompleted ? tipo.border : 'border-slate-800'} space-y-3 relative`}>
                      
                      {/* Header Apartado */}
                      <div className="flex justify-between items-start">
                        <div className="flex items-start gap-2.5">
                          <div className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${tipo.bg}`}>
                            <IconoTipo size={15} className={tipo.color} />
                          </div>
                          <div>
                            <span className={`text-[10px] uppercase font-bold ${tipo.color} tracking-wide`}>
                              {tipo.label}
                            </span>
                            <h3 className="font-semibold text-sm text-slate-100 leading-tight">{ap.name}</h3>
                            <span className="text-[10px] text-slate-500">{ap.category}</span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-sm font-bold text-slate-100">{formatMXN(ap.current)}</span>
                          <span className="text-[10px] text-slate-500 block">meta: {formatMXN(ap.target)}</span>
                        </div>
                      </div>

                      {/* Barra de Progreso */}
                      {!isFondo && (
                        <div className="space-y-1">
                          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-500 ${isCompleted ? tipo.barColor : 'bg-slate-600'}`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <div className="flex justify-between items-center text-[10px] text-slate-400">
                            <span>{percent}% cubierto</span>
                            {isCompleted && (
                              <span className={`font-bold flex items-center gap-1 ${tipo.completedClass}`}>
                                <CheckCircle2 size={11} />
                                {tipo.completedText}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Botones de Acción de Fondos */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/70 text-xs">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenFunding(ap, 'abonar')}
                            className="py-1 px-2.5 bg-slate-800 hover:bg-sky-500/20 hover:text-sky-300 text-slate-300 rounded-lg font-semibold transition text-[11px] flex items-center gap-1"
                            title="Asignar dinero libre a este apartado"
                          >
                            <Plus size={12} /> Abonar
                          </button>
                          {ap.current > 0 && (
                            <button
                              onClick={() => handleOpenFunding(ap, 'retirar')}
                              className="py-1 px-2.5 bg-slate-800 hover:bg-amber-500/20 hover:text-amber-300 text-slate-300 rounded-lg font-semibold transition text-[11px]"
                              title="Retirar dinero de vuelta al disponible"
                            >
                              − Retirar
                            </button>
                          )}
                          {ap.current > 0 && (ap.type === 'objetivo' || ap.type === 'compra') && isCompleted && (
                            <button
                              onClick={() => handleUseApartado(ap)}
                              className="py-1 px-2.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg font-semibold transition text-[11px] flex items-center gap-1"
                              title="Liquidar este gasto"
                            >
                              <Check size={12} /> Usar fondo
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEditApartado(ap)}
                            className="text-slate-500 hover:text-sky-400 p-1.5 rounded-lg transition"
                            title="Editar apartado"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteApartado(ap.id)}
                            className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg transition"
                            title="Eliminar apartado"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                    </div>
                  );
                })}

                {data.apartados.length === 0 && (
                  <div className="text-center p-6 bg-slate-900/50 rounded-xl border border-slate-800/60 space-y-2">
                    <p className="text-xs text-slate-400">No tienes apartados creados.</p>
                    <button
                      onClick={handleOpenNewApartado}
                      className="text-xs text-sky-400 font-bold hover:underline"
                    >
                      + Crear mi primer apartado
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* PESTAÑA 3: FUTURO Y PROYECCIONES */}
          {/* ═══════════════════════════════════════════════════════════ */}
          {activeTab === 'futuro' && (
            <div className="space-y-4">

              {/* Embudo de ingresos */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Embudo de Ingresos Proyectados</span>
                  <button
                    onClick={handleOpenNewIngreso}
                    className="text-[10px] font-semibold text-emerald-400 hover:underline flex items-center gap-0.5"
                  >
                    <Plus size={12} /> Proyectar Ingreso
                  </button>
                </div>

                {/* Seguro */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                      <span className="font-semibold text-emerald-300">Ingreso Seguro</span>
                    </div>
                    <span className="font-bold text-emerald-300">{formatMXN(ingresoSeguro)}</span>
                  </div>
                  {data.ingresosVariables.filter((i) => i.certainty === 'confirmado').map((i) => (
                    <div key={i.id} className="ml-4 text-[10px] text-slate-400 flex justify-between items-center py-1 border-b border-slate-800/40">
                      <div>
                        <span className="font-medium text-slate-200">{i.name}</span>
                        <span className="text-slate-500 block">📅 {i.date} {i.period !== 'unico' ? `• (${i.period})` : ''}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-emerald-400">{formatMXN(i.amount)}</span>
                        <button onClick={() => handleOpenEditIngreso(i)} className="hover:text-sky-400 p-1"><Edit2 size={11} /></button>
                        <button onClick={() => handleDeleteIngreso(i.id)} className="hover:text-red-400 p-1"><Trash2 size={11} /></button>
                      </div>
                    </div>
                  ))}
                  {ingresoSeguro === 0 && <p className="ml-4 text-[10px] text-slate-600 italic">Sin ingresos confirmados aún</p>}
                </div>

                {/* Esperado */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                      <span className="font-semibold text-amber-300">Ingreso Esperado</span>
                    </div>
                    <span className="font-bold text-amber-300">+{formatMXN(ingresoEsperado)}</span>
                  </div>
                  {data.ingresosVariables.filter((i) => i.certainty === 'esperado').map((i) => (
                    <div key={i.id} className="ml-4 text-[10px] text-slate-400 flex justify-between items-center py-1 border-b border-slate-800/40">
                      <div>
                        <span className="font-medium text-slate-200">{i.name}</span>
                        <span className="text-slate-500 block">📅 {i.date} {i.period !== 'unico' ? `• (${i.period})` : ''}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-amber-300">{formatMXN(i.amount)}</span>
                        <button
                          onClick={() => handleConfirmPayment(i)}
                          className="py-0.5 px-2 bg-emerald-500/20 text-emerald-300 rounded text-[10px] font-bold border border-emerald-500/30 hover:bg-emerald-500/30"
                          title="Confirmar que ya cayó el pago y pasarlo a Ingreso Seguro"
                        >
                          ¡Ya cobré!
                        </button>
                        <button onClick={() => handleOpenEditIngreso(i)} className="hover:text-sky-400 p-1"><Edit2 size={11} /></button>
                        <button onClick={() => handleDeleteIngreso(i.id)} className="hover:text-red-400 p-1"><Trash2 size={11} /></button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Posible */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-slate-500 shrink-0" />
                      <span className="font-semibold text-slate-400">Ingreso Posible</span>
                    </div>
                    <span className="font-bold text-slate-400">+{formatMXN(ingresoPosible)}</span>
                  </div>
                  {data.ingresosVariables.filter((i) => i.certainty === 'posible').map((i) => (
                    <div key={i.id} className="ml-4 text-[10px] text-slate-400 flex justify-between items-center py-1 border-b border-slate-800/40">
                      <div>
                        <span className="font-medium text-slate-200">{i.name}</span>
                        <span className="text-slate-500 block">📅 {i.date} {i.period !== 'unico' ? `• (${i.period})` : ''}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-400">{formatMXN(i.amount)}</span>
                        <button
                          onClick={() => handleConfirmPayment(i)}
                          className="py-0.5 px-2 bg-emerald-500/20 text-emerald-300 rounded text-[10px] font-bold border border-emerald-500/30 hover:bg-emerald-500/30"
                          title="Confirmar cobro"
                        >
                          ¡Ya cobré!
                        </button>
                        <button onClick={() => handleOpenEditIngreso(i)} className="hover:text-sky-400 p-1"><Edit2 size={11} /></button>
                        <button onClick={() => handleDeleteIngreso(i.id)} className="hover:text-red-400 p-1"><Trash2 size={11} /></button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Advertencia / Guía Colapsable */}
                <div className="pt-2 border-t border-slate-800 space-y-2">
                  {ingresoTotal > ingresoSeguro && (
                    <div className="flex items-start gap-2">
                      <AlertTriangle size={13} className="text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-amber-300/90">
                        No bases tus gastos en los <span className="font-bold">{formatMXN(ingresoTotal)}</span> proyectados.
                        Solo <span className="font-bold">{formatMXN(ingresoSeguro)}</span> están confirmados en mano.
                      </p>
                    </div>
                  )}

                  <button
                    onClick={() => setShowCertaintyGuide((v) => !v)}
                    className="text-[10px] text-sky-400 hover:underline flex items-center gap-1 font-semibold pt-1"
                  >
                    <Info size={12} />
                    {showCertaintyGuide ? 'Ocultar explicación de certezas' : '¿Qué significa Seguro, Esperado y Posible?'}
                  </button>

                  {showCertaintyGuide && (
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-[11px] text-slate-300">
                      <div className="flex items-start gap-2">
                        <span className="text-emerald-400 font-bold shrink-0">🟢 Seguro:</span>
                        <span>Dinero ya en tu cuenta o garantizado. Es el <strong>único</strong> que calcula tu semáforo de estabilidad.</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-amber-400 font-bold shrink-0">🟡 Esperado:</span>
                        <span>Trabajo ya pactado con fecha próxima (ej. flete acordado). Al presionar <strong>"¡Ya cobré!"</strong> se transfiere a Seguro y a tu saldo.</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-slate-400 font-bold shrink-0">⚪ Posible:</span>
                        <span>Oportunidad en entrevista o negociación. <strong>Nunca comprometas gastos</strong> sobre esta cifra.</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Mínimo mensual Configurable */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calculator size={14} className="text-sky-400" />
                    <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Tu Mínimo Mensual</span>
                  </div>
                  <button
                    onClick={() => {
                      setMonthlyBurnInput(formatInputNumber(data.monthlyBaseBurn));
                      setIsBaseBurnModalOpen(true);
                    }}
                    className="text-[10px] font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1 transition"
                  >
                    <Edit2 size={11} /> Configurar Supervivencia
                  </button>
                </div>

                <div className="text-3xl font-black text-white tracking-tight">
                  {formatMXN(minimoMensual)}<span className="text-sm font-normal text-slate-400"> / mes</span>
                </div>

                <div className="space-y-1.5 pt-1 border-t border-slate-800/60">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Gastos básicos indispensables (supervivencia)</span>
                    <span className="font-semibold text-slate-300">{formatMXN(data.monthlyBaseBurn)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Compromisos fijos (MSI + servicios)</span>
                    <span className="font-semibold text-orange-400">+{formatMXN(totalCompromisosMes)}</span>
                  </div>
                  {gastosRecurrentesApartados > 0 && (
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Gastos recurrentes apartados (terapia, etc.)</span>
                      <span className="font-semibold text-amber-400">+{formatMXN(gastosRecurrentesApartados)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs font-bold text-slate-200 pt-1 border-t border-slate-800">
                    <span>Total Mínimo Necesario</span>
                    <span>{formatMXN(minimoMensual)}</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500">
                  Esta es la respuesta a <em>"¿cuánto necesito ganar?"</em> para estar tranquilo.
                </p>
              </div>

              {/* Escenario manual "¿Qué pasa si...?" */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={14} className="text-violet-400" />
                    <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">¿Qué pasa si…?</span>
                  </div>
                  <button
                    onClick={() => setShowScenarioInput((v) => !v)}
                    className="text-[10px] font-semibold text-violet-400 hover:text-violet-300 flex items-center gap-0.5 transition"
                  >
                    Simular
                    {showScenarioInput ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                </div>

                {showScenarioInput && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                        Si consigo un ingreso mensual de…
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-sm font-bold text-slate-500">$</span>
                        <input
                          type="text"
                          placeholder="12,000"
                          value={scenarioInput}
                          onChange={(e) => setScenarioInput(formatInputNumber(e.target.value))}
                          className="w-full text-lg font-bold bg-slate-950 border border-slate-800 rounded-xl pl-7 pr-3 py-2 text-white focus:outline-none focus:border-violet-500"
                        />
                      </div>
                    </div>

                    {scenarioAmount > 0 && (
                      <div className={`p-3 rounded-xl border ${
                        scenarioMargen > 0 ? 'bg-emerald-500/5 border-emerald-500/20' :
                        scenarioMargen === 0 ? 'bg-amber-500/5 border-amber-500/20' : 'bg-red-500/5 border-red-500/20'
                      }`}>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-base">
                            {scenarioMargen > 0 ? '🟢' : scenarioMargen === 0 ? '🟡' : '🔴'}
                          </span>
                          <span className={`text-xs font-bold ${
                            scenarioMargen > 0 ? 'text-emerald-400' :
                            scenarioMargen === 0 ? 'text-amber-400' : 'text-red-400'
                          }`}>
                            {scenarioMargen > 0
                              ? `Margen libre mensual: +${formatMXN(scenarioMargen)}`
                              : scenarioMargen === 0
                              ? 'Justo al límite del mínimo'
                              : `Faltarían aprox. ${formatMXN(Math.abs(scenarioMargen))}`
                            }
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 space-y-0.5">
                          <div className="flex justify-between">
                            <span>Ingreso simulado</span>
                            <span>{formatMXN(scenarioAmount)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Mínimo mensual</span>
                            <span>-{formatMXN(minimoMensual)}</span>
                          </div>
                          <div className={`flex justify-between font-bold pt-0.5 border-t border-slate-800 ${
                            scenarioMargen >= 0 ? 'text-slate-300' : 'text-red-400'
                          }`}>
                            <span>Resultado</span>
                            <span>{scenarioMargen >= 0 ? '+' : ''}{formatMXN(scenarioMargen)}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!showScenarioInput && (
                  <p className="text-[11px] text-slate-500">
                    Simula cualquier sueldo o flete para ver si te sobra o te falta dinero frente a tus compromisos.
                  </p>
                )}
              </div>

              {/* Compromisos a plazos */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Compromisos a Plazos</span>
                  <button
                    onClick={handleOpenNewCompromiso}
                    className="text-[10px] font-semibold text-orange-400 hover:underline flex items-center gap-0.5"
                  >
                    <Plus size={12} /> Agregar Compromiso
                  </button>
                </div>
                <div className="space-y-1.5">
                  {data.compromisos.map((c) => {
                    const mesesRestantes = c.totalMonths - c.currentMonth + 1;
                    return (
                      <div key={c.id} className="text-xs flex justify-between items-start py-2 border-b border-slate-800/60 last:border-0">
                        <div>
                          <p className="font-medium text-slate-300">{c.name}</p>
                          <p className="text-[10px] text-slate-500">
                            Mes {c.currentMonth} de {c.totalMonths} • Quedan {mesesRestantes} pagos (Vence día {c.dueDay})
                          </p>
                        </div>
                        <div className="text-right flex items-center gap-2">
                          <div>
                            <p className="font-semibold text-orange-300">{formatMXN(c.amount)}/mes</p>
                            <p className="text-[10px] text-slate-500">Total: {formatMXN(c.amount * mesesRestantes)}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handlePayCompromisoMonth(c)}
                              className="py-0.5 px-2 bg-orange-500/20 text-orange-300 rounded text-[10px] font-bold border border-orange-500/30 hover:bg-orange-500/30"
                              title="Pagar mensualidad"
                            >
                              Pagar
                            </button>
                            <button onClick={() => handleOpenEditCompromiso(c)} className="text-slate-500 hover:text-sky-400 p-1"><Edit2 size={12} /></button>
                            <button onClick={() => handleDeleteCompromiso(c.id)} className="text-slate-500 hover:text-red-400 p-1"><Trash2 size={12} /></button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {data.compromisos.length === 0 && (
                    <p className="text-[11px] text-slate-600 italic">No tienes compromisos futuros cargados.</p>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* PESTAÑA 4: CALENDARIO Y AGENDA FINANCIERA */}
          {/* ═══════════════════════════════════════════════════════════ */}
          {activeTab === 'calendario' && (
            <div className="space-y-4">

              {/* Cuadrícula Calendario */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <CalendarDays size={16} className="text-sky-400" />
                    <h3 className="text-xs font-bold uppercase text-slate-200 tracking-wider">
                      Agenda de {MES_CAPITALIZADO} {ANIO_ACTUAL}
                    </h3>
                  </div>
                  <span className="text-[10px] text-slate-500">Hoy: Día {HOY_DIA}</span>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center text-xs">
                  {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((d, i) => (
                    <span key={i} className="text-[10px] font-bold text-slate-600 pb-1">{d}</span>
                  ))}

                  {calendarDays.map((day) => {
                    const isToday = day === HOY_DIA;
                    const compsOnDay = data.compromisos.filter((c) => c.dueDay === day);
                    const ingsOnDay = data.ingresosVariables.filter((ing) => {
                      const d = new Date(ing.date).getDate();
                      return d === day;
                    });

                    const hasEvents = compsOnDay.length > 0 || ingsOnDay.length > 0;

                    return (
                      <div
                        key={day}
                        className={`p-1.5 rounded-lg border text-[11px] flex flex-col items-center justify-between min-h-[42px] transition ${
                          isToday
                            ? 'bg-sky-500/20 border-sky-500 font-bold text-sky-300'
                            : hasEvents
                            ? 'bg-slate-950 border-slate-700 text-slate-200'
                            : 'bg-slate-950/40 border-slate-900 text-slate-600'
                        }`}
                      >
                        <span>{day}</span>
                        <div className="flex items-center gap-0.5 mt-0.5">
                          {compsOnDay.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-orange-400" title="Pago comprometido" />}
                          {ingsOnDay.some(i => i.certainty === 'confirmado') && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Ingreso confirmado" />}
                          {ingsOnDay.some(i => i.certainty === 'esperado') && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Ingreso esperado" />}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-center gap-4 text-[10px] text-slate-400 pt-2 border-t border-slate-800/60">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400 inline-block" /> Pago a realizar</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Cobro esperado</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> Cobro seguro</span>
                </div>
              </div>

              {/* Cronograma Mensual */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-sky-400" />
                  <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Línea de Tiempo del Mes</span>
                </div>

                <div className="space-y-2">
                  {[...data.compromisos].sort((a, b) => a.dueDay - b.dueDay).map((c) => {
                    const isPassed = c.dueDay < HOY_DIA;
                    return (
                      <div key={c.id} className="flex justify-between items-center p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 text-xs">
                        <div className="flex items-center gap-2.5">
                          <span className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold ${
                            isPassed ? 'bg-slate-800 text-slate-500' : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                          }`}>
                            {c.dueDay}
                          </span>
                          <div>
                            <p className="font-semibold text-slate-200">{c.name}</p>
                            <p className="text-[10px] text-slate-500">
                              {isPassed ? 'Pago pasado del mes' : 'Vence este mes'} • Mes {c.currentMonth}/{c.totalMonths}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-orange-400">-{formatMXN(c.amount)}</span>
                          <button
                            onClick={() => handlePayCompromisoMonth(c)}
                            className="py-0.5 px-2 bg-orange-500/20 text-orange-300 rounded text-[10px] font-bold border border-orange-500/30 hover:bg-orange-500/30"
                          >
                            Pagar
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {data.ingresosVariables.map((ing) => (
                    <div key={ing.id} className="flex justify-between items-center p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 text-xs">
                      <div className="flex items-center gap-2.5">
                        <span className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold ${
                          ing.certainty === 'confirmado'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}>
                          {new Date(ing.date).getDate() || '📅'}
                        </span>
                        <div>
                          <p className="font-semibold text-slate-200">{ing.name}</p>
                          <p className="text-[10px] text-slate-500">
                            Certeza: <strong className={ing.certainty === 'confirmado' ? 'text-emerald-400' : 'text-amber-400'}>{ing.certainty}</strong> • {ing.date}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-emerald-400">+{formatMXN(ing.amount)}</span>
                        {ing.certainty !== 'confirmado' && (
                          <button
                            onClick={() => handleConfirmPayment(ing)}
                            className="py-0.5 px-2 bg-emerald-500/20 text-emerald-300 rounded text-[10px] font-bold border border-emerald-500/30"
                          >
                            ¡Ya cobré!
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {data.compromisos.length === 0 && data.ingresosVariables.length === 0 && (
                    <p className="text-xs text-slate-500 italic text-center py-4">
                      No tienes compromisos ni cobros agendados para este mes.
                    </p>
                  )}
                </div>
              </div>

            </div>
          )}
        </main>

        {/* ── MODAL: CREAR / EDITAR APARTADO ──────────────────────────── */}
        {isApartadoModalOpen && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 w-full max-w-sm space-y-4 shadow-2xl">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <h3 className="font-bold text-sm text-slate-100">
                  {editingApartadoId ? 'Editar Apartado' : 'Nuevo Apartado'}
                </h3>
                <button onClick={() => setIsApartadoModalOpen(false)} className="text-slate-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveApartado} className="space-y-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Tipo de Apartado</label>
                  <select
                    value={apType}
                    onChange={(e) => setApType(e.target.value)}
                    className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
                  >
                    <option value="objetivo">🎯 Objetivo (Meta de corto plazo)</option>
                    <option value="compra">🛒 Compra planificada (Ahorro programado)</option>
                    <option value="gasto_recurrente">🔄 Gasto Recurrente (Ej. Terapia mensual)</option>
                    <option value="fondo">🛡️ Fondo de Seguridad (Reserva intocable)</option>
                  </select>
                  <p className="text-[10px] text-slate-500 mt-1">{TIPO_META[apType]?.desc}</p>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Nombre</label>
                  <input
                    type="text"
                    placeholder="Ej. Renovación Licencia, Laptop"
                    value={apName}
                    onChange={(e) => setApName(e.target.value)}
                    required
                    className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    {apType === 'gasto_recurrente' ? 'Presupuesto Mensual ($ MXN)' : 'Monto Total a Gastar / Meta ($ MXN)'}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-bold text-slate-500">$</span>
                    <input
                      type="text"
                      placeholder="0.00"
                      value={apTarget}
                      onChange={(e) => setApTarget(formatInputNumber(e.target.value))}
                      required
                      className="w-full text-sm font-bold bg-slate-950 border border-slate-800 rounded-xl pl-7 pr-3 py-2 text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {editingApartadoId ? 'Puedes ajustar la meta sin alterar lo acumulado.' : 'Inicia en $0. Podrás abonarle dinero desde tu disponible en cualquier momento.'}
                  </p>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Categoría</label>
                  <input
                    type="text"
                    placeholder="Ej. Trámites, Salud, Educación, Seguridad"
                    value={apCategory}
                    onChange={(e) => setApCategory(e.target.value)}
                    className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl text-xs transition mt-1 shadow-lg shadow-sky-500/20"
                >
                  {editingApartadoId ? 'Guardar Cambios' : 'Crear Apartado'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ── MODAL: ABONAR O RETIRAR FONDOS DE APARTADO ──────────────── */}
        {isFundModalOpen && fundingApartado && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 w-full max-w-sm space-y-4 shadow-2xl">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <h3 className="font-bold text-sm text-slate-100">
                  {fundAction === 'abonar' ? 'Abonar a Apartado' : 'Retirar Fondos de Apartado'}
                </h3>
                <button onClick={() => setIsFundModalOpen(false)} className="text-slate-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1 text-xs">
                <p className="font-bold text-slate-200">{fundingApartado.name}</p>
                <p className="text-[11px] text-slate-400">
                  Acumulado actual: <strong className="text-sky-300">{formatMXN(fundingApartado.current)}</strong> de {formatMXN(fundingApartado.target)}
                </p>
                <p className="text-[11px] text-slate-400">
                  Disponible libre: <strong className="text-emerald-300">{formatMXN(disponibleLibre)}</strong>
                </p>
              </div>

              {fundError && (
                <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                  {fundError}
                </div>
              )}

              <form onSubmit={handleExecuteFunding} className="space-y-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    {fundAction === 'abonar' ? 'Monto a transferir del disponible ($ MXN)' : 'Monto a liberar hacia el disponible ($ MXN)'}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-sm font-bold text-slate-500">$</span>
                    <input
                      type="text"
                      placeholder="0.00"
                      value={fundAmount}
                      onChange={(e) => {
                        setFundAmount(formatInputNumber(e.target.value));
                        setFundError('');
                      }}
                      autoFocus
                      required
                      className="w-full text-lg font-bold bg-slate-950 border border-slate-800 rounded-xl pl-7 pr-3 py-2 text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className={`w-full py-2.5 font-bold rounded-xl text-xs transition shadow-lg ${
                    fundAction === 'abonar'
                      ? 'bg-sky-500 hover:bg-sky-400 text-slate-950 shadow-sky-500/20'
                      : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                  }`}
                >
                  {fundAction === 'abonar' ? 'Confirmar Abono' : 'Confirmar Retiro'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ── MODAL: CREAR / EDITAR INGRESO VARIABLE ─────────────────── */}
        {isIngresoModalOpen && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 w-full max-w-sm space-y-4 shadow-2xl">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <h3 className="font-bold text-sm text-slate-100">
                  {editingIngresoId ? 'Editar Ingreso Proyectado' : 'Nuevo Ingreso Proyectado'}
                </h3>
                <button onClick={() => setIsIngresoModalOpen(false)} className="text-slate-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveIngreso} className="space-y-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Concepto / Origen</label>
                  <input
                    type="text"
                    placeholder="Ej. Viaje de flete, Empleo logística"
                    value={ingName}
                    onChange={(e) => setIngName(e.target.value)}
                    required
                    className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Monto Estimado ($ MXN)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-bold text-slate-500">$</span>
                    <input
                      type="text"
                      placeholder="0.00"
                      value={ingAmount}
                      onChange={(e) => setIngAmount(formatInputNumber(e.target.value))}
                      required
                      className="w-full text-sm font-bold bg-slate-950 border border-slate-800 rounded-xl pl-7 pr-3 py-2 text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Nivel de Certeza</label>
                  <select
                    value={ingCertainty}
                    onChange={(e) => setIngCertainty(e.target.value)}
                    className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
                  >
                    <option value="confirmado">🟢 Confirmado (Ya asegurado / suma a dinero real)</option>
                    <option value="esperado">🟡 Esperado (Fecha aprox. / pactado)</option>
                    <option value="posible">⚪ Posible (En proceso / entrevista)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">Fecha de Cobro</label>
                    <input
                      type="date"
                      value={ingDate}
                      onChange={(e) => setIngDate(e.target.value)}
                      required
                      className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">Periodo</label>
                    <select
                      value={ingPeriod}
                      onChange={(e) => setIngPeriod(e.target.value)}
                      className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
                    >
                      <option value="unico">Pago Único</option>
                      <option value="semanal">Semanal</option>
                      <option value="quincenal">Quincenal</option>
                      <option value="mensual">Mensual</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition shadow-lg shadow-emerald-500/20"
                >
                  Guardar Ingreso Proyectado
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ── MODAL: CREAR / EDITAR COMPROMISO ───────────────────────── */}
        {isCompromisoModalOpen && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 w-full max-w-sm space-y-4 shadow-2xl">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <h3 className="font-bold text-sm text-slate-100">
                  {editingCompromisoId ? 'Editar Compromiso' : 'Nuevo Compromiso a Plazos'}
                </h3>
                <button onClick={() => setIsCompromisoModalOpen(false)} className="text-slate-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveCompromiso} className="space-y-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Concepto</label>
                  <input
                    type="text"
                    placeholder="Ej. Laptop (MSI), Pago fijo"
                    value={compName}
                    onChange={(e) => setCompName(e.target.value)}
                    required
                    className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">Monto Mensual ($ MXN)</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-500">$</span>
                      <input
                        type="text"
                        placeholder="1,000"
                        value={compAmount}
                        onChange={(e) => setCompAmount(formatInputNumber(e.target.value))}
                        required
                        className="w-full text-xs font-bold bg-slate-950 border border-slate-800 rounded-xl pl-6 pr-2 py-2 text-white focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">Día de Pago (1-31)</label>
                    <input
                      type="number"
                      placeholder="15"
                      min="1"
                      max="31"
                      value={compDueDay}
                      onChange={(e) => setCompDueDay(e.target.value)}
                      required
                      className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">Mes Actual</label>
                    <input
                      type="number"
                      placeholder="1"
                      min="1"
                      value={compCurrentMonth}
                      onChange={(e) => setCompCurrentMonth(e.target.value)}
                      required
                      className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">Total Meses</label>
                    <input
                      type="number"
                      placeholder="12"
                      min="1"
                      value={compTotalMonths}
                      onChange={(e) => setCompTotalMonths(e.target.value)}
                      required
                      className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold rounded-xl text-xs transition shadow-lg shadow-orange-500/20"
                >
                  Guardar Compromiso
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ── MODAL: CONFIGURAR BASE DE SUPERVIVENCIA ───────────────── */}
        {isBaseBurnModalOpen && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 w-full max-w-sm space-y-4 shadow-2xl">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <h3 className="font-bold text-sm text-slate-100">Gasto de Supervivencia Indispensable</h3>
                <button onClick={() => setIsBaseBurnModalOpen(false)} className="text-slate-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Cantidad mensual mínima que necesitas para vivir: comida básica, techo/renta, transporte indispensable y servicios vitales.
              </p>

              <form onSubmit={handleSaveBaseBurn} className="space-y-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Monto Mensual Base ($ MXN)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-sm font-bold text-slate-500">$</span>
                    <input
                      type="text"
                      placeholder="4,000"
                      value={monthlyBurnInput}
                      onChange={(e) => setMonthlyBurnInput(formatInputNumber(e.target.value))}
                      required
                      className="w-full text-lg font-bold bg-slate-950 border border-slate-800 rounded-xl pl-7 pr-3 py-2 text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Base indispensable:</span>
                    <span className="text-slate-200">{formatMXN(parseInputNumber(monthlyBurnInput))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>+ Compromisos fijos del mes:</span>
                    <span className="text-orange-400">+{formatMXN(totalCompromisosMes)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-200 pt-1 border-t border-slate-800">
                    <span>Mínimo Total Resultante:</span>
                    <span className="text-sky-300">{formatMXN(parseInputNumber(monthlyBurnInput) + totalCompromisosMes + gastosRecurrentesApartados)}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl text-xs transition shadow-lg shadow-sky-500/20"
                >
                  Guardar Presupuesto
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ── MODAL: HISTORIAL DE TRANSACCIONES ────────────────────────── */}
        {isTxHistoryOpen && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 w-full max-w-md space-y-4 shadow-2xl max-h-[80vh] flex flex-col">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800 shrink-0">
                <h3 className="font-bold text-sm text-slate-100">Historial de Registros</h3>
                <button onClick={() => setIsTxHistoryOpen(false)} className="text-slate-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {data.transactions.map((t) => (
                  <div key={t.id} className="flex justify-between items-center text-xs p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                    <div className="flex items-center gap-2.5">
                      {t.type === 'ingreso' ? (
                        <ArrowDownLeft size={16} className="text-emerald-400 shrink-0" />
                      ) : (
                        <ArrowUpRight size={16} className="text-orange-400 shrink-0" />
                      )}
                      <div>
                        <p className="font-medium text-slate-200">{t.concept}</p>
                        <p className="text-[10px] text-slate-500">{t.origin} • {t.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`font-semibold text-sm ${t.type === 'ingreso' ? 'text-emerald-400' : 'text-slate-300'}`}>
                        {t.type === 'ingreso' ? '+' : '-'}{formatMXN(t.amount)}
                      </span>
                      <button
                        onClick={() => handleDeleteTransaction(t)}
                        className="text-slate-600 hover:text-red-400 p-1 transition"
                        title="Eliminar y revertir saldo"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL: REGISTRO RÁPIDO UNIFICADO (+) ─────────────────────── */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
            <div className="bg-slate-900 border-t sm:border border-slate-800 rounded-t-2xl sm:rounded-2xl p-5 w-full max-w-md space-y-4 shadow-2xl">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <h3 className="font-bold text-sm text-slate-100">Registro Rápido</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setTxType('gasto')}
                  className={`py-2 text-xs font-bold rounded-lg transition ${txType === 'gasto' ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40' : 'text-slate-400'}`}
                >
                  − Gasto
                </button>
                <button
                  type="button"
                  onClick={() => setTxType('ingreso')}
                  className={`py-2 text-xs font-bold rounded-lg transition ${txType === 'ingreso' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'text-slate-400'}`}
                >
                  + Ingreso
                </button>
              </div>

              <form onSubmit={handleSaveQuickTransaction} className="space-y-3.5">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Monto ($ MXN)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-lg font-bold text-slate-500">$</span>
                    <input
                      type="text"
                      placeholder="0.00"
                      value={txAmount}
                      onChange={(e) => setTxAmount(formatInputNumber(e.target.value))}
                      autoFocus
                      required
                      className="w-full text-2xl font-bold bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2.5 text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Concepto</label>
                  <input
                    type="text"
                    placeholder="Ej. Comida, Gasolina, Pago de flete"
                    value={txConcept}
                    onChange={(e) => setTxConcept(e.target.value)}
                    required
                    className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:border-sky-500"
                  />
                </div>

                {txType === 'gasto' ? (
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">¿De dónde sale el dinero?</label>
                    <select
                      value={txOrigin}
                      onChange={(e) => setTxOrigin(e.target.value)}
                      className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:border-sky-500"
                    >
                      <option value="disponible">Disponible Libre ({formatMXN(disponibleLibre)})</option>
                      {data.apartados.map((ap) => (
                        <option key={ap.id} value={ap.id}>
                          {TIPO_META[ap.type]?.label || 'Apartado'}: {ap.name} ({formatMXN(ap.current)})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">Nivel de Certeza</label>
                      <select
                        value={txCertainty}
                        onChange={(e) => setTxCertainty(e.target.value)}
                        className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:border-sky-500"
                      >
                        <option value="confirmado">🟢 Confirmado (Ya en mano / banco)</option>
                        <option value="esperado">🟡 Esperado (Flete pactado / fecha aprox)</option>
                        <option value="posible">⚪ Posible (En proceso / entrevista)</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-400 block mb-1">Fecha</label>
                        <input
                          type="date"
                          value={txDate}
                          onChange={(e) => setTxDate(e.target.value)}
                          required
                          className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-400 block mb-1">Periodo</label>
                        <select
                          value={txPeriod}
                          onChange={(e) => setTxPeriod(e.target.value)}
                          className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
                        >
                          <option value="unico">Pago Único</option>
                          <option value="semanal">Semanal</option>
                          <option value="quincenal">Quincenal</option>
                          <option value="mensual">Mensual</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl text-sm transition mt-2 shadow-lg shadow-sky-500/20"
                >
                  Guardar Movimiento
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ── MODAL: AJUSTE DE SALDO REAL ───────────────────────────── */}
        {isAdjustModalOpen && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 w-full max-w-sm space-y-4 shadow-2xl">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <h3 className="font-bold text-sm text-slate-100">Ajuste de Saldo Real</h3>
                <button onClick={() => setIsAdjustModalOpen(false)} className="text-slate-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>
              <p className="text-xs text-slate-400">
                Escribe el total de dinero real que tienes hoy en cuenta y mano:
              </p>
              <form onSubmit={handleAdjustBalance} className="space-y-3">
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-lg font-bold text-slate-500">$</span>
                  <input
                    type="text"
                    placeholder={`Saldo actual: ${formatMXN(data.totalMoney)}`}
                    value={realBalance}
                    onChange={(e) => setRealBalance(formatInputNumber(e.target.value))}
                    className="w-full text-xl font-bold bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2.5 text-white focus:outline-none focus:border-sky-500"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-slate-100 hover:bg-white text-slate-950 font-bold rounded-xl text-xs transition"
                >
                  Actualizar Saldo
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ── BOTTOM NAV (4 PESTAÑAS) ─────────────────────────────────── */}
        <nav className="fixed bottom-0 w-full max-w-md bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 px-4 py-2 flex justify-between items-center z-40">
          <button
            onClick={() => setActiveTab('hoy')}
            className={`flex flex-col items-center gap-1 transition ${activeTab === 'hoy' ? 'text-sky-400 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Wallet size={18} />
            <span className="text-[10px]">Hoy</span>
          </button>

          <button
            onClick={() => setActiveTab('apartados')}
            className={`flex flex-col items-center gap-1 transition ${activeTab === 'apartados' ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Layers size={18} />
            <span className="text-[10px]">Apartados</span>
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="w-11 h-11 -mt-4 bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-full flex items-center justify-center shadow-lg shadow-sky-500/30 transition transform active:scale-95"
            title="Registrar movimiento"
          >
            <Plus size={22} strokeWidth={2.5} />
          </button>

          <button
            onClick={() => setActiveTab('futuro')}
            className={`flex flex-col items-center gap-1 transition ${activeTab === 'futuro' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <TrendingUp size={18} />
            <span className="text-[10px]">Futuro</span>
          </button>

          <button
            onClick={() => setActiveTab('calendario')}
            className={`flex flex-col items-center gap-1 transition ${activeTab === 'calendario' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <CalendarIcon size={18} />
            <span className="text-[10px]">Agenda</span>
          </button>
        </nav>

      </div>
    </div>
  );
}
