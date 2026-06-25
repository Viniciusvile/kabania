import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Search, Trash2, Square, RefreshCw, ZoomIn, ZoomOut,
  Monitor, Upload, X, MapPin, Building2, Pin, UserCheck,
  ChevronDown, Pencil, ArrowRight, UserPlus, Move, Loader2, Mail,
  Flame, Navigation, ShieldAlert, Users, Layers, Coffee,
  BriefcaseBusiness, Wifi, Home, CalendarOff, Video, Focus
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { safeQuery } from '../../utils/supabaseSafe';
import './DigitalTwinModule.css';

// ── DEPARTMENT COLOR PALETTE ──────────────────────────────────────────────────
const DEPT_PALETTE = [
  { label: 'TI',       color: '#22c55e', bg: 'rgba(34,197,94,0.18)',   border: 'rgba(34,197,94,0.55)'   },
  { label: 'Vendas',   color: '#3b82f6', bg: 'rgba(59,130,246,0.18)',  border: 'rgba(59,130,246,0.55)'  },
  { label: 'Design',   color: '#a855f7', bg: 'rgba(168,85,247,0.18)',  border: 'rgba(168,85,247,0.55)'  },
  { label: 'RH',       color: '#f59e0b', bg: 'rgba(245,158,11,0.18)',  border: 'rgba(245,158,11,0.55)'  },
  { label: 'Financeiro', color: '#ef4444', bg: 'rgba(239,68,68,0.18)', border: 'rgba(239,68,68,0.55)'   },
  { label: 'Marketing', color: '#ec4899', bg: 'rgba(236,72,153,0.18)', border: 'rgba(236,72,153,0.55)'  },
  { label: 'Suporte',  color: '#14b8a6', bg: 'rgba(20,184,166,0.18)',  border: 'rgba(20,184,166,0.55)'  },
  { label: 'Outros',   color: '#94a3b8', bg: 'rgba(148,163,184,0.18)', border: 'rgba(148,163,184,0.55)' },
];

// ── PRESENCE STATUS CONFIG ────────────────────────────────────────────────────
const STATUS_CONFIG = {
  office:  { label: 'Escritório',     color: '#22c55e', icon: 'office'    },
  remote:  { label: 'Home Office',    color: '#94a3b8', icon: 'home'      },
  vacation:{ label: 'Férias',         color: '#f59e0b', icon: 'vacation'  },
  meeting: { label: 'Em Reunião',     color: '#3b82f6', icon: 'meeting'   },
  focused: { label: 'Focado (DND)',   color: '#ef4444', icon: 'focus'     },
};

// ── DEFAULT SEED DATA ─────────────────────────────────────────────────────────
const DEFAULT_ROOMS = [
  { id: 'room-1', name: 'Open Space Principal', x: 5, y: 5, w: 55, h: 65, isOccupied: false },
  { id: 'room-2', name: 'Estúdio Design', x: 63, y: 5, w: 32, h: 38, isOccupied: true },
  { id: 'room-3', name: 'Sala Tallis', x: 63, y: 47, w: 32, h: 23, isOccupied: false },
];

const DEFAULT_DESKS = [
  { id: 'desk-1', x: 20, y: 18.1, status: 'free', user: null },
  { id: 'desk-2', x: 20, y: 29.0, status: 'free', user: null },
  { id: 'desk-3', x: 20, y: 39.7, status: 'free', user: null },
  { id: 'desk-4', x: 24, y: 18.1, status: 'free', user: null },
  { id: 'desk-5', x: 24, y: 29.0, status: 'free', user: null },
  { id: 'desk-6', x: 24, y: 39.7, status: 'free', user: null },
];

// ── CONSTANTS ────────────────────────────────────────────────────────────────
const DEFAULT_FLOORPLAN = '/default-floorplan.svg';

