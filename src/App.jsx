import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Download,
  Eye,
  EyeOff,
  ImagePlus,
  Layers,
  Palette,
  Plus,
  RotateCcw,
  Shapes,
  Trash2,
  Type,
  Upload,
} from 'lucide-react';
import {
  BLEND_MODES,
  BRAND_COLORS,
  BUILT_IN_LOGOS,
  CANVAS_PRESETS,
  GOOGLE_FONTS,
  TEXT_ROLE_OPTIONS,
  createImageLayer,
  createInitialScene,
  createLogoLayer,
  createShapeLayer,
  createTextLayer,
} from './presets.js';
import { measureLayerBounds, renderScene } from './engine.js';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const COLOR_PRESETS = [
  { id: 'gelb-schwarz', label: 'Gelb / Schwarz', background: '#050505', secondary: '#111111', accent: '#FFF500', contrast: '#FFFFFF' },
  { id: 'blau-weiss', label: 'Blau / Weiß', background: '#0A163C', secondary: '#3355FF', accent: '#FFFFFF', contrast: '#FFF500' },
  { id: 'pink-lila', label: 'Pink / Lila', background: '#180718', secondary: '#9933FF', accent: '#FF66FF', contrast: '#FFFFFF' },
  { id: 'hellblau-schwarz', label: 'Hellblau / Schwarz', background: '#04090D', secondary: '#001722', accent: '#00FDFF', contrast: '#FFFFFF' },
];

const getGridSpec = (presetId) => {
  if (presetId === 'portrait') {
    return {
      columns: 12,
      rows: 16,
      marginX: 0.075,
      marginY: 0.055,
    };
  }

  return {
    columns: 12,
    rows: 12,
    marginX: 0.06,
    marginY: 0.06,
  };
};

const getNewsLayoutPresets = (presetId) => {
  const isPortrait = presetId === 'portrait';
  return [
    {
      id: 'news-compact',
      label: 'News Compact',
      headline: {
        x: isPortrait ? 0.1 : 0.11,
        y: isPortrait ? 0.5 : 0.54,
        width: isPortrait ? 0.76 : 0.74,
        size: isPortrait ? 116 : 104,
        leading: 0.92,
        tracking: -1,
        weight: '700',
      },
      textbox: {
        x: isPortrait ? 0.1 : 0.11,
        y: isPortrait ? 0.73 : 0.76,
        width: isPortrait ? 0.54 : 0.56,
        size: isPortrait ? 35 : 31,
        leading: 1.24,
        tracking: 0,
        weight: '600',
      },
      kicker: {
        x: 0.93,
        y: isPortrait ? 0.07 : 0.08,
        align: 'right',
      },
      caption: {
        x: isPortrait ? 0.1 : 0.11,
        y: isPortrait ? 0.94 : 0.93,
      },
      logo: {
        x: isPortrait ? 0.84 : 0.82,
        y: isPortrait ? 0.1 : 0.12,
      },
    },
    {
      id: 'news-editorial',
      label: 'News Editorial',
      headline: {
        x: isPortrait ? 0.1 : 0.11,
        y: isPortrait ? 0.16 : 0.18,
        width: isPortrait ? 0.62 : 0.6,
        size: isPortrait ? 102 : 94,
        leading: 0.94,
        tracking: -0.8,
        weight: '700',
      },
      textbox: {
        x: isPortrait ? 0.1 : 0.11,
        y: isPortrait ? 0.78 : 0.8,
        width: isPortrait ? 0.48 : 0.5,
        size: isPortrait ? 34 : 30,
        leading: 1.28,
        tracking: 0,
        weight: '600',
      },
      kicker: {
        x: 0.93,
        y: isPortrait ? 0.07 : 0.08,
        align: 'right',
      },
      caption: {
        x: isPortrait ? 0.1 : 0.11,
        y: isPortrait ? 0.94 : 0.93,
      },
      logo: {
        x: isPortrait ? 0.85 : 0.84,
        y: isPortrait ? 0.1 : 0.12,
      },
    },
    {
      id: 'news-hero',
      label: 'News Hero',
      headline: {
        x: isPortrait ? 0.1 : 0.11,
        y: isPortrait ? 0.58 : 0.61,
        width: isPortrait ? 0.78 : 0.76,
        size: isPortrait ? 126 : 112,
        leading: 0.9,
        tracking: -1.2,
        weight: '800',
      },
      textbox: {
        x: isPortrait ? 0.1 : 0.11,
        y: isPortrait ? 0.84 : 0.86,
        width: isPortrait ? 0.46 : 0.48,
        size: isPortrait ? 31 : 28,
        leading: 1.26,
        tracking: 0,
        weight: '600',
      },
      kicker: {
        x: 0.93,
        y: isPortrait ? 0.07 : 0.08,
        align: 'right',
      },
      caption: {
        x: isPortrait ? 0.1 : 0.11,
        y: isPortrait ? 0.94 : 0.93,
      },
      logo: {
        x: isPortrait ? 0.86 : 0.85,
        y: isPortrait ? 0.11 : 0.12,
      },
    },
  ];
};

const CONTENT_PRESETS = [
  {
    id: 'news-update',
    label: 'News',
    kicker: 'NEWS UPDATE',
    headline: 'Digitale\nEntwicklung',
    textbox: 'Kurz, klar und gut lesbar. Diese Textbox liefert den Kontext zur Headline und bleibt ruhig genug, damit Form, Logo und CI weiter wirken.',
  },
  {
    id: 'workshop',
    label: 'Workshop',
    kicker: 'WORKSHOP',
    headline: 'Tools fuer\nkreative KI',
    textbox: 'Praxisnaher Workshop mit Inputs, Beispielen und offener Fragerunde. Ideal fuer erste Einblicke, Austausch und konkrete Anwendungen im DigiLab.ai Kontext.',
  },
  {
    id: 'termin',
    label: 'Termin',
    kicker: 'TERMIN',
    headline: 'Sprechstunde\nim DigiLab.ai',
    textbox: 'Komm mit Fragen, Projekten oder Ideen vorbei. Wir schauen gemeinsam auf Tools, Workflows und naechste Schritte fuer dein Vorhaben.',
  },
  {
    id: 'open-call',
    label: 'Open Call',
    kicker: 'OPEN CALL',
    headline: 'Ideen, Projekte,\nMitmachen',
    textbox: 'Wir suchen Themen, Prototypen und Experimente rund um digitale Gestaltung und KI. Reiche deine Idee ein und entwickle sie mit uns weiter.',
  },
];

