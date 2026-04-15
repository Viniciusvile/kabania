import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Search, Trash2, Square, RefreshCw, ZoomIn, ZoomOut,
  Monitor, Upload, X, MapPin, Building2, Pin, UserCheck,
  ChevronDown, Pencil, ArrowRight, UserPlus, Move, Loader2, Mail
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { safeQuery } from '../../utils/supabaseSafe';
import './DigitalTwinModule.css';

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

  // ── TEAM MEMBERS: loaded from Supabase profiles (same as Membros da Equipe) ──
  const [teamMembers, setTeamMembers] = useState([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedDeskId, setHighlightedDeskId] = useState(null);
  const [scale, setScale] = useState(1);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDraggingMap, setIsDraggingMap] = useState(false);
  const [mapDragStart, setMapDragStart] = useState({ x: 0, y: 0 });

  // activeTool: 'none' | 'add_desk' | 'add_room' | 'remove' | 'assign' | 'toggle_room'
  const [activeTool, setActiveTool] = useState('none');
  const [draggedObject, setDraggedObject] = useState(null);

  // ── SALA: Draw-to-create state ────────────────────────────────────────────
  const [isDrawingRoom, setIsDrawingRoom] = useState(false);
  // rect in viewport px {x1,y1,x2,y2}
  const [drawRect, setDrawRect] = useState(null);

  // ── DESK INFO MODAL ───────────────────────────────────────────────────────
  const [deskDetailsOpen, setDeskDetailsOpen] = useState(null);

  // ── MESA: Ghost cursor state ──────────────────────────────────────────────
  // Position in viewport px for the ghost preview
  const [ghostPos, setGhostPos] = useState(null);

  // ── PESSOA: Rich assignment panel ─────────────────────────────────────────
  // step: 'pick_person' → user selects from roster
  //       'pick_desk'   → user clicks a desk on the map
  const [assignPanel, setAssignPanel] = useState(false);
  const [assignStep, setAssignStep] = useState('pick_person'); // 'pick_person' | 'pick_desk'
  const [selectedAssignee, setSelectedAssignee] = useState(null);
  const [personSearch, setPersonSearch] = useState('');
  const [newPersonForm, setNewPersonForm] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');
  const [newPersonRole, setNewPersonRole] = useState('');

  // Edit room name overlay
  const [editingRoomId, setEditingRoomId] = useState(null);
  const [editingRoomName, setEditingRoomName] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState(null);

  // Modal (only for confirmations now)
  const [modal, setModal] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // Upload panel
  const [showUploadPanel, setShowUploadPanel] = useState(false);

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
              return (
                <div
                  key={desk.id}
                  className={`dt-desk ${desk.status} ${isMatch ? 'highlighted' : ''} ${isTargetable ? 'targetable' : ''}`}
                  style={{ top: `${desk.y}%`, left: `${desk.x}%` }}
                  onMouseDown={(e) => startDragObject(e, desk.id, 'desk')}
                  onClick={(e) => handleDeskClick(e, desk)}
                >
                  <div className="dt-desk-base">
                    {desk.status !== 'occupied' && <Monitor size={17} strokeWidth={1.5} />}
                  </div>
                  {desk.status === 'occupied' && desk.user && (
                    <div className="dt-desk-badge">
                      {desk.user.avatar}
                      <span className={`dt-status-dot ${desk.user.isOnline ? 'online' : 'offline'}`} />
                    </div>
                  )}
                  {isMatch && (
                    <div className="dt-pin-flag">
                      <MapPin size={12} /> {desk.user?.name}
                    </div>
                  )}
                </div>
              );
            })}

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