// ── HELPERS ───────────────────────────────────────────────────────────────────
function initials(name) {
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// ── COMPONENT ─────────────────────────────────────────────────────────────────
export default function DigitalTwinModule({ currentCompany, currentUser }) {
  const [rooms, setRooms] = useState(DEFAULT_ROOMS);
  const [desks, setDesks] = useState(DEFAULT_DESKS);
  const [backgroundImage, setBackgroundImage] = useState(DEFAULT_FLOORPLAN);
  const [isLayoutLoaded, setIsLayoutLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  // ── TEAM MEMBERS ──────────────────────────────────────────────────────────
  const [teamMembers, setTeamMembers] = useState([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedDeskId, setHighlightedDeskId] = useState(null);
  const [scale, setScale] = useState(1);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDraggingMap, setIsDraggingMap] = useState(false);
  const [mapDragStart, setMapDragStart] = useState({ x: 0, y: 0 });

  // activeTool: 'none' | 'add_desk' | 'add_room' | 'remove' | 'assign' | 'toggle_room' | 'emergency'
  const [activeTool, setActiveTool] = useState('none');
  const [draggedObject, setDraggedObject] = useState(null);

  // ── SALA: Draw-to-create state ────────────────────────────────────────────
  const [isDrawingRoom, setIsDrawingRoom] = useState(false);
  const [drawRect, setDrawRect] = useState(null);

  // ── DESK INFO MODAL ───────────────────────────────────────────────────────
  const [deskDetailsOpen, setDeskDetailsOpen] = useState(null);

  // ── MESA: Ghost cursor state ──────────────────────────────────────────────
  const [ghostPos, setGhostPos] = useState(null);

  // ── PESSOA: Rich assignment panel ─────────────────────────────────────────
  const [assignPanel, setAssignPanel] = useState(false);
  const [assignStep, setAssignStep] = useState('pick_person');
  const [selectedAssignee, setSelectedAssignee] = useState(null);
  const [personSearch, setPersonSearch] = useState('');
  const [newPersonForm, setNewPersonForm] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');
  const [newPersonRole, setNewPersonRole] = useState('');

  // Edit room name overlay
  const [editingRoomId, setEditingRoomId] = useState(null);
  const [editingRoomName, setEditingRoomName] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState(null);

  // Modal
  const [modal, setModal] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // Upload panel
  const [showUploadPanel, setShowUploadPanel] = useState(false);

  // ── 🆕 FILTRO POR DEPARTAMENTO ────────────────────────────────────────────
  const [deptFilterActive, setDeptFilterActive] = useState(false);
  const [activeDeptFilter, setActiveDeptFilter] = useState(null); // null = todos

  // ── 🆕 HEATMAP DE UTILIZAÇÃO ─────────────────────────────────────────────
  const [heatmapActive, setHeatmapActive] = useState(false);
  // Simula dados históricos: { [deskId]: occupancyRate 0-1 }
  const heatmapData = useMemo(() => {
    const data = {};
    desks.forEach(d => {
      // Se já tem usuário, ocupa 100%; caso contrário gera valor aleatório persistente baseado no id
      if (d.status === 'occupied') {
        data[d.id] = 0.85 + Math.random() * 0.15;
      } else {
        const hash = d.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
        data[d.id] = (hash % 100) / 100;
      }
    });
    return data;
  }, [desks]);

  // ── 🆕 WAYFINDING / SAÍDAS DE EMERGÊNCIA ─────────────────────────────────
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [emergencyExits, setEmergencyExits] = useState([]); // [{id, x, y}]
  const [wayfindingActive, setWayfindingActive] = useState(false);
  const [wayfindingFrom, setWayfindingFrom] = useState(null); // desk id
  const [wayfindingTo, setWayfindingTo] = useState(null);     // desk id
  const [wayfindingSearch, setWayfindingSearch] = useState('');
  const [showLayersPanel, setShowLayersPanel] = useState(false);

  // ── 🆕 STATUS DE PRESENÇA ─────────────────────────────────────────────────
  // { [memberId | email]: 'office' | 'remote' | 'vacation' | 'meeting' | 'focused' }
  const [presenceMap, setPresenceMap] = useState({});
  const [showStatusPanel, setShowStatusPanel] = useState(false);
  const [myStatus, setMyStatus] = useState('office');

  const mapViewportRef = useRef(null);
  const mapCanvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // ── FETCH TEAM MEMBERS FROM SUPABASE ──────────────────────────────────────
  useEffect(() => {
    const fetchMembers = async () => {
      if (!currentCompany?.id) return;
      setIsLoadingMembers(true);
      try {
        const { data, error } = await safeQuery(() =>
          supabase
            .from('profiles')
            .select('*')
            .eq('company_id', currentCompany.id)
        );
        if (!error && data) {
          setTeamMembers(data);
        }
      } catch (err) {
        console.error('[DigitalTwin] Error loading team members:', err);
      } finally {
        setIsLoadingMembers(false);
      }
    };
    fetchMembers();
  }, [currentCompany?.id]);

  // ── FETCH DIGITAL TWIN LAYOUT (SILENT BACKGROUND SYNC) ────────────────────
  const skipNextSaveRef = useRef(false);
  const skipNextDeskSaveRef = useRef(false);
  
  useEffect(() => {
    const fetchLayout = async () => {
      // If no company, we are already using defaults, just mark as loaded
      if (!currentCompany?.id) {
        setIsLayoutLoaded(true);
        return;
      }
      
      // Step 1: Rapid fetch of rooms and desks
      const [roomsResp, desksResp] = await Promise.all([
        supabase.from('digital_twin_rooms').select('*').eq('company_id', currentCompany.id),
        supabase.from('digital_twin_desks').select('*').eq('company_id', currentCompany.id)
      ]);
      
      // If we got real data from DB, replace the defaults
      if ((roomsResp.data && roomsResp.data.length > 0) || (desksResp.data && desksResp.data.length > 0)) {
        skipNextSaveRef.current = true;
        skipNextDeskSaveRef.current = true;

        if (roomsResp.data && roomsResp.data.length > 0) {
          const dbRooms = roomsResp.data.map(r => ({ id: r.id, name: r.name, x: r.x, y: r.y, w: r.w, h: r.h, isOccupied: r.is_occupied }));
          setRooms(dbRooms);
          setSelectedRoomId(dbRooms[0]?.id || null);
        }
        
        if (desksResp.data && desksResp.data.length > 0) {
          setDesks(desksResp.data.map(d => ({ id: d.id, x: d.x, y: d.y, status: d.status, user: d.user_data || null })));
        }
      }

      // Mark as transition finished - user edits from now on will sync
      setIsLayoutLoaded(true);

      // Step 2: Lazy fetch of background image (settings)
      const settingsResp = await supabase.from('digital_twin_settings')
        .select('background_image')
        .eq('company_id', currentCompany.id)
        .single();
      
      if (!settingsResp.error && settingsResp.data?.background_image) {
        setBackgroundImage(settingsResp.data.background_image);
      }
    };
    fetchLayout();
  }, [currentCompany?.id]);
  // ── AUTOSAVE ROOMS ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isLayoutLoaded || !currentCompany?.id) return;
    if (skipNextSaveRef.current) {
      // This is the setState from fetchLayout → skip it
      skipNextSaveRef.current = false;
      return;
    }
    
    const timeout = setTimeout(async () => {
      if (rooms.length === 0) return;
      
      setIsSyncing(true);
      console.log('[DigitalTwin] Saving', rooms.length, 'rooms to Supabase...');
      const mapped = rooms.map(r => ({
        id: r.id, company_id: currentCompany.id,
        name: r.name, x: r.x, y: r.y, w: r.w, h: r.h, is_occupied: r.isOccupied
      }));
      
      const res = await safeQuery(() => supabase.from('digital_twin_rooms').upsert(mapped));
      setIsSyncing(false);
      
      if (res?.error) {
        console.error('[DigitalTwin] ❌ Error saving rooms:', res.error);
      } else {
        console.log('[DigitalTwin] ✅ Rooms saved successfully');
        setLastSaved(new Date());
      }
    }, 800);
    return () => clearTimeout(timeout);
  }, [rooms, isLayoutLoaded, currentCompany?.id]);

  // ── AUTOSAVE DESKS ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isLayoutLoaded || !currentCompany?.id) return;
    // Skip the initial load from DB
    if (skipNextDeskSaveRef.current) {
      skipNextDeskSaveRef.current = false;
      return;
    }
    
    const timeout = setTimeout(async () => {
      if (desks.length === 0) return;
      
      setIsSyncing(true);
      console.log('[DigitalTwin] Saving', desks.length, 'desks to Supabase...');
      const mapped = desks.map(d => ({
        id: d.id, company_id: currentCompany.id,
        x: d.x, y: d.y, status: d.status, user_data: d.user || null
      }));
      
      const res = await safeQuery(() => supabase.from('digital_twin_desks').upsert(mapped));
      setIsSyncing(false);
      
      if (res?.error) {
        console.error('[DigitalTwin] ❌ Error saving desks:', res.error);
      } else {
        console.log('[DigitalTwin] ✅ Desks saved successfully');
        setLastSaved(new Date());
      }
    }, 800);
    return () => clearTimeout(timeout);
  }, [desks, isLayoutLoaded, currentCompany?.id]);

  // ── STATISTICS ─────────────────────────────────────────────────────────────
  const freeDesks = desks.filter(d => d.status === 'free').length;
  const occupiedDesks = desks.filter(d => d.status === 'occupied').length;
  const freeRooms = rooms.filter(r => !r.isOccupied).length;
  const selectedRoom = rooms.find(r => r.id === selectedRoomId);

  // ── ROSTER: merge teamMembers (from Supabase) with desk assignment state ──
  // Each entry = a real team member, enriched with currentDeskId if they are assigned
  const roster = teamMembers.map(member => {
    // Try to find if this member is already assigned to a desk
    const displayName = member.first_name
      ? `${member.first_name} ${member.last_name || ''}`.trim()
      : (member.name || member.email?.split('@')[0] || 'Membro');
    const memberRole = member.role === 'admin' ? 'Administrador' : (member.specialty || member.role || 'Membro');
    const avatar = initials(displayName);

    const assignedDesk = desks.find(
      d => d.user && (
        d.user.email === member.email ||
        d.user.memberId === member.id ||
        d.user.name === displayName
      )
    );

    return {
      id: member.id,
      email: member.email,
      name: displayName,
      role: memberRole,
      avatar,
      isOnline: true,
      currentDeskId: assignedDesk?.id || null,
    };
  });

  const filteredRoster = roster.filter(p =>
    p.name.toLowerCase().includes(personSearch.toLowerCase()) ||
    p.role.toLowerCase().includes(personSearch.toLowerCase()) ||
    (p.email || '').toLowerCase().includes(personSearch.toLowerCase())
  );

  // ── WHEEL ZOOM ──────────────────────────────────────────────────────────────
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    setScale(prev => Math.min(Math.max(0.3, prev - e.deltaY * 0.001), 3));
  }, []);

  useEffect(() => {
    const mapEl = mapViewportRef.current;
    if (mapEl) mapEl.addEventListener('wheel', handleWheel, { passive: false });

    const onGlobalMove = (e) => handleMouseMove(e);
    const onGlobalUp = (e) => handleMouseUp(e);
    window.addEventListener('mousemove', onGlobalMove);
    window.addEventListener('mouseup', onGlobalUp);

    // Escape cancels active tool
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setActiveTool('none');
        setAssignPanel(false);
        setAssignStep('pick_person');
        setSelectedAssignee(null);
        setIsDrawingRoom(false);
        setDrawRect(null);
        setGhostPos(null);
      }
    };
    window.addEventListener('keydown', onKey);

    return () => {
      if (mapEl) mapEl.removeEventListener('wheel', handleWheel);
      window.removeEventListener('mousemove', onGlobalMove);
      window.removeEventListener('mouseup', onGlobalUp);
      window.removeEventListener('keydown', onKey);
    };
  }, [isDraggingMap, draggedObject, mapDragStart, dragOffset, isDrawingRoom, drawRect, activeTool]);

  // ── SEARCH ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!searchTerm.trim()) { setHighlightedDeskId(null); return; }
    const match = desks.find(d => d.user && d.user.name.toLowerCase().includes(searchTerm.toLowerCase()));
    setHighlightedDeskId(match ? match.id : null);
  }, [searchTerm, desks]);

  // ── COORDINATE HELPER ──────────────────────────────────────────────────────
  // Convert viewport (clientX, clientY) → canvas % coords
  const viewportToCanvasPct = (clientX, clientY) => {
    if (!mapCanvasRef.current) return { x: 0, y: 0 };
    const rect = mapCanvasRef.current.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * 100,
      y: ((clientY - rect.top) / rect.height) * 100,
    };
  };

  // ── MAP MOUSEDOWN ──────────────────────────────────────────────────────────
  const handleMapMouseDown = (e) => {
    if (e.button !== 0) return;
    if (e.target.closest('.dt-room') || e.target.closest('.dt-desk')) return;

    // SALA: start drawing
    if (activeTool === 'add_room') {
      setIsDrawingRoom(true);
      setDrawRect({ x1: e.clientX, y1: e.clientY, x2: e.clientX, y2: e.clientY });
      return;
    }

    // default: pan map
    setIsDraggingMap(true);
    setMapDragStart({ x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y });
  };

  // ── MAP MOUSEMOVE ──────────────────────────────────────────────────────────
  const handleMouseMove = (e) => {
    // Map pan
    if (isDraggingMap) {
      setDragOffset({ x: e.clientX - mapDragStart.x, y: e.clientY - mapDragStart.y });
    }

    // Object drag
    if (draggedObject && mapCanvasRef.current) {
      const rect = mapCanvasRef.current.getBoundingClientRect();
      const newX = ((e.clientX - rect.left - draggedObject.offsetX) / rect.width) * 100;
      const newY = ((e.clientY - rect.top - draggedObject.offsetY) / rect.height) * 100;
      if (draggedObject.type === 'room') {
        setRooms(prev => prev.map(r => r.id === draggedObject.id ? { ...r, x: newX, y: newY } : r));
      } else if (draggedObject.type === 'desk') {
        setDesks(prev => prev.map(d => d.id === draggedObject.id ? { ...d, x: newX, y: newY } : d));
      }
    }

    // SALA: update draw rect live
    if (isDrawingRoom) {
      setDrawRect(prev => prev ? { ...prev, x2: e.clientX, y2: e.clientY } : null);
      return;
    }

    // MESA: update ghost cursor
    if (activeTool === 'add_desk') {
      setGhostPos({ x: e.clientX, y: e.clientY });
    } else {
      setGhostPos(null);
    }
  };

  // ── MAP MOUSEUP ────────────────────────────────────────────────────────────
  const handleMouseUp = (e) => {
    setIsDraggingMap(false);
    setDraggedObject(null);

    // SALA: finalize drawn rectangle
    if (isDrawingRoom && drawRect) {
      setIsDrawingRoom(false);
      const dx = drawRect.x2 - drawRect.x1;
      const dy = drawRect.y2 - drawRect.y1;
      const minDrag = 40; // px mínimo para criar sala
      if (Math.abs(dx) > minDrag && Math.abs(dy) > minDrag && mapCanvasRef.current) {
        const canvasRect = mapCanvasRef.current.getBoundingClientRect();
        const x1pct = ((Math.min(drawRect.x1, drawRect.x2) - canvasRect.left) / canvasRect.width) * 100;
        const y1pct = ((Math.min(drawRect.y1, drawRect.y2) - canvasRect.top) / canvasRect.height) * 100;
        const wpct = (Math.abs(dx) / canvasRect.width) * 100;
        const hpct = (Math.abs(dy) / canvasRect.height) * 100;

        // open name modal with the exact rect
        setModal({
          isOpen: true,
          title: 'Nova Sala',
          message: 'Dê um nome para este ambiente:',
          inputValue: 'Nova Sala',
          showInput: true,
          onConfirm: (name) => {
            if (!name?.trim()) return;
            const newRoom = { id: `room-${Date.now()}`, name: name.trim(), x: x1pct, y: y1pct, w: wpct, h: hpct, isOccupied: false };
            setRooms(prev => [...prev, newRoom]);
            setSelectedRoomId(newRoom.id);
            setActiveTool('none');
          }
        });
      }
      setDrawRect(null);
    }
  };

  // ── CANVAS CLICK ───────────────────────────────────────────────────────────
  const handleMapCanvasClick = (e) => {
    if (isDraggingMap || draggedObject || isDrawingRoom) return;

    // MESA: place desk (tool stays active — persistent mode)
    if (activeTool === 'add_desk') {
      const { x, y } = viewportToCanvasPct(e.clientX, e.clientY);
      const newDesk = { id: `desk-${Date.now()}`, x, y, status: 'free', user: null };
      setDesks(prev => [...prev, newDesk]);
      // do NOT call setActiveTool('none') → persistent mode
    }
    // EMERGENCY: place exit marker
    if (activeTool === 'emergency') {
      handleEmergencyClick(e);
    }
  };

  // ── OBJECT DRAG ────────────────────────────────────────────────────────────
  const startDragObject = (e, id, type) => {
    if (activeTool !== 'none' || e.button !== 0) return;
    e.stopPropagation();
    const objRect = e.currentTarget.getBoundingClientRect();
    setDraggedObject({ id, type, offsetX: e.clientX - objRect.left, offsetY: e.clientY - objRect.top });
  };

  // ── DESK CLICK ─────────────────────────────────────────────────────────────
  const handleDeskClick = (e, desk) => {
    e.stopPropagation();

    if (activeTool === 'remove') {
      openConfirm(`Remover esta mesa${desk.user ? ` (${desk.user.name})` : ''}?`, async () => {
        setDesks(prev => prev.filter(d => d.id !== desk.id));
        await safeQuery(() => supabase.from('digital_twin_desks').delete().eq('id', desk.id));
      });
      return;
    }

    // PESSOA — pick_desk step: assign or move the selected person here
    if (activeTool === 'assign' && assignStep === 'pick_desk' && selectedAssignee) {
      const person = selectedAssignee;

      if (desk.id === person.currentDeskId) {
        // Clicked the same desk → unassign (free the desk)
        openConfirm(`Remover ${person.name} da mesa atual?`, () => {
          setDesks(prev => prev.map(d => d.id === desk.id ? { ...d, status: 'free', user: null } : d));
          resetAssign();
        });
        return;
      }

      if (desk.status === 'occupied' && desk.user) {
        // Occupied by someone else → confirm swap
        openConfirm(
          `${desk.user.name} já está nessa mesa. Trocar por ${person.name}?`,
          () => {
            setDesks(prev => prev.map(d => {
              if (d.id === desk.id) return { ...d, status: 'occupied', user: { name: person.name, role: person.role, avatar: person.avatar, isOnline: true } };
              if (d.id === person.currentDeskId) return { ...d, status: 'free', user: null };
              return d;
            }));
            resetAssign();
          }
        );
        return;
      }

      // Free desk → assign directly, vacate old desk if any
      setDesks(prev => prev.map(d => {
        if (d.id === desk.id) return {
          ...d, status: 'occupied',
          user: {
            name: person.name,
            role: person.role,
            avatar: person.avatar,
            email: person.email,
            memberId: person.id,
            isOnline: true
          }
        };
        if (person.currentDeskId && d.id === person.currentDeskId) return { ...d, status: 'free', user: null };
        return d;
      }));
      resetAssign();
      return;
    }

    if (desk.status === 'occupied' && desk.user) {
      setDeskDetailsOpen(desk);
    }
  };

  // ── ROOM CLICK ─────────────────────────────────────────────────────────────
  const handleRoomClick = (e, room) => {
    if (activeTool === 'add_desk') return; // Allow click to bubble to canvas to create desk
    
    e.stopPropagation();
    if (activeTool === 'remove') {
      openConfirm(`Apagar permanentemente "${room.name}"?`, async () => {
        setRooms(prev => prev.filter(r => r.id !== room.id));
        await safeQuery(() => supabase.from('digital_twin_rooms').delete().eq('id', room.id));
        if (selectedRoomId === room.id) setSelectedRoomId(rooms[0]?.id || null);
      });
      return;
    }
    if (activeTool === 'toggle_room') {
      setRooms(prev => prev.map(r => r.id === room.id ? { ...r, isOccupied: !r.isOccupied } : r));
      return;
    }
    setSelectedRoomId(room.id);
  };

  // ── ROOM NAME EDIT ─────────────────────────────────────────────────────────
  const startEditRoomName = (e, room) => {
    e.stopPropagation();
    setEditingRoomId(room.id);
    setEditingRoomName(room.name);
  };

  const commitRoomName = () => {
    if (editingRoomName.trim())
      setRooms(prev => prev.map(r => r.id === editingRoomId ? { ...r, name: editingRoomName.trim() } : r));
    setEditingRoomId(null);
  };

  // ── CLEAR ──────────────────────────────────────────────────────────────────
  const clearAllRooms = () => {
    openConfirm('Remover TODAS as salas e mesas do mapa?', async () => {
      setRooms([]); setDesks([]); setSelectedRoomId(null);
      await safeQuery(() => supabase.from('digital_twin_rooms').delete().eq('company_id', currentCompany?.id));
      await safeQuery(() => supabase.from('digital_twin_desks').delete().eq('company_id', currentCompany?.id));
    });
  };

  // ── BACKGROUND UPLOAD ──────────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => { 
      const b64 = ev.target.result;
      setBackgroundImage(b64); 
      setShowUploadPanel(false); 
      
      if (currentCompany?.id) {
        const res = await safeQuery(() => supabase.from('digital_twin_settings').upsert({
          company_id: currentCompany.id,
          background_image: b64,
          updated_at: new Date().toISOString()
        }));
        if (res?.error) alert('Erro ao salvar imagem de fundo: ' + res.error.message);
      }
    };
    reader.readAsDataURL(file);
  };

  // ── CONFIRM MODAL ──────────────────────────────────────────────────────────
  const openConfirm = (message, onConfirm) =>
    setModal({ isOpen: true, title: 'Confirmar', message, showInput: false, onConfirm });
  const closeModal = () => setModal(prev => ({ ...prev, isOpen: false }));

  // ── PESSOA PANEL HELPERS ───────────────────────────────────────────────────
  const openAssignPanel = () => {
    setAssignStep('pick_person');
    setSelectedAssignee(null);
    setPersonSearch('');
    setNewPersonForm(false);
    setAssignPanel(true);
  };

  const resetAssign = () => {
    setAssignStep('pick_person');
    setSelectedAssignee(null);
    setPersonSearch('');
    setNewPersonForm(false);
  };

  const selectPersonForAssign = (person) => {
    setSelectedAssignee(person);
    setAssignStep('pick_desk');
  };

  const addNewPerson = () => {
    if (!newPersonName.trim()) return;
    const p = {
      name: newPersonName.trim(),
      role: newPersonRole.trim() || 'Colaborador',
      avatar: initials(newPersonName.trim()),
      currentDeskId: null,
    };
    setSelectedAssignee(p);
    setAssignStep('pick_desk');
    setNewPersonForm(false);
    setNewPersonName('');
    setNewPersonRole('');
  };

  // ── TOOL TOGGLE ────────────────────────────────────────────────────────────
  const toggleTool = (tool) => {
    if (tool === 'assign') {
      if (activeTool === 'assign') {
        setActiveTool('none');
        setAssignPanel(false);
        resetAssign();
      } else {
        setActiveTool('assign');
        openAssignPanel();
      }
      return;
    }
    const next = activeTool === tool ? 'none' : tool;
    setActiveTool(next);
    if (next !== 'assign') { setAssignPanel(false); resetAssign(); }
    if (next !== 'add_desk') setGhostPos(null);
    if (next !== 'add_room') { setIsDrawingRoom(false); setDrawRect(null); }
  };

  // ── SEARCH ─────────────────────────────────────────────────────────────────
  const searchResults = searchTerm.trim()
    ? desks.filter(d => d.user && d.user.name.toLowerCase().includes(searchTerm.toLowerCase()))
    : [];

  const centerOnDesk = (desk) => {
    setHighlightedDeskId(desk.id);
    setSearchTerm(desk.user.name);
    if (mapCanvasRef.current) {
      const rect = mapCanvasRef.current.getBoundingClientRect();
      const px = (desk.x / 100) * rect.width;
      const py = (desk.y / 100) * rect.height;
      const vw = mapViewportRef.current?.clientWidth || 800;
      const vh = mapViewportRef.current?.clientHeight || 600;
      setDragOffset({ x: vw / 2 - px * scale, y: vh / 2 - py * scale });
    }
  };

  // ── Draw rect preview (in viewport px) ────────────────────────────────────
  const drawRectStyle = drawRect ? {
    left: Math.min(drawRect.x1, drawRect.x2),
    top: Math.min(drawRect.y1, drawRect.y2),
    width: Math.abs(drawRect.x2 - drawRect.x1),
    height: Math.abs(drawRect.y2 - drawRect.y1),
  } : null;

  // ── 🆕 HEATMAP: cor baseada em taxa 0-1 ──────────────────────────────────
  const heatColor = (rate) => {
    if (rate >= 0.75) return { bg: 'rgba(239,68,68,0.45)',  border: '#ef4444', label: 'Alta' };
    if (rate >= 0.45) return { bg: 'rgba(245,158,11,0.4)', border: '#f59e0b', label: 'Média' };
    return             { bg: 'rgba(34,197,94,0.35)',        border: '#22c55e', label: 'Baixa' };
  };

  // ── 🆕 DEPT: cor por departamento do usuário ──────────────────────────────
  const getDeptColor = (desk) => {
    if (!desk.user) return null;
    const role = (desk.user.role || '').toLowerCase();
    return DEPT_PALETTE.find(d => role.includes(d.label.toLowerCase())) || DEPT_PALETTE[DEPT_PALETTE.length - 1];
  };

  // ── 🆕 PRESENCE: pega status do usuário da mesa ───────────────────────────
  const getDeskPresence = (desk) => {
    if (!desk.user) return null;
    const key = desk.user.email || desk.user.memberId || desk.user.name;
    return presenceMap[key] || 'office';
  };

  // ── 🆕 WAYFINDING: estilo de linha SVG entre duas mesas ──────────────────
  const wayfindingLine = useMemo(() => {
    if (!wayfindingFrom || !wayfindingTo || !mapCanvasRef.current) return null;
    const fromDesk = desks.find(d => d.id === wayfindingFrom);
    const toDesk = desks.find(d => d.id === wayfindingTo);
    if (!fromDesk || !toDesk) return null;
    return { x1: fromDesk.x, y1: fromDesk.y, x2: toDesk.x, y2: toDesk.y };
  }, [wayfindingFrom, wayfindingTo, desks]);

  // ── 🆕 EMERGENCY: colocar saída clicando no canvas ───────────────────────
  const handleEmergencyClick = (e) => {
    if (activeTool !== 'emergency') return;
    const { x, y } = viewportToCanvasPct(e.clientX, e.clientY);
    setEmergencyExits(prev => [...prev, { id: `exit-${Date.now()}`, x, y }]);
  };

  // ── 🆕 STATUS: atualizar meu status e propagar ao mapa ───────────────────
  const updateMyStatus = (status) => {
    setMyStatus(status);
    const myKey = currentUser;
    if (myKey) setPresenceMap(prev => ({ ...prev, [myKey]: status }));
    setShowStatusPanel(false);
  };

  // ── 🆕 PRESENCE: setar status de qualquer membro manualmente ─────────────
  const setMemberStatus = (key, status) => {
    setPresenceMap(prev => ({ ...prev, [key]: status }));
  };

  // ── 🆕 DEPT FILTER: filtra mesas por dept selecionado ────────────────────
  const isDeskVisibleByDept = (desk) => {
    if (!deptFilterActive || activeDeptFilter === null) return true;
    if (!desk.user) return activeDeptFilter === 'Outros';
    const role = (desk.user.role || '').toLowerCase();
    if (activeDeptFilter === 'Outros') {
      return !DEPT_PALETTE.slice(0, -1).some(d => role.includes(d.label.toLowerCase()));
    }
    return role.includes(activeDeptFilter.toLowerCase());
  };

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div className="dt-root">

      {/* ── CANVAS VIEWPORT ── */}
      <div
        className="dt-viewport"
        ref={mapViewportRef}
        onMouseDown={handleMapMouseDown}
        data-tool={activeTool}
        style={{ cursor: activeTool === 'add_room' ? 'crosshair' : (activeTool === 'add_desk' ? 'none' : isDraggingMap ? 'grabbing' : 'grab') }}
      >

        {/* SALA: live draw preview (positioned in viewport) */}
        {isDrawingRoom && drawRectStyle && (
          <div className="dt-draw-preview" style={drawRectStyle} />
        )}

        {/* MESA: ghost cursor preview */}
        {activeTool === 'add_desk' && ghostPos && (
          <div
            className="dt-ghost-desk"
            style={{ left: ghostPos.x, top: ghostPos.y }}
          >
            <Monitor size={17} strokeWidth={1.5} />
          </div>
        )}

        <div
          className="dt-canvas"
          style={{ transform: `translate(${dragOffset.x}px, ${dragOffset.y}px) scale(${scale})` }}
        >
          <div className="dt-dot-grid" ref={mapCanvasRef} onClick={handleMapCanvasClick}>

            {/* BACKGROUND FLOOR PLAN */}
            {backgroundImage && (
              <img src={backgroundImage} alt="Planta baixa" className="dt-bg-image" draggable={false} />
            )}

            {/* ROOMS */}
            {rooms.map(room => (
              <div
                key={room.id}
                className={`dt-room ${room.isOccupied ? 'occupied' : 'free'} ${selectedRoomId === room.id ? 'selected' : ''}`}
                style={{ top: `${room.y}%`, left: `${room.x}%`, width: `${room.w}%`, height: `${room.h}%` }}
                onMouseDown={(e) => startDragObject(e, room.id, 'room')}
                onClick={(e) => handleRoomClick(e, room)}
              >
                <div className="dt-room-header">
                  <div className="dt-room-status-dot" />
                  {editingRoomId === room.id ? (
                    <input
                      className="dt-room-name-input"
                      value={editingRoomName}
                      onChange={e => setEditingRoomName(e.target.value)}
                      onBlur={commitRoomName}
                      onKeyDown={e => { if (e.key === 'Enter') commitRoomName(); e.stopPropagation(); }}
                      onClick={e => e.stopPropagation()}
                      autoFocus
                    />
                  ) : (
                    <span className="dt-room-name">{room.name}</span>
                  )}
                  <button className="dt-room-edit-btn" onClick={(e) => startEditRoomName(e, room)} title="Renomear sala">
                    <Pencil size={11} />
                  </button>
                </div>
                <div className="dt-room-body" />
              </div>
            ))}

            {/* DESKS */}
            {desks.map(desk => {
              const isMatch = !!highlightedDeskId && desk.id === highlightedDeskId;
              const isTargetable = activeTool === 'assign' && assignStep === 'pick_desk';
              const isWayfindingFrom = wayfindingFrom === desk.id;
              const isWayfindingTo = wayfindingTo === desk.id;
              const deptColor = deptFilterActive ? getDeptColor(desk) : null;
              const heat = heatmapActive ? heatmapData[desk.id] : null;
              const heatC = heat !== null && heat !== undefined ? heatColor(heat) : null;
              const presence = getDeskPresence(desk);
              const isRemote = presence === 'remote';
              const isFocused = presence === 'focused';
              const isVacation = presence === 'vacation';
              const isMeeting = presence === 'meeting';
              const visibleByDept = isDeskVisibleByDept(desk);

              const deskStyle = {
                top: `${desk.y}%`,
                left: `${desk.x}%`,
                opacity: visibleByDept ? 1 : 0.15,
              };

              let baseStyle = {};
              if (heatC) baseStyle = { background: heatC.bg, borderColor: heatC.border };
              else if (deptColor) baseStyle = { background: deptColor.bg, borderColor: deptColor.border };
              if (isRemote || isVacation) baseStyle = { ...baseStyle, opacity: 0.45, filter: 'grayscale(0.8)' };
              if (isFocused) baseStyle = { ...baseStyle, boxShadow: '0 0 0 3px #ef4444, 0 0 12px rgba(239,68,68,0.4)' };
              if (isMeeting) baseStyle = { ...baseStyle, boxShadow: '0 0 0 3px #3b82f6, 0 0 12px rgba(59,130,246,0.4)' };

              return (
                <div
                  key={desk.id}
                  className={`dt-desk ${desk.status} ${isMatch ? 'highlighted' : ''} ${isTargetable ? 'targetable' : ''} ${isWayfindingFrom ? 'wf-from' : ''} ${isWayfindingTo ? 'wf-to' : ''}`}
                  style={deskStyle}
                  onMouseDown={(e) => startDragObject(e, desk.id, 'desk')}
                  onClick={(e) => {
                    if (wayfindingActive) {
                      e.stopPropagation();
                      if (!wayfindingFrom) { setWayfindingFrom(desk.id); return; }
                      if (desk.id !== wayfindingFrom) { setWayfindingTo(desk.id); return; }
                    }
                    handleDeskClick(e, desk);
                  }}
                >
                  <div className="dt-desk-base" style={baseStyle}>
                    {desk.status !== 'occupied' && <Monitor size={17} strokeWidth={1.5} />}
                    {heatC && heatmapActive && (
                      <span className="dt-heat-label">{Math.round((heatmapData[desk.id] || 0) * 100)}%</span>
                    )}
                  </div>
                  {desk.status === 'occupied' && desk.user && (
                    <div className="dt-desk-badge" style={deptColor && deptFilterActive ? { background: `linear-gradient(135deg, ${deptColor.color}, ${deptColor.color}aa)` } : {}}>
                      {desk.user.avatar}
                      <span className={`dt-status-dot ${desk.user.isOnline && presence === 'office' ? 'online' : 'offline'}`} />
                    </div>
                  )}
                  {/* Presence indicator icon */}
                  {presence && presence !== 'office' && desk.status === 'occupied' && (
                    <div className={`dt-presence-badge dt-presence-${presence}`} title={STATUS_CONFIG[presence]?.label}>
                      {presence === 'remote'   && '🏠'}
                      {presence === 'vacation' && '🌴'}
                      {presence === 'meeting'  && '📹'}
                      {presence === 'focused'  && '🎯'}
                    </div>
                  )}
                  {isMatch && (
                    <div className="dt-pin-flag">
                      <MapPin size={12} /> {desk.user?.name}
                    </div>
                  )}
                  {deptColor && deptFilterActive && (
                    <div className="dt-dept-dot" style={{ background: deptColor.color }} title={deptColor.label} />
                  )}
                </div>
              );
            })}

            {/* WAYFINDING SVG LINE */}
            {wayfindingLine && (
              <svg className="dt-wayfinding-svg" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 100 }}>
                <defs>
                  <marker id="wf-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                    <path d="M0,0 L0,6 L8,3 z" fill="#6366f1" />
                  </marker>
                </defs>
                <line
                  x1={`${wayfindingLine.x1}%`} y1={`${wayfindingLine.y1}%`}
                  x2={`${wayfindingLine.x2}%`} y2={`${wayfindingLine.y2}%`}
                  stroke="#6366f1" strokeWidth="2.5" strokeDasharray="8 5"
                  markerEnd="url(#wf-arrow)" opacity="0.85"
                />
                <circle cx={`${wayfindingLine.x1}%`} cy={`${wayfindingLine.y1}%`} r="6" fill="#22c55e" opacity="0.9" />
                <circle cx={`${wayfindingLine.x2}%`} cy={`${wayfindingLine.y2}%`} r="6" fill="#6366f1" opacity="0.9" />
              </svg>
            )}

            {/* EMERGENCY EXITS */}
            {emergencyMode && emergencyExits.map(exit => (
              <div
                key={exit.id}
                className="dt-emergency-exit"
                style={{ top: `${exit.y}%`, left: `${exit.x}%` }}
                onClick={(e) => { e.stopPropagation(); setEmergencyExits(prev => prev.filter(x => x.id !== exit.id)); }}
                title="Saída de emergência (clique para remover)"
              >
                🚪
              </div>
            ))}

          </div>
        </div>
      </div>


      {/* ── FLOATING UI LAYER ── */}
      <div className="dt-ui-layer">

        {/* TOP-LEFT: ROOM LABEL */}
        <div className="dt-room-label-overlay">
          <Pencil size={14} className="dt-room-label-icon" />
          {selectedRoom ? (
            <span className="dt-room-label-text">{selectedRoom.name}</span>
          ) : (
            <span className="dt-room-label-text dt-room-label-empty">Selecione uma sala</span>
          )}
          {rooms.length > 0 && (
            <div className="dt-room-picker">
              <ChevronDown size={13} />
              <div className="dt-room-picker-dropdown">
                {rooms.map(r => (
                  <button key={r.id} onClick={() => setSelectedRoomId(r.id)} className={r.id === selectedRoomId ? 'active' : ''}>
                    <span className={`dt-room-pick-dot ${r.isOccupied ? 'occ' : 'free'}`} />
                    {r.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* TOP-CENTER: MAIN TOOLBAR */}
        <div className="dt-toolbar-glass">
          <div className="dt-toolbar-left">
            <span className="dt-toolbar-title">Workspace Builder</span>
            {isSyncing && <span className="dt-sync-dot-tiny" title="Sincronizando..." />}
          </div>
          <div className="dt-toolbar-actions">

            {/* Search */}
            <div className="dt-search-wrap">
              <div className="dt-search-bar">
                <Search size={15} />
                <input
                  type="text"
                  placeholder="Buscar colaborador..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Escape') { setSearchTerm(''); setHighlightedDeskId(null); } }}
                />
                {searchTerm && (
                  <button className="dt-search-clear" onClick={() => { setSearchTerm(''); setHighlightedDeskId(null); }}>
                    <X size={12} />
                  </button>
                )}
              </div>
              {searchResults.length > 0 && (
                <div className="dt-search-results">
                  {searchResults.map(desk => (
                    <button key={desk.id} className="dt-search-result-item" onClick={() => centerOnDesk(desk)}>
                      <div className="dt-sr-avatar">{desk.user?.avatar || initials(desk.user?.name || 'M')}</div>
                      <div className="dt-sr-info">
                        <span className="dt-sr-name">{desk.user?.name}</span>
                        <span className="dt-sr-role">{desk.user?.role}</span>
                      </div>
                      <Pin size={12} className="dt-sr-pin" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="dt-tb-sep" />

            {/* SALA: hint changes to "drag to draw" */}
            <button
              className={`dt-tb-btn ${activeTool === 'add_room' ? 'active' : ''}`}
              onClick={() => toggleTool('add_room')}
              title="Clique e arraste no mapa para desenhar uma sala"
            >
              <Square size={15} /> Sala
            </button>

            {/* MESA: persistent mode */}
            <button
              className={`dt-tb-btn ${activeTool === 'add_desk' ? 'active' : ''}`}
              onClick={() => toggleTool('add_desk')}
              title="Clique no mapa para adicionar mesas. ESC para sair."
            >
              <Monitor size={15} /> Mesa
            </button>

            {/* PESSOA: opens rich panel */}
            <button
              className={`dt-tb-btn ${activeTool === 'assign' ? 'active' : ''}`}
              onClick={() => toggleTool('assign')}
              title="Abrir painel de colaboradores"
            >
              <UserCheck size={15} /> Pessoa
            </button>

            <div className="dt-tb-sep" />

            {/* Toggle Room Occupancy */}
            <button
              className={`dt-tb-btn ${activeTool === 'toggle_room' ? 'active-amber' : ''}`}
              onClick={() => toggleTool('toggle_room')}
              title="Clique em uma sala para alternar disponibilidade"
            >
              <RefreshCw size={15} />
            </button>

            {/* Tool: Remove */}
            <button
              className={`dt-tb-btn ${activeTool === 'remove' ? 'active-red' : ''}`}
              onClick={() => toggleTool('remove')}
              title="Borracha: Clique para remover"
            >
              <Trash2 size={15} />
            </button>

            <div className="dt-tb-sep" />

            {/* Background Upload */}
            <button
              className="dt-tb-btn"
              onClick={() => setShowUploadPanel(true)}
              title="Trocar planta baixa"
            >
              <Upload size={15} />
            </button>

            <div className="dt-tb-sep" />

            {/* 🆕 Camadas / Visualização */}
            <button
              className={`dt-tb-btn ${showLayersPanel ? 'active' : ''}`}
              onClick={() => setShowLayersPanel(v => !v)}
              title="Camadas de visualização"
            >
              <Layers size={15} /> Camadas
            </button>

            {/* 🆕 Status de Presença */}
            <button
              className={`dt-tb-btn ${showStatusPanel ? 'active' : ''}`}
              onClick={() => setShowStatusPanel(v => !v)}
              title="Status de presença"
            >
              <Users size={15} /> Status
            </button>

            <div className="dt-tb-sep" />

            {/* Clear All */}
            <button
              className="dt-tb-btn dt-btn-danger"
              onClick={clearAllRooms}
              title="Limpar tudo"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* 🆕 LAYERS PANEL */}
        {showLayersPanel && (
          <div className="dt-layers-panel">
            <div className="dt-lp-header">
              <Layers size={15} />
              <span>Camadas de Visualização</span>
              <button className="dt-ap-close" onClick={() => setShowLayersPanel(false)}><X size={14} /></button>
            </div>

            {/* --- Filtro por Departamento --- */}
            <div className="dt-lp-section">
              <div className="dt-lp-section-title">
                <Users size={13} />
                Heatmap de Equipes
                <button
                  className={`dt-lp-toggle ${deptFilterActive ? 'on' : ''}`}
                  onClick={() => { setDeptFilterActive(v => !v); setActiveDeptFilter(null); }}
                />
              </div>
              {deptFilterActive && (
                <div className="dt-lp-dept-chips">
                  <button
                    className={`dt-lp-chip ${activeDeptFilter === null ? 'active' : ''}`}
                    onClick={() => setActiveDeptFilter(null)}
                    style={{ borderColor: '#6366f1', color: '#6366f1' }}
                  >Todos</button>
                  {DEPT_PALETTE.map(d => (
                    <button
                      key={d.label}
                      className={`dt-lp-chip ${activeDeptFilter === d.label ? 'active' : ''}`}
                      style={{ borderColor: d.color, color: d.color, background: activeDeptFilter === d.label ? d.bg : 'transparent' }}
                      onClick={() => setActiveDeptFilter(activeDeptFilter === d.label ? null : d.label)}
                    >
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, display: 'inline-block', marginRight: 4 }} />
                      {d.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* --- Heatmap de Utilização --- */}
            <div className="dt-lp-section">
              <div className="dt-lp-section-title">
                <Flame size={13} />
                Heatmap de Utilização
                <button
                  className={`dt-lp-toggle ${heatmapActive ? 'on' : ''}`}
                  onClick={() => setHeatmapActive(v => !v)}
                />
              </div>
              {heatmapActive && (
                <div className="dt-lp-heat-legend">
                  <span className="dt-lp-heat-item" style={{ color: '#22c55e' }}>● Baixa (&lt;45%)</span>
                  <span className="dt-lp-heat-item" style={{ color: '#f59e0b' }}>● Média (45-74%)</span>
                  <span className="dt-lp-heat-item" style={{ color: '#ef4444' }}>● Alta (≥75%)</span>
                </div>
              )}
            </div>

            {/* --- Wayfinding --- */}
            <div className="dt-lp-section">
              <div className="dt-lp-section-title">
                <Navigation size={13} />
                Wayfinding (Rota entre mesas)
                <button
                  className={`dt-lp-toggle ${wayfindingActive ? 'on' : ''}`}
                  onClick={() => {
                    setWayfindingActive(v => !v);
                    setWayfindingFrom(null); setWayfindingTo(null);
                  }}
                />
              </div>
              {wayfindingActive && (
                <div className="dt-lp-wf-info">
                  <p>Clique em <strong>2 mesas</strong> no mapa para traçar a rota.</p>
                  <div className="dt-lp-wf-state">
                    <span className="dt-lp-wf-dot" style={{ background: wayfindingFrom ? '#22c55e' : '#cbd5e1' }} />
                    <span>{wayfindingFrom ? `Origem: ${desks.find(d => d.id === wayfindingFrom)?.user?.name || 'Mesa selecionada'}` : 'Clique na mesa de origem'}</span>
                  </div>
                  <div className="dt-lp-wf-state">
                    <span className="dt-lp-wf-dot" style={{ background: wayfindingTo ? '#6366f1' : '#cbd5e1' }} />
                    <span>{wayfindingTo ? `Destino: ${desks.find(d => d.id === wayfindingTo)?.user?.name || 'Mesa selecionada'}` : 'Clique na mesa de destino'}</span>
                  </div>
                  {(wayfindingFrom || wayfindingTo) && (
                    <button className="dt-lp-clear-btn" onClick={() => { setWayfindingFrom(null); setWayfindingTo(null); }}>
                      <X size={11} /> Limpar rota
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* --- Saídas de Emergência --- */}
            <div className="dt-lp-section">
              <div className="dt-lp-section-title">
                <ShieldAlert size={13} />
                Saídas de Emergência
                <button
                  className={`dt-lp-toggle ${emergencyMode ? 'on' : ''}`}
                  onClick={() => { setEmergencyMode(v => !v); setActiveTool(t => t === 'emergency' ? 'none' : 'emergency'); }}
                />
              </div>
              {emergencyMode && (
                <div className="dt-lp-wf-info">
                  <p>Clique no mapa para posicionar saídas 🚪. Clique em uma saída para remover.</p>
                  <span className="dt-lp-heat-item">{emergencyExits.length} saída(s) marcada(s)</span>
                  {emergencyExits.length > 0 && (
                    <button className="dt-lp-clear-btn" onClick={() => setEmergencyExits([])}>
                      <X size={11} /> Remover todas
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 🆕 STATUS DE PRESENÇA PANEL */}
        {showStatusPanel && (
          <div className="dt-status-panel-float">
            <div className="dt-lp-header">
              <Users size={15} />
              <span>Status de Presença</span>
              <button className="dt-ap-close" onClick={() => setShowStatusPanel(false)}><X size={14} /></button>
            </div>

            {/* Meu status */}
            <div className="dt-sp-my-status">
              <span className="dt-sp-label">Meu status:</span>
              <div className="dt-sp-status-grid">
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                  <button
                    key={key}
                    className={`dt-sp-status-btn ${myStatus === key ? 'active' : ''}`}
                    style={{ '--status-color': cfg.color }}
                    onClick={() => updateMyStatus(key)}
                    title={cfg.label}
                  >
                    {key === 'office'   && '🏢'}
                    {key === 'remote'   && '🏠'}
                    {key === 'vacation' && '🌴'}
                    {key === 'meeting'  && '📹'}
                    {key === 'focused'  && '🎯'}
                    <span>{cfg.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Status da equipe */}
            <div className="dt-sp-team">
              <span className="dt-sp-label">Equipe:</span>
              <div className="dt-sp-team-list">
                {roster.map(person => {
                  const key = person.email || person.id;
                  const status = presenceMap[key] || 'office';
                  const cfg = STATUS_CONFIG[status];
                  return (
                    <div key={person.id} className="dt-sp-team-row">
                      <div className="dt-ap-avatar" style={{ width: 28, height: 28, fontSize: '0.6rem' }}>{person.avatar}</div>
                      <div className="dt-sp-team-info">
                        <span className="dt-sp-team-name">{person.name}</span>
                        <span className="dt-sp-team-status" style={{ color: cfg.color }}>{cfg.label}</span>
                      </div>
                      <div className="dt-sp-status-mini">
                        {Object.entries(STATUS_CONFIG).map(([k, c]) => (
                          <button
                            key={k}
                            className={`dt-sp-mini-btn ${status === k ? 'active' : ''}`}
                            style={{ '--sc': c.color }}
                            onClick={() => setMemberStatus(key, k)}
                            title={c.label}
                          >
                            {k === 'office' && '🏢'}
                            {k === 'remote' && '🏠'}
                            {k === 'vacation' && '🌴'}
                            {k === 'meeting' && '📹'}
                            {k === 'focused' && '🎯'}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {roster.length === 0 && <span className="dt-ap-empty">Nenhum colaborador atribuído a mesas.</span>}
              </div>
            </div>
          </div>
        )}

        {/* UPLOAD PANEL */}
        {showUploadPanel && (
          <div className="dt-upload-panel">
            <div className="dt-upload-header">
              <Upload size={16} />
              <span>Upload de Planta Baixa</span>
              <button className="dt-upload-close" onClick={() => setShowUploadPanel(false)}><X size={14} /></button>
            </div>
            <p className="dt-upload-desc">
              Faça o upload da planta do seu escritório (PNG, JPG ou SVG). O mapa será exibido como fundo do canvas.
            </p>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
            <button className="dt-upload-btn" onClick={() => fileInputRef.current?.click()}>
              <Upload size={16} /> Selecionar Arquivo
            </button>
            {backgroundImage && (
              <button className="dt-upload-remove-btn" onClick={() => { setBackgroundImage(null); setShowUploadPanel(false); }}>
                <X size={14} /> Remover Planta
              </button>
            )}
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────
            PESSOA: RICH ASSIGNMENT PANEL
        ───────────────────────────────────────────────────────────────── */}
        {assignPanel && (
          <div className="dt-assign-panel">
            {/* Panel Header */}
            <div className="dt-ap-header">
              <UserCheck size={16} />
              <span>Colaboradores</span>
              <button className="dt-ap-close" onClick={() => { setAssignPanel(false); setActiveTool('none'); resetAssign(); }}>
                <X size={14} />
              </button>
            </div>

            {/* Step indicator */}
            <div className="dt-ap-steps">
              <div className={`dt-ap-step ${assignStep === 'pick_person' ? 'active' : 'done'}`}>
                <span className="dt-ap-step-num">1</span>
                <span>Selecionar pessoa</span>
              </div>
              <ArrowRight size={12} className="dt-ap-step-arrow" />
              <div className={`dt-ap-step ${assignStep === 'pick_desk' ? 'active' : ''}`}>
                <span className="dt-ap-step-num">2</span>
                <span>Clicar na mesa</span>
              </div>
            </div>

            {/* Step 1: Pick person */}
            {assignStep === 'pick_person' && (
              <>
                {/* Search */}
                <div className="dt-ap-search">
                  <Search size={13} />
                  <input
                    type="text"
                    placeholder="Buscar colaborador..."
                    value={personSearch}
                    onChange={e => setPersonSearch(e.target.value)}
                    autoFocus
                  />
                </div>

                {/* Roster */}
                <div className="dt-ap-roster">
                  {isLoadingMembers && (
                    <div className="dt-ap-loading">
                      <Loader2 size={16} className="dt-ap-spinner" />
                      <span>Carregando membros da equipe...</span>
                    </div>
                  )}
                  {!isLoadingMembers && filteredRoster.length === 0 && !newPersonForm && (
                    <div className="dt-ap-empty">
                      {teamMembers.length === 0
                        ? 'Nenhum membro encontrado. Verifique os Membros da Equipe.'
                        : 'Nenhum resultado para a busca.'}
                    </div>
                  )}
                  {filteredRoster.map((person, idx) => {
                    const deskInfo = desks.find(d => d.id === person.currentDeskId);
                    const isYou = person.email === currentUser;
                    return (
                      <button
                        key={person.id || idx}
                        className={`dt-ap-person-card ${isYou ? 'is-you' : ''}`}
                        onClick={() => selectPersonForAssign(person)}
                      >
                        <div className="dt-ap-avatar">{person.avatar}</div>
                        <div className="dt-ap-person-info">
                          <div className="dt-ap-person-name-row">
                            <span className="dt-ap-person-name">{person.name}</span>
                            {isYou && <span className="dt-ap-you-badge">você</span>}
                          </div>
                          <span className="dt-ap-person-role">{person.role}</span>
                          <span className="dt-ap-person-desk">
                            {deskInfo ? '📍 Na mesa atual' : person.email || '—'}
                          </span>
                        </div>
                        <Move size={13} className="dt-ap-move-icon" />
                      </button>
                    );
                  })}
                </div>

                {/* Add new person form */}
                {!newPersonForm ? (
                  <button className="dt-ap-add-btn" onClick={() => setNewPersonForm(true)}>
                    <UserPlus size={14} /> Novo colaborador
                  </button>
                ) : (
                  <div className="dt-ap-new-form">
                    <input
                      className="dt-ap-input"
                      placeholder="Nome completo *"
                      value={newPersonName}
                      onChange={e => setNewPersonName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addNewPerson()}
                      autoFocus
                    />
                    <input
                      className="dt-ap-input"
                      placeholder="Cargo (opcional)"
                      value={newPersonRole}
                      onChange={e => setNewPersonRole(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addNewPerson()}
                    />
                    <div className="dt-ap-form-actions">
                      <button className="dt-ap-cancel" onClick={() => setNewPersonForm(false)}>Cancelar</button>
                      <button className="dt-ap-confirm" onClick={addNewPerson}>
                        Próximo <ArrowRight size={13} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Step 2: Pick desk */}
            {assignStep === 'pick_desk' && selectedAssignee && (
              <div className="dt-ap-pick-desk">
                <div className="dt-ap-selected-person">
                  <div className="dt-ap-avatar large">{selectedAssignee.avatar}</div>
                  <div>
                    <div className="dt-ap-person-name">{selectedAssignee.name}</div>
                    <div className="dt-ap-person-role">{selectedAssignee.role}</div>
                  </div>
                </div>
                <p className="dt-ap-pick-desk-hint">
                  Clique em qualquer <strong>mesa no mapa</strong> para atribuir esta pessoa à posição.
                </p>
                <div className="dt-ap-desk-stats">
                  <div className="dt-ap-stat">
                    <span className="dt-ap-dot free" />
                    <span>{freeDesks} mesas livres</span>
                  </div>
                  <div className="dt-ap-stat">
                    <span className="dt-ap-dot occ" />
                    <span>{occupiedDesks} ocupadas</span>
                  </div>
                </div>
                <button className="dt-ap-back" onClick={resetAssign}>
                  ← Escolher outra pessoa
                </button>
              </div>
            )}
          </div>
        )}

        {/* BOTTOM-LEFT: STATS CHIPS */}
        <div className="dt-stats-panel">
          <div className="dt-stat-chip">
            <div className="dt-chip-dot free" />
            <span className="dt-chip-val">{freeDesks} Livres</span>
          </div>
          <div className="dt-stat-chip">
            <div className="dt-chip-dot occupied" />
            <span className="dt-chip-val">{occupiedDesks} Ocupadas</span>
          </div>
          <div className="dt-stat-chip outline">
            <span className="dt-chip-lbl">Salas:</span>
            <span className="dt-chip-val">{rooms.length}</span>
          </div>
          {rooms.length > 0 && (
            <div className="dt-stat-chip outline">
              <span className="dt-chip-lbl">Salas livres:</span>
              <span className="dt-chip-val free-text">{freeRooms}</span>
            </div>
          )}
        </div>

        {/* BOTTOM-RIGHT: VIEWPORT CONTROLS */}
        <div className="dt-viewport-controls">
          <button onClick={() => { setScale(1); setDragOffset({ x: 0, y: 0 }); }} title="Centralizar">
            <RefreshCw size={16} />
          </button>
          <div className="dt-vc-sep" />
          <button onClick={() => setScale(s => Math.min(s + 0.15, 3))}><ZoomIn size={16} /></button>
          <span className="dt-vc-zoom">{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale(s => Math.max(s - 0.15, 0.3))}><ZoomOut size={16} /></button>
        </div>

        {/* ACTIVE TOOL HINT */}
        {activeTool !== 'none' && (
          <div className="dt-tool-hint">
            {activeTool === 'add_desk' && <><Monitor size={14} /> Clique no mapa para adicionar mesas — <kbd>ESC</kbd> para sair</>}
            {activeTool === 'add_room' && <><Square size={14} /> Clique e <strong>arraste</strong> para desenhar a área da sala</>}
            {activeTool === 'assign' && assignStep === 'pick_person' && <><UserCheck size={14} /> Selecione um colaborador no painel à direita</>}
            {activeTool === 'assign' && assignStep === 'pick_desk' && <><MapPin size={14} /> Clique em uma mesa no mapa para posicionar {selectedAssignee?.name}</>}
            {activeTool === 'remove' && <><Trash2 size={14} /> Clique em um elemento para removê-lo</>}
            {activeTool === 'toggle_room' && <><Building2 size={14} /> Clique em uma sala para alternar livre / ocupada</>}
            <button className="dt-hint-dismiss" onClick={() => { setActiveTool('none'); setAssignPanel(false); resetAssign(); }}>
              <X size={12} />
            </button>
          </div>
        )}

      </div>

      {/* CONFIRM MODAL */}
      {modal.isOpen && (
        <div className="dt-modal-overlay" onClick={closeModal}>
          <div className="dt-modal-glass" onClick={e => e.stopPropagation()}>
            <h3>{modal.title}</h3>
            <p>{modal.message}</p>
            {modal.showInput && (
              <input
                className="dt-modal-input"
                autoFocus
                value={modal.inputValue || ''}
                onChange={e => setModal(m => ({ ...m, inputValue: e.target.value }))}
                onKeyDown={e => {
                  if (e.key === 'Enter') { modal.onConfirm(modal.inputValue); closeModal(); }
                  if (e.key === 'Escape') closeModal();
                }}
              />
            )}
            <div className="dt-modal-actions">
              <button className="dt-btn dt-btn-secondary" onClick={closeModal}>Cancelar</button>
              <button
                className="dt-btn dt-btn-primary"
                onClick={() => { modal.onConfirm(modal.inputValue); closeModal(); }}
              >
                {modal.showInput ? 'Salvar' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DESK INFO MODAL ── */}
      {deskDetailsOpen && (
        <div className="dt-modal-overlay" onClick={() => setDeskDetailsOpen(null)}>
          <div className="dt-desk-info-modal" onClick={e => e.stopPropagation()}>
            <button className="dt-modal-close" onClick={() => setDeskDetailsOpen(null)}>
              <X size={16} />
            </button>
            <div className="dt-dim-header">
              <div className="dt-dim-avatar">{deskDetailsOpen.user.avatar}</div>
              <div className="dt-dim-title">
                <h2>{deskDetailsOpen.user.name}</h2>
                <span className="dt-dim-role">{deskDetailsOpen.user.role}</span>
              </div>
            </div>
            <div className="dt-dim-body">
              <div className="dt-dim-row">
                <Mail size={14} className="dt-dim-icon" />
                {deskDetailsOpen.user.email || 'E-mail não definido'}
              </div>
              <div className="dt-dim-row">
                <Monitor size={14} className="dt-dim-icon" />
                Mesa Ocupada
              </div>
              <div className="dt-dim-row">
                <div className={`dt-dim-status-dot ${deskDetailsOpen.user.isOnline ? 'online' : 'offline'}`} />
                {deskDetailsOpen.user.isOnline ? 'Online no momento' : 'Offline / Ausente'}
              </div>
            </div>
            <div className="dt-dim-actions">
              <button 
                className="dt-dim-btn outline" 
                onClick={() => {
                  const nameStr = deskDetailsOpen.user.name;
                  setDeskDetailsOpen(null);
                  toggleTool('assign');
                  setTimeout(() => setPersonSearch(nameStr), 0);
                }}
              >
                <Move size={14} /> Mover Colaborador
              </button>
              <button className="dt-dim-btn primary" onClick={() => setDeskDetailsOpen(null)}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