const deepSet = (source, path, value) => {
  const keys = path.split('.');
  const clone = Array.isArray(source) ? [...source] : { ...source };
  let cursor = clone;
  let original = source;

  keys.forEach((key, index) => {
    if (index === keys.length - 1) {
      cursor[key] = value;
      return;
    }
    cursor[key] = Array.isArray(original[key]) ? [...original[key]] : { ...original[key] };
    cursor = cursor[key];
    original = original[key];
  });

  return clone;
};

const useElementSize = (ref) => {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!ref.current) {
      return undefined;
    }

    const observer = new ResizeObserver(([entry]) => {
      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref]);

  return size;
};

const SliderField = ({ label, value, min, max, step = 0.01, onChange, format }) => (
  <label className="field">
    <div className="field__head">
      <span>{label}</span>
      <span>{format ? format(value) : value}</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
  </label>
);

const SelectField = ({ label, value, options, onChange }) => (
  <label className="field">
    <div className="field__head">
      <span>{label}</span>
    </div>
    <select value={value} onChange={(event) => onChange(event.target.value)}>
      {options.map((option) => (
        <option key={option.value ?? option} value={option.value ?? option}>
          {option.label ?? option}
        </option>
      ))}
    </select>
  </label>
);

const ToggleField = ({ label, checked, onChange }) => (
  <label className="toggle">
    <span>{label}</span>
    <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
  </label>
);

const PaletteSwatches = ({ onPick }) => (
  <div className="swatch-row">
    {BRAND_COLORS.map((color) => (
      <button
        key={color}
        type="button"
        className="swatch"
        style={{ background: color }}
        onClick={() => onPick(color)}
        aria-label={color}
      />
    ))}
  </div>
);

const ColorField = ({ label, value, onChange }) => (
  <label className="field">
    <div className="field__head">
      <span>{label}</span>
      <span>{value}</span>
    </div>
    <input type="color" value={value} onChange={(event) => onChange(event.target.value)} />
  </label>
);

const Section = ({ title, icon: Icon, children }) => (
  <section className="panel">
    <div className="panel__title">
      <Icon size={15} />
      <span>{title}</span>
    </div>
    <div className="panel__body">{children}</div>
  </section>
);

const UploadButton = ({ label, accept, onSelect }) => {
  const inputRef = useRef(null);

  return (
    <div className="upload-tile">
      <button className="ghost-button upload-button" type="button" onClick={() => inputRef.current?.click()}>
        <Upload size={16} />
        {label}
      </button>
      <input ref={inputRef} type="file" accept={accept} className="sr-only" onChange={onSelect} />
    </div>
  );
};

const App = () => {
  const initialScene = useMemo(() => createInitialScene(), []);
  const [scene, setScene] = useState(initialScene);
  const [activeLayerId, setActiveLayerId] = useState(initialScene.layers[initialScene.layers.length - 1]?.id ?? null);
  const [assetVersion, setAssetVersion] = useState(0);
  const [previewZoom, setPreviewZoom] = useState(0.78);
  const [dragState, setDragState] = useState(null);
  const [logoLibrary, setLogoLibrary] = useState(BUILT_IN_LOGOS);
  const canvasRef = useRef(null);
  const stageRef = useRef(null);
  const imageCacheRef = useRef(new Map());
  const stageSize = useElementSize(stageRef);

  const preset = CANVAS_PRESETS.find((item) => item.id === scene.presetId) ?? CANVAS_PRESETS[0];
  const activeLayer = scene.layers.find((layer) => layer.id === activeLayerId) ?? null;
  const gridSpec = getGridSpec(scene.presetId);

  const getPrimaryTextLayer = (role) => scene.layers.find((layer) => layer.kind === 'text' && layer.role === role) ?? null;
  const getPrimaryTextLayerByRoles = (...roles) => scene.layers.find((layer) => layer.kind === 'text' && roles.includes(layer.role)) ?? null;

  const updatePrimaryTextColor = (roles, color) => {
    const roleList = Array.isArray(roles) ? roles : [roles];
    setScene((current) => ({
      ...current,
      layers: current.layers.map((layer) => {
        if (layer.kind !== 'text' || !roleList.includes(layer.role)) {
          return layer;
        }
        return {
          ...layer,
          text: {
            ...layer.text,
            color,
          },
        };
      }),
    }));
  };

  const applyColorPreset = (scheme) => {
    setScene((current) => {
      let shapeIndex = 0;
      return {
        ...current,
        background: {
          ...current.background,
          colorA: scheme.background,
          colorB: scheme.secondary,
        },
        layers: current.layers.map((layer) => {
          if (layer.kind === 'shape') {
            const fill = shapeIndex === 0 ? scheme.secondary : scheme.accent;
            shapeIndex += 1;
            return {
              ...layer,
              shape: {
                ...layer.shape,
                fill,
              },
            };
          }
          if (layer.kind === 'text') {
            const nextColor =
              layer.role === 'headline' || layer.role === 'caption'
                ? scheme.accent
                : layer.role === 'body' || layer.role === 'textbox'
                  ? scheme.contrast
                  : scheme.contrast;
            return {
              ...layer,
              text: {
                ...layer.text,
                color: nextColor,
              },
            };
          }
          if (layer.kind === 'logo') {
            return {
              ...layer,
              logo: {
                ...layer.logo,
                tint: scheme.accent,
              },
            };
          }
          if (layer.kind === 'image') {
            return {
              ...layer,
              image: {
                ...layer.image,
                tint: scheme.accent,
              },
            };
          }
          return layer;
        }),
      };
    });
  };

  const getImage = (src) => {
    if (!src) {
      return null;
    }

    const cached = imageCacheRef.current.get(src);
    if (cached?.status === 'loaded') {
      return cached.image;
    }
    if (cached?.status === 'loading') {
      return null;
    }

    const image = new Image();
    image.onload = () => {
      imageCacheRef.current.set(src, { status: 'loaded', image });
      setAssetVersion((value) => value + 1);
    };
    image.onerror = () => {
      imageCacheRef.current.set(src, { status: 'error', image: null });
      setAssetVersion((value) => value + 1);
    };
    image.src = src;
    imageCacheRef.current.set(src, { status: 'loading', image: null });
    return null;
  };

  useEffect(() => {
    document.fonts?.ready.then(() => setAssetVersion((value) => value + 1));
  }, []);

  const previewScale = useMemo(() => {
    if (!stageSize.width || !stageSize.height) {
      return previewZoom;
    }
    return Math.min(
      (stageSize.width - 96) / preset.width,
      (stageSize.height - 120) / preset.height,
      1,
    ) * previewZoom;
  }, [preset.height, preset.width, previewZoom, stageSize.height, stageSize.width]);

  const updateScene = (path, value) => setScene((current) => deepSet(current, path, value));

  const updateLayer = (layerId, path, value) => {
    setScene((current) => ({
      ...current,
      layers: current.layers.map((layer) => (layer.id === layerId ? deepSet(layer, path, value) : layer)),
    }));
  };

  const replaceLayer = (layerId, updater) => {
    setScene((current) => ({
      ...current,
      layers: current.layers.map((layer) => (layer.id === layerId ? updater(layer) : layer)),
    }));
  };

  const addShapeLayer = () => {
    setScene((current) => {
      const layer = createShapeLayer(current.layers.filter((item) => item.kind === 'shape').length + 1);
      setActiveLayerId(layer.id);
      return { ...current, layers: [...current.layers, layer] };
    });
  };

  const addTextLayer = (role = 'body') => {
    setScene((current) => {
      const layer = createTextLayer(current.layers.filter((item) => item.kind === 'text').length + 1, role);
      setActiveLayerId(layer.id);
      return { ...current, layers: [...current.layers, layer] };
    });
  };

  const applyNewsLayoutPreset = (presetId) => {
    const layout = getNewsLayoutPresets(scene.presetId).find((item) => item.id === presetId);
    if (!layout) {
      return;
    }

    setScene((current) => {
      let textboxAssigned = false;
      return {
        ...current,
        newsLayoutPresetId: presetId,
        layers: current.layers.map((layer) => {
          if (layer.kind === 'text' && layer.role === 'headline') {
            return {
              ...layer,
              text: {
                ...layer.text,
                width: layout.headline.width,
                size: layout.headline.size,
                leading: layout.headline.leading,
                tracking: layout.headline.tracking,
                weight: layout.headline.weight,
              },
              transform: {
                ...layer.transform,
                x: layout.headline.x,
                y: layout.headline.y,
              },
            };
          }

          if (layer.kind === 'text' && !textboxAssigned && (layer.role === 'textbox' || layer.role === 'body')) {
            textboxAssigned = true;
            return {
              ...layer,
              role: 'textbox',
              name: layer.name.includes('Body') ? layer.name.replace('Body', 'Textbox') : layer.name,
              text: {
                ...layer.text,
                width: layout.textbox.width,
                size: layout.textbox.size,
                leading: layout.textbox.leading,
                tracking: layout.textbox.tracking,
                weight: layout.textbox.weight,
              },
              transform: {
                ...layer.transform,
                x: layout.textbox.x,
                y: layout.textbox.y,
              },
            };
          }

          if (layer.kind === 'text' && layer.role === 'kicker') {
            return {
              ...layer,
              text: {
                ...layer.text,
                align: layout.kicker.align ?? layer.text.align,
              },
              transform: {
                ...layer.transform,
                x: layout.kicker.x,
                y: layout.kicker.y,
              },
            };
          }

          if (layer.kind === 'text' && layer.role === 'caption') {
            return {
              ...layer,
              transform: {
                ...layer.transform,
                x: layout.caption.x,
                y: layout.caption.y,
              },
            };
          }

          if (layer.kind === 'logo') {
            return {
              ...layer,
              transform: {
                ...layer.transform,
                x: layout.logo.x,
                y: layout.logo.y,
              },
            };
          }

          return layer;
        }),
      };
    });
  };

  const applyContentPreset = (presetId) => {
    const presetDef = CONTENT_PRESETS.find((item) => item.id === presetId);
    if (!presetDef) {
      return;
    }

    setScene((current) => {
      let headlineAssigned = false;
      let textboxAssigned = false;
      let kickerAssigned = false;

      return {
        ...current,
        layers: current.layers.map((layer) => {
          if (layer.kind !== 'text') {
            return layer;
          }

          if (!kickerAssigned && layer.role === 'kicker') {
            kickerAssigned = true;
            return {
              ...layer,
              text: {
                ...layer.text,
                value: presetDef.kicker,
                align: 'right',
              },
            };
          }

          if (!headlineAssigned && layer.role === 'headline') {
            headlineAssigned = true;
            return {
              ...layer,
              text: {
                ...layer.text,
                value: presetDef.headline,
              },
            };
          }

          if (!textboxAssigned && (layer.role === 'textbox' || layer.role === 'body')) {
            textboxAssigned = true;
            return {
              ...layer,
              role: 'textbox',
              text: {
                ...layer.text,
                value: presetDef.textbox,
              },
            };
          }

          return layer;
        }),
      };
    });
  };

  const addLogoLayer = () => {
    setScene((current) => {
      const layer = createLogoLayer(current.layers.filter((item) => item.kind === 'logo').length + 1);
      setActiveLayerId(layer.id);
      return { ...current, layers: [...current.layers, layer] };
    });
  };

  const addImageLayer = () => {
    setScene((current) => {
      const layer = createImageLayer(current.layers.filter((item) => item.kind === 'image').length + 1);
      setActiveLayerId(layer.id);
      return { ...current, layers: [...current.layers, layer] };
    });
  };

  const duplicateLayer = (layerId) => {
    setScene((current) => {
      const target = current.layers.find((layer) => layer.id === layerId);
      if (!target) {
        return current;
      }
      const duplicate = {
        ...target,
        id: `${target.kind}_${Math.random().toString(36).slice(2, 9)}`,
        name: `${target.name} Copy`,
      };
      setActiveLayerId(duplicate.id);
      return { ...current, layers: [...current.layers, duplicate] };
    });
  };

  const deleteLayer = (layerId) => {
    setScene((current) => {
      const layers = current.layers.filter((layer) => layer.id !== layerId);
      setActiveLayerId(layers[layers.length - 1]?.id ?? null);
      return { ...current, layers };
    });
  };

  const moveLayer = (layerId, direction) => {
    setScene((current) => {
      const index = current.layers.findIndex((layer) => layer.id === layerId);
      if (index < 0) {
        return current;
      }
      const targetIndex = clamp(index + direction, 0, current.layers.length - 1);
      if (targetIndex === index) {
        return current;
      }
      const layers = [...current.layers];
      const [item] = layers.splice(index, 1);
      layers.splice(targetIndex, 0, item);
      return { ...current, layers };
    });
  };

  const randomizeShapes = () => {
    setScene((current) => ({
      ...current,
      layers: current.layers.map((layer) => {
        if (layer.kind !== 'shape') {
          return layer;
        }
        return {
          ...layer,
          transform: {
            ...layer.transform,
            rotation: Math.round(Math.random() * 30 - 15),
          },
          shape: {
            ...layer.shape,
            seed: Math.floor(Math.random() * 100000),
            roughness: Number((0.16 + Math.random() * 0.34).toFixed(2)),
            asymmetry: Number((0.08 + Math.random() * 0.26).toFixed(2)),
            wobble: Number((0.06 + Math.random() * 0.22).toFixed(2)),
            bites: Math.floor(1 + Math.random() * 4),
            biteSize: Number((0.06 + Math.random() * 0.13).toFixed(2)),
            squishX: Number((0.8 + Math.random() * 0.45).toFixed(2)),
            squishY: Number((0.8 + Math.random() * 0.45).toFixed(2)),
            points: Math.floor(9 + Math.random() * 10),
          },
        };
      }),
    }));
  };

  const applyLogoEntry = (entry) => {
    if (activeLayer?.kind === 'logo') {
      replaceLayer(activeLayer.id, (layer) => ({
        ...layer,
        assetSrc: entry.src,
        assetName: entry.name,
        logo: {
          ...layer.logo,
          ...(entry.defaults ?? {}),
        },
        transform: {
          ...layer.transform,
          x: entry.defaults?.x ?? layer.transform.x,
          y: entry.defaults?.y ?? layer.transform.y,
        },
      }));
      return;
    }

    setScene((current) => {
      const layer = createLogoLayer(current.layers.filter((item) => item.kind === 'logo').length + 1, {
        assetSrc: entry.src,
        assetName: entry.name,
        ...(entry.defaults ?? {}),
      });
      setActiveLayerId(layer.id);
      return { ...current, layers: [...current.layers, layer] };
    });
  };

  const handleAssetUpload = (event, callback) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const src = URL.createObjectURL(file);
    callback({ file, src });
    event.target.value = '';
  };

  const exportPng = () => {
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = preset.width;
    exportCanvas.height = preset.height;
    const ctx = exportCanvas.getContext('2d');
    renderScene({
      ctx,
      width: preset.width,
      height: preset.height,
      scene,
      getImage,
    });
    const link = document.createElement('a');
    link.download = `digilab-news-${Date.now()}.png`;
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
  };

  const layerBounds = useMemo(
    () =>
      scene.layers
        .map((layer) => ({
          layerId: layer.id,
          bounds: measureLayerBounds({
            layer,
            width: preset.width,
            height: preset.height,
            getImage,
          }),
        }))
        .filter((entry) => entry.bounds),
    [assetVersion, preset.height, preset.width, scene],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext('2d');
    renderScene({
      ctx,
      width: preset.width,
      height: preset.height,
      scene,
      getImage,
    });
  }, [assetVersion, preset.height, preset.width, scene]);

  const getCanvasPoint = (event) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) {
      return null;
    }
    return {
      x: ((event.clientX - rect.left) / rect.width) * preset.width,
      y: ((event.clientY - rect.top) / rect.height) * preset.height,
    };
  };

  const handlePointerDown = (event) => {
    const point = getCanvasPoint(event);
    if (!point) {
      return;
    }

    const hit = [...layerBounds].reverse().find(({ bounds }) => (
      point.x >= bounds.x &&
      point.x <= bounds.x + bounds.width &&
      point.y >= bounds.y &&
      point.y <= bounds.y + bounds.height
    ));

    if (!hit) {
      return;
    }

    const layer = scene.layers.find((entry) => entry.id === hit.layerId);
    if (!layer) {
      return;
    }

    setActiveLayerId(layer.id);
    setDragState({
      layerId: layer.id,
      pointerX: point.x,
      pointerY: point.y,
      startX: layer.transform.x,
      startY: layer.transform.y,
    });
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event) => {
    if (!dragState) {
      return;
    }

    const point = getCanvasPoint(event);
    if (!point) {
      return;
    }

    const deltaX = (point.x - dragState.pointerX) / preset.width;
    const deltaY = (point.y - dragState.pointerY) / preset.height;

    updateLayer(dragState.layerId, 'transform.x', clamp(dragState.startX + deltaX, 0, 1));
    updateLayer(dragState.layerId, 'transform.y', clamp(dragState.startY + deltaY, 0, 1));
  };

  const handlePointerUp = (event) => {
    if (!dragState) {
      return;
    }
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    setDragState(null);
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar__header">
          <div>
            <div className="eyebrow">Static Instagram News Builder</div>
            <h1>digilab.ai News Studio</h1>
          </div>
          <button
            className="ghost-button"
            onClick={() => {
              const freshScene = createInitialScene();
              setScene(freshScene);
              setActiveLayerId(freshScene.layers[freshScene.layers.length - 1]?.id ?? null);
            }}
          >
            <RotateCcw size={16} />
            Reset
          </button>
        </div>

        <Section title="Format & Export" icon={Download}>
          <SelectField
            label="Canvas"
            value={scene.presetId}
            options={CANVAS_PRESETS.map((item) => ({ value: item.id, label: `${item.label} (${item.width}x${item.height})` }))}
            onChange={(value) => updateScene('presetId', value)}
          />
          <SliderField
            label="Preview Zoom"
            value={previewZoom}
            min={0.45}
            max={1}
            step={0.01}
            format={(value) => `${Math.round(value * 100)}%`}
            onChange={setPreviewZoom}
          />
          <ToggleField label="Grid einblenden" checked={scene.guides?.showGrid ?? true} onChange={(value) => updateScene('guides.showGrid', value)} />
          <div className="button-row">
            <button className="ghost-button" type="button" onClick={randomizeShapes}>
              <Shapes size={16} />
              Shapes variieren
            </button>
            <button className="accent-button" type="button" onClick={exportPng}>
              <Download size={16} />
              PNG exportieren
            </button>
          </div>
        </Section>

        <Section title="News Layout" icon={Type}>
          <SelectField
            label="Preset"
            value={scene.newsLayoutPresetId ?? 'news-compact'}
            options={getNewsLayoutPresets(scene.presetId).map((item) => ({ value: item.id, label: item.label }))}
            onChange={applyNewsLayoutPreset}
          />
          <div className="button-row">
            {getNewsLayoutPresets(scene.presetId).map((item) => (
              <button key={item.id} className="ghost-button small-chip" type="button" onClick={() => applyNewsLayoutPreset(item.id)}>
                {item.label}
              </button>
            ))}
          </div>
          <div className="status-pill">
            Empfehlung: kurze Headline mit 1 bis 2 Zeilen plus eine ruhige Textbox mit 3 bis 6 Zeilen.
          </div>
        </Section>

        <Section title="Inhalt Presets" icon={Type}>
          <div className="button-row">
            {CONTENT_PRESETS.map((item) => (
              <button key={item.id} className="ghost-button small-chip" type="button" onClick={() => applyContentPreset(item.id)}>
                {item.label}
              </button>
            ))}
          </div>
          <div className="status-pill">
            Setzt Kicker, Headline und Textbox mit sinnvollen Starttexten. Dein Layout bleibt dabei erhalten.
          </div>
        </Section>

        <Section title="Background & CI" icon={Palette}>
          <div className="mode-row">
            {[
              { value: 'solid', label: 'Solid' },
              { value: 'gradient', label: 'Gradient' },
              { value: 'image', label: 'Image' },
            ].map((item) => (
              <button
                key={item.value}
                type="button"
                className={`mode-chip ${scene.background.mode === item.value ? 'is-active' : ''}`}
                onClick={() => updateScene('background.mode', item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="field-grid">
            <ColorField label="Farbe A" value={scene.background.colorA} onChange={(value) => updateScene('background.colorA', value)} />
            <ColorField label="Farbe B" value={scene.background.colorB} onChange={(value) => updateScene('background.colorB', value)} />
          </div>
          <div className="field">
            <div className="field__head">
              <span>CI Presets</span>
              <span>Ein Klick</span>
            </div>
            <div className="button-row">
              {COLOR_PRESETS.map((scheme) => (
                <button key={scheme.id} type="button" className="ghost-button" onClick={() => applyColorPreset(scheme)}>
                  {scheme.label}
                </button>
              ))}
            </div>
          </div>
          {scene.background.mode === 'gradient' && (
            <SliderField
              label="Gradient Winkel"
              value={scene.background.angle}
              min={0}
              max={360}
              step={1}
              format={(value) => `${Math.round(value)}°`}
              onChange={(value) => updateScene('background.angle', value)}
            />
          )}
          {scene.background.mode === 'image' && (
            <UploadButton
              label={scene.background.imageSrc ? 'Background ersetzen' : 'Background hochladen'}
              accept="image/*"
              onSelect={(event) => handleAssetUpload(event, ({ src }) => updateScene('background.imageSrc', src))}
            />
          )}
          <PaletteSwatches
            onPick={(color) => {
              updateScene('background.colorA', color);
              if (scene.background.mode === 'gradient') {
                updateScene('background.colorB', '#050505');
              }
            }}
          />
        </Section>

        <Section title="Textfarben" icon={Type}>
          <div className="field-grid">
            <ColorField
              label="Headline"
              value={getPrimaryTextLayer('headline')?.text.color ?? '#FFF500'}
              onChange={(value) => updatePrimaryTextColor('headline', value)}
            />
            <ColorField
              label="Textbox"
              value={getPrimaryTextLayerByRoles('textbox', 'body')?.text.color ?? '#F3F1E8'}
              onChange={(value) => updatePrimaryTextColor(['textbox', 'body'], value)}
            />
          </div>
          <div className="field-grid">
            <ColorField
              label="Kicker"
              value={getPrimaryTextLayer('kicker')?.text.color ?? '#FFFFFF'}
              onChange={(value) => updatePrimaryTextColor('kicker', value)}
            />
            <ColorField
              label="Caption"
              value={getPrimaryTextLayer('caption')?.text.color ?? '#FFFFFF'}
              onChange={(value) => updatePrimaryTextColor('caption', value)}
            />
          </div>
          <div className="button-row">
            {BRAND_COLORS.map((color) => (
              <button
                key={`text-swatch-${color}`}
                type="button"
                className="swatch"
                style={{ background: color }}
                onClick={() => updatePrimaryTextColor(['headline', 'textbox', 'body', 'kicker', 'caption'], color)}
                aria-label={`Alle Textfarben auf ${color} setzen`}
              />
            ))}
          </div>
        </Section>

        <Section title="Layer Stack" icon={Layers}>
          <div className="button-row">
            <button className="ghost-button" type="button" onClick={addShapeLayer}>
              <Plus size={16} />
              Shape
            </button>
            <button className="ghost-button" type="button" onClick={addLogoLayer}>
              <Plus size={16} />
              Logo
            </button>
            <button className="ghost-button" type="button" onClick={() => addTextLayer('headline')}>
              <Type size={16} />
              Headline
            </button>
            <button className="ghost-button" type="button" onClick={() => addTextLayer('textbox')}>
              <Type size={16} />
              Textbox
            </button>
            <button className="ghost-button" type="button" onClick={addImageLayer}>
              <ImagePlus size={16} />
              Bild-Layer
            </button>
          </div>
          <div className="layer-list">
            {[...scene.layers].reverse().map((layer) => (
              <div
                key={layer.id}
                className={`layer-row ${activeLayerId === layer.id ? 'is-active' : ''}`}
              >
                <button
                  type="button"
                  className="layer-row__select"
                  onClick={() => setActiveLayerId(layer.id)}
                >
                  <div className="layer-row__main">
                    <span>{layer.name}</span>
                    <small>{layer.kind}</small>
                  </div>
                </button>
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => updateLayer(layer.id, 'visible', !layer.visible)}
                >
                  {layer.visible ? <Eye size={15} /> : <EyeOff size={15} />}
                </button>
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => deleteLayer(layer.id)}
                  aria-label={`${layer.name} löschen`}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        </Section>

        {activeLayer && (
          <Section title={`Aktiver Layer: ${activeLayer.name}`} icon={activeLayer.kind === 'text' ? Type : activeLayer.kind === 'shape' ? Shapes : activeLayer.kind === 'image' ? ImagePlus : Layers}>
            <div className="field">
              <div className="field__head">
                <span>Layer Tools</span>
              </div>
              <div className="button-row">
                <button className="ghost-button" type="button" onClick={() => moveLayer(activeLayer.id, 1)}>
                  <ArrowDown size={16} />
                  Runter
                </button>
                <button className="ghost-button" type="button" onClick={() => moveLayer(activeLayer.id, -1)}>
                  <ArrowUp size={16} />
                  Hoch
                </button>
                <button className="ghost-button" type="button" onClick={() => duplicateLayer(activeLayer.id)}>
                  <Copy size={16} />
                  Duplizieren
                </button>
                <button className="ghost-button danger" type="button" onClick={() => deleteLayer(activeLayer.id)}>
                  <Trash2 size={16} />
                  Löschen
                </button>
              </div>
            </div>

            <div className="field-grid">
              <SliderField label="X" value={activeLayer.transform.x} min={0} max={1} step={0.001} format={(value) => `${Math.round(value * 100)}%`} onChange={(value) => updateLayer(activeLayer.id, 'transform.x', value)} />
              <SliderField label="Y" value={activeLayer.transform.y} min={0} max={1} step={0.001} format={(value) => `${Math.round(value * 100)}%`} onChange={(value) => updateLayer(activeLayer.id, 'transform.y', value)} />
            </div>

            <div className="field-grid">
              <SliderField label="Rotation" value={activeLayer.transform.rotation} min={-180} max={180} step={1} format={(value) => `${Math.round(value)}°`} onChange={(value) => updateLayer(activeLayer.id, 'transform.rotation', value)} />
              <SliderField label="Opacity" value={activeLayer.opacity} min={0} max={1} step={0.01} format={(value) => `${Math.round(value * 100)}%`} onChange={(value) => updateLayer(activeLayer.id, 'opacity', value)} />
            </div>

            <div className="field-grid">
              <SliderField label="Scale" value={activeLayer.transform.scale} min={0.3} max={2} step={0.01} format={(value) => `${value.toFixed(2)}x`} onChange={(value) => updateLayer(activeLayer.id, 'transform.scale', value)} />
              <SliderField label="Blur" value={activeLayer.blur} min={0} max={24} step={0.5} format={(value) => `${value.toFixed(1)}px`} onChange={(value) => updateLayer(activeLayer.id, 'blur', value)} />
            </div>

            <SelectField
              label="Blend Mode"
              value={activeLayer.blendMode}
              options={BLEND_MODES}
              onChange={(value) => updateLayer(activeLayer.id, 'blendMode', value)}
            />

            {activeLayer.kind === 'shape' && (
              <>
                <div className="field-grid">
                  <ColorField label="Fill" value={activeLayer.shape.fill} onChange={(value) => updateLayer(activeLayer.id, 'shape.fill', value)} />
                  <SliderField label="Size" value={activeLayer.shape.size} min={0.08} max={0.9} step={0.01} format={(value) => `${Math.round(value * 100)}%`} onChange={(value) => updateLayer(activeLayer.id, 'shape.size', value)} />
                </div>
                <PaletteSwatches onPick={(color) => updateLayer(activeLayer.id, 'shape.fill', color)} />
                <UploadButton
                  label={activeLayer.shape.imageSrc ? 'Bild in Form ersetzen' : 'Bild in Form hochladen'}
                  accept="image/*"
                  onSelect={(event) => handleAssetUpload(event, ({ file, src }) => {
                    replaceLayer(activeLayer.id, (layer) => ({
                      ...layer,
                      shape: {
                        ...layer.shape,
                        imageSrc: src,
                        imageName: file.name,
                      },
                    }));
                  })}
                />
                <div className="status-pill">
                  {activeLayer.shape.imageSrc ? `Formbild: ${activeLayer.shape.imageName}` : 'Kein Bild in der Form'}
                </div>
                <div className="field-grid">
                  <SliderField label="Bild Deckkraft" value={activeLayer.shape.imageOpacity ?? 1} min={0} max={1} step={0.01} format={(value) => `${Math.round(value * 100)}%`} onChange={(value) => updateLayer(activeLayer.id, 'shape.imageOpacity', value)} />
                  <SliderField label="Bild Scale" value={activeLayer.shape.imageScale ?? 1} min={0.6} max={1.8} step={0.01} format={(value) => `${value.toFixed(2)}x`} onChange={(value) => updateLayer(activeLayer.id, 'shape.imageScale', value)} />
                </div>
                <SelectField
                  label="Bild Blend Mode"
                  value={activeLayer.shape.imageBlendMode ?? 'source-over'}
                  options={BLEND_MODES}
                  onChange={(value) => updateLayer(activeLayer.id, 'shape.imageBlendMode', value)}
                />
                <div className="field-grid">
                  <SliderField label="Pixel" value={activeLayer.shape.pixelSize} min={12} max={84} step={1} format={(value) => `${Math.round(value)}`} onChange={(value) => updateLayer(activeLayer.id, 'shape.pixelSize', value)} />
                  <SliderField label="Punkte" value={activeLayer.shape.points} min={6} max={24} step={1} format={(value) => `${Math.round(value)}`} onChange={(value) => updateLayer(activeLayer.id, 'shape.points', value)} />
                </div>
                <div className="field-grid">
                  <SliderField label="Roughness" value={activeLayer.shape.roughness} min={0} max={0.7} step={0.01} onChange={(value) => updateLayer(activeLayer.id, 'shape.roughness', value)} />
                  <SliderField label="Asymmetry" value={activeLayer.shape.asymmetry} min={0} max={0.5} step={0.01} onChange={(value) => updateLayer(activeLayer.id, 'shape.asymmetry', value)} />
                </div>
                <div className="field-grid">
                  <SliderField label="Wobble" value={activeLayer.shape.wobble} min={0} max={0.4} step={0.01} onChange={(value) => updateLayer(activeLayer.id, 'shape.wobble', value)} />
                  <SliderField label="Bites" value={activeLayer.shape.bites} min={0} max={5} step={1} format={(value) => `${Math.round(value)}`} onChange={(value) => updateLayer(activeLayer.id, 'shape.bites', value)} />
                </div>
                <div className="field-grid">
                  <SliderField label="Stretch X" value={activeLayer.shape.squishX} min={0.6} max={1.4} step={0.01} onChange={(value) => updateLayer(activeLayer.id, 'shape.squishX', value)} />
                  <SliderField label="Stretch Y" value={activeLayer.shape.squishY} min={0.6} max={1.4} step={0.01} onChange={(value) => updateLayer(activeLayer.id, 'shape.squishY', value)} />
                </div>
                <div className="button-row">
                  <button className="ghost-button" type="button" onClick={randomizeShapes}>
                    <RotateCcw size={16} />
                    Nur Formen neu
                  </button>
                </div>
              </>
            )}

            {activeLayer.kind === 'logo' && (
              <>
                <div className="field field--stack">
                  <div className="field__head">
                    <span>Logo Library</span>
                    <span>{activeLayer.assetName}</span>
                  </div>
                  <div className="library-grid">
                    {logoLibrary.map((entry) => (
                      <button key={entry.id} type="button" className="library-card" onClick={() => applyLogoEntry(entry)}>
                        <img src={entry.src} alt={entry.name} />
                        <span>{entry.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <UploadButton
                  label="Eigenes Logo hochladen"
                  accept="image/*,.svg"
                  onSelect={(event) => handleAssetUpload(event, ({ file, src }) => {
                    const entry = {
                      id: `upload_${Date.now()}`,
                      name: file.name,
                      src,
                      defaults: {
                        tint: activeLayer.logo.tint,
                        preserveColor: true,
                      },
                    };
                    setLogoLibrary((current) => [entry, ...current]);
                    applyLogoEntry(entry);
                  })}
                />
                <div className="field-grid">
                  <SliderField label="Size" value={activeLayer.logo.size} min={0.06} max={0.6} step={0.01} format={(value) => `${Math.round(value * 100)}%`} onChange={(value) => updateLayer(activeLayer.id, 'logo.size', value)} />
                  <ColorField label="Tint" value={activeLayer.logo.tint} onChange={(value) => updateLayer(activeLayer.id, 'logo.tint', value)} />
                </div>
                <PaletteSwatches onPick={(color) => updateLayer(activeLayer.id, 'logo.tint', color)} />
                <div className="field-grid">
                  <ToggleField label="Originalfarbe" checked={activeLayer.logo.preserveColor} onChange={(value) => updateLayer(activeLayer.id, 'logo.preserveColor', value)} />
                  <ToggleField label="Weiß entfernen" checked={activeLayer.logo.removeWhite} onChange={(value) => updateLayer(activeLayer.id, 'logo.removeWhite', value)} />
                </div>
                <SliderField label="Threshold" value={activeLayer.logo.whiteThreshold} min={180} max={255} step={1} format={(value) => `${Math.round(value)}`} onChange={(value) => updateLayer(activeLayer.id, 'logo.whiteThreshold', value)} />
              </>
            )}

            {activeLayer.kind === 'image' && (
              <>
                <UploadButton
                  label={activeLayer.assetSrc ? 'Bild für diesen Layer ersetzen' : 'Bild für diesen Layer hochladen'}
                  accept="image/*"
                  onSelect={(event) => handleAssetUpload(event, ({ file, src }) => {
                    replaceLayer(activeLayer.id, (layer) => ({
                      ...layer,
                      assetSrc: src,
                      assetName: file.name,
                    }));
                  })}
                />
                <div className="status-pill">
                  {activeLayer.assetSrc ? `Aktiv: ${activeLayer.assetName}` : 'Noch kein Bild geladen'}
                </div>
                <div className="field-grid">
                  <SliderField label="Size" value={activeLayer.image.size} min={0.08} max={0.9} step={0.01} format={(value) => `${Math.round(value * 100)}%`} onChange={(value) => updateLayer(activeLayer.id, 'image.size', value)} />
                  <SliderField label="Radius" value={activeLayer.image.radius} min={0} max={0.5} step={0.01} format={(value) => `${Math.round(value * 100)}%`} onChange={(value) => updateLayer(activeLayer.id, 'image.radius', value)} />
                </div>
                <div className="field-grid">
                  <ToggleField label="Originalfarbe" checked={activeLayer.image.preserveColor} onChange={(value) => updateLayer(activeLayer.id, 'image.preserveColor', value)} />
                  <ToggleField label="Weiß entfernen" checked={activeLayer.image.removeWhite} onChange={(value) => updateLayer(activeLayer.id, 'image.removeWhite', value)} />
                </div>
                <ColorField label="Tint" value={activeLayer.image.tint} onChange={(value) => updateLayer(activeLayer.id, 'image.tint', value)} />
                <PaletteSwatches onPick={(color) => updateLayer(activeLayer.id, 'image.tint', color)} />
              </>
            )}

            {activeLayer.kind === 'text' && (
              <>
                <SelectField
                  label="Texttyp"
                  value={activeLayer.role ?? 'body'}
                  options={TEXT_ROLE_OPTIONS}
                  onChange={(value) => updateLayer(activeLayer.id, 'role', value)}
                />
                <label className="field">
                  <div className="field__head">
                    <span>Text</span>
                  </div>
                  <textarea
                    value={activeLayer.text.value}
                    onChange={(event) => updateLayer(activeLayer.id, 'text.value', event.target.value)}
                  />
                </label>
                <div className="field-grid">
                  <SelectField label="Font" value={activeLayer.text.font} options={GOOGLE_FONTS} onChange={(value) => updateLayer(activeLayer.id, 'text.font', value)} />
                  <SelectField
                    label="Ausrichtung"
                    value={activeLayer.text.align}
                    options={[
                      { value: 'left', label: 'Links' },
                      { value: 'center', label: 'Mittig' },
                      { value: 'right', label: 'Rechts' },
                      { value: 'justify', label: 'Blocksatz' },
                    ]}
                    onChange={(value) => updateLayer(activeLayer.id, 'text.align', value)}
                  />
                </div>
                <div className="field-grid">
                  <SliderField label="Größe" value={activeLayer.text.size} min={14} max={180} step={1} format={(value) => `${Math.round(value)}px`} onChange={(value) => updateLayer(activeLayer.id, 'text.size', value)} />
                  <SliderField label="Breite" value={activeLayer.text.width} min={0.12} max={0.94} step={0.01} format={(value) => `${Math.round(value * 100)}%`} onChange={(value) => updateLayer(activeLayer.id, 'text.width', value)} />
                </div>
                <div className="field-grid">
                  <SliderField label="Zeilenabstand" value={activeLayer.text.leading} min={0.45} max={1.8} step={0.01} onChange={(value) => updateLayer(activeLayer.id, 'text.leading', value)} />
                  <SliderField label="Tracking" value={activeLayer.text.tracking} min={-4} max={8} step={0.1} onChange={(value) => updateLayer(activeLayer.id, 'text.tracking', value)} />
                </div>
                <div className="field-grid">
                  <SelectField
                    label="Weight"
                    value={activeLayer.text.weight}
                    options={['400', '500', '600', '700', '800', '900']}
                    onChange={(value) => updateLayer(activeLayer.id, 'text.weight', value)}
                  />
                  <ColorField label="Farbe" value={activeLayer.text.color} onChange={(value) => updateLayer(activeLayer.id, 'text.color', value)} />
                </div>
                <div className="field-grid">
                  <ToggleField label="Uppercase" checked={activeLayer.text.uppercase} onChange={(value) => updateLayer(activeLayer.id, 'text.uppercase', value)} />
                  <ToggleField label="Italic" checked={activeLayer.text.italic} onChange={(value) => updateLayer(activeLayer.id, 'text.italic', value)} />
                </div>
                <PaletteSwatches onPick={(color) => updateLayer(activeLayer.id, 'text.color', color)} />
              </>
            )}
          </Section>
        )}
      </aside>

      <main className="workspace">
        <div className="workspace__header">
          <div>
            <div className="eyebrow">Preview</div>
            <h2>Logo, Headline und Textblöcke lassen sich direkt auf der Fläche ziehen.</h2>
          </div>
          <p>
            Die Vorschau bleibt beim Arbeiten sichtbar, damit Komposition, Typo und Logo jederzeit im Blick bleiben.
          </p>
        </div>

        <div className="stage-shell" ref={stageRef}>
          <div
            className="stage"
            style={{
              width: preset.width * previewScale,
              height: preset.height * previewScale,
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            <canvas
              ref={canvasRef}
              width={preset.width}
              height={preset.height}
              className="stage__canvas"
              style={{
                width: preset.width * previewScale,
                height: preset.height * previewScale,
              }}
            />
            {scene.guides?.showGrid && (
              <div
                className="stage__grid"
                style={{
                  '--grid-columns': gridSpec.columns,
                  '--grid-rows': gridSpec.rows,
                  '--grid-margin-x': `${gridSpec.marginX * 100}%`,
                  '--grid-margin-y': `${gridSpec.marginY * 100}%`,
                }}
              />
            )}
            <div className="stage__overlay">
              {layerBounds.map(({ layerId, bounds }) => (
                <button
                  key={layerId}
                  type="button"
                  className={`bound-box ${layerId === activeLayerId ? 'is-active' : ''}`}
                  style={{
                    left: bounds.x * previewScale,
                    top: bounds.y * previewScale,
                    width: Math.max(12, bounds.width * previewScale),
                    height: Math.max(12, bounds.height * previewScale),
                  }}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => setActiveLayerId(layerId)}
                />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
